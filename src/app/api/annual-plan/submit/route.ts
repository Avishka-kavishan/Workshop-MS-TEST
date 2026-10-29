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

    if (amendmentNumber === 0) {
      return NextResponse.json(
        { error: 'Original baseline plan is kept internally in your branch and cannot be submitted. Only Amendments can be submitted to Planning Branch.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    await updateDb((data) => {
      if (!data.aipPlans) data.aipPlans = [];
      if (!data.notifications) data.notifications = [];

      const planIdx = data.aipPlans.findIndex(
        (p) =>
          (planId && p.id === planId) ||
          (p.branchId === branchId && p.year === year && Number(p.amendmentNumber) === amendmentNumber)
      );

      if (planIdx !== -1) {
        data.aipPlans[planIdx] = {
          ...data.aipPlans[planIdx],
          status: 'Submitted',
          submittedAt: now,
          submissionNotes,
          updatedAt: now,
        };
        updatedPlan = data.aipPlans[planIdx];
      } else {
        // Create as submitted
        const newPlan = {
          id: planId || `plan-${branchId}-${year}-amend-${amendmentNumber}`,
          branchId,
          branchName: user.organizationName || 'MOE Branch',
          year,
          amendmentNumber,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}`,
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
        data.aipPlans.push(newPlan);
        updatedPlan = newPlan;
      }

      // Notify MOE Planning Branch
      const notifToPlanning: Notification = {
        id: `notif-aip-sub-${randomUUID()}`,
        recipientOrgId: 'org-moe-planning',
        workshopId: 'aip-amendment',
        title: `📤 Amendment ${amendmentNumber} Submitted: ${user.organizationName || 'MOE Branch'}`,
        message: `${user.organizationName || 'A branch'} has submitted their 2027 Amendment ${amendmentNumber} for review.${submissionNotes ? ` Note: "${submissionNotes}"` : ''}`,
        isRead: false,
        createdAt: now,
      };
      data.notifications.push(notifToPlanning);
    });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: `Amendment ${amendmentNumber} successfully submitted to MOE Planning Branch!`,
    });
  } catch (error: any) {
    console.error('Error submitting amendment:', error);
    return NextResponse.json(
      { error: 'Failed to submit amendment', details: error.message },
      { status: 500 }
    );
  }
}
