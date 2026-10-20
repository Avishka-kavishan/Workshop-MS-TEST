import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';
import { canUserManageParticipants } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const data = await getDb();
    const workshop = data.workshops.find((w) => w.id === params.id);

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
    }

    if (!canUserManageParticipants(user, workshop)) {
      return NextResponse.json({ error: 'Permission denied: Cannot manage workshop attendance.' }, { status: 403 });
    }

    const body = await req.json();
    const { date, attendance, records } = body;

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    // Support both record map and array
    const attendanceMap: Record<string, 'present' | 'absent' | 'late'> = {};
    if (attendance && typeof attendance === 'object') {
      Object.assign(attendanceMap, attendance);
    } else if (Array.isArray(records)) {
      records.forEach((r: any) => {
        if (r.traineeId && r.status) {
          attendanceMap[r.traineeId] = r.status;
        }
      });
    }

    const now = new Date().toISOString();
    let attendedCount = 0;

    await updateDb((d) => {
      const workshopTrainees = d.trainees.filter((t) => t.workshopId === params.id);

      workshopTrainees.forEach((trainee) => {
        if (!trainee.dailyAttendance) {
          trainee.dailyAttendance = {};
        }

        if (attendanceMap[trainee.id]) {
          trainee.dailyAttendance[date] = attendanceMap[trainee.id];
          trainee.updatedAt = now;
        }

        // Determine cumulative attendance status across all recorded days
        const statuses = Object.values(trainee.dailyAttendance);
        const hasAttendedAny = statuses.some((s) => s === 'present' || s === 'late');
        const allAbsent = statuses.length > 0 && statuses.every((s) => s === 'absent');

        if (hasAttendedAny) {
          trainee.attendanceStatus = 'attended';
        } else if (allAbsent) {
          trainee.attendanceStatus = 'absent';
        } else {
          trainee.attendanceStatus = 'registered';
        }
      });

      // Recalculate actual attended trainees for this workshop
      attendedCount = d.trainees.filter(
        (t) => t.workshopId === params.id && t.attendanceStatus === 'attended'
      ).length;

      const ws = d.workshops.find((w) => w.id === params.id);
      if (ws) {
        ws.actualTrainees = attendedCount;
        ws.updatedAt = now;
      }
    });

    return NextResponse.json({
      success: true,
      actualTrainees: attendedCount,
      message: `Attendance for ${date} saved successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save attendance' }, { status: 500 });
  }
}
