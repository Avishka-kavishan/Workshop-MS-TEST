import fs from 'fs';
import path from 'path';

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
  meta: { lastWorkshopNumber: number; };
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
  unitType?: 'location' | 'branch';  // 'location' = Province/Zone/School, 'branch' = internal division/unit
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
  // User's specific required fields:
  year: string;                   // Year (e.g. "2025")
  branch: string;                 // Organizing Branch (e.g. "MOE - ICT Branch")
  subject: string;                // Subject (e.g. "Information & Communication Technology")
  title: string;                  // Workshop Title / Name
  aim: string;                    // Objectives of the workshop
  expectedOutput?: string;        // Expected output of the workshop
  placeId: string;                // Place ID (The other user / branch unit, e.g. "org-zone-galle-it")
  placeName: string;              // Place name (e.g. "Galle Zone IT Branch")
  targetLevel?: 'national' | 'province' | 'zone' | 'school';  // Which hierarchy level was targeted
  targetPath?: string[];          // Array of org IDs from top→bottom (e.g. ["org-prov-western", "org-zone-colombo", "org-school-ananda"])
  daysHeld: number;               // How many days it held (e.g. 3)
  workshopType?: string;
  
  // Timing & legacy compatibility:
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
  // Legacy / fallback fields
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
  workshopId: string;
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
  // Legacy / backward-compat fields
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

class JsonDatabase {
  private data: DbSchema | null = null;

  private ensureDataDir(): void {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error('Error creating database directory:', err);
      }
    }
  }

  read(): DbSchema {
    this.ensureDataDir();

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
      };
      this.write(emptyDb);
      return emptyDb;
    }

    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.workshopReschedules) parsed.workshopReschedules = [];
      this.data = parsed as DbSchema;
      return this.data;
    } catch (err) {
      if (this.data) return this.data;
      throw err;
    }
  }

  write(data: DbSchema): void {
    this.ensureDataDir();
    this.data = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  update(updater: (data: DbSchema) => void): DbSchema {
    const data = this.read();
    updater(data);
    this.write(data);
    return data;
  }

  invalidate(): void {
    this.data = null;
  }
}

const db = new JsonDatabase();
export default db;
