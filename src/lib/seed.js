const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const dataDir = path.dirname(DB_FILE);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const now = new Date().toISOString();

// ── Organization Types ────────────────────────────────────────────────
const organizationTypes = [
  { id: 'ot-moe', name: 'Ministry of Education', level: 1, description: 'Ministry of Education and NIE', createdAt: now },
  { id: 'ot-nie', name: 'National Institute of Education', level: 1, description: 'NIE', createdAt: now },
  { id: 'ot-province', name: 'Provincial Department of Education', level: 2, description: 'Provincial level education departments', createdAt: now },
  { id: 'ot-zone', name: 'Zonal Education Office', level: 3, description: 'Zonal education offices', createdAt: now },
  { id: 'ot-branch', name: 'Zonal Branch / Division', level: 4, description: 'Zonal Branch or Specialized Unit', createdAt: now },
  { id: 'ot-school', name: 'School', level: 4, description: 'Educational institutions', createdAt: now },
];

// ── Organizations ────────────────────────────────────────────────────
const organizations = [
  // Level 1 - MOE Branches (each treated as one organizational user)
  { id: 'org-moe', name: 'Ministry of Education', code: 'MOE', typeId: 'ot-moe', parentId: null, isActive: true, createdAt: now },
  { id: 'org-moe-data', name: 'MOE Data Management Branch', code: 'MOE-DATA', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-ict', name: 'MOE ICT Branch', code: 'MOE-ICT', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-planning', name: 'MOE Planning Branch', code: 'MOE-PLAN', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-finance', name: 'MOE Finance Branch', code: 'MOE-FIN', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-hr', name: 'MOE Human Resources Branch', code: 'MOE-HR', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-curriculum', name: 'MOE Curriculum Development Branch', code: 'MOE-CURR', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-quality', name: 'MOE Quality Assurance Branch', code: 'MOE-QA', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-piriven', name: 'Piriven division', code: 'MOE-PIRIVEN', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-reforms', name: 'Education Reforms', code: 'MOE-REFORMS', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-ncoe', name: 'National College of Education', code: 'MOE-NCOE', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-agri', name: 'Agriculture and Environmental', code: 'MOE-AGRI', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-digital-infra', name: 'Digital Education Infrastructure Development', code: 'MOE-DIGI-INFRA', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-maths', name: 'Mathematics', code: 'MOE-MATHS', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-moe-health', name: 'School Health and Nutrition', code: 'MOE-HEALTH', typeId: 'ot-moe', parentId: 'org-moe', isActive: true, createdAt: now },
  { id: 'org-nie', name: 'National Institute of Education', code: 'NIE', typeId: 'ot-nie', parentId: null, isActive: true, createdAt: now },

  // Level 2 - Provinces
  { id: 'org-prov-western', name: 'Western Province Education Department', code: 'PROV-WP', typeId: 'ot-province', parentId: null, isActive: true, createdAt: now },
  { id: 'org-prov-central', name: 'Central Province Education Department', code: 'PROV-CP', typeId: 'ot-province', parentId: null, isActive: true, createdAt: now },
  { id: 'org-prov-southern', name: 'Southern Province Education Department', code: 'PROV-SP', typeId: 'ot-province', parentId: null, isActive: true, createdAt: now },
  { id: 'org-prov-southern-it', name: 'Southern Province IT Branch', code: 'PROV-SP-IT', typeId: 'ot-branch', parentId: 'org-prov-southern', isActive: true, createdAt: now },
  { id: 'org-prov-northern', name: 'Northern Province Education Department', code: 'PROV-NP', typeId: 'ot-province', parentId: null, isActive: true, createdAt: now },
  { id: 'org-prov-eastern', name: 'Eastern Province Education Department', code: 'PROV-EP', typeId: 'ot-province', parentId: null, isActive: true, createdAt: now },

  // Level 3 - Zones
  { id: 'org-zone-galle', name: 'Galle Zonal Education Office', code: 'ZONE-GALLE', typeId: 'ot-zone', parentId: 'org-prov-southern', isActive: true, createdAt: now },
  { id: 'org-zone-galle-plan', name: 'Galle Zone Planning Branch', code: 'ZONE-GALLE-PLAN', typeId: 'ot-branch', parentId: 'org-zone-galle', isActive: true, createdAt: now },
  { id: 'org-zone-colombo', name: 'Colombo Zonal Education Office', code: 'ZONE-COLOMBO', typeId: 'ot-zone', parentId: 'org-prov-western', isActive: true, createdAt: now },
  { id: 'org-zone-kandy', name: 'Kandy Zonal Education Office', code: 'ZONE-KANDY', typeId: 'ot-zone', parentId: 'org-prov-central', isActive: true, createdAt: now },
  { id: 'org-zone-matara', name: 'Matara Zonal Education Office', code: 'ZONE-MATARA', typeId: 'ot-zone', parentId: 'org-prov-southern', isActive: true, createdAt: now },

  // Target Places (Branches / Users where workshops are held)
  { id: 'org-zone-galle-it', name: 'Galle Zone IT Branch', code: 'ZONE-GALLE-IT', typeId: 'ot-branch', parentId: 'org-zone-galle', isActive: true, createdAt: now },
  { id: 'org-zone-colombo-it', name: 'Colombo Zone IT Branch', code: 'ZONE-COL-IT', typeId: 'ot-branch', parentId: 'org-zone-colombo', isActive: true, createdAt: now },
  { id: 'org-zone-kandy-it', name: 'Kandy Zone IT Branch', code: 'ZONE-KANDY-IT', typeId: 'ot-branch', parentId: 'org-zone-kandy', isActive: true, createdAt: now },
  { id: 'org-zone-matara-it', name: 'Matara Zone IT Branch', code: 'ZONE-MATARA-IT', typeId: 'ot-branch', parentId: 'org-zone-matara', isActive: true, createdAt: now },
];

// ── User Roles ──────────────────────────────────────────────────────
const userRoles = [
  { id: 'role-admin', name: 'System Administrator', description: 'Full system access', canCreateWorkshop: true, canApproveWorkshop: false, canManageUsers: true, canViewReports: true, canManageOrganizations: true },
  { id: 'role-moe-officer', name: 'MOE Officer / Planner', description: 'Creates and schedules workshops', canCreateWorkshop: true, canApproveWorkshop: false, canManageUsers: false, canViewReports: true, canManageOrganizations: false },
  { id: 'role-place-coordinator', name: 'Place Coordinator / Officer', description: 'Receives workshop notifications, assigns trainees & resource persons, exports Excel', canCreateWorkshop: true, canApproveWorkshop: false, canManageUsers: false, canViewReports: true, canManageOrganizations: false },
];

// ── Users ──────────────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('password123', 10);

const users = [
  { id: 'user-admin', username: 'admin', passwordHash, fullName: 'MOE Data Management Branch', email: 'data.management@moe.gov.lk', designation: 'Data Management Branch', organizationId: 'org-moe-data', roleId: 'role-admin', isActive: true, createdAt: now },
  { id: 'user-planning-officer', username: 'planning.officer', passwordHash, fullName: 'MOE Planning Branch', email: 'planning@moe.gov.lk', designation: 'Planning Branch', organizationId: 'org-moe-planning', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-ict-officer', username: 'ict.officer', passwordHash, fullName: 'MOE ICT Branch', email: 'ict@moe.gov.lk', designation: 'ICT Branch', organizationId: 'org-moe-ict', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-piriven', username: 'piriven.officer', passwordHash, fullName: 'Piriven division', email: 'piriven@moe.gov.lk', designation: 'Piriven Division Officer', organizationId: 'org-moe-piriven', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-reforms', username: 'reforms.officer', passwordHash, fullName: 'Education Reforms', email: 'reforms@moe.gov.lk', designation: 'Education Reforms Officer', organizationId: 'org-moe-reforms', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-ncoe', username: 'ncoe.officer', passwordHash, fullName: 'National College of Education', email: 'ncoe@moe.gov.lk', designation: 'NCOE Branch Officer', organizationId: 'org-moe-ncoe', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-agri', username: 'agri.officer', passwordHash, fullName: 'Agriculture and Environmental', email: 'agri@moe.gov.lk', designation: 'Agriculture & Environmental Officer', organizationId: 'org-moe-agri', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-digital-infra', username: 'digital.infra', passwordHash, fullName: 'Digital Education Infrastructure Development', email: 'digital.infra@moe.gov.lk', designation: 'Digital Infrastructure Officer', organizationId: 'org-moe-digital-infra', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-maths', username: 'maths.officer', passwordHash, fullName: 'Mathematics', email: 'maths@moe.gov.lk', designation: 'Mathematics Branch Officer', organizationId: 'org-moe-maths', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-health', username: 'health.officer', passwordHash, fullName: 'School Health and Nutrition', email: 'health@moe.gov.lk', designation: 'School Health & Nutrition Officer', organizationId: 'org-moe-health', roleId: 'role-moe-officer', isActive: true, createdAt: now },
  { id: 'user-galle-it', username: 'galle.it', passwordHash, fullName: 'Galle Zone IT Branch', email: 'it@galle.zone.gov.lk', designation: 'Zonal IT Branch', organizationId: 'org-zone-galle-it', roleId: 'role-place-coordinator', isActive: true, createdAt: now },
  { id: 'user-galle-coord', username: 'galle.coordinator', passwordHash, fullName: 'Galle Zone Planning Branch', email: 'planning@galle.zone.gov.lk', designation: 'Zonal Planning Branch', organizationId: 'org-zone-galle-plan', roleId: 'role-place-coordinator', isActive: true, createdAt: now },
  { id: 'user-southern-it', username: 'southern.it', passwordHash, fullName: 'Southern Province IT Branch', email: 'it@southern.prov.gov.lk', designation: 'Provincial IT Branch', organizationId: 'org-prov-southern-it', roleId: 'role-place-coordinator', isActive: true, createdAt: now },
  { id: 'user-colombo-it', username: 'colombo.it', passwordHash, fullName: 'Colombo Zone IT Branch', email: 'it@colombo.zone.gov.lk', designation: 'Zonal IT Branch', organizationId: 'org-zone-colombo-it', roleId: 'role-place-coordinator', isActive: true, createdAt: now },
];

// ── User Organization Permissions ─────────────────────────────────
const userOrgPermissions = [];
organizations.forEach(org => {
  users.forEach(u => {
    userOrgPermissions.push({ id: uuidv4(), userId: u.id, organizationId: org.id, canCreate: true, canView: true, canApprove: false });
  });
});

// ── Categories & Statuses ─────────────────────────────────────────
const workshopCategories = [
  { id: 'cat-ict', name: 'Information & Communication Technology', description: 'ICT workshops', isActive: true },
  { id: 'cat-stem', name: 'STEM & Science', description: 'STEM workshops', isActive: true },
  { id: 'cat-math', name: 'Mathematics', description: 'Mathematics pedagogy', isActive: true },
  { id: 'cat-lang', name: 'English & Languages', description: 'Language teaching workshops', isActive: true },
  { id: 'cat-mgmt', name: 'Educational Management', description: 'Administration and planning', isActive: true },
];

const workshopStatuses = [
  { id: 'status-scheduled', name: 'Scheduled', description: 'Workshop is scheduled and notified to the place', displayOrder: 1, color: '#00534E' },
  { id: 'status-ongoing', name: 'In Progress', description: 'Workshop is currently being held', displayOrder: 2, color: '#EB7400' },
  { id: 'status-completed', name: 'Completed', description: 'Workshop has concluded', displayOrder: 3, color: '#8D153A' },
];

// ── Sample Workshops (Following User's Simple Flow) ────────────────
const workshops = [
  {
    id: 'ws-001',
    workshopNumber: 'MOE/ICT/20250512/0001',
    year: '2025',
    branch: 'MOE - ICT Branch',
    subject: 'Information & Communication Technology',
    title: 'Python & Web Development for Teachers',
    aim: 'Equip Galle Zone secondary school teachers with hands-on Python programming and web development pedagogy.',
    placeId: 'org-zone-galle-it',
    placeName: 'Galle Zone IT Branch',
    daysHeld: 3,
    startDate: '2025-05-12',
    endDate: '2025-05-14',
    venue: 'Galle District Education Resource Centre (Computer Lab A)',
    organizingOrgId: 'org-moe-ict',
    targetOrgId: 'org-zone-galle-it',
    expectedTrainees: 45,
    actualTrainees: 42,
    status: 'Scheduled',
    statusId: 'status-scheduled',
    statusName: 'Scheduled',
    createdBy: 'user-ict-officer',
    creatorName: 'MOE ICT Branch',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'ws-002',
    workshopNumber: 'MOE/PLANNING/20250602/0001',
    year: '2025',
    branch: 'MOE - Planning Branch',
    subject: 'Educational Management & Data Analysis',
    title: 'School Census & Digital Attendance Management',
    aim: 'Train zonal coordinators on national education data collection, SIS management, and statistical reporting.',
    placeId: 'org-zone-colombo-it',
    placeName: 'Colombo Zone IT Branch',
    daysHeld: 2,
    startDate: '2025-06-02',
    endDate: '2025-06-03',
    venue: 'Colombo Regional IT Centre',
    organizingOrgId: 'org-moe-planning',
    targetOrgId: 'org-zone-colombo-it',
    expectedTrainees: 35,
    actualTrainees: 0,
    status: 'Scheduled',
    statusId: 'status-scheduled',
    statusName: 'Scheduled',
    createdBy: 'user-planning-officer',
    creatorName: 'MOE Planning Branch',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'ws-003',
    workshopNumber: 'MOE/DATA-MANAGEMENT/20250720/0001',
    year: '2025',
    branch: 'Ministry of Education',
    subject: 'National Education Leadership & Governance',
    title: 'National Workshop on Digital Education Leadership',
    aim: 'Provide provincial and zonal leadership teams with institutional guidance on digital education programs and workshop oversight.',
    placeId: 'org-zone-galle-it',
    placeName: 'Galle Zone IT Branch',
    daysHeld: 2,
    startDate: '2025-07-20',
    endDate: '2025-07-21',
    venue: 'Galle Regional Leadership Center',
    organizingOrgId: 'org-moe',
    targetOrgId: 'org-zone-galle-it',
    expectedTrainees: 30,
    actualTrainees: 0,
    status: 'Scheduled',
    statusId: 'status-scheduled',
    statusName: 'Scheduled',
    createdBy: 'user-admin',
    creatorName: 'MOE Data Management Branch',
    createdAt: now,
    updatedAt: now,
  },
];

// ── Sample Trainees (for ws-001 at Galle Zone IT Branch) ───────────
const trainees = [
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 1,
    nicNumber: '199234567890',
    name: 'Amara Dissanayake',
    position: 'ICT Teacher',
    schoolInstitute: 'Mahinda College, Galle',
    region: 'Galle Zone',
    province: 'Southern Province',
    phone: '0771234567',
    designation: 'ICT Teacher',
    organization: 'Mahinda College, Galle',
    email: 'amara@school.lk',
    attendanceStatus: 'attended',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 2,
    nicNumber: '198756789012',
    name: 'Buddhika Rajapaksa',
    position: 'Science & ICT Teacher',
    schoolInstitute: 'Richmond College, Galle',
    region: 'Galle Zone',
    province: 'Southern Province',
    phone: '0772345678',
    designation: 'Science & ICT Teacher',
    organization: 'Richmond College, Galle',
    email: 'buddhika@school.lk',
    attendanceStatus: 'attended',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 3,
    nicNumber: '199012345678',
    name: 'Chaminda Perera',
    position: 'Mathematics Teacher',
    schoolInstitute: 'Southlands College, Galle',
    region: 'Galle Zone',
    province: 'Southern Province',
    phone: '0773456789',
    designation: 'Mathematics Teacher',
    organization: 'Southlands College, Galle',
    email: 'chaminda@school.lk',
    attendanceStatus: 'attended',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 4,
    nicNumber: '199187654321',
    name: 'Dilani Wickremasinghe',
    position: 'English & IT Teacher',
    schoolInstitute: 'Sanghamitta Balika Vidyalaya',
    region: 'Galle Zone',
    province: 'Southern Province',
    phone: '0774567890',
    designation: 'English & IT Teacher',
    organization: 'Sanghamitta Balika Vidyalaya',
    email: 'dilani@school.lk',
    attendanceStatus: 'registered',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 5,
    nicNumber: '198823456789',
    name: 'Eranga Senanayake',
    position: 'ICT Teacher',
    schoolInstitute: 'Rippon Girls College, Galle',
    region: 'Galle Zone',
    province: 'Southern Province',
    phone: '0775678901',
    designation: 'ICT Teacher',
    organization: 'Rippon Girls College, Galle',
    email: 'eranga@school.lk',
    attendanceStatus: 'attended',
    createdAt: now,
    updatedAt: now,
  },
];

