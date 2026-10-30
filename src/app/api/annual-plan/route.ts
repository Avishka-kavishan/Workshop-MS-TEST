import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipPlan, AipActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2027';
    const reqBranchId = searchParams.get('branchId');
    const amendmentNumber = parseInt(searchParams.get('amendmentNumber') || '0', 10);

    const data = await getDb();
    const organizations = data.organizations || [];

    // Filter all MOE-level branches
    const moeBranches = organizations
      .filter((o) => o.typeId === 'ot-moe' && o.id !== 'org-moe')
      .map((o) => ({ id: o.id, name: o.name, code: o.code }));

    // Identify branch: Privileged accounts (Planning Branch / Admin) can switch between any branch
    const isPrivileged =
      user?.organizationId === 'org-moe-planning' ||
      user?.organizationId === 'org-moe-data' ||
      user?.roleId === 'role-admin' ||
      user?.roleId === 'admin';

    let branchId = (isPrivileged && reqBranchId) ? reqBranchId : (user?.organizationId || reqBranchId || 'org-moe-ict');

    const currentBranch = organizations.find((o) => o.id === branchId) || {
      id: branchId,
      name: user?.organizationName || 'Information Technology and Digital Education Branch',
      code: 'MOE-ICT',
    };

    // Find all amendments for this year
    const allAmendments = (data.aipAmendments || []).filter((a) => a.year === year);
    allAmendments.sort((a, b) => a.amendmentNumber - b.amendmentNumber);
    const currentAmendment = allAmendments.find((a) => a.amendmentNumber === amendmentNumber) || null;

    // Find AIP plan for this branch, year, and amendmentNumber
    const allPlans = data.aipPlans || [];
    let plan = allPlans.find(
      (p) =>
        p.branchId === branchId &&
        p.year === year &&
        Number(p.amendmentNumber || 0) === amendmentNumber
    );

    // If an amendment was called and branch hasn't opened it yet, auto-clone from previous version!
    if (!plan && amendmentNumber > 0) {
      // Find source plan (previous amendment or Original Plan 0)
      const sourcePlan = allPlans.find(
        (p) =>
          p.branchId === branchId &&
          p.year === year &&
          Number(p.amendmentNumber || 0) === amendmentNumber - 1
      ) || allPlans.find(
        (p) =>
          p.branchId === branchId &&
          p.year === year &&
          Number(p.amendmentNumber || 0) === 0
      );

      // Find source activities to clone
      const sourceActivities = (data.aipActivities || []).filter(
        (a) =>
          a.branchId === branchId &&
          a.year === year &&
          Number(a.amendmentNumber || 0) === (sourcePlan?.amendmentNumber || 0)
      );

      const newPlanId = `plan-${branchId}-${year}-amend-${amendmentNumber}`;
      plan = {
        id: newPlanId,
        branchId,
        branchName: currentBranch.name,
        year,
        amendmentNumber,
        amendmentId: currentAmendment?.id,
        phaseTitle: sourcePlan?.phaseTitle || '3. Implementation Phase',
        targetTitle: `Overall Physical and Financial Targets ${year} (Amendment ${amendmentNumber})`,
        mainResponsibility: sourcePlan?.mainResponsibility || '',
        mainContactNo: sourcePlan?.mainContactNo || '',
        overallResponsibility: sourcePlan?.overallResponsibility || '',
        overallContactNo: sourcePlan?.overallContactNo || '',
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Clone activities
      const clonedActivities: AipActivity[] = sourceActivities.map((sa) => ({
        ...sa,
        id: `act-${randomUUID()}`,
        planId: newPlanId,
        amendmentNumber,
        amendmentId: currentAmendment?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Save into DB
      await updateDb((dbData) => {
        if (!dbData.aipPlans) dbData.aipPlans = [];
        if (!dbData.aipActivities) dbData.aipActivities = [];
        dbData.aipPlans.push(plan!);
        clonedActivities.forEach((ca) => dbData.aipActivities.push(ca));
      });
    }

    // Default baseline plan for Original Plan (amendmentNumber === 0)
    if (!plan && amendmentNumber === 0) {
      plan = {
        id: `plan-${branchId}-${year}`,
        branchId,
        branchName: currentBranch.name,
        year,
        amendmentNumber: 0,
        phaseTitle: '3. Implementation Phase',
        targetTitle: `Overall Physical and Financial Targets ${year}`,
        mainResponsibility: branchId === 'org-moe-ict'
          ? 'Mrs. Udara T. Dikkumbura, Add.Sec.(Information Technology and Digital Education)'
          : '',
        mainContactNo: branchId === 'org-moe-ict' ? '714929279' : '',
        overallResponsibility: branchId === 'org-moe-ict'
          ? 'Mrs. S. Dakshina Kasthuriarachchi (Director of Education)'
          : '',
        overallContactNo: branchId === 'org-moe-ict' ? '714325568' : '',
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Filter activities for this branch, year, and amendmentNumber
    const freshData = await getDb();
    const allActivities = freshData.aipActivities || [];
    const activities = allActivities.filter(
      (a) =>
        a.branchId === branchId &&
        (a.year === year || !a.year) &&
        Number(a.amendmentNumber || 0) === amendmentNumber
    );

    // Calculations for totals
    const totalEstimatedCost = activities.reduce(
      (sum, a) => sum + (Number(a.estimatedCost) || 0),
      0
    );

    const monthlyFinancialTotals = Array(12).fill(0);
    activities.forEach((act) => {
      if (Array.isArray(act.financialMonths)) {
        act.financialMonths.forEach((val, idx) => {
          if (idx < 12) {
            monthlyFinancialTotals[idx] += Number(val) || 0;
          }
        });
      }
    });

    const q1Fin = monthlyFinancialTotals[0] + monthlyFinancialTotals[1] + monthlyFinancialTotals[2];
    const q2Fin = q1Fin + monthlyFinancialTotals[3] + monthlyFinancialTotals[4] + monthlyFinancialTotals[5];
    const q3Fin = q2Fin + monthlyFinancialTotals[6] + monthlyFinancialTotals[7] + monthlyFinancialTotals[8];
    const q4Fin = q3Fin + monthlyFinancialTotals[9] + monthlyFinancialTotals[10] + monthlyFinancialTotals[11];
    const quarterlyFinancialCumulative = [q1Fin, q2Fin, q3Fin, q4Fin];

    const monthlyPhysicalSums = Array(12).fill(0);
    const n = activities.length || 1;
    activities.forEach((act) => {
      if (Array.isArray(act.physicalMonths)) {
        act.physicalMonths.forEach((val, idx) => {
          if (idx < 12) {
            const raw = String(val || '').replace('%', '').trim();
            const num = parseFloat(raw);
            if (!isNaN(num)) {
              monthlyPhysicalSums[idx] += num;
            }
          }
        });
      }
    });

    const monthlyPhysicalTotals = monthlyPhysicalSums.map((sum) => Math.round((sum / n) * 10) / 10);
    const q1Phys = Math.round((monthlyPhysicalTotals[0] + monthlyPhysicalTotals[1] + monthlyPhysicalTotals[2]) * 10) / 10;
    const q2Phys = Math.round((q1Phys + monthlyPhysicalTotals[3] + monthlyPhysicalTotals[4] + monthlyPhysicalTotals[5]) * 10) / 10;
    const q3Phys = Math.round((q2Phys + monthlyPhysicalTotals[6] + monthlyPhysicalTotals[7] + monthlyPhysicalTotals[8]) * 10) / 10;
    const q4Phys = activities.length > 0 ? 100 : 0;
    const quarterlyPhysicalCumulative = [q1Phys, q2Phys, q3Phys, q4Phys];

    // Compute live submission stats for all amendments + original plan 0
    const originalPlanSubmissions = moeBranches.map((br) => {
      const brPlan = allPlans.find(
        (p) => p.branchId === br.id && p.year === year && Number(p.amendmentNumber || 0) === 0
      );
      const brActs = (freshData.aipActivities || []).filter(
        (a) => a.branchId === br.id && (a.year === year || !a.year) && Number(a.amendmentNumber || 0) === 0
      );
      const totalCost = brActs.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
      return {
        branchId: br.id,
        branchName: br.name,
        status: brPlan?.status || 'Draft',
        submittedAt: brPlan?.submittedAt || null,
        approvedAt: brPlan?.approvedAt || null,
        approvedBy: brPlan?.approvedBy || null,
        activityCount: brActs.length,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    });

    const amendmentsWithSubmissions = allAmendments.map((amend) => {
      const branchSubmissions = moeBranches.map((br) => {
        const brPlan = allPlans.find(
          (p) => p.branchId === br.id && p.year === year && Number(p.amendmentNumber || 0) === amend.amendmentNumber
        );
        const brActs = (freshData.aipActivities || []).filter(
          (a) => a.branchId === br.id && (a.year === year || !a.year) && Number(a.amendmentNumber || 0) === amend.amendmentNumber
        );
        const totalCost = brActs.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
        return {
          branchId: br.id,
          branchName: br.name,
          status: brPlan?.status || 'Draft',
          submittedAt: brPlan?.submittedAt || null,
          approvedAt: brPlan?.approvedAt || null,
          approvedBy: brPlan?.approvedBy || null,
          activityCount: brActs.length,
          totalCost: Math.round(totalCost * 100) / 100,
        };
      });
      const submittedCount = branchSubmissions.filter((b) => b.status === 'Submitted' || b.status === 'Approved').length;
      return {
        ...amend,
        totalBranches: moeBranches.length,
        submittedBranchesCount: submittedCount,
        branchSubmissions,
      };
    });

    return NextResponse.json({
      success: true,
      hasPlan: true,
      plan,
      branch: currentBranch,
      moeBranches,
      year,
      amendmentNumber,
      currentAmendment,
      amendments: amendmentsWithSubmissions,
      originalPlanSubmissions,
      activities,
      totals: {
        totalEstimatedCost: Math.round(totalEstimatedCost * 1000) / 1000,
        monthlyFinancialTotals: monthlyFinancialTotals.map((f) => Math.round(f * 1000) / 1000),
        quarterlyFinancialCumulative: quarterlyFinancialCumulative.map((f) => Math.round(f * 1000) / 1000),
        monthlyPhysicalTotals,
        quarterlyPhysicalCumulative,
      },
    });
  } catch (error: any) {
    console.error('Error fetching annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annual plan data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const body = await request.json();

    const branchId = body.branchId || user?.organizationId || 'org-moe-ict';
    const branchName = body.branchName || user?.organizationName || 'Information Technology and Digital Education Branch';
    const year = body.year ? String(body.year) : '2027';
    const amendmentNumber = parseInt(String(body.amendmentNumber || '0'), 10);

    let savedPlan: AipPlan | null = null;

    await updateDb((data) => {
      if (!data.aipPlans) data.aipPlans = [];

      const existingIdx = data.aipPlans.findIndex(
        (p) =>
          (body.id && p.id === body.id) ||
          (p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber)
      );

      if (existingIdx !== -1) {
        data.aipPlans[existingIdx] = {
          ...data.aipPlans[existingIdx],
          branchName: body.branchName || data.aipPlans[existingIdx].branchName || branchName,
          phaseTitle: body.phaseTitle !== undefined ? body.phaseTitle : data.aipPlans[existingIdx].phaseTitle,
          targetTitle: body.targetTitle !== undefined ? body.targetTitle : data.aipPlans[existingIdx].targetTitle,
          mainResponsibility: body.mainResponsibility !== undefined ? body.mainResponsibility : data.aipPlans[existingIdx].mainResponsibility,
          mainContactNo: body.mainContactNo !== undefined ? body.mainContactNo : data.aipPlans[existingIdx].mainContactNo,
          overallResponsibility: body.overallResponsibility !== undefined ? body.overallResponsibility : data.aipPlans[existingIdx].overallResponsibility,
          overallContactNo: body.overallContactNo !== undefined ? body.overallContactNo : data.aipPlans[existingIdx].overallContactNo,
          progressStartDate: body.progressStartDate !== undefined ? body.progressStartDate : data.aipPlans[existingIdx].progressStartDate,
          progressEndDate: body.progressEndDate !== undefined ? body.progressEndDate : data.aipPlans[existingIdx].progressEndDate,
          updatedAt: new Date().toISOString(),
        };
        savedPlan = data.aipPlans[existingIdx];
      } else {
        const newPlan: AipPlan = {
          id: body.id || `plan-${branchId}-${year}${amendmentNumber > 0 ? `-amend-${amendmentNumber}` : ''}`,
          branchId,
          branchName,
          year,
          amendmentNumber,
          phaseTitle: body.phaseTitle || '3. Implementation Phase',
          targetTitle: body.targetTitle || `Overall Physical and Financial Targets ${year}`,
          mainResponsibility: body.mainResponsibility || '',
          mainContactNo: body.mainContactNo || '',
          overallResponsibility: body.overallResponsibility || '',
          overallContactNo: body.overallContactNo || '',
          progressStartDate: body.progressStartDate || '2026.01.01',
          progressEndDate: body.progressEndDate || '2026.10.31',
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.aipPlans.push(newPlan);
        savedPlan = newPlan;
      }
    });

    return NextResponse.json({ success: true, plan: savedPlan });
  } catch (error: any) {
    console.error('Error saving annual plan header:', error);
    return NextResponse.json(
      { error: 'Failed to save annual plan header', details: error.message },
      { status: 500 }
    );
  }
}
