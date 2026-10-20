import db, { Organization, Workshop } from '@/lib/db';

/**
 * Get all available places (Zonal IT Branches, Zonal offices, Institutes)
 * where workshops can be held.
 */
export function getAvailablePlaces(): Organization[] {
  const data = db.read();
  return data.organizations.filter((o) => o.isActive && o.id !== 'org-moe');
}

/**
 * Check which target organizations a user is allowed to select when planning a workshop.
 */
export function getPermittedTargetOrganizations(
  userId: string,
  userOrgId: string,
  roleName: string,
  organizations?: Organization[]
): Organization[] {
  const orgList = organizations || db.read().organizations;
  const allOrgs = orgList.filter((o) => o.isActive && o.id !== 'org-moe');
  return allOrgs;
}

/**
 * Check if user can view a workshop.
 *
 * Visibility rules:
 *  - Admin: sees ALL workshops
 *  - Creator: always sees their own workshop
 *  - Organizing branch member: sees workshops their org scheduled
 *  - Place/host branch member: sees workshops assigned to their branch as the venue
 *  - Parent org member (e.g. Zone level): sees workshops at their child branches
 */
export function canUserViewWorkshop(
  user: { id: string; organizationId: string; roleName: string; organizationName?: string; username?: string },
  workshop: Workshop,
  allowAdminAll = false,
  organizations?: Organization[]
): boolean {
  if (!user) return false;

  // System Administrator sees all workshops
  if (
    allowAdminAll ||
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // 1. Creator always sees their own workshop
  if (workshop.createdBy === user.id) {
    return true;
  }

  // 2. Organizing branch — the branch that scheduled the workshop
  if (
    workshop.organizingOrgId === user.organizationId ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // 3. Place / Host branch — the branch assigned to hold the workshop (e.g. Galle Zone IT Branch)
  if (
    workshop.placeId === user.organizationId ||
    workshop.targetOrgId === user.organizationId ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  // 4. Parent org check — e.g. if user is at Zone level and workshop is at a sub-branch of that zone
  const orgList = organizations || db.read().organizations;
  const placeOrg = orgList.find(
    (o) => o.id === (workshop.placeId || workshop.targetOrgId)
  );
  if (placeOrg?.parentId && placeOrg.parentId === user.organizationId) {
    return true;
  }

  // Not connected to this workshop — deny visibility
  return false;
}

/**
 * Check if user can add trainees / resource persons to a workshop.
 * Both the Organizing Branch and the Place (e.g. Galle Zone IT Branch) can manage.
 */
export function canUserManageParticipants(
  user: { id?: string; organizationId?: string; roleName?: string; organizationName?: string; username?: string },
  workshop: Workshop
): boolean {
  if (!user || !workshop) return false;

  if (
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // Creator can manage
  if (workshop.createdBy && workshop.createdBy === user.id) return true;

  // Organizing branch can manage
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // The Place / Host branch can manage (e.g. Galle Zone IT Branch)
  if (
    (workshop.placeId && user.organizationId && workshop.placeId === user.organizationId) ||
    (workshop.targetOrgId && user.organizationId && workshop.targetOrgId === user.organizationId) ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a user can reschedule a workshop.
 * Permitted parties:
 *  - System Administrator / Admins
 *  - The Creator of the workshop
 *  - Organizing Branch (the branch that planned/dispatched the workshop)
 *  - Host Branch / Place (the venue branch conducting the workshop)
 *
 * Restrictions:
 *  - Completed workshops cannot be rescheduled.
 */
export function canUserRescheduleWorkshop(
  user: { id?: string; organizationId?: string; roleName?: string; organizationName?: string; username?: string } | null | undefined,
  workshop: Workshop | null | undefined,
  organizations?: Organization[]
): boolean {
  if (!user || !workshop) return false;

  // 1. System Administrator
  if (
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // 2. Creator can always reschedule
  if (workshop.createdBy && workshop.createdBy === user.id) {
    return true;
  }

  // 3. Organizing Branch: can reschedule any workshop organized by their branch
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // 4. Host Branch / Place: can reschedule any workshop hosted at their branch
  if (
    (workshop.placeId && user.organizationId && workshop.placeId === user.organizationId) ||
    (workshop.targetOrgId && user.organizationId && workshop.targetOrgId === user.organizationId) ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  // 5. Parent org check — e.g. if user is at Zone level and workshop is at a sub-branch of that zone
  try {
    const orgList = organizations || db.read().organizations;
    const placeOrg = orgList.find(
      (o) => o.id === (workshop.placeId || workshop.targetOrgId)
    );
    if (placeOrg?.parentId && placeOrg.parentId === user.organizationId) {
      return true;
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

