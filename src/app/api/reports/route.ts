import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { canUserViewWorkshop } from '@/lib/permissions';
import { computeWorkshopStatus } from '@/lib/workshopStatus';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = db.read();

  // Permitted workshops for this user
  const userWorkshops = data.workshops.filter((w) => canUserViewWorkshop(user, w));

  const now = new Date();
  const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Enrich each workshop with dynamic status and dates metrics
  const enrichedWorkshops = userWorkshops.map((w) => {
    const computed = computeWorkshopStatus(w);
    const startStr = (w.startDate || '').slice(0, 10);
    const endStr = (w.endDate || w.startDate || '').slice(0, 10);

    const sParts = startStr ? startStr.split('-').map(Number) : [2026, 1, 1];
    const eParts = endStr ? endStr.split('-').map(Number) : [2026, 1, 1];
    const sTime = new Date(sParts[0], sParts[1] - 1, sParts[2]).getTime();
    const eTime = new Date(eParts[0], eParts[1] - 1, eParts[2]).getTime();

    // Days remaining until end date (inclusive)
    const daysRemaining = Math.max(0, Math.ceil((eTime - todayTime) / (1000 * 60 * 60 * 24)));
    const daysUntilStart = Math.max(0, Math.ceil((sTime - todayTime) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.max(1, Math.ceil((eTime - sTime) / (1000 * 60 * 60 * 24)) + 1);
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((todayTime - sTime) / (1000 * 60 * 60 * 24)) + 1));
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    const trainees = (data.trainees || []).filter((t) => t.workshopId === w.id);
    const attendedCount = trainees.filter((t) => t.attendanceStatus === 'attended').length;

    const organizingOrg = data.organizations.find((o) => o.id === w.organizingOrgId);
    const placeOrg = data.organizations.find((o) => o.id === (w.placeId || w.targetOrgId));

    return {
      ...w,
      status: computed.status,
      statusName: computed.statusName,
      statusId: computed.statusId,
      completionDate: endStr,
      daysRemaining,
      daysUntilStart,
      totalDays,
      elapsedDays,
      progressPercent,
      organizingOrgName: organizingOrg?.name || w.branch || 'Organizing Unit',
      targetOrgName: w.placeName || placeOrg?.name || 'Host Branch',
      registeredTraineesCount: trainees.length,
      actualAttendedCount: attendedCount || w.actualTrainees || 0,
    };
  });

  // Categorize workshops
  const inProgressWorkshops = enrichedWorkshops.filter((w) => w.status === 'In Progress');
  const completedWorkshops = enrichedWorkshops.filter((w) => w.status === 'Completed');
  const pendingWorkshops = enrichedWorkshops.filter((w) => w.status === 'Scheduled');

  // All Registered Participants across permitted workshops
  const userWorkshopMap = new Map(enrichedWorkshops.map((w) => [w.id, w]));
  const allParticipants = (data.trainees || [])
    .filter((t) => userWorkshopMap.has(t.workshopId))
    .map((t) => {
      const ws = userWorkshopMap.get(t.workshopId);
      return {
        id: t.id,
        serialNumber: t.serialNumber,
        name: t.name,
        nicNumber: t.nicNumber || '—',
        position: t.position || t.designation || 'Teacher / Officer',
        schoolInstitute: t.schoolInstitute || t.organization || 'Educational Institute',
        phone: t.phone || '—',
        email: t.email || '—',
        attendanceStatus: t.attendanceStatus || 'registered',
        workshopId: t.workshopId,
        workshopTitle: ws?.title || 'Workshop',
        workshopNumber: ws?.workshopNumber || '',
        workshopStartDate: ws?.startDate || '',
        workshopEndDate: ws?.endDate || '',
        workshopStatus: ws?.status || 'Scheduled',
        workshopPlaceName: ws?.targetOrgName || '',
      };
    });

  // Overall metrics
  const totalWorkshops = enrichedWorkshops.length;
  const totalExpectedTrainees = enrichedWorkshops.reduce((sum, w) => sum + (w.expectedTrainees || 0), 0);
  const totalActualTrainees = enrichedWorkshops.reduce((sum, w) => sum + (w.actualAttendedCount || 0), 0);

  // Status breakdown
  const statusCounts = {
    'In Progress': inProgressWorkshops.length,
    Completed: completedWorkshops.length,
    Scheduled: pendingWorkshops.length,
  };

  const statusBreakdown = [
    { name: 'In Progress', count: inProgressWorkshops.length, color: '#EB7400' },
    { name: 'Completed', count: completedWorkshops.length, color: '#00534E' },
    { name: 'Pending / Scheduled', count: pendingWorkshops.length, color: '#1565C0' },
  ];

  // Category (Subject) breakdown
  const categoryCounts: Record<string, { name: string; count: number }> = {};
  enrichedWorkshops.forEach((w) => {
    const catName =
      w.subject ||
      w.categoryName ||
      (w.categoryId ? data.workshopCategories.find((c) => c.id === w.categoryId)?.name : null) ||
      'General';
    if (!categoryCounts[catName]) {
      categoryCounts[catName] = { name: catName, count: 0 };
    }
    categoryCounts[catName].count += 1;
  });

  return NextResponse.json({
    metrics: {
      totalWorkshops,
      totalExpectedTrainees,
      totalActualTrainees,
      totalRegisteredParticipants: allParticipants.length,
      inProgressCount: inProgressWorkshops.length,
      completedCount: completedWorkshops.length,
      pendingCount: pendingWorkshops.length,
    },
    inProgressWorkshops,
    completedWorkshops,
    pendingWorkshops,
    participants: allParticipants,
    workshops: enrichedWorkshops,
    statusBreakdown,
    categoryBreakdown: Object.values(categoryCounts).filter((c) => c.count > 0),
  });
}
