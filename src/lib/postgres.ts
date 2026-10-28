import { query } from './pg';
import type {
  DbSchema,
  OrganizationType,
  Organization,
  UserRole,
  User,
  UserOrgPermission,
  WorkshopCategory,
  WorkshopStatus,
  Workshop,
  WorkshopReschedule,
  Trainee,
  ResourcePerson,
  Notification,
  WorkshopApproval,
  Attachment,
  AipHeaderTemplate,
  AipActivity,
} from './db';

// ── Row Mappers (PostgreSQL snake_case <-> TypeScript camelCase) ─────

export function rowToOrgType(r: any): OrganizationType {
  return {
    id: r.id,
    name: r.name,
    level: Number(r.level),
    description: r.description || '',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToOrg(r: any): Organization {
  return {
    id: r.id,
    name: r.name,
    code: r.code || '',
    typeId: r.type_id,
    parentId: r.parent_id || null,
    unitType: r.unit_type || 'location',
    address: r.address || undefined,
    phone: r.phone || undefined,
    email: r.email || undefined,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToUserRole(r: any): UserRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    canCreateWorkshop: Boolean(r.can_create_workshop),
    canApproveWorkshop: Boolean(r.can_approve_workshop),
    canManageUsers: Boolean(r.can_manage_users),
    canViewReports: Boolean(r.can_view_reports),
    canManageOrganizations: Boolean(r.can_manage_organizations),
  };
}

export function rowToUser(r: any): User {
  return {
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    fullName: r.full_name,
    email: r.email || '',
    phone: r.phone || undefined,
    designation: r.designation || '',
    organizationId: r.organization_id || '',
    roleId: r.role_id || '',
    isActive: Boolean(r.is_active),
    lastLogin: r.last_login ? new Date(r.last_login).toISOString() : undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToUserOrgPerm(r: any): UserOrgPermission {
  return {
    id: r.id,
    userId: r.user_id,
    organizationId: r.organization_id,
    canCreate: Boolean(r.can_create),
    canView: Boolean(r.can_view),
    canApprove: Boolean(r.can_approve),
  };
}

export function rowToCategory(r: any): WorkshopCategory {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    isActive: Boolean(r.is_active),
  };
}

export function rowToStatus(r: any): WorkshopStatus {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    displayOrder: Number(r.display_order || 0),
    color: r.color || '#00534E',
  };
}

export function rowToWorkshop(r: any): Workshop {
  let targetPath = r.target_path;
  if (typeof targetPath === 'string') {
    try {
      targetPath = JSON.parse(targetPath);
    } catch {
      targetPath = [];
    }
  }

  return {
    id: r.id,
    workshopNumber: r.workshop_number || '',
    year: r.year ? String(r.year) : '2025',
    branch: r.branch || '',
    subject: r.subject || '',
    title: r.title || '',
    aim: r.aim || '',
    expectedOutput: r.expected_output || undefined,
    placeId: r.place_id || '',
    placeName: r.place_name || '',
    targetLevel: r.target_level || undefined,
    targetPath: Array.isArray(targetPath) ? targetPath : undefined,
    daysHeld: Number(r.days_held || 1),
    workshopType: r.workshop_type || undefined,
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    venue: r.venue || undefined,
    organizingOrgId: r.organizing_org_id || '',
    targetOrgId: r.target_org_id || '',
    isSelfOrganized: Boolean(r.is_self_organized),
    expectedTrainees: Number(r.expected_trainees || 0),
    actualTrainees: Number(r.actual_trainees || 0),
    status: r.status || 'Scheduled',
    confirmationStatus: r.confirmation_status || 'Confirmed',
    statusId: r.status_id || undefined,
    statusName: r.status_name || undefined,
    categoryId: r.category_id || undefined,
    categoryName: r.category_name || undefined,
    objective: r.objective || undefined,
    description: r.description || undefined,
    originalStartDate: r.original_start_date || undefined,
    originalEndDate: r.original_end_date || undefined,
    originalVenue: r.original_venue || undefined,
    rescheduleCount: Number(r.reschedule_count || 0),
    lastRescheduledAt: r.last_rescheduled_at ? new Date(r.last_rescheduled_at).toISOString() : undefined,
    lastRescheduleReason: r.last_reschedule_reason || undefined,
    createdBy: r.created_by || '',
    creatorName: r.creator_name || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToReschedule(r: any): WorkshopReschedule {
  return {
    id: r.id,
    workshopId: r.workshop_id,
    rescheduledByUserId: r.rescheduled_by_user_id || '',
    rescheduledByName: r.rescheduled_by_name || '',
    rescheduledByOrgName: r.rescheduled_by_org_name || '',
    rescheduledByBranchType: r.rescheduled_by_branch_type || 'organizer',
    oldStartDate: r.old_start_date || '',
    oldEndDate: r.old_end_date || '',
    oldDaysHeld: Number(r.old_days_held || 1),
    oldVenue: r.old_venue || undefined,
    newStartDate: r.new_start_date || '',
    newEndDate: r.new_end_date || '',
    newDaysHeld: Number(r.new_days_held || 1),
    newVenue: r.new_venue || undefined,
    reason: r.reason || '',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToTrainee(r: any): Trainee {
  let dailyAttendance = r.daily_attendance;
  if (typeof dailyAttendance === 'string') {
    try {
      dailyAttendance = JSON.parse(dailyAttendance);
    } catch {
      dailyAttendance = undefined;
    }
  }

  return {
    id: r.id,
    workshopId: r.workshop_id,
    serialNumber: r.serial_number ? Number(r.serial_number) : undefined,
    nicNumber: r.nic_number || undefined,
    name: r.name,
    position: r.position || undefined,
    schoolInstitute: r.school_institute || undefined,
    region: r.region || undefined,
    province: r.province || undefined,
    phone: r.phone || undefined,
    designation: r.designation || undefined,
    organization: r.organization || undefined,
    email: r.email || undefined,
    attendanceStatus: r.attendance_status || 'registered',
    dailyAttendance: dailyAttendance || undefined,
    remarks: r.remarks || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToResourcePerson(r: any): ResourcePerson {
  return {
    id: r.id,
    workshopId: r.workshop_id || undefined,
    serialNumber: r.serial_number ? Number(r.serial_number) : undefined,
    nic: r.nic || undefined,
    name: r.name,
    position: r.position || undefined,
    service: r.service || undefined,
    grade: r.grade || undefined,
    workplace: r.workplace || undefined,
    personalAddress: r.personal_address || undefined,
    educationalQualifications: r.educational_qualifications || undefined,
    subjectQualifications: r.subject_qualifications || undefined,
    phone: r.phone || undefined,
    specialNotes: r.special_notes || undefined,
    organization: r.organization || undefined,
    designation: r.designation || undefined,
    expertiseArea: r.expertise_area || undefined,
    roleInWorkshop: r.role_in_workshop || undefined,
    email: r.email || undefined,
    remarks: r.remarks || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToNotification(r: any): Notification {
  return {
    id: r.id,
    recipientOrgId: r.recipient_org_id,
    recipientUserId: r.recipient_user_id || undefined,
    workshopId: r.workshop_id,
    title: r.title,
    message: r.message,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToAipHeaderTemplate(r: any): AipHeaderTemplate {
  return {
    id: r.id,
    branchId: r.branch_id || undefined,
    name: r.name,
    phaseTitle: r.phase_title || '2. Implementation Phase',
    targetTitle: r.target_title || 'Overall Physical and Financial Targets',
    mainResponsibility: r.main_responsibility || '',
    mainContactNo: r.main_contact_no || '',
    overallResponsibility: r.overall_responsibility || '',
    overallContactNo: r.overall_contact_no || '',
    footnote: r.footnote || '',
    isDefault: Boolean(r.is_default),
    createdBy: r.created_by || undefined,
    creatorName: r.creator_name || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function rowToAipActivity(r: any): AipActivity {
  let finMonths: (number | null)[] = [];
  let physMonths: (string | null)[] = [];
  try {
    if (r.financial_months) {
      finMonths = typeof r.financial_months === 'string' ? JSON.parse(r.financial_months) : r.financial_months;
    }
  } catch (e) {}
  try {
    if (r.physical_months) {
      physMonths = typeof r.physical_months === 'string' ? JSON.parse(r.physical_months) : r.physical_months;
    }
  } catch (e) {}

  return {
    id: r.id,
    branchId: r.branch_id,
    branchName: r.branch_name || '',
    year: r.year ? String(r.year) : '2026',
    outputNo: r.output_no || '1',
    activityCode: r.activity_code || '',
    strategy: r.strategy || '',
    activity: r.activity || '',
    kpi: r.kpi || '',
    voteNumber: r.vote_number || '',
    estimatedCost: r.estimated_cost ? parseFloat(r.estimated_cost) : 0,
    costNote: r.cost_note || '',
    financialMonths: Array.isArray(finMonths) ? finMonths : [],
    physicalMonths: Array.isArray(physMonths) ? physMonths : [],
    targetQ1: r.target_q1 || '',
    targetQ2: r.target_q2 || '',
    targetQ3: r.target_q3 || '',
    targetQ4: r.target_q4 || '',
    totalTarget: r.total_target || '',
    fundingSource: r.funding_source || '',
    responsibleOfficer: r.responsible_officer || '',
    status: r.status || 'Planned',
    createdBy: r.created_by || undefined,
    creatorName: r.creator_name || undefined,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

// ── Full Schema Loader ────────────────────────────────────────────────

export async function loadFullSchemaFromPostgres(): Promise<DbSchema> {
  const [
    orgTypesRes,
    orgsRes,
    rolesRes,
    usersRes,
    permsRes,
    catsRes,
    statusesRes,
    workshopsRes,
    traineesRes,
    rpRes,
    notifsRes,
    reschedulesRes,
    metaRes,
    aipTemplatesRes,
    aipActivitiesRes,
  ] = await Promise.all([
    query('SELECT * FROM organization_types ORDER BY level ASC, name ASC'),
    query('SELECT * FROM organizations ORDER BY name ASC'),
    query('SELECT * FROM user_roles ORDER BY name ASC'),
    query('SELECT * FROM users ORDER BY full_name ASC'),
    query('SELECT * FROM user_org_permissions'),
    query('SELECT * FROM workshop_categories ORDER BY name ASC'),
    query('SELECT * FROM workshop_statuses ORDER BY display_order ASC'),
    query('SELECT * FROM workshops ORDER BY created_at DESC'),
    query('SELECT * FROM trainees ORDER BY serial_number ASC, name ASC'),
    query('SELECT * FROM resource_persons ORDER BY serial_number ASC, name ASC'),
    query('SELECT * FROM notifications ORDER BY created_at DESC'),
    query('SELECT * FROM workshop_reschedules ORDER BY created_at DESC'),
    query("SELECT value FROM system_meta WHERE key = 'lastWorkshopNumber'"),
    query('SELECT * FROM aip_header_templates ORDER BY created_at ASC').catch(() => ({ rows: [] })),
    query('SELECT * FROM aip_activities ORDER BY activity_code ASC, created_at ASC').catch(() => ({ rows: [] })),
  ]);

  const lastWorkshopNumber = metaRes.rows.length > 0 && metaRes.rows[0].value
    ? parseInt(metaRes.rows[0].value, 10)
    : workshopsRes.rows.length;

  return {
    organizationTypes: orgTypesRes.rows.map(rowToOrgType),
    organizations: orgsRes.rows.map(rowToOrg),
    userRoles: rolesRes.rows.map(rowToUserRole),
    users: usersRes.rows.map(rowToUser),
    userOrgPermissions: permsRes.rows.map(rowToUserOrgPerm),
    workshopCategories: catsRes.rows.map(rowToCategory),
    workshopStatuses: statusesRes.rows.map(rowToStatus),
    workshops: workshopsRes.rows.map(rowToWorkshop),
    trainees: traineesRes.rows.map(rowToTrainee),
    resourcePersons: rpRes.rows.map(rowToResourcePerson),
    workshopApprovals: [],
    attachments: [],
    notifications: notifsRes.rows.map(rowToNotification),
    workshopReschedules: reschedulesRes.rows.map(rowToReschedule),
    meta: { lastWorkshopNumber: isNaN(lastWorkshopNumber) ? 0 : lastWorkshopNumber },
    aipHeaderTemplates: aipTemplatesRes.rows.map(rowToAipHeaderTemplate),
    aipActivities: aipActivitiesRes.rows.map(rowToAipActivity),
  };
}

// ── CRUD Helpers ──────────────────────────────────────────────────────

export async function pgInsertWorkshop(w: Workshop): Promise<void> {
  const sql = `
    INSERT INTO workshops (
      id, workshop_number, year, branch, subject, title, aim, expected_output,
      place_id, place_name, target_level, target_path, days_held, workshop_type,
      start_date, end_date, venue, organizing_org_id, target_org_id, is_self_organized,
      expected_trainees, actual_trainees, status, confirmation_status, status_id,
      status_name, category_id, category_name, objective, description,
      original_start_date, original_end_date, original_venue, reschedule_count,
      last_rescheduled_at, last_reschedule_reason, created_by, creator_name,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30,
      $31, $32, $33, $34,
      $35, $36, $37, $38,
      $39, $40
    )
    ON CONFLICT (id) DO UPDATE SET
      workshop_number = EXCLUDED.workshop_number,
      year = EXCLUDED.year,
      branch = EXCLUDED.branch,
      subject = EXCLUDED.subject,
      title = EXCLUDED.title,
      aim = EXCLUDED.aim,
      expected_output = EXCLUDED.expected_output,
      place_id = EXCLUDED.place_id,
      place_name = EXCLUDED.place_name,
      target_level = EXCLUDED.target_level,
      target_path = EXCLUDED.target_path,
      days_held = EXCLUDED.days_held,
      workshop_type = EXCLUDED.workshop_type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      venue = EXCLUDED.venue,
      organizing_org_id = EXCLUDED.organizing_org_id,
      target_org_id = EXCLUDED.target_org_id,
      expected_trainees = EXCLUDED.expected_trainees,
      actual_trainees = EXCLUDED.actual_trainees,
      status = EXCLUDED.status,
      confirmation_status = EXCLUDED.confirmation_status,
      status_id = EXCLUDED.status_id,
      status_name = EXCLUDED.status_name,
      category_id = EXCLUDED.category_id,
      category_name = EXCLUDED.category_name,
      reschedule_count = EXCLUDED.reschedule_count,
      last_rescheduled_at = EXCLUDED.last_rescheduled_at,
      last_reschedule_reason = EXCLUDED.last_reschedule_reason,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, [
    w.id,
    w.workshopNumber,
    w.year,
    w.branch,
    w.subject,
    w.title,
    w.aim,
    w.expectedOutput || null,
    w.placeId,
    w.placeName,
    w.targetLevel || null,
    JSON.stringify(w.targetPath || []),
    w.daysHeld || 1,
    w.workshopType || null,
    w.startDate,
    w.endDate,
    w.venue || null,
    w.organizingOrgId,
    w.targetOrgId,
    w.isSelfOrganized || false,
    w.expectedTrainees || 0,
    w.actualTrainees || 0,
    w.status,
    w.confirmationStatus || 'Confirmed',
    w.statusId || null,
    w.statusName || null,
    w.categoryId || null,
    w.categoryName || null,
    w.objective || null,
    w.description || null,
    w.originalStartDate || null,
    w.originalEndDate || null,
    w.originalVenue || null,
    w.rescheduleCount || 0,
    w.lastRescheduledAt || null,
    w.lastRescheduleReason || null,
    w.createdBy,
    w.creatorName || null,
    w.createdAt || new Date().toISOString(),
    w.updatedAt || new Date().toISOString(),
  ]);
}

export async function pgInsertTrainee(t: Trainee): Promise<void> {
  const sql = `
    INSERT INTO trainees (
      id, workshop_id, serial_number, nic_number, name, position,
      school_institute, region, province, phone, designation,
      organization, email, attendance_status, daily_attendance,
      remarks, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18
    )
    ON CONFLICT (id) DO UPDATE SET
      serial_number = EXCLUDED.serial_number,
      nic_number = EXCLUDED.nic_number,
      name = EXCLUDED.name,
      position = EXCLUDED.position,
      school_institute = EXCLUDED.school_institute,
      region = EXCLUDED.region,
      province = EXCLUDED.province,
      phone = EXCLUDED.phone,
      designation = EXCLUDED.designation,
      organization = EXCLUDED.organization,
      email = EXCLUDED.email,
      attendance_status = EXCLUDED.attendance_status,
      daily_attendance = EXCLUDED.daily_attendance,
      remarks = EXCLUDED.remarks,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, [
    t.id,
    t.workshopId,
    t.serialNumber || null,
    t.nicNumber || null,
    t.name,
    t.position || null,
    t.schoolInstitute || null,
    t.region || null,
    t.province || null,
    t.phone || null,
    t.designation || null,
    t.organization || null,
    t.email || null,
    t.attendanceStatus || 'registered',
    JSON.stringify(t.dailyAttendance || {}),
    t.remarks || null,
    t.createdAt || new Date().toISOString(),
    t.updatedAt || new Date().toISOString(),
  ]);
}

export async function pgInsertResourcePerson(rp: ResourcePerson): Promise<void> {
  const sql = `
    INSERT INTO resource_persons (
      id, workshop_id, serial_number, nic, name, position, service,
      grade, workplace, personal_address, educational_qualifications,
      subject_qualifications, phone, special_notes, organization,
      designation, expertise_area, role_in_workshop, email, remarks,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21, $22
    )
    ON CONFLICT (id) DO UPDATE SET
      workshop_id = EXCLUDED.workshop_id,
      serial_number = EXCLUDED.serial_number,
      nic = EXCLUDED.nic,
      name = EXCLUDED.name,
      position = EXCLUDED.position,
      service = EXCLUDED.service,
      grade = EXCLUDED.grade,
      workplace = EXCLUDED.workplace,
      personal_address = EXCLUDED.personal_address,
      educational_qualifications = EXCLUDED.educational_qualifications,
      subject_qualifications = EXCLUDED.subject_qualifications,
      phone = EXCLUDED.phone,
      special_notes = EXCLUDED.special_notes,
      organization = EXCLUDED.organization,
      designation = EXCLUDED.designation,
      expertise_area = EXCLUDED.expertise_area,
      role_in_workshop = EXCLUDED.role_in_workshop,
      email = EXCLUDED.email,
      remarks = EXCLUDED.remarks,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, [
    rp.id,
    rp.workshopId || null,
    rp.serialNumber || null,
    rp.nic || null,
    rp.name,
    rp.position || null,
    rp.service || null,
    rp.grade || null,
    rp.workplace || null,
    rp.personalAddress || null,
    rp.educationalQualifications || null,
    rp.subjectQualifications || null,
    rp.phone || null,
    rp.specialNotes || null,
    rp.organization || null,
    rp.designation || null,
    rp.expertiseArea || null,
    rp.roleInWorkshop || null,
    rp.email || null,
    rp.remarks || null,
    rp.createdAt || new Date().toISOString(),
    rp.updatedAt || new Date().toISOString(),
  ]);
}

export async function pgInsertReschedule(r: WorkshopReschedule): Promise<void> {
  const sql = `
    INSERT INTO workshop_reschedules (
      id, workshop_id, rescheduled_by_user_id, rescheduled_by_name,
      rescheduled_by_org_name, rescheduled_by_branch_type, old_start_date,
      old_end_date, old_days_held, old_venue, new_start_date,
      new_end_date, new_days_held, new_venue, reason, created_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14, $15, $16
    )
    ON CONFLICT (id) DO NOTHING
  `;

  await query(sql, [
    r.id,
    r.workshopId,
    r.rescheduledByUserId,
    r.rescheduledByName,
    r.rescheduledByOrgName,
    r.rescheduledByBranchType,
    r.oldStartDate,
    r.oldEndDate,
    r.oldDaysHeld,
    r.oldVenue || null,
    r.newStartDate,
    r.newEndDate,
    r.newDaysHeld,
    r.newVenue || null,
    r.reason,
    r.createdAt || new Date().toISOString(),
  ]);
}

export async function pgInsertNotification(n: Notification): Promise<void> {
  const sql = `
    INSERT INTO notifications (
      id, recipient_org_id, recipient_user_id, workshop_id, title, message, is_read, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      is_read = EXCLUDED.is_read
  `;

  await query(sql, [
    n.id,
    n.recipientOrgId,
    n.recipientUserId || null,
    n.workshopId,
    n.title,
    n.message,
    n.isRead,
    n.createdAt || new Date().toISOString(),
  ]);
}

export async function pgUpdateUserLastLogin(userId: string): Promise<void> {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}

export async function pgSetMeta(key: string, value: string): Promise<void> {
  await query(
    'INSERT INTO system_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [key, value]
  );
}

export async function pgInsertAipTemplate(tpl: AipHeaderTemplate): Promise<void> {
  const sql = `
    INSERT INTO aip_header_templates (
      id, branch_id, name, phase_title, target_title,
      main_responsibility, main_contact_no, overall_responsibility,
      overall_contact_no, footnote, is_default, created_by,
      creator_name, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phase_title = EXCLUDED.phase_title,
      target_title = EXCLUDED.target_title,
      main_responsibility = EXCLUDED.main_responsibility,
      main_contact_no = EXCLUDED.main_contact_no,
      overall_responsibility = EXCLUDED.overall_responsibility,
      overall_contact_no = EXCLUDED.overall_contact_no,
      footnote = EXCLUDED.footnote,
      is_default = EXCLUDED.is_default,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, [
    tpl.id,
    tpl.branchId || null,
    tpl.name,
    tpl.phaseTitle || '2. Implementation Phase',
    tpl.targetTitle || 'Overall Physical and Financial Targets',
    tpl.mainResponsibility || null,
    tpl.mainContactNo || null,
    tpl.overallResponsibility || null,
    tpl.overallContactNo || null,
    tpl.footnote || null,
    Boolean(tpl.isDefault),
    tpl.createdBy || null,
    tpl.creatorName || null,
    tpl.createdAt || new Date().toISOString(),
    tpl.updatedAt || new Date().toISOString(),
  ]);
}

export async function pgInsertAipActivity(act: AipActivity): Promise<void> {
  const sql = `
    INSERT INTO aip_activities (
      id, branch_id, branch_name, year, output_no, activity_code,
      strategy, activity, kpi, vote_number, target_q1, target_q2,
      target_q3, target_q4, total_target, estimated_cost, cost_note,
      financial_months, physical_months, funding_source, responsible_officer, status,
      created_by, creator_name, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22,
      $23, $24, $25, $26
    )
    ON CONFLICT (id) DO UPDATE SET
      output_no = EXCLUDED.output_no,
      activity_code = EXCLUDED.activity_code,
      strategy = EXCLUDED.strategy,
      activity = EXCLUDED.activity,
      kpi = EXCLUDED.kpi,
      vote_number = EXCLUDED.vote_number,
      target_q1 = EXCLUDED.target_q1,
      target_q2 = EXCLUDED.target_q2,
      target_q3 = EXCLUDED.target_q3,
      target_q4 = EXCLUDED.target_q4,
      total_target = EXCLUDED.total_target,
      estimated_cost = EXCLUDED.estimated_cost,
      cost_note = EXCLUDED.cost_note,
      financial_months = EXCLUDED.financial_months,
      physical_months = EXCLUDED.physical_months,
      funding_source = EXCLUDED.funding_source,
      responsible_officer = EXCLUDED.responsible_officer,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at
  `;

  await query(sql, [
    act.id,
    act.branchId,
    act.branchName || null,
    act.year ? String(act.year) : '2026',
    act.outputNo || '1',
    act.activityCode || null,
    act.strategy || null,
    act.activity,
    act.kpi || null,
    act.voteNumber || null,
    act.targetQ1 || null,
    act.targetQ2 || null,
    act.targetQ3 || null,
    act.targetQ4 || null,
    act.totalTarget || null,
    act.estimatedCost || 0,
    act.costNote || null,
    JSON.stringify(act.financialMonths || []),
    JSON.stringify(act.physicalMonths || []),
    act.fundingSource || null,
    act.responsibleOfficer || null,
    act.status || 'Planned',
    act.createdBy || null,
    act.creatorName || null,
    act.createdAt || new Date().toISOString(),
    act.updatedAt || new Date().toISOString(),
  ]);
}

