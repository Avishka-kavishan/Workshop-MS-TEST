import fs from 'fs';
import path from 'path';
import { isPostgresConfigured, query } from './pg';
import {
  loadFullSchemaFromPostgres,
  pgInsertWorkshop,
  pgInsertTrainee,
  pgInsertResourcePerson,
  pgInsertReschedule,
  pgInsertNotification,
  pgSetMeta,
  pgInsertAipPlan,
  pgInsertAipActivity,
} from './postgres';

const IS_VERCEL = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const SOURCE_DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const DB_FILE = IS_VERCEL ? path.join('/tmp', 'database.json') : SOURCE_DB_FILE;

export interface DbSchema {
  organizationTypes: OrganizationType[];
  organizations: Organization[];
  userRoles: UserRole[];
  users: User[];
  userOrgPermissions: UserOrgPermission[];
  workshopCategories: WorkshopCategory[];
  workshopStatuses: WorkshopStatus[];
  workshops: Workshop[];
  trainees: Trainee[];
  resourcePersons: ResourcePerson[];
  workshopApprovals: WorkshopApproval[];
  attachments: Attachment[];
  notifications: Notification[];
  workshopReschedules: WorkshopReschedule[];
  meta: { lastWorkshopNumber: number };
  aipAmendments: AipAmendment[];
  aipPlans: AipPlan[];
  aipActivities: AipActivity[];
}

