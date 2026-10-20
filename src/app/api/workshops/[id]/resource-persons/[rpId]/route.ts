import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; rpId: string } }
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

    const now = new Date().toISOString();

    await updateDb((d) => {
      const rp = d.resourcePersons.find((r) => r.id === params.rpId && r.workshopId === params.id);
      if (rp) {
        if (serialNumber !== undefined) rp.serialNumber = Number(serialNumber);
        if (nic !== undefined) rp.nic = nic.trim();
        if (name) rp.name = name.trim();
        if (position !== undefined) {
          rp.position = position.trim();
          rp.designation = position.trim();
        } else if (designation !== undefined) {
          rp.position = designation.trim();
          rp.designation = designation.trim();
        }
        if (service !== undefined) rp.service = service.trim();
        if (grade !== undefined) rp.grade = grade.trim();
        if (workplace !== undefined) {
          rp.workplace = workplace.trim();
          rp.organization = workplace.trim();
        } else if (organization !== undefined) {
          rp.workplace = organization.trim();
          rp.organization = organization.trim();
        }
        if (personalAddress !== undefined) rp.personalAddress = personalAddress.trim();
        if (educationalQualifications !== undefined) rp.educationalQualifications = educationalQualifications.trim();
        if (subjectQualifications !== undefined) {
          rp.subjectQualifications = subjectQualifications.trim();
          rp.expertiseArea = subjectQualifications.trim();
        } else if (expertiseArea !== undefined) {
          rp.subjectQualifications = expertiseArea.trim();
          rp.expertiseArea = expertiseArea.trim();
        }
        if (roleInWorkshop !== undefined) rp.roleInWorkshop = roleInWorkshop.trim();
        if (email !== undefined) rp.email = email.trim();
        if (phone !== undefined) rp.phone = phone.trim();
        if (specialNotes !== undefined) {
          rp.specialNotes = specialNotes.trim();
          rp.remarks = specialNotes.trim();
        } else if (remarks !== undefined) {
          rp.specialNotes = remarks.trim();
          rp.remarks = remarks.trim();
        }
        rp.updatedAt = now;
      }
    });

    return NextResponse.json({ success: true, message: 'Resource person updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update resource person' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; rpId: string } }
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
    d.resourcePersons = d.resourcePersons.filter((r) => !(r.id === params.rpId && r.workshopId === params.id));
  });

  return NextResponse.json({ success: true, message: 'Resource person removed' });
}
