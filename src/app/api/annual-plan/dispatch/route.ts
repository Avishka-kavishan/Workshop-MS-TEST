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
        { error: 'Only MOE Planning Branch or Administrators can send amendments to branches.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { branchId, year = '2027', amendmentNumber = 1, notes } = body;

    if (!branchId || Number(amendmentNumber) <= 0) {
      return NextResponse.json(
        { error: 'branchId and valid amendmentNumber are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    const data = await getDb();
    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || 'MOE Branch';

    const currentAmendment = (data.aipAmendments || []).find(
      (a) => a.year === String(year) && Number(a.amendmentNumber) === Number(amendmentNumber)
    );

    const amendTitle = currentAmendment?.title || `Amendment 0${amendmentNumber}`;

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];

      const planIdx = dbData.aipPlans.findIndex(
        (p) =>
          p.branchId === branchId &&
          p.year === String(year) &&
          Number(p.amendmentNumber || 0) === Number(amendmentNumber)
      );

      if (planIdx !== -1) {
        dbData.aipPlans[planIdx] = {
          ...dbData.aipPlans[planIdx],
          isDispatchedToBranch: true,
          dispatchedAt: now,
          dispatchedBy: user.name || 'MOE Planning Branch',
          updatedAt: now,
        };
        updatedPlan = dbData.aipPlans[planIdx];
      } else {
        const newPlan = {
          id: `plan-${branchId}-${year}-amend-${amendmentNumber}`,
          branchId,
          branchName,
          year: String(year),
          amendmentNumber: Number(amendmentNumber),
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year} (Amendment ${amendmentNumber})`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: 'Draft' as const,
          isDispatchedToBranch: true,
          dispatchedAt: now,
          dispatchedBy: user.name || 'MOE Planning Branch',
          createdAt: now,
          updatedAt: now,
        };
        dbData.aipPlans.push(newPlan);
        updatedPlan = newPlan;
      }

      // Send In-App Notification directly to this specific branch
      const notifToBranch: Notification = {
        id: `notif-aip-disp-${randomUUID()}`,
        recipientOrgId: branchId,
        workshopId: 'aip-amendment',
        title: `📢 MOE Planning: ${amendTitle} Sent to Your Branch`,
        message: `MOE Planning Branch has finalized your baseline targets for ${amendTitle} (${year}) and sent it to your branch. Please open Amendment 0${amendmentNumber}, fill your actual progress in the green & peach columns, and submit back to Planning Branch.${notes ? ` Note: "${notes}"` : ''}`,
        isRead: false,
        createdAt: now,
      };
      dbData.notifications.push(notifToBranch);
    });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: `${amendTitle} successfully sent to ${branchName}!`,
    });
  } catch (error: any) {
    console.error('Error dispatching amendment to branch:', error);
    return NextResponse.json(
      { error: 'Failed to send amendment to branch', details: error.message },
      { status: 500 }
    );
  }
}

