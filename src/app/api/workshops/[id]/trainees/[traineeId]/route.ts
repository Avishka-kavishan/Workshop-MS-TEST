import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; traineeId: string } }
) {
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

  try {
    const body = await req.json();
    const {
      serialNumber,
      name,
      nicNumber,
      nic,
      position,
      designation,
      schoolInstitute,
      organization,
      region,
      province,
      email,
      phone,
      attendanceStatus,
      remarks,
    } = body;

    const now = new Date().toISOString();

    await updateDb((d) => {
      const trainee = d.trainees.find((t) => t.id === params.traineeId && t.workshopId === params.id);
      if (trainee) {
        if (serialNumber !== undefined) trainee.serialNumber = Number(serialNumber);
        if (name) trainee.name = name.trim();
        if (nicNumber !== undefined) {
          trainee.nicNumber = nicNumber.trim();
        } else if (nic !== undefined) {
          trainee.nicNumber = nic.trim();
        }
        if (position !== undefined) {
          trainee.position = position.trim();
          trainee.designation = position.trim();
        } else if (designation !== undefined) {
          trainee.position = designation.trim();
          trainee.designation = designation.trim();
        }
        if (schoolInstitute !== undefined) {
          trainee.schoolInstitute = schoolInstitute.trim();
          trainee.organization = schoolInstitute.trim();
        } else if (organization !== undefined) {
          trainee.schoolInstitute = organization.trim();
          trainee.organization = organization.trim();
        }
        if (region !== undefined) trainee.region = region.trim();
        if (province !== undefined) trainee.province = province.trim();
        if (email !== undefined) trainee.email = email.trim();
        if (phone !== undefined) trainee.phone = phone.trim();
        if (attendanceStatus) trainee.attendanceStatus = attendanceStatus;
        if (remarks !== undefined) trainee.remarks = remarks.trim();
        trainee.updatedAt = now;
      }

      // Update actual trainees count
      const attendedCount = d.trainees.filter(
        (t) => t.workshopId === params.id && t.attendanceStatus === 'attended'
      ).length;
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) {
        w.actualTrainees = attendedCount;
        w.updatedAt = now;
      }
    });

    return NextResponse.json({ success: true, message: 'Trainee updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update trainee' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; traineeId: string } }
) {
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

  await updateDb((d) => {
    d.trainees = d.trainees.filter((t) => !(t.id === params.traineeId && t.workshopId === params.id));
    const attendedCount = d.trainees.filter(
      (t) => t.workshopId === params.id && t.attendanceStatus === 'attended'
    ).length;
    const w = d.workshops.find((item) => item.id === params.id);
    if (w) {
      w.actualTrainees = attendedCount;
    }
  });

  return NextResponse.json({ success: true, message: 'Trainee removed' });
}