export interface OrganizationType {
  id: string;
  name: string;
  level: number;
  description: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  typeId: string;
  parentId: string | null;
  unitType?: 'location' | 'branch';
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  canCreateWorkshop: boolean;
  canApproveWorkshop: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageOrganizations: boolean;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  phone?: string;
  designation: string;
  organizationId: string;
  roleId: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserOrgPermission {
  id: string;
  userId: string;
  organizationId: string;
  canCreate: boolean;
  canView: boolean;
  canApprove: boolean;
}

export interface WorkshopCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface WorkshopStatus {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  color: string;
}

export interface Workshop {
  id: string;
  workshopNumber: string;
  year: string;
  branch: string;
  subject: string;
  title: string;
  aim: string;
  expectedOutput?: string;
  placeId: string;
  placeName: string;
  targetLevel?: 'national' | 'province' | 'zone' | 'school';
  targetPath?: string[];
  daysHeld: number;
  workshopType?: string;
  startDate: string;
  endDate: string;
  venue?: string;
  organizingOrgId: string;
  targetOrgId: string;
  isSelfOrganized?: boolean;
  expectedTrainees: number;
  actualTrainees: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Cancelled';
  confirmationStatus?: 'Confirmed' | 'Tentative';
  statusId?: string;
  statusName?: string;
  categoryId?: string;
  categoryName?: string;
  objective?: string;
  description?: string;
  originalStartDate?: string;
  originalEndDate?: string;
  originalVenue?: string;
  rescheduleCount?: number;
  lastRescheduledAt?: string;
  lastRescheduleReason?: string;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopReschedule {
  id: string;
  workshopId: string;
  rescheduledByUserId: string;
  rescheduledByName: string;
  rescheduledByOrgName: string;
  rescheduledByBranchType: 'organizer' | 'host' | 'admin';
  oldStartDate: string;
  oldEndDate: string;
  oldDaysHeld: number;
  oldVenue?: string;
  newStartDate: string;
  newEndDate: string;
  newDaysHeld: number;
  newVenue?: string;
  reason: string;
  createdAt: string;
}

export interface Trainee {
  id: string;
  workshopId: string;
  serialNumber?: number;
  nicNumber?: string;
  name: string;
  position?: string;
  schoolInstitute?: string;
  region?: string;
  province?: string;
  phone?: string;
  designation?: string;
  organization?: string;
  email?: string;
  attendanceStatus: 'registered' | 'attended' | 'absent';
  dailyAttendance?: Record<string, 'present' | 'absent' | 'late'>;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourcePerson {
  id: string;
  workshopId?: string;
  serialNumber?: number;
  nic?: string;
  name: string;
  position?: string;
  service?: string;
  grade?: string;
  workplace?: string;
  personalAddress?: string;
  educationalQualifications?: string;
  subjectQualifications?: string;
  phone?: string;
  specialNotes?: string;
  organization?: string;
  designation?: string;
  expertiseArea?: string;
  roleInWorkshop?: string;
  email?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientOrgId: string;
  recipientUserId?: string;
  workshopId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface WorkshopApproval {
  id: string;
  workshopId: string;
  reviewerId: string;
  action: 'submit' | 'approve' | 'return' | 'reject' | 'cancel';
  comments?: string;
  previousStatusId: string;
  newStatusId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  workshopId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string;
  uploadedBy: string;
  createdAt: string;
}


export interface AipAmendment {
  id: string;
  year: string;
  amendmentNumber: number;
  title: string;
  circularRef?: string;
  deadline?: string;
  notes?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  createdBy: string;
  creatorName: string;
  status: 'Active' | 'Closed';
  totalBranches?: number;
  submittedBranchesCount?: number;
  branchSubmissions?: Array<{
    branchId: string;
    branchName: string;
    status: string;
    submittedAt?: string | null;
    activityCount: number;
    totalCost: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AipPlan {
  id: string;
  branchId: string;
  branchName: string;
  year: string;
  phaseTitle: string;
  targetTitle: string;
  mainResponsibility: string;
  mainContactNo: string;
  overallResponsibility: string;
  overallContactNo: string;
  amendmentNumber?: number;
  amendmentId?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  submittedAt?: string;
  submissionNotes?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  createdAt: string;
  updatedAt: string;
}

export interface AipActivity {
  id: string;
  planId?: string;
  branchId: string;
  branchName: string;
  year: string;
  amendmentNumber?: number;
  amendmentId?: string;
  outputNo: string;
  activityCode: string;
  activity: string;
  voteNumber: string;
  estimatedCost: number;
  financialMonths: number[];
  physicalMonths: string[];
  financialQ1: number;
  financialQ2: number;
  financialQ3: number;
  financialQ4: number;
  targetQ1: string;
  targetQ2: string;
  targetQ3: string;
  targetQ4: string;
  responsibleOfficer: string;
  remarks?: string;
  physicalProgress?: string;
  physicalProgressPct?: string;
  financialProgress?: number;
  financialProgressPct?: string;
  createdBy?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

// ── JSON Local File Helpers ──────────────────────────────────────────

function ensureDataDir(): void {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error('Error creating database directory:', err);
    }
  }
}

function readJsonFile(): DbSchema {
  ensureDataDir();

  if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
    if (fs.existsSync(SOURCE_DB_FILE)) {
      try {
        fs.copyFileSync(SOURCE_DB_FILE, DB_FILE);
      } catch (err) {
        console.error('Failed to copy seed database to /tmp:', err);
      }
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: DbSchema = {
      organizationTypes: [],
      organizations: [],
      userRoles: [],
      users: [],
      userOrgPermissions: [],
      workshopCategories: [],
      workshopStatuses: [],
      workshops: [],
      trainees: [],
      resourcePersons: [],
      workshopApprovals: [],
      attachments: [],
      notifications: [],
      workshopReschedules: [],
      meta: { lastWorkshopNumber: 0 },
      aipAmendments: [],
      aipPlans: [],
      aipActivities: [],
    };
    writeJsonFile(emptyDb);
    return emptyDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.workshopReschedules) parsed.workshopReschedules = [];
    if (!parsed.aipAmendments) parsed.aipAmendments = [];
    if (!parsed.aipPlans) parsed.aipPlans = [];
    if (!parsed.aipActivities) parsed.aipActivities = [];
    return parsed as DbSchema;
  } catch (err) {
    console.error('Error reading JSON database file:', err);
    throw err;
  }
}

function writeJsonFile(data: DbSchema): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Non-fatal if read-only filesystem
    console.warn('Could not write JSON database file:', err);
  }
}

// ── Core Async Database Methods (PostgreSQL + JSON Fallback) ──────────

export async function getDb(): Promise<DbSchema> {
  if (isPostgresConfigured()) {
    try {
      return await loadFullSchemaFromPostgres();
    } catch (err: any) {
      console.error('[Database] Failed to query PostgreSQL, falling back to JSON:', err?.message);
      return readJsonFile();
    }
  }
  return readJsonFile();
}

export async function updateDb(
  updater: (data: DbSchema) => void | Promise<void>
): Promise<DbSchema> {
  const isPg = isPostgresConfigured();

  if (isPg) {
    try {
      const current = await loadFullSchemaFromPostgres();
      // Clone previous collections for diffing
      const prevWorkshopIds = new Set(current.workshops.map((w) => w.id));
      const prevTraineeIds = new Set(current.trainees.map((t) => t.id));
      const prevRpIds = new Set(current.resourcePersons.map((r) => r.id));

      await updater(current);

      // 1. Sync Workshops
      const currentWorkshopIds = new Set(current.workshops.map((w) => w.id));
      for (const oldId of Array.from(prevWorkshopIds)) {
        if (!currentWorkshopIds.has(oldId)) {
          await query('DELETE FROM workshops WHERE id = $1', [oldId]);
        }
      }
      for (const w of current.workshops) {
        await pgInsertWorkshop(w);
      }

      // 2. Sync Trainees
      const currentTraineeIds = new Set(current.trainees.map((t) => t.id));
      for (const oldId of Array.from(prevTraineeIds)) {
        if (!currentTraineeIds.has(oldId)) {
          await query('DELETE FROM trainees WHERE id = $1', [oldId]);
        }
      }
      for (const t of current.trainees) {
        await pgInsertTrainee(t);
      }

      // 3. Sync Resource Persons
      const currentRpIds = new Set(current.resourcePersons.map((r) => r.id));
      for (const oldId of Array.from(prevRpIds)) {
        if (!currentRpIds.has(oldId)) {
          await query('DELETE FROM resource_persons WHERE id = $1', [oldId]);
        }
      }
      for (const rp of current.resourcePersons) {
        await pgInsertResourcePerson(rp);
      }

      // 4. Sync Reschedules
      for (const r of current.workshopReschedules || []) {
        await pgInsertReschedule(r);
      }

      // 5. Sync Notifications
      for (const n of current.notifications || []) {
        await pgInsertNotification(n);
      }

      // 6. Sync Metadata
      if (current.meta?.lastWorkshopNumber !== undefined) {
        await pgSetMeta('lastWorkshopNumber', String(current.meta.lastWorkshopNumber));
      }

      // 7. Sync AIP Plans & Activities
      for (const p of current.aipPlans || []) {
        try { await pgInsertAipPlan(p); } catch (e) {}
      }
      for (const a of current.aipActivities || []) {
        try { await pgInsertAipActivity(a); } catch (e) {}
      }

      // Also update JSON file as a local backup if writable
      writeJsonFile(current);

      return current;
    } catch (err: any) {
      console.error('[Database] Failed to persist updates to PostgreSQL, falling back to JSON:', err?.message);
    }
  }

  // Fallback to JSON file storage
  const data = readJsonFile();
  await updater(data);
  writeJsonFile(data);
  return data;
}

// ── Backward-Compatible db Object ─────────────────────────────────────

class DatabaseFacade {
  read(): DbSchema {
    return readJsonFile();
  }

  write(data: DbSchema): void {
    writeJsonFile(data);
  }

  update(updater: (data: DbSchema) => void): DbSchema {
    const data = this.read();
    updater(data);
    this.write(data);
    // If PostgreSQL is configured, schedule async persistence in background
    if (isPostgresConfigured()) {
      updateDb((d) => {
        updater(d);
      }).catch((e) => console.error('[DatabaseFacade] Background PG update error:', e));
    }
    return data;
  }

  invalidate(): void {}
}

const db = new DatabaseFacade();
export default db;
