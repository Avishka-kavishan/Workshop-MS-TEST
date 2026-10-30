import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipAmendment, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2027';

    const data = await getDb();
    const isPlanningOrAdmin =
      user?.organizationId === 'org-moe-planning' ||
      user?.organizationId === 'org-moe-data' ||
      user?.roleId === 'role-admin' ||
      user?.roleId === 'admin';

    let allAmendments = (data.aipAmendments || []).filter((a) => a.year === year);

    // If regular branch user, show only amendments that apply to their branch (or all branches)
    if (!isPlanningOrAdmin && user?.organizationId) {
      allAmendments = allAmendments.filter((a) => !a.targetBranchIds || a.targetBranchIds.length === 0 || a.targetBranchIds.includes(user.organizationId));
    }
    allAmendments.sort((a, b) => a.amendmentNumber - b.amendmentNumber);

    // List of MOE branches
    const moeBranches = (data.organizations || [])
      .filter((o) => o.typeId === 'ot-moe' && o.id !== 'org-moe')
      .map((o) => ({ id: o.id, name: o.name, code: o.code }));

    // Compute branch submission status for each amendment
    const allPlans = data.aipPlans || [];
    const allActivities = data.aipActivities || [];

    const amendmentsWithStats = allAmendments.map((amend) => {
      const relevantBranches = amend.targetBranchIds && amend.targetBranchIds.length > 0
        ? moeBranches.filter((b) => amend.targetBranchIds!.includes(b.id))
        : moeBranches;

      const branchSubmissions = relevantBranches.map((branch) => {
        const plan = allPlans.find(
          (p) =>
            p.branchId === branch.id &&
            p.year === year &&
            Number(p.amendmentNumber) === Number(amend.amendmentNumber)
        );

        const activities = allActivities.filter(
          (a) =>
            a.branchId === branch.id &&
            a.year === year &&
            Number(a.amendmentNumber) === Number(amend.amendmentNumber)
        );

        const totalCost = activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);

        return {
          branchId: branch.id,
          branchName: branch.name,
          status: plan?.status || 'Not Started',
          submittedAt: plan?.submittedAt || null,
          activityCount: activities.length,
          totalCost: Math.round(totalCost * 1000) / 1000,
        };
      });

      const submittedCount = branchSubmissions.filter((b) => b.status === 'Submitted' || b.status === 'Approved').length;

      return {
        ...amend,
        totalBranches: relevantBranches.length,
        submittedBranchesCount: submittedCount,
        branchSubmissions,
      };
    });

    return NextResponse.json({
      success: true,
      amendments: amendmentsWithStats,
      moeBranches,
    });
  } catch (error: any) {
    console.error('Error in GET /api/annual-plan/amendments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch amendments', details: error.message },
      { status: 500 }
    );
  }
}

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
      user.roleId === 'role-admin';

    if (!isPlanningOrAdmin) {
      return NextResponse.json(
        { error: 'Only MOE Planning Branch or Administrators can initiate Amendment calls.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const year = body.year ? String(body.year) : '2027';
    const title = (body.title || '').trim();
    const circularRef = (body.circularRef || '').trim();
    const deadline = body.deadline || '';
    const notes = (body.notes || '').trim();
    // targetBranchIds: array of specific branch IDs, or empty/omitted to send to all branches
    const targetBranchIds: string[] = Array.isArray(body.targetBranchIds) && body.targetBranchIds.length > 0 
      ? body.targetBranchIds 
      : [];

    if (!title) {
      return NextResponse.json({ error: 'Amendment title is required' }, { status: 400 });
    }

    let createdAmendment: AipAmendment | null = null;
    const now = new Date().toISOString();

    await updateDb((data) => {
      if (!data.aipAmendments) data.aipAmendments = [];
      if (!data.notifications) data.notifications = [];

      const existingForYear = data.aipAmendments.filter((a) => a.year === year);
      const nextNum = existingForYear.length + 1;

      createdAmendment = {
        id: `amend-${year}-${nextNum}-${randomUUID().slice(0, 6)}`,
        year,
        amendmentNumber: nextNum,
        title,
        circularRef: circularRef || undefined,
        deadline: deadline || undefined,
        notes: notes || undefined,
        progressStartDate: body.progressStartDate ? String(body.progressStartDate).trim() : `${year}.01.01`,
        progressEndDate: body.progressEndDate ? String(body.progressEndDate).trim() : `${year}.10.31`,
        targetBranchIds: targetBranchIds.length > 0 ? targetBranchIds : undefined,
        createdBy: user.id,
        creatorName: user.name || 'MOE Planning Branch',
        status: 'Active',
        createdAt: now,
        updatedAt: now,
      };

      data.aipAmendments.push(createdAmendment);
    });

    return NextResponse.json({
      success: true,
      amendment: createdAmendment,
      message: `${title} created successfully! You can now pre-populate branch targets and send to responsible branches individually.`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/annual-plan/amendments:', error);
    return NextResponse.json(
      { error: 'Failed to create amendment', details: error.message },
      { status: 500 }
    );
  }
}

