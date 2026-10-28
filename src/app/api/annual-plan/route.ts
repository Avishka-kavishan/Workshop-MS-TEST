import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb, AipActivity, AipHeaderTemplate } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2026';
    const reqBranchId = searchParams.get('branchId');

    const data = await getDb();

    // Determine target branch
    let branchId = reqBranchId;
    if (!branchId) {
      if (user?.organizationId) {
        branchId = user.organizationId;
      } else {
        branchId = 'org-moe-ict'; // Default demo branch
      }
    }

    const organizations = data.organizations || [];
    const currentBranch = organizations.find((o) => o.id === branchId) || {
      id: branchId,
      name: 'MOE ICT Branch',
    };

    // Find template for this branch, or default template, or fallback
    const allTemplates = data.aipHeaderTemplates || [];
    let template = allTemplates.find((t) => t.branchId === branchId);
    if (!template) {
      template = allTemplates.find((t) => t.isDefault) || allTemplates[0] || {
        id: 'default-aip-template',
        branchId: currentBranch.id,
        name: `${currentBranch.name} Template`,
        phaseTitle: '2. Implementation Phase',
        targetTitle: 'Overall Physical and Financial Targets',
        mainResponsibility: `${currentBranch.name}`,
        mainContactNo: '0112785000',
        overallResponsibility: 'Director of Education',
        overallContactNo: '0112785111',
        footnote: `* Implementation targets governed under ${currentBranch.name} operational mandate.`,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Filter activities for this branch and year
    const allActivities = data.aipActivities || [];
    const activities = allActivities.filter(
      (a) => (a.branchId === branchId || !branchId) && (a.year === year || !a.year)
    );

    // Sort activities numerically by activityCode (1, 2, 3 ... 13)
    activities.sort((a, b) => {
      const codeA = parseFloat(a.activityCode) || 0;
      const codeB = parseFloat(b.activityCode) || 0;
      return codeA - codeB;
    });

    // Summary calculations
    const totalCost = activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
    const statusCounts = {
      planned: activities.filter((a) => a.status === 'Planned').length,
      inProgress: activities.filter((a) => a.status === 'In Progress').length,
      completed: activities.filter((a) => a.status === 'Completed').length,
      deferred: activities.filter((a) => a.status === 'Deferred').length,
    };

    return NextResponse.json({
      success: true,
      branch: currentBranch,
      year,
      template,
      activities,
      summary: {
        totalActivities: activities.length,
        totalCost,
        statusCounts,
      },
      organizations: organizations.map((o) => ({ id: o.id, name: o.name, code: o.code })),
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

    if (!body.activity) {
      return NextResponse.json(
        { error: 'Main Activity description is required.' },
        { status: 400 }
      );
    }

    const branchId = body.branchId || user?.organizationId || 'org-moe-ict';
    const year = body.year ? String(body.year) : '2026';

    const newActivity: AipActivity = {
      id: `act-${randomUUID()}`,
      branchId,
      branchName: body.branchName || user?.organizationName || 'Information Technology and Digital Education Branch',
      year,
      outputNo: body.outputNo || '1',
      activityCode: body.activityCode || '1',
      strategy: body.strategy || '',
      activity: body.activity,
      kpi: body.kpi || '',
      voteNumber: body.voteNumber || '',
      estimatedCost: Number(body.estimatedCost) || 0,
      costNote: body.costNote || '',
      financialMonths: Array.isArray(body.financialMonths) ? body.financialMonths : Array(12).fill(0),
      physicalMonths: Array.isArray(body.physicalMonths) ? body.physicalMonths : Array(12).fill('-'),
      targetQ1: body.targetQ1 || '-',
      targetQ2: body.targetQ2 || '-',
      targetQ3: body.targetQ3 || '-',
      targetQ4: body.targetQ4 || '-',
      totalTarget: body.totalTarget || '',
      fundingSource: body.fundingSource || '',
      responsibleOfficer: body.responsibleOfficer || '',
      status: body.status || 'Planned',
      createdBy: user?.id || 'unknown',
      creatorName: user?.name || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      data.aipActivities.push(newActivity);
    });

    return NextResponse.json({ success: true, activity: newActivity }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding AIP activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    let updatedActivity: AipActivity | null = null;

    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      const idx = data.aipActivities.findIndex((a) => a.id === body.id);
      if (idx !== -1) {
        data.aipActivities[idx] = {
          ...data.aipActivities[idx],
          outputNo: body.outputNo !== undefined ? body.outputNo : data.aipActivities[idx].outputNo,
          activityCode: body.activityCode !== undefined ? body.activityCode : data.aipActivities[idx].activityCode,
          strategy: body.strategy !== undefined ? body.strategy : data.aipActivities[idx].strategy,
          activity: body.activity !== undefined ? body.activity : data.aipActivities[idx].activity,
          kpi: body.kpi !== undefined ? body.kpi : data.aipActivities[idx].kpi,
          voteNumber: body.voteNumber !== undefined ? body.voteNumber : data.aipActivities[idx].voteNumber,
          estimatedCost: body.estimatedCost !== undefined ? Number(body.estimatedCost) : data.aipActivities[idx].estimatedCost,
          costNote: body.costNote !== undefined ? body.costNote : data.aipActivities[idx].costNote,
          financialMonths: body.financialMonths !== undefined ? body.financialMonths : data.aipActivities[idx].financialMonths,
          physicalMonths: body.physicalMonths !== undefined ? body.physicalMonths : data.aipActivities[idx].physicalMonths,
          targetQ1: body.targetQ1 !== undefined ? body.targetQ1 : data.aipActivities[idx].targetQ1,
          targetQ2: body.targetQ2 !== undefined ? body.targetQ2 : data.aipActivities[idx].targetQ2,
          targetQ3: body.targetQ3 !== undefined ? body.targetQ3 : data.aipActivities[idx].targetQ3,
          targetQ4: body.targetQ4 !== undefined ? body.targetQ4 : data.aipActivities[idx].targetQ4,
          totalTarget: body.totalTarget !== undefined ? body.totalTarget : data.aipActivities[idx].totalTarget,
          fundingSource: body.fundingSource !== undefined ? body.fundingSource : data.aipActivities[idx].fundingSource,
          responsibleOfficer: body.responsibleOfficer !== undefined ? body.responsibleOfficer : data.aipActivities[idx].responsibleOfficer,
          status: body.status !== undefined ? body.status : data.aipActivities[idx].status,
          updatedAt: new Date().toISOString(),
        };
        updatedActivity = data.aipActivities[idx];
      }
    });

    if (!updatedActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, activity: updatedActivity });
  } catch (error: any) {
    console.error('Error updating AIP activity:', error);
    return NextResponse.json(
      { error: 'Failed to update activity', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    let found = false;
    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      const initLen = data.aipActivities.length;
      data.aipActivities = data.aipActivities.filter((a) => a.id !== id);
      found = data.aipActivities.length < initLen;
    });

    if (!found) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting AIP activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: error.message },
      { status: 500 }
    );
  }
}
