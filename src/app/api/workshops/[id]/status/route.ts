import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, action } = body;
    const targetStatus = status || (action === 'start_ongoing' ? 'In Progress' : action === 'complete' ? 'Completed' : 'Scheduled');

    const now = new Date().toISOString();

    await updateDb((d) => {
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) {
        w.status = targetStatus;
        w.statusName = targetStatus;
        w.updatedAt = now;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${targetStatus}`,
      status: targetStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update status' }, { status: 500 });
  }
}
