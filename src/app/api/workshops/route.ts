import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { Workshop } from '@/lib/db';
import { canUserViewWorkshop, canUserRescheduleWorkshop } from '@/lib/permissions';
import { formatWorkshopId, getNextSequenceForBranch } from '@/lib/workshopId';
import { computeWorkshopStatus } from '@/lib/workshopStatus';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const searchParams = req.nextUrl.searchParams;
  const statusFilter = searchParams.get('status');
  const yearFilter = searchParams.get('year');
  const placeFilter = searchParams.get('place');
  const search = searchParams.get('search')?.toLowerCase();

  const connectionFilter = searchParams.get('connection'); // 'to-conduct' | 'scheduled-by-you' | 'all'

  const data = db.read();

  // Filter based on user permissions: only workshops connected to the user
  const allConnected = data.workshops.filter((w) => canUserViewWorkshop(user, w));

  const toConductCount = allConnected.filter(
    (w) => w.placeId === user.organizationId || w.targetOrgId === user.organizationId
  ).length;

  const scheduledByYouCount = allConnected.filter(
    (w) => w.createdBy === user.id || w.organizingOrgId === user.organizationId
  ).length;

  let workshops = [...allConnected];

  // Connection filter: 'to-conduct' vs 'scheduled-by-you'
  if (connectionFilter === 'to-conduct') {
    workshops = workshops.filter(
      (w) => w.placeId === user.organizationId || w.targetOrgId === user.organizationId
    );
  } else if (connectionFilter === 'scheduled-by-you') {
    workshops = workshops.filter(
      (w) => w.createdBy === user.id || w.organizingOrgId === user.organizationId
    );
  }

  // Apply optional filters
  if (statusFilter && statusFilter !== 'all') {
    workshops = workshops.filter((w) => (w.status === statusFilter || w.statusId === statusFilter));
  }
  if (yearFilter && yearFilter !== 'all') {
    workshops = workshops.filter((w) => String(w.year) === yearFilter);
  }
  if (placeFilter && placeFilter !== 'all') {
    workshops = workshops.filter((w) => (w.placeId === placeFilter || w.targetOrgId === placeFilter));
  }
  if (search) {
    workshops = workshops.filter(
      (w) =>
        w.title?.toLowerCase().includes(search) ||
        w.workshopNumber?.toLowerCase().includes(search) ||
        w.subject?.toLowerCase().includes(search) ||
        w.branch?.toLowerCase().includes(search) ||
        w.placeName?.toLowerCase().includes(search) ||
        w.aim?.toLowerCase().includes(search)
    );
  }

  // Populate related entities
  const populated = workshops.map((w) => {
    const organizingOrg = data.organizations.find((o) => o.id === w.organizingOrgId);
    const placeOrg = data.organizations.find((o) => o.id === (w.placeId || w.targetOrgId));
    const creator = data.users.find((u) => u.id === w.createdBy);
    const traineeCount = data.trainees.filter((t) => t.workshopId === w.id).length;
    const rpCount = data.resourcePersons.filter((r) => r.workshopId === w.id).length;

    const isToConduct = (w.placeId === user.organizationId || w.targetOrgId === user.organizationId);
    const isScheduledByYou = (w.createdBy === user.id || w.organizingOrgId === user.organizationId);

    let connectionRole: 'to-conduct' | 'scheduled-by-you' | 'both' | 'overseeing' = 'to-conduct';
    if (isToConduct && isScheduledByYou) connectionRole = 'both';
    else if (isToConduct) connectionRole = 'to-conduct';
    else if (isScheduledByYou) connectionRole = 'scheduled-by-you';
    else connectionRole = 'overseeing';

    return {
      ...w,
      connectionRole,
      isToConduct,
      isScheduledByYou,
      year: w.year || (w.startDate ? new Date(w.startDate).getFullYear().toString() : '2025'),
      branch: w.branch || organizingOrg?.name || 'MOE Branch',
      subject: w.subject || 'General Curriculum',
      aim: w.aim || w.objective || '',
      expectedOutput: w.expectedOutput || '',
      placeId: w.placeId || w.targetOrgId,
      placeName: w.placeName || placeOrg?.name || 'Local Zonal Branch',
      daysHeld: w.daysHeld || 2,
      status: computeWorkshopStatus(w).status,
      statusName: computeWorkshopStatus(w).statusName,
      statusId: computeWorkshopStatus(w).statusId,
      confirmationStatus: w.confirmationStatus || 'Confirmed',
      organizingOrgName: organizingOrg?.name || w.branch || 'MOE Branch',
      targetOrgName: w.placeName || placeOrg?.name || 'Host Branch',
      creatorName: creator?.fullName || 'Authorized Planner',
      traineeCount,
      resourcePersonCount: rpCount,
      canReschedule: canUserRescheduleWorkshop(user, w),
    };
  });

  // Sort by updatedAt descending
  populated.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  return NextResponse.json({
    workshops: populated,
    counts: {
      total: allConnected.length,
      toConduct: toConductCount,
      scheduledByYou: scheduledByYouCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;

  try {
    const body = await req.json();
    const {
      year,
      branch,
      subject,
      workshop,
      title,
      aim,
      expectedOutput,
      placeId,
      placeName,
      targetLevel: bodyTargetLevel,
      targetPath: bodyTargetPath,
      hostAssignments, // Array<{ placeId: string; placeName: string; targetPath?: string[] }>
      daysHeld,
      startDate,
      endDate,
      venue,
      selfOrganize,
    } = body;

    const workshopTitle = (workshop || title || '').trim();
    const workshopAim = (aim || '').trim();
    const workshopSubject = (subject || '').trim();
    const workshopBranch = (branch || user.organizationName || 'MOE - ICT Branch').trim();
    const workshopYear = String(year || new Date().getFullYear()).trim();
    const workshopDays = parseInt(daysHeld, 10) || 1;
    const isSelfOrganized = selfOrganize === true;
    const confirmationStatus = (body.confirmationStatus || body.scheduleType || 'Confirmed') === 'Tentative' ? 'Tentative' : 'Confirmed';

    if (!workshopTitle) {
      return NextResponse.json({ error: 'Workshop name/title is required.' }, { status: 400 });
    }
    if (!workshopSubject) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    // Resolve list of hosts to create workshops for
    let hostsToCreate: Array<{ placeId: string; placeName: string; targetPath?: string[] }> = [];

    if (Array.isArray(hostAssignments) && hostAssignments.length > 0) {
      hostsToCreate = hostAssignments.filter((h) => h && h.placeId);
    } else if (placeId) {
      hostsToCreate = [{ placeId, placeName: placeName || '', targetPath: bodyTargetPath }];
    }

    if (hostsToCreate.length === 0) {
      return NextResponse.json({ error: 'Please select at least one host organization / branch.' }, { status: 400 });
    }

    const data = db.read();
    const now = new Date().toISOString();

    const createdWorkshops: Workshop[] = [];

    db.update((dbData) => {
      if (!dbData.notifications) dbData.notifications = [];

      // Calculate start and end dates
      const start = startDate || new Date().toISOString().slice(0, 10);
      let end = endDate;
      if (!end) {
        const d = new Date(start);
        d.setDate(d.getDate() + (workshopDays - 1));
        end = d.toISOString().slice(0, 10);
      }

      hostsToCreate.forEach((hostItem, idx) => {
        const targetPlace = dbData.organizations.find((o) => o.id === hostItem.placeId);
        const resolvedPlaceName = (hostItem.placeName || targetPlace?.name || 'Local Branch').trim();

        const branchSeq = getNextSequenceForBranch(workshopBranch, dbData.workshops);
        const generatedWsNum = formatWorkshopId(workshopBranch, startDate, branchSeq);
        const wsNum = (body.workshopId || body.workshopNumber || '').trim() || generatedWsNum;

        const newWorkshop: Workshop = {
          id: uuidv4(),
          workshopNumber: wsNum,
          year: workshopYear,
          branch: workshopBranch,
          subject: workshopSubject,
          title: workshopTitle,
          aim: workshopAim,
          expectedOutput: (expectedOutput || '').trim(),
          placeId: hostItem.placeId,
          placeName: resolvedPlaceName,
          targetLevel: bodyTargetLevel || undefined,
          targetPath: hostItem.targetPath || bodyTargetPath || undefined,
          daysHeld: workshopDays,
          startDate: start,
          endDate: end,
          venue: venue?.trim() || '',
          organizingOrgId: user.organizationId,
          targetOrgId: hostItem.placeId,
          isSelfOrganized,
          expectedTrainees: 40,
          actualTrainees: 0,
          status: 'Scheduled',
          statusId: 'status-scheduled',
          statusName: 'Scheduled',
          confirmationStatus,
          createdBy: user.id,
          creatorName: user.name || 'Authorized Officer',
          createdAt: now,
          updatedAt: now,
        };

        dbData.workshops.push(newWorkshop);
        createdWorkshops.push(newWorkshop);

        // Send notification
        if (isSelfOrganized) {
          dbData.notifications.push({
            id: uuidv4(),
            recipientOrgId: user.organizationId,
            workshopId: newWorkshop.id,
            title: `🏠 Self-Organized Workshop Created`,
            message: `You have created "${workshopTitle}" (Subject: ${workshopSubject}) to be organized at your own branch (${resolvedPlaceName}) for ${workshopDays} days in ${workshopYear}.`,
            isRead: false,
            createdAt: now,
          });
        } else {
          dbData.notifications.push({
            id: uuidv4(),
            recipientOrgId: hostItem.placeId,
            workshopId: newWorkshop.id,
            title: `📢 Workshop Scheduled at ${resolvedPlaceName}`,
            message: `${workshopBranch} has scheduled "${workshopTitle}" (Subject: ${workshopSubject}) at ${resolvedPlaceName} for ${workshopDays} days in ${workshopYear}. You can now add trainees and resource persons.`,
            isRead: false,
            createdAt: now,
          });
        }
      });
    });

    if (createdWorkshops.length === 1) {
      return NextResponse.json({ workshop: createdWorkshops[0] }, { status: 201 });
    }

    return NextResponse.json({
      workshop: createdWorkshops[0],
      workshops: createdWorkshops,
      count: createdWorkshops.length,
      batch: true,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create workshop' }, { status: 500 });
  }
}

