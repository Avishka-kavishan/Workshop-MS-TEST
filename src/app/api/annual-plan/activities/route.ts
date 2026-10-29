import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const body = await request.json();

    if (!body.activity || !body.activity.trim()) {
      return NextResponse.json({ error: 'Main Activities description is required' }, { status: 400 });
    }

    const branchId = body.branchId || user?.organizationId || 'org-moe-ict';
    const branchName = body.branchName || user?.organizationName || 'Information Technology and Digital Education Branch';
    const year = body.year ? String(body.year) : '2027';

    // Parse financial and physical months
    const financialMonths = Array.isArray(body.financialMonths)
      ? body.financialMonths.map((v: any) => Number(v) || 0)
      : Array(12).fill(0);

    const physicalMonths = Array.isArray(body.physicalMonths)
      ? body.physicalMonths.map((v: any) => (v ? String(v).trim() : '-'))
      : Array(12).fill('-');

    // Auto-calculate financial quarters if not explicitly provided
    const q1Fin = body.financialQ1 !== undefined
      ? Number(body.financialQ1)
      : financialMonths[0] + financialMonths[1] + financialMonths[2];
    const q2Fin = body.financialQ2 !== undefined
      ? Number(body.financialQ2)
      : q1Fin + financialMonths[3] + financialMonths[4] + financialMonths[5];
    const q3Fin = body.financialQ3 !== undefined
      ? Number(body.financialQ3)
      : q2Fin + financialMonths[6] + financialMonths[7] + financialMonths[8];
    const q4Fin = body.financialQ4 !== undefined
      ? Number(body.financialQ4)
      : q3Fin + financialMonths[9] + financialMonths[10] + financialMonths[11];

    const newActivity: AipActivity = {
      id: body.id || `act-${randomUUID()}`,
      planId: body.planId || undefined,
      branchId,
      branchName,
      year,
      amendmentNumber: parseInt(String(body.amendmentNumber || '0'), 10),
      amendmentId: body.amendmentId || undefined,
      outputNo: body.outputNo ? String(body.outputNo).trim() : '1',
      activityCode: body.activityCode ? String(body.activityCode).trim() : '1',
      activity: body.activity.trim(),
      voteNumber: body.voteNumber ? String(body.voteNumber).trim() : '-',
      estimatedCost: Number(body.estimatedCost) || 0,
      financialMonths,
      physicalMonths,
      financialQ1: Math.round(q1Fin * 1000) / 1000,
      financialQ2: Math.round(q2Fin * 1000) / 1000,
      financialQ3: Math.round(q3Fin * 1000) / 1000,
      financialQ4: Math.round(q4Fin * 1000) / 1000,
      targetQ1: body.targetQ1 ? String(body.targetQ1).trim() : '-',
      targetQ2: body.targetQ2 ? String(body.targetQ2).trim() : '-',
      targetQ3: body.targetQ3 ? String(body.targetQ3).trim() : '-',
      targetQ4: body.targetQ4 ? String(body.targetQ4).trim() : '100%',
      responsibleOfficer: body.responsibleOfficer ? String(body.responsibleOfficer).trim() : '',
      remarks: body.remarks ? String(body.remarks).trim() : '',
      physicalProgress: body.physicalProgress ? String(body.physicalProgress).trim() : '',
      physicalProgressPct: body.physicalProgressPct ? String(body.physicalProgressPct).trim() : '',
      financialProgress: body.financialProgress !== undefined && body.financialProgress !== '' ? Number(body.financialProgress) : undefined,
      financialProgressPct: body.financialProgressPct ? String(body.financialProgressPct).trim() : '',
      createdBy: user?.id || 'user',
      creatorName: user?.name || branchName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      data.aipActivities.push(newActivity);
    });

    return NextResponse.json({ success: true, activity: newActivity }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating activity:', error);
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

    // Batch update support for progress entries
    if (Array.isArray(body.activities)) {
      await updateDb((data) => {
        if (!data.aipActivities) data.aipActivities = [];
        body.activities.forEach((item: any) => {
          const idx = data.aipActivities.findIndex((a) => a.id === item.id);
          if (idx !== -1) {
            data.aipActivities[idx] = {
              ...data.aipActivities[idx],
              physicalProgress: item.physicalProgress !== undefined ? String(item.physicalProgress).trim() : data.aipActivities[idx].physicalProgress,
              physicalProgressPct: item.physicalProgressPct !== undefined ? String(item.physicalProgressPct).trim() : data.aipActivities[idx].physicalProgressPct,
              financialProgress: item.financialProgress !== undefined ? (item.financialProgress === '' ? undefined : Number(item.financialProgress)) : data.aipActivities[idx].financialProgress,
              financialProgressPct: item.financialProgressPct !== undefined ? String(item.financialProgressPct).trim() : data.aipActivities[idx].financialProgressPct,
              updatedAt: new Date().toISOString(),
            };
          }
        });
      });
      return NextResponse.json({ success: true, count: body.activities.length });
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    let updatedActivity: AipActivity | null = null;

    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      const idx = data.aipActivities.findIndex((a) => a.id === body.id);
      if (idx !== -1) {
        const current = data.aipActivities[idx];

        const financialMonths = body.financialMonths !== undefined
          ? (Array.isArray(body.financialMonths) ? body.financialMonths.map((v: any) => Number(v) || 0) : current.financialMonths)
          : current.financialMonths;

        const physicalMonths = body.physicalMonths !== undefined
          ? (Array.isArray(body.physicalMonths) ? body.physicalMonths.map((v: any) => (v ? String(v).trim() : '-')) : current.physicalMonths)
          : current.physicalMonths;

        data.aipActivities[idx] = {
          ...current,
          outputNo: body.outputNo !== undefined ? String(body.outputNo).trim() : current.outputNo,
          activityCode: body.activityCode !== undefined ? String(body.activityCode).trim() : current.activityCode,
          activity: body.activity !== undefined ? body.activity.trim() : current.activity,
          voteNumber: body.voteNumber !== undefined ? String(body.voteNumber).trim() : current.voteNumber,
          amendmentNumber: body.amendmentNumber !== undefined ? parseInt(String(body.amendmentNumber), 10) : (current.amendmentNumber || 0),
          amendmentId: body.amendmentId !== undefined ? body.amendmentId : current.amendmentId,
          estimatedCost: body.estimatedCost !== undefined ? Number(body.estimatedCost) : current.estimatedCost,
          financialMonths,
          physicalMonths,
          financialQ1: body.financialQ1 !== undefined ? Number(body.financialQ1) : current.financialQ1,
          financialQ2: body.financialQ2 !== undefined ? Number(body.financialQ2) : current.financialQ2,
          financialQ3: body.financialQ3 !== undefined ? Number(body.financialQ3) : current.financialQ3,
          financialQ4: body.financialQ4 !== undefined ? Number(body.financialQ4) : current.financialQ4,
          targetQ1: body.targetQ1 !== undefined ? String(body.targetQ1).trim() : current.targetQ1,
          targetQ2: body.targetQ2 !== undefined ? String(body.targetQ2).trim() : current.targetQ2,
          targetQ3: body.targetQ3 !== undefined ? String(body.targetQ3).trim() : current.targetQ3,
          targetQ4: body.targetQ4 !== undefined ? String(body.targetQ4).trim() : current.targetQ4,
          responsibleOfficer: body.responsibleOfficer !== undefined ? String(body.responsibleOfficer).trim() : current.responsibleOfficer,
          remarks: body.remarks !== undefined ? String(body.remarks).trim() : (current.remarks || ''),
          physicalProgress: body.physicalProgress !== undefined ? String(body.physicalProgress).trim() : current.physicalProgress,
          physicalProgressPct: body.physicalProgressPct !== undefined ? String(body.physicalProgressPct).trim() : current.physicalProgressPct,
          financialProgress: body.financialProgress !== undefined ? (body.financialProgress === '' ? undefined : Number(body.financialProgress)) : current.financialProgress,
          financialProgressPct: body.financialProgressPct !== undefined ? String(body.financialProgressPct).trim() : current.financialProgressPct,
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
    console.error('Error updating activity:', error);
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

    let removed = false;
    await updateDb((data) => {
      if (!data.aipActivities) data.aipActivities = [];
      const initLen = data.aipActivities.length;
      data.aipActivities = data.aipActivities.filter((a) => a.id !== id);
      removed = data.aipActivities.length < initLen;
    });

    if (!removed) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Failed to delete activity', details: error.message },
      { status: 500 }
    );
  }
}

