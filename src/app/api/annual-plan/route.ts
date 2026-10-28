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

    // Automatically identify branch from logged in user
    let branchId = user?.organizationId;
    if (!branchId) {
      // Default to MOE ICT / ITDE for demo if not logged in
      branchId = 'org-moe-ict';
    }

    const data = await getDb();
    const organizations = data.organizations || [];
    const currentBranch = organizations.find((o) => o.id === branchId) || {
      id: branchId,
      name: user?.organizationName || 'Information Technology and Digital Education Branch',
    };

    // Find AIP plan for this branch and year
    const allPlans = data.aipPlans || [];
    let plan = allPlans.find((p) => p.branchId === branchId && p.year === year);

    // If branch is org-moe-ict and no plan exists yet, check default 2027
    if (!plan && branchId === 'org-moe-ict') {
      plan = allPlans.find((p) => p.year === year);
    }

    // Filter activities for this branch and year
    const allActivities = data.aipActivities || [];
    const activities = allActivities.filter(
      (a) => (a.branchId === branchId || !branchId) && (a.year === year || !a.year)
    );

    // Sort numerically by activityCode (1, 2, 3 ... 17)
    activities.sort((a, b) => {
      const codeA = parseFloat(a.activityCode) || 0;
      const codeB = parseFloat(b.activityCode) || 0;
      return codeA - codeB;
    });

    // ── Calculations ──────────────────────────────────────────
    // 1. Total Estimated Cost
    const totalEstimatedCost = activities.reduce(
      (sum, a) => sum + (Number(a.estimatedCost) || 0),
      0
    );

    // 2. Monthly Financial Totals (January to December)
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

    // 3. Quarterly Cumulative Financial Targets
    // Q1 = J + F + M
    // Q2 = Q1 + A + M + J
    // Q3 = Q2 + J + A + S
    // Q4 = Q3 + O + N + D
    const q1Fin = monthlyFinancialTotals[0] + monthlyFinancialTotals[1] + monthlyFinancialTotals[2];
    const q2Fin = q1Fin + monthlyFinancialTotals[3] + monthlyFinancialTotals[4] + monthlyFinancialTotals[5];
    const q3Fin = q2Fin + monthlyFinancialTotals[6] + monthlyFinancialTotals[7] + monthlyFinancialTotals[8];
    const q4Fin = q3Fin + monthlyFinancialTotals[9] + monthlyFinancialTotals[10] + monthlyFinancialTotals[11];
    const quarterlyFinancialCumulative = [q1Fin, q2Fin, q3Fin, q4Fin];

    // 4. Monthly Physical Progress Totals (January to December)
    // Calculate average percentage contribution of each month across activities
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

    // 5. Quarterly Cumulative Physical Targets
    // Q1 = sum(Jan..Mar), Q2 = sum(Jan..Jun), Q3 = sum(Jan..Sep), Q4 = 100%
    const q1Phys = Math.round((monthlyPhysicalTotals[0] + monthlyPhysicalTotals[1] + monthlyPhysicalTotals[2]) * 10) / 10;
    const q2Phys = Math.round((q1Phys + monthlyPhysicalTotals[3] + monthlyPhysicalTotals[4] + monthlyPhysicalTotals[5]) * 10) / 10;
    const q3Phys = Math.round((q2Phys + monthlyPhysicalTotals[6] + monthlyPhysicalTotals[7] + monthlyPhysicalTotals[8]) * 10) / 10;
    const q4Phys = activities.length > 0 ? 100 : 0;
    const quarterlyPhysicalCumulative = [q1Phys, q2Phys, q3Phys, q4Phys];

    return NextResponse.json({
      success: true,
      hasPlan: Boolean(plan),
      plan: plan || null,
      branch: currentBranch,
      year,
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

    let savedPlan: AipPlan | null = null;

    await updateDb((data) => {
      if (!data.aipPlans) data.aipPlans = [];

      const existingIdx = data.aipPlans.findIndex(
        (p) => (body.id && p.id === body.id) || (p.branchId === branchId && p.year === year)
      );

      if (existingIdx !== -1) {
        // Update existing plan
        data.aipPlans[existingIdx] = {
          ...data.aipPlans[existingIdx],
          phaseTitle: body.phaseTitle !== undefined ? body.phaseTitle : data.aipPlans[existingIdx].phaseTitle,
          targetTitle: body.targetTitle !== undefined ? body.targetTitle : data.aipPlans[existingIdx].targetTitle,
          mainResponsibility: body.mainResponsibility !== undefined ? body.mainResponsibility : data.aipPlans[existingIdx].mainResponsibility,
          mainContactNo: body.mainContactNo !== undefined ? body.mainContactNo : data.aipPlans[existingIdx].mainContactNo,
          overallResponsibility: body.overallResponsibility !== undefined ? body.overallResponsibility : data.aipPlans[existingIdx].overallResponsibility,
          overallContactNo: body.overallContactNo !== undefined ? body.overallContactNo : data.aipPlans[existingIdx].overallContactNo,
          status: body.status || data.aipPlans[existingIdx].status || 'Draft',
          updatedAt: new Date().toISOString(),
        };
        savedPlan = data.aipPlans[existingIdx];
      } else {
        // Create new AIP Plan
        const newPlan: AipPlan = {
          id: body.id || `plan-${randomUUID()}`,
          branchId,
          branchName,
          year,
          phaseTitle: body.phaseTitle || '3. Implementation Phase',
          targetTitle: body.targetTitle || `Overall Physical and Financial Targets ${year}`,
          mainResponsibility: body.mainResponsibility || 'Mrs. Udara T. Dikkumbura, Add.Sec.(Information Technology and Digital Education)',
          mainContactNo: body.mainContactNo || '714929279',
          overallResponsibility: body.overallResponsibility || 'Mrs. S. Dakshina Kasthuriarachchi (Director of Education)',
          overallContactNo: body.overallContactNo || '714325568',
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
    console.error('Error saving AIP plan:', error);
    return NextResponse.json(
      { error: 'Failed to save plan', details: error.message },
      { status: 500 }
    );
  }
}

