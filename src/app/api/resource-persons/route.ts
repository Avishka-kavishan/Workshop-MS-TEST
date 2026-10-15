import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { ResourcePerson } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workshopId = searchParams.get('workshopId');
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  const data = db.read();
  let list = data.resourcePersons || [];

  if (workshopId === 'unassigned') {
    list = list.filter((r) => !r.workshopId || r.workshopId === 'general');
  } else if (workshopId && workshopId !== 'all') {
    list = list.filter((r) => r.workshopId === workshopId);
  }

  if (search) {
    list = list.filter((r) =>
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.nic && r.nic.toLowerCase().includes(search)) ||
      (r.position && r.position.toLowerCase().includes(search)) ||
      (r.workplace && r.workplace.toLowerCase().includes(search)) ||
      (r.subjectQualifications && r.subjectQualifications.toLowerCase().includes(search)) ||
      (r.educationalQualifications && r.educationalQualifications.toLowerCase().includes(search))
    );
  }

  // Enrich with workshop info
  const workshopMap = new Map((data.workshops || []).map((w) => [w.id, w]));
  const enriched = list.map((rp) => {
    const ws = rp.workshopId ? workshopMap.get(rp.workshopId) : null;
    return {
      ...rp,
      workshopTitle: ws ? ws.title : null,
      workshopNumber: ws ? ws.workshopNumber : null,
    };
  });

  return NextResponse.json({ resourcePersons: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      workshopId,
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
      email,
      specialNotes,
      roleInWorkshop,
      organization,
      designation,
      expertiseArea,
      remarks,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Resource person name is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let newRP: ResourcePerson | null = null;

    db.update((d) => {
      if (!d.resourcePersons) d.resourcePersons = [];

      const resolvedWsId = (workshopId && workshopId.trim() !== '' && workshopId !== 'none' && workshopId !== 'unassigned')
        ? workshopId.trim()
        : '';

      // Determine serial number
      let computedSerial = 1;
      if (serialNumber) {
        computedSerial = Number(serialNumber);
      } else if (resolvedWsId) {
        const existingForWs = d.resourcePersons.filter((r) => r.workshopId === resolvedWsId);
        const maxSerial = existingForWs.reduce((max, r) => Math.max(max, r.serialNumber || 0), 0);
        computedSerial = maxSerial > 0 ? maxSerial + 1 : existingForWs.length + 1;
      } else {
        const maxSerial = d.resourcePersons.reduce((max, r) => Math.max(max, r.serialNumber || 0), 0);
        computedSerial = maxSerial > 0 ? maxSerial + 1 : d.resourcePersons.length + 1;
      }

      const resolvedWorkplace = (workplace || organization || '').trim();
      const resolvedPosition = (position || designation || '').trim();
      const resolvedSubjectQuals = (subjectQualifications || expertiseArea || '').trim();
      const resolvedNotes = (specialNotes || remarks || '').trim();

      newRP = {
        id: uuidv4(),
        workshopId: resolvedWsId,
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
        organization: resolvedWorkplace || 'Ministry of Education',
        designation: resolvedPosition || 'Resource Person',
        expertiseArea: resolvedSubjectQuals,
        roleInWorkshop: (roleInWorkshop || 'Lead Facilitator').trim(),
        email: (email || '').trim(),
        remarks: resolvedNotes,
        createdAt: now,
        updatedAt: now,
      };

      d.resourcePersons.push(newRP);

      if (resolvedWsId) {
        const w = d.workshops.find((item) => item.id === resolvedWsId);
        if (w) w.updatedAt = now;
      }
    });

    return NextResponse.json({ success: true, resourcePerson: newRP }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register resource person' }, { status: 500 });
  }
}