// ── Sample Resource Persons ─────────────────────────────────────
const resourcePersons = [
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 1,
    nic: '197824501234',
    name: 'Prof. Ajith Madurapperuma',
    position: 'Senior Lecturer in Computing',
    service: 'Sri Lanka University Academic Service',
    grade: 'Senior Professor (Grade I)',
    workplace: 'University of Ruhuna',
    personalAddress: 'No. 12, Beach Road, Matara',
    educationalQualifications: 'Ph.D. in Computer Science (UK), B.Sc (Hons) in Computing',
    subjectQualifications: 'Python Programming, Cloud Architecture, IEEE Fellow',
    phone: '0776789012',
    specialNotes: 'Main instructor for days 1 and 2',
    organization: 'University of Ruhuna',
    designation: 'Senior Lecturer in Computing',
    expertiseArea: 'Python Programming & Cloud',
    roleInWorkshop: 'Lead Facilitator',
    email: 'ajith@ruh.ac.lk',
    remarks: 'Main instructor for days 1 and 2',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 2,
    nic: '198267809876',
    name: 'Dr. Buddhini Samarasinghe',
    position: 'Senior Curriculum Developer',
    service: 'National Institute of Education Academic Staff',
    grade: 'Grade I',
    workplace: 'National Institute of Education (NIE)',
    personalAddress: 'No. 45, High Level Road, Maharagama',
    educationalQualifications: 'Ph.D. in Education Pedagogy, M.Ed, B.Sc',
    subjectQualifications: 'Digital Pedagogy & STEM Curriculum Specialization',
    phone: '0777890123',
    specialNotes: 'Assisting pedagogical integration and lesson plans',
    organization: 'NIE',
    designation: 'Senior Curriculum Developer',
    expertiseArea: 'Digital Pedagogy & STEM',
    roleInWorkshop: 'Co-Facilitator',
    email: 'buddhini@nie.lk',
    remarks: 'Assisting pedagogical integration',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    workshopId: 'ws-001',
    serialNumber: 3,
    nic: '198912304567',
    name: 'Lahiru Gunasekara',
    position: 'Technical Consultant',
    service: 'Sri Lanka ICT Service (SLICTS)',
    grade: 'Grade II',
    workplace: 'MOE - ICT Branch',
    personalAddress: 'No. 88, Galle Road, Colombo 03',
    educationalQualifications: 'B.Sc in Information Technology, CCNA, RHCE',
    subjectQualifications: 'Server Infrastructure & Linux Lab Orchestration',
    phone: '0778901234',
    specialNotes: 'Managing software installations and local network setup',
    organization: 'MOE - ICT Branch',
    designation: 'Technical Consultant',
    expertiseArea: 'Server & Lab Setup',
    roleInWorkshop: 'Lab Coordinator',
    email: 'lahiru@moe.gov.lk',
    remarks: 'Managing software installations',
    createdAt: now,
    updatedAt: now,
  },
];

