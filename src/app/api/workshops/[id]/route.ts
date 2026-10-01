import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { canUserViewWorkshop, canUserManageParticipants, canUserRescheduleWorkshop } from '@/lib/permissions';
import { computeWorkshopStatus } from '@/lib/workshopStatus';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = db.read();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  if (!canUserViewWorkshop(user, workshop)) {
    return NextResponse.json({ error: 'Access denied: You do not have permission to view this workshop.' }, { status: 403 });
  }

  const organizingOrg = data.organizations.find((o) => o.id === workshop.organizingOrgId);
  const placeOrg = data.organizations.find((o) => o.id === (workshop.placeId || workshop.targetOrgId));
  const creator = data.users.find((u) => u.id === workshop.createdBy);

  const trainees = data.trainees.filter((t) => t.workshopId === workshop.id);
  const resourcePersons = data.resourcePersons.filter((r) => r.workshopId === workshop.id);

  const canManage = canUserManageParticipants(user, workshop);
  const canReschedule = canUserRescheduleWorkshop(user, workshop);
  const rescheduleHistory = (data.workshopReschedules || [])
    .filter((r) => r.workshopId === workshop.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    workshop: {
      ...workshop,
      year: workshop.year || (workshop.startDate ? new Date(workshop.startDate).getFullYear().toString() : '2025'),
      branch: workshop.branch || organizingOrg?.name || 'MOE Branch',
      subject: workshop.subject || 'General Curriculum',
      aim: workshop.aim || workshop.objective || '',
      placeId: workshop.placeId || workshop.targetOrgId,
      placeName: workshop.placeName || placeOrg?.name || 'Local Zonal Branch',
      daysHeld: workshop.daysHeld || 2,
      status: computeWorkshopStatus(workshop).status,
      statusName: computeWorkshopStatus(workshop).statusName,
      statusId: computeWorkshopStatus(workshop).statusId,
      confirmationStatus: workshop.confirmationStatus || 'Confirmed',
      organizingOrgName: organizingOrg?.name || workshop.branch || 'MOE Branch',
      targetOrgName: workshop.placeName || placeOrg?.name || 'Host Branch',
      creatorName: creator?.fullName || 'Authorized Officer',
      creatorEmail: creator?.email || '',
      trainees,
      resourcePersons,
      rescheduleHistory,
      canManageParticipants: canManage,
      canReschedule,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = db.read();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, confirmationStatus, title, aim, expectedOutput, daysHeld, venue } = body;

    const now = new Date().toISOString();

    db.update((d) => {
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) {
        if (status) {
          w.status = status;
          w.statusName = status;
        }
        if (confirmationStatus) {
          w.confirmationStatus = confirmationStatus;
        }
        if (title) w.title = title.trim();
        if (aim !== undefined) w.aim = aim.trim();
        if (expectedOutput !== undefined) w.expectedOutput = expectedOutput.trim();
        if (daysHeld) w.daysHeld = parseInt(daysHeld, 10);
        if (venue !== undefined) w.venue = venue.trim();
        w.updatedAt = now;
      }
    });

    return NextResponse.json({ success: true, message: 'Workshop updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update workshop' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = db.read();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  db.update((d) => {
    d.workshops = d.workshops.filter((w) => w.id !== params.id);
    d.trainees = d.trainees.filter((t) => t.workshopId !== params.id);
    d.resourcePersons = d.resourcePersons.filter((r) => r.workshopId !== params.id);
  });

  return NextResponse.json({ success: true, message: 'Workshop deleted successfully' });
}
