import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const isPlanningOrAdmin =
      user.organizationId === 'org-moe-planning' ||
      user.organizationId === 'org-moe-data' ||
      user.roleId === 'role-admin' ||
      user.roleId === 'admin';

    if (!isPlanningOrAdmin) {
      return NextResponse.json(
        { error: 'Only MOE Planning Branch or Administrators can approve or return plans.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { branchId, year, amendmentNumber = 0, action, notes } = body;

    if (!branchId || !year) {
      return NextResponse.json({ error: 'branchId and year are required' }, { status: 400 });
    }

    if (action !== 'Approve' && action !== 'Return') {
      return NextResponse.json({ error: 'Action must be "Approve" or "Return"' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    const data = await getDb();
    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || 'MOE Branch';

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];

      const planIdx = dbData.aipPlans.findIndex(
        (p) =>
          p.branchId === branchId &&
          p.year === String(year) &&
          Number(p.amendmentNumber || 0) === Number(amendmentNumber)
      );

      const newStatus = action === 'Approve' ? 'Approved' : 'Draft';

      if (planIdx !== -1) {
        dbData.aipPlans[planIdx] = {
          ...dbData.aipPlans[planIdx],
          status: newStatus,
          approvedAt: action === 'Approve' ? now : undefined,
          approvedBy: action === 'Approve' ? (user.name || 'MOE Planning Branch') : undefined,
          approvalNotes: notes ? String(notes).trim() : undefined,
          updatedAt: now,
        };
        updatedPlan = dbData.aipPlans[planIdx];
      } else {
        const newPlan = {
          id: `plan-${branchId}-${year}${Number(amendmentNumber) > 0 ? `-amend-${amendmentNumber}` : ''}`,
          branchId,
          branchName,
          year: String(year),
          amendmentNumber: Number(amendmentNumber),
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}${Number(amendmentNumber) > 0 ? ` (Amendment ${amendmentNumber})` : ''}`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: newStatus as any,
          approvedAt: action === 'Approve' ? now : undefined,
          approvedBy: action === 'Approve' ? (user.name || 'MOE Planning Branch') : undefined,
          approvalNotes: notes ? String(notes).trim() : undefined,
          createdAt: now,
          updatedAt: now,
        };
        dbData.aipPlans.push(newPlan);
        updatedPlan = newPlan;
      }

      // Notify the responsible branch
      const planTitle = Number(amendmentNumber) === 0
        ? `Original Implementation Plan (${year})`
        : `Amendment 0${amendmentNumber} (${year})`;

      const notifTitle = action === 'Approve'
        ? `✅ ${planTitle} Approved by Planning Branch`
        : `⚠️ ${planTitle} Returned for Revision`;

      const notifMsg = action === 'Approve'
        ? `MOE Planning Branch has approved your ${planTitle}.${notes ? ` Remarks: "${notes}"` : ''}`
        : `MOE Planning Branch has returned your ${planTitle} for adjustments.${notes ? ` Remarks: "${notes}"` : ' Please review and resubmit.'}`;

      const notifToBranch: Notification = {
        id: `notif-aip-appr-${randomUUID()}`,
        recipientOrgId: branchId,
        workshopId: 'aip-plan',
        title: notifTitle,
        message: notifMsg,
        isRead: false,
        createdAt: now,
      };
      dbData.notifications.push(notifToBranch);
    });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: action === 'Approve'
        ? `Plan successfully approved!`
        : `Plan successfully returned to branch for revision.`,
    });
  } catch (error: any) {
    console.error('Error in approve route:', error);
    return NextResponse.json(
      { error: 'Failed to process approval action', details: error.message },
      { status: 500 }
    );
  }
}
