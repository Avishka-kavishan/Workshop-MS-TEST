-- ====================================================================
-- Workshop Management System - PostgreSQL Database Schema
-- Ministry of Education Sri Lanka
-- ====================================================================

-- 1. Organization Types (Levels: 1=MOE/NIE, 2=Province, 3=Zone, 4=Branch/School)
CREATE TABLE IF NOT EXISTS organization_types (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level INT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organizations & Administrative Units
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  type_id VARCHAR(100) REFERENCES organization_types(id) ON DELETE SET NULL,
  parent_id VARCHAR(100) REFERENCES organizations(id) ON DELETE SET NULL,
  unit_type VARCHAR(50) DEFAULT 'location', -- 'location' (Province/Zone/School) or 'branch' (IT Branch, Planning)
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  can_create_workshop BOOLEAN DEFAULT FALSE,
  can_approve_workshop BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_manage_organizations BOOLEAN DEFAULT FALSE
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  designation VARCHAR(255),
  organization_id VARCHAR(100) REFERENCES organizations(id) ON DELETE SET NULL,
  role_id VARCHAR(100) REFERENCES user_roles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Organization Permissions
CREATE TABLE IF NOT EXISTS user_org_permissions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(100) REFERENCES organizations(id) ON DELETE CASCADE,
  can_create BOOLEAN DEFAULT FALSE,
  can_view BOOLEAN DEFAULT TRUE,
  can_approve BOOLEAN DEFAULT FALSE
);

