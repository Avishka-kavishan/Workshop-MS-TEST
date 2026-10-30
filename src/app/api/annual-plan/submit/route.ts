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
    const body = await request.json();

    const planId = body.planId;
    const branchId = body.branchId || user?.organizationId;
    const year = body.year ? String(body.year) : '2027';
    const amendmentNumber = Number(body.amendmentNumber) || 0;
    const submissionNotes = (body.notes || '').trim();

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    const data = await getDb();
    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || user?.organizationName || 'MOE Branch';

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];

      const planIdx = dbData.aipPlans.findIndex(
        (p) =>
          (planId && p.id === planId) ||
          (p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber)
      );

      if (planIdx !== -1) {
        dbData.aipPlans[planIdx] = {
          ...dbData.aipPlans[planIdx],
          status: 'Submitted',
          submittedAt: now,
          submissionNotes,
          updatedAt: now,
        };
        updatedPlan = dbData.aipPlans[planIdx];
      } else {
        // Create as submitted
        const newPlan = {
          id: planId || `plan-${branchId}-${year}${amendmentNumber > 0 ? `-amend-${amendmentNumber}` : ''}`,
          branchId,
          branchName,
          year,
          amendmentNumber,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}${amendmentNumber > 0 ? ` (Amendment ${amendmentNumber})` : ''}`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: 'Submitted' as const,
          submittedAt: now,
          submissionNotes,
          createdAt: now,
          updatedAt: now,
        };
        dbData.aipPlans.push(newPlan);
        updatedPlan = newPlan;
      }

      // Notify MOE Planning Branch
      const titlePrefix = amendmentNumber === 0 
        ? `📋 Original Plan Submitted: ${branchName}` 
        : `🔄 Amendment 0${amendmentNumber} Submitted: ${branchName}`;
      const msgDesc = amendmentNumber === 0
        ? `${branchName} has submitted their Original Implementation Plan (${year}) for Planning Branch approval.`
        : `${branchName} has submitted their Amendment 0${amendmentNumber} progress update (${year}) for review.`;

      const notifToPlanning: Notification = {
        id: `notif-aip-sub-${randomUUID()}`,
        recipientOrgId: 'org-moe-planning',
        workshopId: 'aip-plan',
        title: titlePrefix,
        message: `${msgDesc}${submissionNotes ? ` Note: "${submissionNotes}"` : ''}`,
        isRead: false,
        createdAt: now,
      };
      dbData.notifications.push(notifToPlanning);
    });

    const successMsg = amendmentNumber === 0
      ? 'Original Implementation Plan successfully submitted to MOE Planning Branch for approval!'
      : `Amendment 0${amendmentNumber} successfully submitted to MOE Planning Branch!`;

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: successMsg,
    });
  } catch (error: any) {
    console.error('Error submitting plan:', error);
    return NextResponse.json(
      { error: 'Failed to submit plan', details: error.message },
      { status: 500 }
    );
  }
}
