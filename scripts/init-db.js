/**
 * Workshop Management System - PostgreSQL Initialization & Migration Script
 *
 * Usage:
 *   node scripts/init-db.js          # Run migrations and seed data
 *   node scripts/init-db.js --schema # Run migrations only
 *   node scripts/init-db.js --seed   # Seed data from data/database.json
 */

const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to read .env or .env.local if present
function loadEnvFile(file) {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const isLocalhost =
  !connectionString ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'workshop_ms',
      ssl: false,
    };

async function ensureDatabaseExists() {
  let targetDb = 'workshop_ms';
  let maintenanceConfig;

  if (connectionString) {
    if (!isLocalhost) return; // For cloud databases (Supabase, Neon, etc.) database already exists
    try {
      const parsedUrl = new URL(connectionString);
      targetDb = parsedUrl.pathname.replace(/^\//, '') || 'workshop_ms';
      parsedUrl.pathname = '/postgres';
      maintenanceConfig = {
        connectionString: parsedUrl.toString(),
        ssl: false,
      };
    } catch {
      return;
    }
  } else {
    targetDb = poolConfig.database;
    maintenanceConfig = {
      ...poolConfig,
      database: 'postgres',
    };
  }

  const maintenanceClient = new Client(maintenanceConfig);

  try {
    await maintenanceClient.connect();
    const res = await maintenanceClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (res.rowCount === 0) {
      console.log(`[Init] Database "${targetDb}" does not exist. Creating...`);
      await maintenanceClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[Init] Database "${targetDb}" created successfully.`);
    }
  } catch (err) {
    console.warn(`[Init] Note: Could not verify/create database "${targetDb}" automatically: ${err.message}`);
  } finally {
    await maintenanceClient.end().catch(() => {});
  }
}

async function runSchema(pool) {
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('[Init] Executing schema.sql to create tables and indexes...');
  await pool.query(sql);
  console.log('✅ Schema migration completed successfully.');
}

async function seedData(pool) {
  const dbJsonPath = path.join(process.cwd(), 'data', 'database.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.log('[Init] No data/database.json found to seed.');
    return;
  }

  const raw = fs.readFileSync(dbJsonPath, 'utf8');
  const data = JSON.parse(raw);
  console.log('[Init] Seeding initial data from database.json...');

  // 1. Organization Types
  for (const ot of data.organizationTypes || []) {
    await pool.query(
      `INSERT INTO organization_types (id, name, level, description, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [ot.id, ot.name, ot.level, ot.description || null, ot.createdAt || new Date().toISOString()]
    );
  }

  // 2. Organizations
  for (const o of data.organizations || []) {
    await pool.query(
      `INSERT INTO organizations (id, name, code, type_id, parent_id, unit_type, address, phone, email, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        o.id,
        o.name,
        o.code || null,
        o.typeId || null,
        o.parentId || null,
        o.unitType || 'location',
        o.address || null,
        o.phone || null,
        o.email || null,
        o.isActive !== false,
        o.createdAt || new Date().toISOString(),
      ]
    );
  }

  // 3. User Roles
  for (const r of data.userRoles || []) {
    await pool.query(
      `INSERT INTO user_roles (id, name, description, can_create_workshop, can_approve_workshop, can_manage_users, can_view_reports, can_manage_organizations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id,
        r.name,
        r.description || null,
        Boolean(r.canCreateWorkshop),
        Boolean(r.canApproveWorkshop),
        Boolean(r.canManageUsers),
        Boolean(r.canViewReports),
        Boolean(r.canManageOrganizations),
      ]
    );
  }

  // 4. Users
  for (const u of data.users || []) {
    await pool.query(
      `INSERT INTO users (id, username, password_hash, full_name, email, phone, designation, organization_id, role_id, is_active, last_login, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         designation = EXCLUDED.designation,
         organization_id = EXCLUDED.organization_id,
         role_id = EXCLUDED.role_id`,
      [
        u.id,
        u.username,
        u.passwordHash,
        u.fullName,
        u.email || null,
        u.phone || null,
        u.designation || null,
        u.organizationId || null,
        u.roleId || null,
        u.isActive !== false,
        u.lastLogin || null,
        u.createdAt || new Date().toISOString(),
      ]
    );
  }

  // 5. User Org Permissions
  for (const p of data.userOrgPermissions || []) {
    await pool.query(
      `INSERT INTO user_org_permissions (id, user_id, organization_id, can_create, can_view, can_approve)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.userId, p.organizationId, Boolean(p.canCreate), Boolean(p.canView), Boolean(p.canApprove)]
    );
  }

  // 6. Workshop Categories
  for (const c of data.workshopCategories || []) {
    await pool.query(
      `INSERT INTO workshop_categories (id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.description || null, c.isActive !== false]
    );
  }

  // 7. Workshop Statuses
  for (const s of data.workshopStatuses || []) {
    await pool.query(
      `INSERT INTO workshop_statuses (id, name, description, display_order, color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.description || null, s.displayOrder || 0, s.color || null]
    );
  }

  // 8. Workshops
  for (const w of data.workshops || []) {
    await pool.query(
      `INSERT INTO workshops (
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
      ON CONFLICT (id) DO NOTHING`,
      [
        w.id,
        w.workshopNumber || null,
        w.year ? String(w.year) : '2025',
        w.branch || null,
        w.subject || null,
        w.title,
        w.aim || null,
        w.expectedOutput || null,
        w.placeId || null,
        w.placeName || null,
        w.targetLevel || null,
        JSON.stringify(w.targetPath || []),
        w.daysHeld || 1,
        w.workshopType || null,
        w.startDate || null,
        w.endDate || null,
        w.venue || null,
        w.organizingOrgId || null,
        w.targetOrgId || null,
        Boolean(w.isSelfOrganized),
        w.expectedTrainees || 0,
        w.actualTrainees || 0,
        w.status || 'Scheduled',
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
        w.createdBy || null,
        w.creatorName || null,
        w.createdAt || new Date().toISOString(),
        w.updatedAt || new Date().toISOString(),
      ]
    );
  }

  // 9. Trainees
  for (const t of data.trainees || []) {
    await pool.query(
      `INSERT INTO trainees (
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
      ON CONFLICT (id) DO NOTHING`,
      [
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
      ]
    );
  }

  // 10. Resource Persons
  for (const rp of data.resourcePersons || []) {
    await pool.query(
      `INSERT INTO resource_persons (
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
      ON CONFLICT (id) DO NOTHING`,
      [
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
      ]
    );
  }

  // 11. Notifications
  for (const n of data.notifications || []) {
    await pool.query(
      `INSERT INTO notifications (id, recipient_org_id, recipient_user_id, workshop_id, title, message, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        n.id,
        n.recipientOrgId,
        n.recipientUserId || null,
        n.workshopId,
        n.title,
        n.message,
        Boolean(n.isRead),
        n.createdAt || new Date().toISOString(),
      ]
    );
  }

  // 12. Workshop Reschedules
  for (const r of data.workshopReschedules || []) {
    await pool.query(
      `INSERT INTO workshop_reschedules (
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
      ON CONFLICT (id) DO NOTHING`,
      [
        r.id,
        r.workshopId,
        r.rescheduledByUserId || null,
        r.rescheduledByName || null,
        r.rescheduledByOrgName || null,
        r.rescheduledByBranchType || 'organizer',
        r.oldStartDate,
        r.oldEndDate,
        r.oldDaysHeld || 1,
        r.oldVenue || null,
        r.newStartDate,
        r.newEndDate,
        r.newDaysHeld || 1,
        r.newVenue || null,
        r.reason || null,
        r.createdAt || new Date().toISOString(),
      ]
    );
  }

  // 13. System Meta
  const lastWorkshopNum = data.meta?.lastWorkshopNumber || data.workshops?.length || 0;
  await pool.query(
    `INSERT INTO system_meta (key, value)
     VALUES ('lastWorkshopNumber', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(lastWorkshopNum)]
  );

  console.log('✅ Initial data seeded successfully into PostgreSQL!');
  console.log(`   - Organizations: ${(data.organizations || []).length}`);
  console.log(`   - Users: ${(data.users || []).length}`);
  console.log(`   - Workshops: ${(data.workshops || []).length}`);
  console.log(`   - Trainees: ${(data.trainees || []).length}`);
  console.log(`   - Resource Persons: ${(data.resourcePersons || []).length}`);
}

async function main() {
  console.log('\n========================================================');
  console.log('🐘 Workshop Management System - PostgreSQL Setup');
  console.log('========================================================\n');

  if (connectionString) {
    const masked = connectionString.replace(/:([^@]+)@/, ':****@');
    console.log(`Connecting via URL: ${masked}`);
  } else {
    console.log(`Connecting to: ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
  }

  await ensureDatabaseExists();

  const pool = new Pool(poolConfig);

  try {
    const test = await pool.query('SELECT NOW() as now, version() as version');
    console.log(`✅ Connected successfully to PostgreSQL server!`);
    console.log(`   Server time: ${test.rows[0].now}`);

    const args = process.argv.slice(2);
    const schemaOnly = args.includes('--schema');
    const seedOnly = args.includes('--seed');

    if (seedOnly) {
      await seedData(pool);
    } else if (schemaOnly) {
      await runSchema(pool);
    } else {
      await runSchema(pool);
      await seedData(pool);
    }

    console.log('\n🎉 PostgreSQL backend setup completed successfully!\n');
  } catch (err) {
    console.error('\n❌ Error setting up PostgreSQL:', err.message);
    if (err.code === '28P01') {
      console.error('👉 Tip: Check your password in DATABASE_URL or PGPASSWORD.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('👉 Tip: Ensure PostgreSQL service is running and port is correct.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