-- 6. Workshop Categories
CREATE TABLE IF NOT EXISTS workshop_categories (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- 7. Workshop Statuses
CREATE TABLE IF NOT EXISTS workshop_statuses (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  color VARCHAR(50)
);

-- 8. Workshops
CREATE TABLE IF NOT EXISTS workshops (
  id VARCHAR(100) PRIMARY KEY,
  workshop_number VARCHAR(100),
  year VARCHAR(10),
  branch VARCHAR(255),
  subject VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  aim TEXT,
  expected_output TEXT,
  place_id VARCHAR(100),
  place_name VARCHAR(255),
  target_level VARCHAR(50),
  target_path JSONB DEFAULT '[]'::jsonb,
  days_held INT DEFAULT 1,
  workshop_type VARCHAR(100),
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  venue VARCHAR(500),
  organizing_org_id VARCHAR(100),
  target_org_id VARCHAR(100),
  is_self_organized BOOLEAN DEFAULT FALSE,
  expected_trainees INT DEFAULT 0,
  actual_trainees INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Scheduled',
  confirmation_status VARCHAR(50) DEFAULT 'Confirmed',
  status_id VARCHAR(100),
  status_name VARCHAR(100),
  category_id VARCHAR(100),
  category_name VARCHAR(255),
  objective TEXT,
  description TEXT,
  original_start_date VARCHAR(50),
  original_end_date VARCHAR(50),
  original_venue VARCHAR(500),
  reschedule_count INT DEFAULT 0,
  last_rescheduled_at TIMESTAMPTZ,
  last_reschedule_reason TEXT,
  created_by VARCHAR(100),
  creator_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Workshop Reschedule History
CREATE TABLE IF NOT EXISTS workshop_reschedules (
  id VARCHAR(100) PRIMARY KEY,
  workshop_id VARCHAR(100) REFERENCES workshops(id) ON DELETE CASCADE,
  rescheduled_by_user_id VARCHAR(100),
  rescheduled_by_name VARCHAR(255),
  rescheduled_by_org_name VARCHAR(255),
  rescheduled_by_branch_type VARCHAR(50),
  old_start_date VARCHAR(50),
  old_end_date VARCHAR(50),
  old_days_held INT,
  old_venue VARCHAR(500),
  new_start_date VARCHAR(50),
  new_end_date VARCHAR(50),
  new_days_held INT,
  new_venue VARCHAR(500),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Trainees
CREATE TABLE IF NOT EXISTS trainees (
  id VARCHAR(100) PRIMARY KEY,
  workshop_id VARCHAR(100) REFERENCES workshops(id) ON DELETE CASCADE,
  serial_number INT,
  nic_number VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  school_institute VARCHAR(255),
  region VARCHAR(255),
  province VARCHAR(255),
  phone VARCHAR(50),
  designation VARCHAR(255),
  organization VARCHAR(255),
  email VARCHAR(255),
  attendance_status VARCHAR(50) DEFAULT 'registered',
  daily_attendance JSONB DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Resource Persons (Global & Workshop-Specific)
CREATE TABLE IF NOT EXISTS resource_persons (
  id VARCHAR(100) PRIMARY KEY,
  workshop_id VARCHAR(100),
  serial_number INT,
  nic VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  service VARCHAR(255),
  grade VARCHAR(100),
  workplace VARCHAR(255),
  personal_address TEXT,
  educational_qualifications TEXT,
  subject_qualifications TEXT,
  phone VARCHAR(50),
  special_notes TEXT,
  organization VARCHAR(255),
  designation VARCHAR(255),
  expertise_area VARCHAR(255),
  role_in_workshop VARCHAR(255),
  email VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Workshop Approvals & Audit Trail
CREATE TABLE IF NOT EXISTS workshop_approvals (
  id VARCHAR(100) PRIMARY KEY,
  workshop_id VARCHAR(100) REFERENCES workshops(id) ON DELETE CASCADE,
  reviewer_id VARCHAR(100),
  action VARCHAR(50),
  comments TEXT,
  previous_status_id VARCHAR(100),
  new_status_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(100) PRIMARY KEY,
  workshop_id VARCHAR(100) REFERENCES workshops(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  file_path TEXT,
  uploaded_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(100) PRIMARY KEY,
  recipient_org_id VARCHAR(100),
  recipient_user_id VARCHAR(100),
  workshop_id VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. System Metadata
CREATE TABLE IF NOT EXISTS system_meta (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_workshops_place ON workshops(place_id);
CREATE INDEX IF NOT EXISTS idx_workshops_target_org ON workshops(target_org_id);
CREATE INDEX IF NOT EXISTS idx_workshops_organizing_org ON workshops(organizing_org_id);
CREATE INDEX IF NOT EXISTS idx_workshops_created_by ON workshops(created_by);
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_year ON workshops(year);
CREATE INDEX IF NOT EXISTS idx_trainees_workshop ON trainees(workshop_id);
CREATE INDEX IF NOT EXISTS idx_resource_persons_workshop ON resource_persons(workshop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_org_id, recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_reschedules_workshop ON workshop_reschedules(workshop_id);


-- 16. AIP Plans
CREATE TABLE IF NOT EXISTS aip_plans (
  id VARCHAR(100) PRIMARY KEY,
  branch_id VARCHAR(100) REFERENCES organizations(id) ON DELETE CASCADE,
  branch_name VARCHAR(255),
  year VARCHAR(10) NOT NULL DEFAULT '2027',
  phase_title VARCHAR(255) DEFAULT '3. Implementation Phase',
  target_title VARCHAR(255) DEFAULT 'Overall Physical and Financial Targets 2027',
  main_responsibility VARCHAR(255),
  main_contact_no VARCHAR(50),
  overall_responsibility VARCHAR(255),
  overall_contact_no VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AIP Activities
CREATE TABLE IF NOT EXISTS aip_activities (
  id VARCHAR(100) PRIMARY KEY,
  plan_id VARCHAR(100) REFERENCES aip_plans(id) ON DELETE SET NULL,
  branch_id VARCHAR(100) REFERENCES organizations(id) ON DELETE CASCADE,
  branch_name VARCHAR(255),
  year VARCHAR(10) NOT NULL DEFAULT '2027',
  output_no VARCHAR(50) DEFAULT '1',
  activity_code VARCHAR(50) NOT NULL,
  activity TEXT NOT NULL,
  vote_number VARCHAR(100),
  estimated_cost NUMERIC(15, 3) DEFAULT 0,
  financial_months JSONB DEFAULT '[]',
  physical_months JSONB DEFAULT '[]',
  financial_q1 NUMERIC(15, 3) DEFAULT 0,
  financial_q2 NUMERIC(15, 3) DEFAULT 0,
  financial_q3 NUMERIC(15, 3) DEFAULT 0,
  financial_q4 NUMERIC(15, 3) DEFAULT 0,
  target_q1 VARCHAR(50),
  target_q2 VARCHAR(50),
  target_q3 VARCHAR(50),
  target_q4 VARCHAR(50),
  responsible_officer VARCHAR(255),
  created_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
  creator_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aip_plans_branch ON aip_plans(branch_id, year);
CREATE INDEX IF NOT EXISTS idx_aip_activities_branch ON aip_activities(branch_id, year);
