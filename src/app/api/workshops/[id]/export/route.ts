import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const workshop = data.workshops.find((w) => w.id === params.id);
  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  const trainees = data.trainees.filter((t) => t.workshopId === workshop.id);
  const resourcePersons = data.resourcePersons.filter((r) => r.workshopId === workshop.id);
  const organizingOrg = data.organizations.find((o) => o.id === workshop.organizingOrgId);
  const placeOrg = data.organizations.find((o) => o.id === (workshop.placeId || workshop.targetOrgId));
  const creator = data.users.find((u) => u.id === workshop.createdBy);

  const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

  // Build CSV content formatted for Microsoft Excel
  const lines: string[] = [];

  // Title Banner
  lines.push('MINISTRY OF EDUCATION - SRI LANKA');
  lines.push('WORKSHOP MANAGEMENT SYSTEM - OFFICIAL REPORT');
  lines.push('');

  // Workshop Summary
  lines.push('=== WORKSHOP DETAILS ===');
  lines.push(`Workshop ID,${clean(workshop.workshopNumber)}`);
  lines.push(`Year,${clean(workshop.year || new Date(workshop.startDate || Date.now()).getFullYear())}`);
  lines.push(`Organizing Branch,${clean(workshop.branch || organizingOrg?.name || 'N/A')}`);
  lines.push(`Subject,${clean(workshop.subject || workshop.categoryName || 'General')}`);
  lines.push(`Workshop Title,${clean(workshop.title)}`);
  lines.push(`Objectives of the Workshop,${clean(workshop.aim || workshop.objective || '')}`);
  if (workshop.expectedOutput) {
    lines.push(`Expected Outcomes,${clean(workshop.expectedOutput)}`);
  }
  lines.push(`Host Branch,${clean(workshop.placeName || placeOrg?.name || 'N/A')}`);
  lines.push(`Duration (Days Held),${clean(workshop.daysHeld ? `${workshop.daysHeld} Days` : 'N/A')}`);
  lines.push(`Start Date,${clean(workshop.startDate)}`);
  lines.push(`End Date,${clean(workshop.endDate)}`);
  lines.push(`Venue,${clean(workshop.venue || 'N/A')}`);
  lines.push(`Status,${clean(workshop.status || workshop.statusName || 'Scheduled')}`);
  lines.push(`Created By,${clean(workshop.creatorName || creator?.fullName || 'N/A')}`);
  lines.push(`Report Generated At,${clean(new Date().toLocaleString())}`);
  lines.push('');

  // Trainees Table
  lines.push('=== TRAINEES / PARTICIPANTS LIST ===');
  lines.push('Serial No.,NIC Number,Name,Position,School / Institute,Region,Province,Telephone Number,Attendance Status');
  if (trainees.length > 0) {
    trainees.forEach((t, idx) => {
      lines.push([
        t.serialNumber || (idx + 1),
        clean(t.nicNumber || '—'),
        clean(t.name),
        clean(t.position || t.designation || 'Teacher'),
        clean(t.schoolInstitute || t.organization || '—'),
        clean(t.region || '—'),
        clean(t.province || '—'),
        clean(t.phone || '—'),
        clean(t.attendanceStatus ? t.attendanceStatus.toUpperCase() : 'REGISTERED'),
      ].join(','));
    });
  } else {
    lines.push('No trainees registered yet.,,,,,,,');
  }
  lines.push('');

  // Resource Persons Table
  lines.push('=== RESOURCE PERSONS & FACILITATORS ===');
  lines.push('Serial No.,NIC Number,Name,Position,Service Relevant to Position,Grade Relevant to Position,Workplace,Personal Address,Educational & Professional Qualifications,Subject Specific Qualifications,Telephone Number,Special Notes');
  if (resourcePersons.length > 0) {
    resourcePersons.forEach((rp, idx) => {
      lines.push([
        rp.serialNumber || (idx + 1),
        clean(rp.nic || '—'),
        clean(rp.name),
        clean(rp.position || rp.designation || '—'),
        clean(rp.service || '—'),
        clean(rp.grade || '—'),
        clean(rp.workplace || rp.organization || '—'),
        clean(rp.personalAddress || '—'),
        clean(rp.educationalQualifications || '—'),
        clean(rp.subjectQualifications || rp.expertiseArea || '—'),
        clean(rp.phone || '—'),
        clean(rp.specialNotes || rp.remarks || ''),
      ].join(','));
    });
  } else {
    lines.push('No resource persons assigned yet.,,,,,,,,,,,');
  }

  // Prepend UTF-8 BOM so Excel opens Sinhala/Tamil/English characters with correct UTF-8 encoding
  const csvString = '\uFEFF' + lines.join('\r\n');
  const filename = `Workshop_${workshop.workshopNumber || 'Export'}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
