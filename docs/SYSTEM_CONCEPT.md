# DPWH 360° Infrastructure Project Monitoring and Transparency System

Project Proposal and System Concept – Occidental Mindoro, Philippines

> **Note on implementation:** this document is the approved concept. Where the built system differs
> from it (for example, the flag engine runs inside the database, not in Node.js), the
> [Implementation notes](#implementation-notes) at the end and `database/README.md` describe what is actually built.

---

## 1. Project Overview

The DPWH 360° Infrastructure Project Monitoring and Transparency System is a proposed web-based platform designed to monitor DPWH government infrastructure projects in Occidental Mindoro, Philippines, through 360-degree panoramic imaging, project progress tracking, financial monitoring, GIS mapping, and auditing. The system is focused on the province of Occidental Mindoro (Region IV-B MIMAROPA) and covers the municipalities within the province.

The system will allow DPWH personnel to upload projects, construction progress updates, and 360-degree images documenting actual project site conditions. Once a project is uploaded, the system will automatically evaluate its data and detect whether the project is completed or not completed, and will assign a green, yellow, or red flag without manual intervention. Auditors will verify the automatic flags and may confirm or override them, with a recorded reason, when further investigation or monitoring is needed.

Users can also select a project location on the interactive map. The system will then automatically open the 360-degree view of the project site together with its detailed information, including the approved budget, contract amount, contractor, implementing agency, project duration, progress, and flag status.

The System Administrator will manage the platform, user accounts, and system configurations, while the Public Viewer will have access to approved project information to promote transparency and accountability.

## 2. Proposed System Name

**DPWH 360° – Infrastructure Project Monitoring and Transparency System**

## 3. Main Concept

The system will provide a centralized digital record of every registered infrastructure project, including:

- Project name and identification number.
- Implementing agency or DPWH office.
- Contractor information.
- Approved project budget and contract amount.
- Project location (municipality and barangay within Occidental Mindoro, with coordinates).
- Project duration.
- Construction phases.
- Reported accomplishments.
- Actual site documentation.

DPWH personnel will upload the project record, 360-degree panoramic images, and project progress updates during construction. Upon every upload, the system will automatically detect whether the project is completed or not completed and assign its flag.

The system will automatically compare reported accomplishments with the planned schedule, target completion date, financial records, and available site documentation to determine a green, yellow, or red flag. Auditors will review the flagged projects, verify the findings, and may confirm or override a flag with a recorded reason and supporting evidence.

The public can view approved project information, construction progress, and available 360-degree site documentation. By selecting a project location on the map, users automatically see the 360-degree site view together with project details such as the budget, contractor, and duration.

## 4. Core Functionalities

### 4.1 360° Project Site Monitoring

This feature provides visual documentation of actual infrastructure project sites.

- Upload 360-degree panoramic images.
- View project sites through an interactive 360-degree viewer.
- Organize images by project, construction phase, and inspection date.
- Compare previous and current site conditions.
- Record GPS coordinates and timestamps.
- Display project locations on an interactive map.
- Automatically open the 360-degree view of a project when its location is selected on the map.

### 4.2 Automatic Project Flagging System

The system will automatically evaluate every project whenever DPWH personnel upload a new project record or progress update. It detects whether the project is completed or not completed, whether it is on track or delayed, and whether discrepancies exist, then assigns the appropriate flag. Flags are recalculated with every new upload and by a scheduled daily check, so delays are detected even when no new update is submitted.

**Project flag indicators**

| Flag | Meaning |
|---|---|
| **GREEN** – On Track / Completed | Reported progress meets the planned schedule and documentation is complete. A project is shown as completed when all phases are fully accomplished and a final 360-degree image is on record. |
| **YELLOW** – Needs Attention | The system detected possible delays, incomplete or outdated documentation, or minor differences between physical and financial progress. |
| **RED** – For Investigation | The system detected significant delays, a passed target completion date without completion, questionable or reused images, or large financial discrepancies. |

**Automatic detection checks**

- **Completion check:** a project is marked Completed only when all construction phases total 100% accomplishment, an actual completion date is recorded, and a final 360-degree image is uploaded; otherwise it is marked Not Completed (Ongoing or Delayed).
- **Schedule check:** actual accomplishment is compared with the planned accomplishment for the current date and with the target completion date.
- **Documentation check:** missing or outdated 360-degree images, reused images, and GPS coordinates that do not match the project location are detected.
- **Financial check:** disbursements are compared with physical accomplishment, and disbursements exceeding the contract amount are detected.

The detection thresholds are illustrative and configurable (for example, slippage of 5% or less is Green, above 5% up to 15% is Yellow, and above 15% is Red) and should be based on approved project documents and DPWH guidelines.

> **Important:** The flag is assigned automatically by the system based on the uploaded data and the configured rules. The authorized Auditor reviews flagged projects and may confirm or override a flag; every override must include a recorded reason and supporting evidence. Automatic flagging is a monitoring aid and does not replace engineering inspection or a formal audit.

### 4.3 Phase-by-Phase Project Monitoring

The system will divide infrastructure projects into different construction phases to monitor their progress and accomplishments.

| Sample construction phase | Target weight |
|---|---|
| Site Preparation | 10% |
| Earthworks | 20% |
| Drainage Construction | 20% |
| Road Concreting | 35% |
| Finishing and Inspection | 15% |
| **Total** | **100%** |

Each phase will record:

- Planned and actual starting dates.
- Target and reported accomplishment.
- Phase completion percentage.
- Automatically computed overall project completion (sum of weighted phase accomplishments).
- Uploaded 360-degree documentation.
- Progress update history.
- Audit remarks and findings.
- Financial allocation, when available.

The percentages are illustrative and should be based on approved project documents.

### 4.4 Project Financial Monitoring

This module will monitor the financial information of government infrastructure projects.

- Approved project budget.
- Contract amount.
- Approved variation orders.
- Financial obligations.
- Actual disbursements.
- Reported expenses.
- Remaining project balance.
- Comparison of physical and financial accomplishment.

The Auditor can review financial information and identify discrepancies that may require further investigation.

### 4.5 Contractor and Agency Information

Every project will have a detailed profile containing:

- Project ID and project name.
- Implementing agency or DPWH office.
- Contractor name.
- Contract reference number.
- Project location (municipality and barangay within Occidental Mindoro, with coordinates).
- Approved budget and contract amount.
- Notice to Proceed date.
- Project duration.
- Target completion date.
- Actual completion date.
- Project status.
- Current completion status and flag, detected automatically by the system.

### 4.6 Audit and Inspection Panel

The audit panel will serve as the evaluation center for authorized auditors.

- View all registered infrastructure projects.
- Review uploaded 360-degree images.
- Compare reported and documented accomplishments.
- Review available financial records.
- Record audit findings and remarks.
- Upload supporting evidence.
- Assign audit findings and corrective actions.
- Review automatically assigned flags and confirm or override them with a recorded reason.
- Update the project's audit status.
- Generate downloadable audit reports.

The system will maintain an activity log of audit decisions, status changes, and user actions for accountability.

## 5. GIS Mapping and Project Location

The system will integrate OpenStreetMap for visualizing the geographical locations of registered infrastructure projects.

- Display project locations using map markers on an OpenStreetMap map centered on Occidental Mindoro.
- Show the automatically detected flag status through colored markers (green, yellow, red).
- Automatically open the 360-degree view and detailed project information when a project location (map marker) is selected.
- Show the project details in the same panel: project name and ID, contractor, implementing agency, approved budget and contract amount, project duration and target completion date, current progress, and flag status.
- Filter projects by municipality, barangay, implementing agency or district engineering office, contractor, or status.
- Display project coordinates.
- View available project documentation.

This feature will allow users to identify infrastructure projects within a selected municipality or area of Occidental Mindoro.

When a user selects a location on the map, a project panel opens with the interactive 360-degree viewer showing the latest uploaded panoramic image beside the project details. If no panoramic image has been uploaded yet, the panel shows the project details with a notice that no 360-degree image is available. Public Viewers see only information approved for public disclosure.

## 6. Main System Panels

| System panel | Description |
|---|---|
| Dashboard | Displays project statistics and monitoring summaries. |
| Project Management | Registers and manages infrastructure projects; each upload triggers automatic completion and flag detection. |
| 360° Site Monitoring | Uploads and displays panoramic site images. |
| GIS Project Map | Visualizes project locations; selecting a location automatically opens the 360° view and project details. |
| Project Flagging | Displays automatically detected flags and flagged projects, with auditor confirmation or override. |
| Financial Monitoring | Displays project budgets, contract amounts, and financial records. |
| Contractor Management | Manages contractor information and project assignments. |
| Audit and Inspection | Allows auditors to review projects, record findings, and confirm or override automatic flags. |
| Reports and Analytics | Generates project performance and financial reports. |
| Activity and Audit Logs | Records system activities and changes. |
| User Management | Manages accounts, roles, and access permissions. |

## 7. User Roles and Responsibilities

The system will have four main user roles.

### 7.1 System Administrator

Responsible for managing and maintaining the system.

- Manage user accounts and permissions.
- Create, update, and deactivate accounts.
- Assign user roles.
- Manage system configurations.
- Monitor system activities.
- Manage overall platform access and security.

### 7.2 DPWH Personnel

Responsible for registering and updating infrastructure project information.

- Register infrastructure projects.
- Upload 360-degree panoramic images.
- Submit project progress updates.
- Update construction phase accomplishments.
- Upload supporting project documents.
- Update project information, including contractors, budget, and duration, based on authorized records.
- Submit project updates, which the system automatically evaluates to detect completion status and flag.

### 7.3 Auditor

Responsible for reviewing, evaluating, and auditing infrastructure projects.

- Review project information and progress reports.
- Examine uploaded 360-degree images.
- Compare reported accomplishments with documented site conditions.
- Review available financial information.
- Record audit findings and recommendations.
- Review the automatically assigned flag and confirm or override it (green, yellow, or red).
- Provide reasons and supporting evidence for flag overrides and audit decisions.
- Generate audit reports.
- Monitor corrective actions and project status.

### 7.4 Public Viewer

Responsible for accessing approved public project information.

- View registered public infrastructure projects.
- View project locations through GIS mapping and open the 360-degree view and project details by selecting a location.
- View approved 360-degree site images.
- Monitor construction progress and project status.
- View publicly available budget and contractor information.
- View published project updates and audit findings, subject to disclosure restrictions.

The Public Viewer will have read-only access and will not be allowed to modify project information or audit records.

## 8. Proposed System Workflow

1. **Project Registration** – DPWH personnel register infrastructure projects, including project details, contractor, approved budget, location, and duration.
2. **Project Phase Setup** – Project information and construction phases are organized according to approved project documents.
3. **Project Progress Upload** – DPWH personnel upload construction progress reports, 360-degree images, timestamps, coordinates, and supporting documents.
4. **Automatic Completion and Flag Detection** – Upon every upload, the system automatically compares reported progress with the planned schedule, target completion date, financial records, and available documentation. It detects whether the project is completed or not completed and assigns a green, yellow, or red flag. The flag is also rechecked by a scheduled daily task.
5. **Auditor Verification** – The Auditor reviews the automatically assigned flag and may confirm or override it (Green – On Track / Completed; Yellow – Needs Attention; Red – For Investigation). Any confirmation or override must include the reason and supporting findings for the decision.
6. **Map Access and Public Transparency** – Approved project information, progress updates, flags, and 360-degree images become accessible to the Public Viewer. By selecting a project location on the map, the user automatically sees the 360-degree site view with the project's budget, contractor, and other details.
7. **Monitoring and Reporting** – The system maintains project histories, audit decisions, and monitoring reports for authorized users.

## 9. Recommended Technology Stack

| Technology | Purpose |
|---|---|
| React.js + Vite | Frontend development and application setup. |
| Tailwind CSS | Responsive user interface and styling. |
| Node.js | Backend development for custom server-side processing, automatic completion and flag detection, report generation, and business logic. |
| Supabase (PostgreSQL) | Main database for storing project information, users, contractors, construction phases, progress records, and audit records. Includes the built-in Table Editor and SQL Editor for database administration. |
| Supabase Auth | User authentication and role management. |
| Supabase Storage | Storage of 360-degree images and project documents, with access policies per bucket. |
| Supabase REST API and client library (supabase-js) | Communication between frontend/backend and the database, auto-generated from the database schema. |
| Row Level Security (RLS) | Database-level, role-based access rules for Administrator, DPWH Personnel, Auditor, and Public Viewer. |
| OpenStreetMap | Geographical maps and project location visualization; map markers open the project's 360-degree view and details. |
| Pannellum | Interactive 360-degree panoramic image viewer, opened automatically when a project location is selected. |
| Chart.js | Project progress charts, financial analytics, and dashboard statistics. |

**Proposed architecture**

- React + Vite + Tailwind CSS will handle the frontend interface.
- Supabase will serve as the backend platform: PostgreSQL stores structured project information, user accounts, contractor details, construction phases, progress records, and audit decisions; Supabase Auth handles login and sessions; and Row Level Security enforces role-based permissions directly in the database.
- Node.js will handle custom backend operations that go beyond standard database access, such as running the automatic completion and flag detection (on every upload and on a daily schedule), generating audit reports, and validating image metadata. It may also be replaced or supplemented by Supabase Edge Functions if preferred.
- Supabase Storage will store large image files and supporting documents, while their file references and related metadata (GPS coordinates, timestamps, uploader) will be recorded in PostgreSQL tables.
- OpenStreetMap will provide map visualization; selecting a project marker will load the project's details from PostgreSQL and automatically display its latest 360-degree image in Pannellum. Chart.js will present project statistics and analytics.
- The Supabase Dashboard (Table Editor and SQL Editor) will be used to administer the database, replacing phpMyAdmin.

## 10. Potential Problems and Proposed Solutions

| Potential problem | Proposed solution |
|---|---|
| Limited access to a 360° camera | Use sample panoramic images during development. |
| Fake or reused images | Review timestamps, GPS metadata, upload history, and inspection records. |
| Weak internet connection | Consider offline capture and later synchronization. |
| Incorrect accomplishment reports | Require supporting evidence and auditor verification. |
| Incomplete financial records | Use authorized and verifiable financial documents. |
| Unauthorized data changes | Implement Supabase Auth, Row Level Security policies, and protected audit logs (insert-only audit table). |
| High image-storage requirements | Optimize images and use organized Supabase Storage buckets; monitor storage limits of the chosen Supabase plan. |
| Dependency on a third-party platform | Use standard PostgreSQL schemas and regular database backups so data can be migrated if needed. |
| Incorrect automatic flags | Use configurable rules based on approved guidelines, test them with sample data, and allow auditor review and override with a recorded reason. |
| Project has no 360° image yet | Show the project details with a no-image notice and flag the project Yellow for incomplete documentation. |

> **Important limitation:** A 360-degree image documents visible site conditions but cannot independently verify hidden structural quality, material specifications, or exact completed quantities. Likewise, automatic flags are based only on submitted data. These require appropriate engineering inspections, measurements, and supporting documents.

## 11. Recommended Initial Project Scope

For the initial development, the system will focus on selected DPWH infrastructure projects within Occidental Mindoro, Philippines, rather than attempting nationwide deployment. Coverage may be expanded to other provinces in future development.

**Recommended project types**

1. Road construction and rehabilitation projects.
2. Bridge construction projects.
3. Flood control infrastructure projects.

**Recommended development priorities**

1. Supabase project setup, user authentication, and role-based access control (Row Level Security).
2. Project registration and information management.
3. Contractor and agency records.
4. Phase-by-phase progress monitoring.
5. 360-degree panoramic image uploading and viewing.
6. GIS project mapping with automatic 360-degree view and project details on map selection.
7. Automatic project completion and flag detection, with auditor verification.
8. Financial monitoring.
9. Public project transparency.
10. Reports and audit logs.

## 12. Project Objectives

**General objective**

To design and develop a web-based DPWH 360° Infrastructure Project Monitoring and Transparency System that provides visual documentation, project progress tracking, financial monitoring, automatic project flagging, and auditing to promote infrastructure project transparency and accountability in Occidental Mindoro.

**Specific objectives**

1. To develop a centralized platform for managing infrastructure project information, including contractors, budgets, agencies, and project duration.
2. To integrate 360° panoramic imaging for monitoring actual construction site conditions.
3. To implement phase-by-phase tracking of project progress and accomplishments.
4. To develop a financial monitoring module for tracking project budgets, expenses, and fund utilization.
5. To implement an automatic flagging mechanism that detects whether a project is completed or not and identifies project delays and potential discrepancies, with auditor verification.
6. To integrate GIS mapping for visualizing infrastructure project locations and statuses, where selecting a location automatically opens the 360° view and detailed project information such as budget and contractor.
7. To develop an audit and inspection module for reviewing automatic flags, documenting findings, and generating reports.
8. To provide a dashboard for monitoring project performance, financial records, and overall progress.

## 13. Expected Outcome

The proposed system aims to provide a centralized platform for monitoring DPWH infrastructure projects in Occidental Mindoro through visual site documentation, phase-by-phase progress tracking, financial monitoring, GIS visualization with automatic 360-degree project views, and automatic project flagging verified by auditors.

It is intended to help DPWH personnel provide documented project updates, assist auditors in quickly identifying incomplete or delayed projects, and allow the public to see approved information and site conditions of government-funded projects directly from the map.

## 14. Important Implementation Considerations

- Only authorized DPWH personnel should be allowed to upload and update official project information.
- Auditors should have the authority to review project documentation, verify automatic flags, and make the final decision when a flag is overridden.
- Public users should only access information approved for public disclosure.
- All audit decisions and flag overrides should include recorded reasons and supporting evidence.
- Automatic flagging rules and thresholds must be based on approved project documents and DPWH guidelines and should be configurable by the System Administrator.
- Project information and financial records must come from authorized and verifiable sources.
- The system must implement appropriate authentication, role-based access control (enforced through Supabase Auth and Row Level Security), privacy safeguards, and audit logs.
- Supabase service keys must be kept on the server side only and never exposed in the frontend; only the public (anon) key may be used in the React application, protected by Row Level Security.
- Engineering validation and formal financial audits must remain the responsibility of qualified and authorized personnel.

## 15. Proposed Folder Structure

```
dpwh-360-system/
├── README.md
├── .gitignore
├── docs/                      concept document, progress report, prompt guide, diagrams
├── database/                  Goco
│   ├── migrations/
│   │   ├── 001_core_schema.sql
│   │   ├── 002_phases_finance.sql
│   │   ├── 003_images_storage.sql
│   │   ├── 004_flags_audit.sql
│   │   └── 005_rls_views.sql
│   └── seed/seed.sql
├── server/                    Julina (Node.js/Express)
│   ├── package.json
│   ├── .env.example           service key lives only here, never committed
│   └── src/
│       ├── server.js, app.js
│       ├── config/supabase.js
│       ├── middleware/        auth.js, role.js, validate.js, errorHandler.js
│       ├── routes/            projects, contractors, agencies, phases, finance, images, map, flags, reports
│       ├── controllers/
│       ├── services/          flagDetection, completion, imageValidation, report
│       ├── jobs/dailyFlagCheck.js
│       └── tests/
└── client/                    Tracy and Jonalyn (React + Vite + Tailwind)
    ├── package.json
    ├── .env.example           only the Supabase anon key and the API URL
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx
        ├── lib/               supabaseClient.js, api.js
        ├── context/AuthContext.jsx
        ├── routes/            ProtectedRoute.jsx
        ├── components/        layout, common, map, viewer360, charts
        ├── hooks/
        └── pages/
            ├── auth/          Login (Tracy), Register (Jonalyn)
            ├── admin/         Tracy
            ├── dpwh/          Tracy
            ├── auditor/       Jonalyn
            └── public/        Jonalyn
```

---

## Implementation notes

What is actually built, where it differs from the proposal above. **These notes take precedence.**

| Proposal says | Actually built |
|---|---|
| Node.js runs the automatic completion and flag detection, plus a daily job (`services/flagDetection`, `services/completion`, `jobs/dailyFlagCheck.js`) | The engine is **inside the database**: `evaluate_project()` runs on every insert/update/delete of projects, phases, progress updates, site images, disbursements and variation orders, and a pg_cron job (`dpwh360-daily-flag-check`, 00:05 Manila time) re-checks every project daily. The server does **not** re-implement it; it can call the `rerun_evaluation` RPC when needed. |
| Thresholds are configurable | Stored in the `system_settings` table (`slippage_yellow_pct`, `slippage_red_pct`, `fin_gap_*`, `image_stale_days`, `gps_tolerance_m`, `gps_red_m`), editable by administrators. |
| Image reuse / GPS validation in Node (`imageValidation`) | The database computes `is_reused` (SHA-256 seen before) and `distance_from_site_m` when a `site_images` row is inserted. The browser sends the hash and EXIF data. |
| Auditor confirm/override | The `review_flag(...)` RPC. An override needs a reason (at least 10 characters) and evidence ids. The review sets `effective_flag` until the automatic flag changes. |
| Migrations 001–005 | Migrations `000_reset` … `006_hardening` (all applied to Supabase project IPMATS). |
| Map, 360° viewer, details | Views `v_map_projects` and `v_project_details`; panoramas are in the private `panoramas` bucket and opened with signed URLs in Pannellum. |
| Public disclosure | `is_published` on projects plus approval flags on images, documents and findings, set only through the `publish_project` and `set_disclosure` RPCs. |
| Week 1 page ownership | Per `docs/WEEK1_GUIDE.md`: Tracy built Login, the project form and list; Jonalyn built Register, PendingApproval, and the contractor and agency pages (under `pages/admin/`). |

Full details: `database/README.md`.
