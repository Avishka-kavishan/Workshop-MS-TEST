import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb, ResourcePerson } from '@/lib/db';
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

  const resourcePersons = data.resourcePersons.filter((r) => r.workshopId === params.id);
  return NextResponse.json({ resourcePersons });
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

  // Both organizing branch and place branch (e.g. Galle Zone IT Branch) can add resource persons!
  if (!canUserManageParticipants(user, workshop)) {
    return NextResponse.json({ error: 'You do not have permission to manage resource persons for this workshop.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      serialNumber,
      nic,
      name,
      position,
      service,
      grade,
      workplace,
      personalAddress,
      educationalQualifications,
      subjectQualifications,
      phone,
      specialNotes,
      organization,
      designation,
      expertiseArea,
      roleInWorkshop,
      email,
      remarks,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Resource person name is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let newRP: ResourcePerson | null = null;

    await updateDb((d) => {
      // Auto-generate serial number - globally unique across all resource persons so hash # never duplicates
      const maxSerial = (d.resourcePersons || []).reduce((max, r) => Math.max(max, r.serialNumber || 0), 0);
      const computedSerial = serialNumber && Number(serialNumber) > 0 && !(d.resourcePersons || []).some((r) => r.serialNumber === Number(serialNumber))
        ? Number(serialNumber)
        : maxSerial + 1;

      const resolvedWorkplace = (workplace || organization || '').trim();
      const resolvedPosition = (position || designation || '').trim();
      const resolvedSubjectQuals = (subjectQualifications || expertiseArea || '').trim();
      const resolvedNotes = (specialNotes || remarks || '').trim();

      newRP = {
        id: uuidv4(),
        workshopId: params.id,
        serialNumber: computedSerial,
        nic: (nic || '').trim(),
        name: name.trim(),
        position: resolvedPosition || 'Resource Person',
        service: (service || '').trim(),
        grade: (grade || '').trim(),
        workplace: resolvedWorkplace || 'Ministry of Education',
        personalAddress: (personalAddress || '').trim(),
        educationalQualifications: (educationalQualifications || '').trim(),
        subjectQualifications: resolvedSubjectQuals,
        phone: (phone || '').trim(),
        specialNotes: resolvedNotes,
        // Maintain backwards compatibility
        organization: resolvedWorkplace || 'Ministry of Education',
        designation: resolvedPosition || 'Resource Person',
        expertiseArea: resolvedSubjectQuals,
        roleInWorkshop: roleInWorkshop || 'Lead Facilitator',
        email: (email || '').trim(),
        remarks: resolvedNotes,
        createdAt: now,
        updatedAt: now,
      };

      d.resourcePersons.push(newRP);
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) w.updatedAt = now;
    });

    return NextResponse.json({ resourcePerson: newRP }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add resource person' }, { status: 500 });
  }
}
