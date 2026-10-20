import { NextRequest, NextResponse } from 'next/server';
import db, { getDb } from '@/lib/db';

/**
 * GET /api/organizations/hierarchy
 * 
 * Returns organizations in a hierarchical structure for the step-by-step
 * host selection UI.
 * 
 * Query params:
 *   ?level=national|province|zone|school  — filter by hierarchy level
 *   ?parentId=org-xxx                     — get children of a specific org
 *   ?parentIds=org-1,org-2                — get branches grouped by parent ID
 *   ?includeBranches=true                 — embed branches into each org item
 */
export async function GET(req: NextRequest) {
  const data = await getDb();
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const parentId = searchParams.get('parentId');
  const parentIdsParam = searchParams.get('parentIds');
  const includeBranches = searchParams.get('includeBranches') === 'true';

  const allOrgs = data.organizations.filter((o) => o.isActive);
  const orgTypes = data.organizationTypes;

  // Helper: get type info
  const getTypeInfo = (typeId: string) => orgTypes.find((t) => t.id === typeId);

  // Helper: enrich organization with type info and children count
  const enrichOrg = (org: typeof allOrgs[0]) => {
    const type = getTypeInfo(org.typeId);
    const children = allOrgs.filter((c) => c.parentId === org.id);
    const locationChildren = children.filter((c) => c.unitType !== 'branch' && c.typeId !== 'ot-branch');
    const branchChildren = children.filter((c) => c.unitType === 'branch' || c.typeId === 'ot-branch');
    
    const enriched: any = {
      id: org.id,
      name: org.name,
      code: org.code,
      typeId: org.typeId,
      typeName: type?.name || '',
      level: type?.level || 0,
      parentId: org.parentId,
      unitType: org.unitType || (org.typeId === 'ot-branch' ? 'branch' : 'location'),
      childrenCount: locationChildren.length,
      branchCount: branchChildren.length,
      hasChildren: locationChildren.length > 0,
      hasBranches: branchChildren.length > 0,
    };

    if (includeBranches) {
      enriched.branches = branchChildren.map(enrichOrg);
    }

    return enriched;
  };

  // If parentIds (comma separated) is requested, return branches map
  if (parentIdsParam) {
    const ids = parentIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const branchesByParent: Record<string, any[]> = {};
    for (const pid of ids) {
      const branches = allOrgs
        .filter((o) => o.parentId === pid && (o.unitType === 'branch' || o.typeId === 'ot-branch'))
        .map(enrichOrg)
        .sort((a, b) => a.name.localeCompare(b.name));
      branchesByParent[pid] = branches;
    }
    return NextResponse.json({ branchesByParent });
  }

  // If parentId is specified, return children of that parent
  if (parentId) {
    const children = allOrgs.filter((o) => o.parentId === parentId);
    const locations = children
      .filter((o) => o.unitType !== 'branch' && o.typeId !== 'ot-branch')
      .map(enrichOrg)
      .sort((a, b) => a.name.localeCompare(b.name));
    const branches = children
      .filter((o) => o.unitType === 'branch' || o.typeId === 'ot-branch')
      .map(enrichOrg)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Also return the parent org info for breadcrumb display
    const parentOrg = allOrgs.find((o) => o.id === parentId);

    return NextResponse.json({
      parent: parentOrg ? enrichOrg(parentOrg) : null,
      locations,
      branches,
    });
  }

  // If level is specified, return all orgs at that level
  if (level) {
    let filtered: typeof allOrgs = [];

    switch (level) {
      case 'national':
        filtered = allOrgs.filter(
          (o) => (o.typeId === 'ot-moe' || o.typeId === 'ot-nie') && !o.parentId
        );
        break;
      case 'province':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-province');
        break;
      case 'zone':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-zone');
        break;
      case 'school':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-school');
        break;
    }

    return NextResponse.json({
      organizations: filtered.map(enrichOrg).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  // Default: return the full hierarchy summary
  const national = allOrgs
    .filter((o) => (o.typeId === 'ot-moe' || o.typeId === 'ot-nie') && !o.parentId)
    .map(enrichOrg);
  const provinces = allOrgs.filter((o) => o.typeId === 'ot-province').map(enrichOrg);
  const zones = allOrgs.filter((o) => o.typeId === 'ot-zone').map(enrichOrg);
  const schools = allOrgs.filter((o) => o.typeId === 'ot-school').map(enrichOrg);

  return NextResponse.json({
    levels: [
      { key: 'national', label: 'MOE / NIE', description: 'National Level', count: national.length, icon: '🏛️' },
      { key: 'province', label: 'Province', description: 'Provincial Level', count: provinces.length, icon: '🏢' },
      { key: 'zone', label: 'Zone', description: 'Zonal Level', count: zones.length, icon: '📍' },
      { key: 'school', label: 'School', description: 'School Level', count: schools.length, icon: '🏫' },
    ],
    summary: {
      national,
      provinces: provinces.sort((a, b) => a.name.localeCompare(b.name)),
      zones: zones.sort((a, b) => a.name.localeCompare(b.name)),
      schools: schools.sort((a, b) => a.name.localeCompare(b.name)),
    },
  });
}