// ── Initial Notifications (Sent to Place) ──────────────────────────
const notifications = [
  {
    id: uuidv4(),
    recipientOrgId: 'org-zone-galle-it',
    workshopId: 'ws-001',
    title: '📢 Workshop Scheduled at Galle Zone IT Branch',
    message: 'MOE - ICT Branch has scheduled "Python & Web Development for Teachers" (Subject: Information & Communication Technology) at Galle Zone IT Branch for 3 days in 2025. Please register your trainees and resource persons.',
    isRead: false,
    createdAt: now,
  },
  {
    id: uuidv4(),
    recipientOrgId: 'org-zone-colombo-it',
    workshopId: 'ws-002',
    title: '📢 Workshop Scheduled at Colombo Zone IT Branch',
    message: 'MOE - Planning Branch has scheduled "School Census & Digital Attendance Management" at Colombo Zone IT Branch for 2 days in 2025.',
    isRead: false,
    createdAt: now,
  },
  {
    id: uuidv4(),
    recipientOrgId: 'org-zone-galle-it',
    workshopId: 'ws-003',
    title: '📢 Workshop Scheduled at Galle Zone IT Branch',
    message: 'Ministry of Education has scheduled "National Workshop on Digital Education Leadership" at Galle Zone IT Branch for 2 days in 2025.',
    isRead: false,
    createdAt: now,
  },
];

// ── Build Database ──────────────────────────────────────────────
const database = {
  organizationTypes,
  organizations,
  userRoles,
  users,
  userOrgPermissions,
  workshopCategories,
  workshopStatuses,
  workshops,
  trainees,
  resourcePersons,
  workshopApprovals: [],
  attachments: [],
  notifications,
  meta: { lastWorkshopNumber: 3 },
};

fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');

console.log('\n✅ Database seeded successfully with simplified workflow!');
console.log(`Places / Branches: ${organizations.filter(o => o.typeId === 'ot-branch').map(b => b.name).join(', ')}`);
console.log(`Workshops: ${workshops.length}`);
console.log(`Notifications: ${notifications.length}`);
