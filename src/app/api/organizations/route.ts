import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb } from '@/lib/db';
import { getPermittedTargetOrganizations } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const data = await getDb();

  const permittedTargetOrgs = user
    ? getPermittedTargetOrganizations(user.id, user.organizationId, user.roleName)
    : data.organizations.filter((o) => o.isActive && o.id !== 'org-moe');

  // Map organizations with type details
  const populatedOrgs = data.organizations.map((org) => {
    const type = data.organizationTypes.find((t) => t.id === org.typeId);
    const parent = data.organizations.find((p) => p.id === org.parentId);
    const workshopCount = data.workshops.filter((w) => (w.placeId === org.id || w.targetOrgId === org.id || w.organizingOrgId === org.id)).length;
    return {
      ...org,
      typeName: type?.name || '',
      level: type?.level || 4,
      parentName: parent?.name || null,
      workshopCount,
    };
  });

  // Places: All organizations where a workshop can be held (branches, zones, institutions)
  const places = populatedOrgs.filter((o) => o.id !== 'org-moe');

  // MOE Organizing Branches
  const organizingBranches = populatedOrgs.filter((o) => o.id.startsWith('org-moe-') || o.id === 'org-nie');

  // Educational subjects
  const subjects = [
    'Information & Communication Technology',
    'Mathematics',
    'Science & Technology',
    'English Language',
    'Sinhala Language & Literature',
    'Tamil Language & Literature',
    'STEM Education',
    'Commerce & Accounting',
    'Educational Leadership & Administration',
    'Special Needs Education',
    'Health & Physical Education',
    'Aesthetic Studies (Art / Music / Dance)',
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(String);

  return NextResponse.json({
    organizations: populatedOrgs,
    permittedTargetOrgs,
    places,
    organizingBranches,
    subjects,
    years,
    categories: data.workshopCategories,
    statuses: data.workshopStatuses,
    existingWorkshopNumbers: (data.workshops || []).map((w) => w.workshopNumber).filter(Boolean),
    nextWorkshopNumber: (data.meta?.lastWorkshopNumber || data.workshops.length || 0) + 1,
  });
}
