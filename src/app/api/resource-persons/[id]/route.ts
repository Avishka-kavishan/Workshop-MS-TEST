import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const rp = data.resourcePersons.find((r) => r.id === params.id);
  if (!rp) {
    return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
  }

  const workshop = rp.workshopId ? data.workshops.find((w) => w.id === rp.workshopId) : null;
  return NextResponse.json({
    resourcePerson: {
      ...rp,
      workshopTitle: workshop ? workshop.title : null,
      workshopNumber: workshop ? workshop.workshopNumber : null,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await getDb();
    const rp = data.resourcePersons.find((r) => r.id === params.id);
    if (!rp) {
      return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
    }

    const {
      workshopId,
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
      email,
      specialNotes,
      roleInWorkshop,
      organization,
      designation,
      expertiseArea,
      remarks,
    } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Resource person name cannot be empty.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updatedRP: any = null;

    await updateDb((d) => {
      const target = d.resourcePersons.find((r) => r.id === params.id);
      if (!target) return;

      if (workshopId !== undefined) {
        target.workshopId = (workshopId && workshopId !== 'none' && workshopId !== 'unassigned') ? workshopId.trim() : '';
      }
      if (nic !== undefined) target.nic = nic.trim();
      if (name !== undefined) target.name = name.trim();
      if (position !== undefined || designation !== undefined) {
        target.position = (position || designation || '').trim();
        target.designation = target.position;
      }
      if (service !== undefined) target.service = service.trim();
      if (grade !== undefined) target.grade = grade.trim();
      if (workplace !== undefined || organization !== undefined) {
        target.workplace = (workplace || organization || '').trim();
        target.organization = target.workplace;
      }
      if (personalAddress !== undefined) target.personalAddress = personalAddress.trim();
      if (educationalQualifications !== undefined) target.educationalQualifications = educationalQualifications.trim();
      if (subjectQualifications !== undefined || expertiseArea !== undefined) {
        target.subjectQualifications = (subjectQualifications || expertiseArea || '').trim();
        target.expertiseArea = target.subjectQualifications;
      }
      if (phone !== undefined) target.phone = phone.trim();
      if (email !== undefined) target.email = email.trim();
      if (specialNotes !== undefined || remarks !== undefined) {
        target.specialNotes = (specialNotes || remarks || '').trim();
        target.remarks = target.specialNotes;
      }
      if (roleInWorkshop !== undefined) target.roleInWorkshop = roleInWorkshop.trim();
      target.updatedAt = now;
      updatedRP = target;
    });

    return NextResponse.json({ success: true, resourcePerson: updatedRP });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update resource person' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const rp = data.resourcePersons.find((r) => r.id === params.id);
  if (!rp) {
    return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
  }

  await updateDb((d) => {
    d.resourcePersons = d.resourcePersons.filter((r) => r.id !== params.id);
  });

  return NextResponse.json({ success: true, message: 'Resource person deleted' });
}
