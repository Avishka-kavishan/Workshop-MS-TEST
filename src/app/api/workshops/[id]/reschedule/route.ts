import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb, WorkshopReschedule } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { canUserRescheduleWorkshop } from '@/lib/permissions';


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDb();
    const workshop = data.workshops.find((w) => w.id === params.id);
    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const history = (data.workshopReschedules || [])
      .filter((r) => r.workshopId === params.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      history,
      originalSchedule: {
        startDate: workshop.originalStartDate || workshop.startDate,
        endDate: workshop.originalEndDate || workshop.endDate,
        venue: workshop.originalVenue || workshop.venue,
      },
      currentSchedule: {
        startDate: workshop.startDate,
        endDate: workshop.endDate,
        venue: workshop.venue,
        status: workshop.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch reschedule history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const data = await getDb();
    const workshop = data.workshops.find((w) => w.id === params.id);

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    if (!canUserRescheduleWorkshop(user, workshop)) {
      return NextResponse.json(
        { error: 'Permission denied: Only the Organizing Branch, Host Branch, or an Administrator can reschedule this workshop.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { newStartDate, newEndDate, reason, keepVenue, newVenue } = body;

    if (!newStartDate || !newEndDate) {
      return NextResponse.json({ error: 'Both New Start Date and New End Date are required.' }, { status: 400 });
    }

    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid dates provided.' }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ error: 'New End Date cannot be earlier than New Start Date.' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Official Reason for rescheduling is mandatory (minimum 5 characters).' },
        { status: 400 }
      );
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const computedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const now = new Date().toISOString();

    const isOrganizer =
      workshop.organizingOrgId === user.organizationId ||
      workshop.createdBy === user.id ||
      (workshop.branch && user.organizationName && (
        workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase()) ||
        user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase())
      ));
    const isHost =
      (workshop.placeId || workshop.targetOrgId) === user.organizationId ||
      (workshop.placeName && user.organizationName && (
        workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase()) ||
        user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase())
      ));
    const branchType: 'organizer' | 'host' | 'admin' = isOrganizer ? 'organizer' : isHost ? 'host' : 'admin';

    const resolvedVenue = keepVenue ? (workshop.venue || '') : (newVenue ? newVenue.trim() : '');

    const oldStart = workshop.startDate;
    const oldEnd = workshop.endDate;
    const oldVenue = workshop.venue;

    const rescheduleRecord: WorkshopReschedule = {
      id: `RS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      workshopId: workshop.id,
      rescheduledByUserId: user.id,
      rescheduledByName: user.fullName || user.name || user.username || 'Authorized Officer',
      rescheduledByOrgName: user.organizationName || 'Education Branch',
      rescheduledByBranchType: branchType,
      oldStartDate: oldStart,
      oldEndDate: oldEnd,
      oldDaysHeld: workshop.daysHeld,
      oldVenue: oldVenue,
      newStartDate,
      newEndDate,
      newDaysHeld: computedDays,
      newVenue: resolvedVenue,
      reason: reason.trim(),
      createdAt: now,
    };

    await updateDb((d) => {
      const ws = d.workshops.find((w) => w.id === params.id);
      if (ws) {
        if (!ws.originalStartDate) ws.originalStartDate = oldStart;
        if (!ws.originalEndDate) ws.originalEndDate = oldEnd;
        if (!ws.originalVenue && oldVenue) ws.originalVenue = oldVenue;

        ws.startDate = newStartDate;
        ws.endDate = newEndDate;
        ws.daysHeld = computedDays;
        ws.venue = resolvedVenue;
        ws.status = 'Rescheduled';
        ws.statusName = 'Rescheduled';
        ws.lastRescheduledAt = now;
        ws.lastRescheduleReason = reason.trim();
        ws.rescheduleCount = (ws.rescheduleCount || 0) + 1;
        ws.updatedAt = now;
      }

      if (!d.workshopReschedules) d.workshopReschedules = [];
      d.workshopReschedules.push(rescheduleRecord);

      // Automated Mutual Notifications
      if (!d.notifications) d.notifications = [];

      const notifMessage = `"${workshop.title}" (Subject: ${workshop.subject}) originally scheduled for ${oldStart} to ${oldEnd} has been rescheduled to ${newStartDate} to ${newEndDate} by ${user.organizationName || 'Authorized Officer'}. Reason: ${reason.trim()}`;

      // If organizer reschedules -> notify host branch
      if (branchType === 'organizer' && (workshop.placeId || workshop.targetOrgId)) {
        d.notifications.push({
          id: uuidv4(),
          recipientOrgId: workshop.placeId || workshop.targetOrgId,
          workshopId: workshop.id,
          title: `🔄 Workshop Rescheduled: ${workshop.title}`,
          message: notifMessage,
          isRead: false,
          createdAt: now,
        });
      }
      // If host branch reschedules -> notify organizing branch
      else if (branchType === 'host' && workshop.organizingOrgId) {
        d.notifications.push({
          id: uuidv4(),
          recipientOrgId: workshop.organizingOrgId,
          workshopId: workshop.id,
          title: `🔄 Workshop Rescheduled: ${workshop.title}`,
          message: notifMessage,
          isRead: false,
          createdAt: now,
        });
      }
      // If admin reschedules -> notify both
      else {
        if (workshop.organizingOrgId) {
          d.notifications.push({
            id: uuidv4(),
            recipientOrgId: workshop.organizingOrgId,
            workshopId: workshop.id,
            title: `🔄 Workshop Rescheduled: ${workshop.title}`,
            message: notifMessage,
            isRead: false,
            createdAt: now,
          });
        }
        if (workshop.placeId && workshop.placeId !== workshop.organizingOrgId) {
          d.notifications.push({
            id: uuidv4(),
            recipientOrgId: workshop.placeId,
            workshopId: workshop.id,
            title: `🔄 Workshop Rescheduled: ${workshop.title}`,
            message: notifMessage,
            isRead: false,
            createdAt: now,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Workshop has been successfully rescheduled.',
      reschedule: rescheduleRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reschedule workshop' }, { status: 500 });
  }
}
