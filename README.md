# Workshop Management System (Ministry of Education - Sri Lanka)

A standalone parallel web application built with **Next.js 14**, **TypeScript**, and **Vanilla CSS Design System**, designed for workshop planning, participant management, and organizational hierarchy lifecycle approvals across all educational administrative tiers.

> **Future Integration Note**: Designed with clean domain separation so it can be seamlessly embedded into the **Budget Management System as the Workshop Management module** without redesigning the core workflow or schemas.

---

## 🏛️ Organizational Hierarchy (4 Levels)

The system enforces strict hierarchy-based access control and target organization permission filtering:

| Level | Organization Type | Description | System Unit Rule |
| :--- | :--- | :--- | :--- |
| **Level 1** | **MOE / NIE** | Ministry of Education & National Institute of Education | **An MOE Branch is treated as one organizational user unit** (e.g., `MOE – ICT Branch`, `MOE – Planning Branch`, `MOE – Finance Branch`). Internal divisions do not act as separate hierarchy levels. |
| **Level 2** | **Province** | Provincial Departments of Education | Controls all educational zones and institutions within the province (e.g. `Southern Province Education Department`). |
| **Level 3** | **Zone** | Zonal Education Offices | Coordinates and reviews workshops for schools and divisions within the zone (e.g. `Galle Zonal Education Office`, `Colombo Zonal Office`). |
| **Level 4** | **Other Institutions** | Divisional Education Offices & Schools | Participating institutions and schools (e.g. `Galle South Divisional Office`). |

---

## 🚀 Key Features

1. **Hierarchy-Based Access Control & Target Selection**:
   - When an **MOE ICT Branch** user plans a workshop, the target organization dropdown dynamically permits targeting all provinces, zones (e.g. **Galle Zone**), or divisions.
   - Provincial directors can target zones within their province.
   - Zonal directors can target schools and divisions within their zone.
2. **Workshop Registration**:
   - System-generated Workshop ID (`WS-YYYY-XXXX`).
   - Title, Category, Objective, Description, Venue, Dates, Organizing Unit, Target Organization, and Expected Trainees.
   - Option to save as **Draft** or **Submit for Review immediately**.
3. **Trainee Management**:
   - Add, edit, remove, and view trainees.
   - Captures: Name, NIC/Employee ID, Designation, Organization/School, Email, Phone, Attendance Status (`Registered`, `Attended`, `Absent`), and Remarks.
   - Trainee capacity vs. expected progress indicators.
4. **Resource Person Management**:
   - Add, edit, remove, and view resource persons.
   - Captures: Name, Organization/University, Designation, Area of Expertise, Role in Workshop (`Lead Facilitator`, `Trainer`, etc.), Contact details, and Remarks.
5. **Workshop Lifecycle Status Workflow & Approvals**:
   - 9 Lifecycle Statuses:
     - `Draft`
     - `Submitted`
     - `Under Review`
     - `Approved`
     - `Returned for Revision`
     - `Rejected`
     - `Ongoing`
     - `Completed`
     - `Cancelled`
   - Complete audit trail logging: records reviewer, action taken, comments, timestamp, and status transition.
6. **Executive Dashboard & Reporting**:
   - Status distribution breakdown, target organization charts, real-time KPI metrics.
   - Printable reports and CSV export functionality.
7. **Demo Persona Fast-Switcher**:
   - Header dropdown and login screen fast-switchers allow instant testing between different hierarchy tiers (National Admin, MOE Branch Directors, Provincial Directors, and Zonal Directors).

---

## 🔑 Demo Credentials

Default password for all demo accounts: `password123`

| Username | Role | Organization Unit | Hierarchy Level |
| :--- | :--- | :--- | :--- |
| `admin` | System Administrator | Ministry of Education | National (All Levels) |
| `ict.officer` | MOE Officer | MOE - ICT Branch | Level 1 – MOE Branch |
| `ict.director` | MOE Director | MOE - ICT Branch | Level 1 – MOE Branch |
| `planning.director` | MOE Director | MOE - Planning Branch | Level 1 – MOE Branch |
| `sp.director` | Provincial Director | Southern Province Dept. of Education | Level 2 – Province |
| `galle.director` | Zonal Director | Galle Zonal Education Office | Level 3 – Zone |
| `galle.coordinator` | Workshop Coordinator | Galle Zonal Education Office | Level 3 – Zone |
| `colombo.director` | Zonal Director | Colombo Zonal Education Office | Level 3 – Zone |

---

## 🛠️ How to Run Locally

### Option A: With PostgreSQL Backend (Recommended for Production & Vercel)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file (or copy from `.env.example`):
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/workshop_ms
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=workshop-management-system-secret-key-2026
   ```
   *(Works seamlessly with local PostgreSQL, Supabase, Neon, AWS RDS, or Vercel Postgres)*

3. **Initialize & Seed PostgreSQL database**:
   ```bash
   npm run db:init
   ```
   *(This creates all relational tables, foreign keys, performance indexes, and seeds initial data from `database.json`)*

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Verify database connection**:
   Visit [http://localhost:3000/api/db-status](http://localhost:3000/api/db-status) to confirm PostgreSQL status and table row counts.

---

### Option B: Without PostgreSQL (Local JSON Fallback)

If no `DATABASE_URL` is configured, the system automatically falls back to the embedded local JSON database:

```bash
# 1. Install dependencies
npm install

# 2. Seed JSON database with initial educational hierarchy and sample workshops
node src/lib/seed.js

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

