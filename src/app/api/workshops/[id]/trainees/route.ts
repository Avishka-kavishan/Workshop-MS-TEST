import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb, Trainee } from '@/lib/db';
import { canUserViewWorkshop, canUserManageParticipants } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

  if (!canUserViewWorkshop(user, workshop)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const trainees = data.trainees.filter((t) => t.workshopId === params.id);
  return NextResponse.json({ trainees });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  // Both organizing branch and place branch (e.g. Galle Zone IT Branch) can add trainees!
  if (!canUserManageParticipants(user, workshop)) {
    return NextResponse.json({ error: 'You do not have permission to add trainees to this workshop.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      serialNumber,
      nicNumber,
      nic,
      name,
      position,
      designation,
      schoolInstitute,
      organization,
      region,
      province,
      phone,
      email,
      remarks,
      attendanceStatus,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Trainee name is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let newTrainee: Trainee | null = null;

    await updateDb((d) => {
      // Auto-generate serial number for this workshop
      const existingTrainees = d.trainees.filter((t) => t.workshopId === params.id);
      const maxSerial = existingTrainees.reduce((max, t) => Math.max(max, t.serialNumber || 0), 0);
      const computedSerial = serialNumber ? Number(serialNumber) : (maxSerial > 0 ? maxSerial + 1 : existingTrainees.length + 1);

      const resolvedPosition = (position || designation || 'Teacher').trim();
      const resolvedSchoolInstitute = (schoolInstitute || organization || workshop.placeName || 'School').trim();
      const resolvedNic = (nicNumber || nic || '').trim();

      newTrainee = {
        id: uuidv4(),
        workshopId: params.id,
        serialNumber: computedSerial,
        name: name.trim(),
        nicNumber: resolvedNic,
        position: resolvedPosition,
        designation: resolvedPosition,
        schoolInstitute: resolvedSchoolInstitute,
        organization: resolvedSchoolInstitute,
        region: (region || '').trim(),
        province: (province || '').trim(),
        phone: (phone || '').trim(),
        email: (email || '').trim(),
        remarks: (remarks || '').trim(),
        attendanceStatus: attendanceStatus || 'registered',
        createdAt: now,
        updatedAt: now,
      };

      d.trainees.push(newTrainee);
      // Update actual trainee count if attended
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) {
        w.actualTrainees = d.trainees.filter((t) => t.workshopId === params.id && t.attendanceStatus === 'attended').length;
        w.updatedAt = now;
      }
    });

    return NextResponse.json({ trainee: newTrainee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add trainee' }, { status: 500 });
  }
}
