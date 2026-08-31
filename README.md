<div align="center">

# 🩸 LifeLink

### *Intelligent Blood Donation & Emergency Healthcare Coordination Platform*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A full-stack healthcare platform connecting blood donors, recipients, hospitals, blood banks, and NGOs to streamline emergency blood requests, inventory management, and community donation drives in real-time.
</p>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features by Role](#-key-features-by-role)
- [Visual Feature Tour](#-visual-feature-tour)
  - [Public & Authentication](#1-public--authentication)
  - [User & Donor Portal](#2-user--donor-portal)
  - [Hospital Portal](#3-hospital-portal)
  - [Blood Bank Portal](#4-blood-bank-portal)
  - [NGO & Drive Organizers](#5-ngo--drive-organizers)
  - [Admin Governance & Analytics](#6-admin-governance--analytics)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Demo Test Credentials](#-demo-test-credentials)
- [API Endpoints Overview](#-api-endpoints-overview)
- [Project Directory Structure](#-project-directory-structure)

---

## 🌟 Overview

**LifeLink** is engineered to eliminate critical delays in emergency healthcare. In life-or-death situations, finding compatible blood is often slowed down by fragmented communication between patients, hospitals, and blood banks. 

LifeLink integrates all healthcare stakeholders into a single, unified digital network:
- **Patients & Donors** can broadcast emergency blood requests and track availability within their vicinity.
- **Hospitals** verify medical necessity, manage emergency patient requests, and link directly with blood banks.
- **Blood Banks** maintain real-time unit inventory across all blood types and coordinate blood camp collections.
- **NGOs** organize community donation drives and mobilize local volunteer networks during surges.
- **Administrators** verify institutional credentials, audit system-wide health, and ensure patient safety standards.

---

## 🚀 Key Features by Role

### 👤 Donors & General Users
- **Emergency Blood Request Creation:** Multi-step wizard with patient details, hospital location, required units, and urgency level.
- **Live Status Tracking:** Real-time timeline from verification through blood bank dispatch and hospital confirmation.
- **Donor Mode Toggle:** Enable/disable donor availability, specify blood type, and receive immediate alerts for nearby matches.
- **Blood Compatibility Matrix:** Interactive compatibility reference for RBC and plasma compatibility.
- **Donation History & Impact:** Track past donation dates, locations, and lives saved counter.
- **Notifications Hub:** Real-time updates on active requests, matching alerts, and donation camp announcements.

### 🏥 Hospital Management
- **Request Triage & Review:** Verify patient emergency requisitions and attach medical urgency tags.
- **Blood Bank Requisition:** Dispatch verified blood requests directly to linked blood bank facilities.
- **Delivery Confirmation:** Secure handshake to confirm receipt of blood units from blood banks.
- **Audit History:** Comprehensive log of fulfilled and historical hospital patient requests.

### 🩸 Blood Bank Operations
- **Live Inventory Management:** Real-time stock counters across all blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-) with low-stock warnings.
- **Requisition Processing:** Accept, process, and dispatch blood units to linked hospitals.
- **Camp Management:** Host, schedule, and log blood collection drives with attendee tracking.
- **Hospital Partnerships:** Manage two-way digital links and permissions with verified medical facilities.

### 🤝 NGO Coordination
- **Community Surge Response:** Respond to urgent unfulfilled blood needs with coordinated volunteer drives.
- **Donation Drive Publishing:** Create, publish, and manage blood donation camps with date, venue, and target donor capacity.
- **Volunteer Mobilization:** Engage registered community donors through targeted location outreach.

### 🛡️ System Administration
- **Organization Verification (KYC):** Review, verify, approve, or reject incoming Hospital, Blood Bank, and NGO registrations.
- **User Governance:** Inspect user profiles, roles, and status with administrative oversight.
- **Analytics & Health Metrics:** System-wide metrics on request fulfillment rate, inventory levels, and user registrations.
- **Reports & Auditing:** Exportable logs and summary audit trails for healthcare compliance.

---

## 📸 Visual Feature Tour

### 1. Public & Authentication

| Landing Page | Login | Registration |
|:---:|:---:|:---:|
| <img src="screenshots/01_landing_page.png" width="300"/> | <img src="screenshots/02_login.png" width="300"/> | <img src="screenshots/03_register.png" width="300"/> |
| *Hero, metrics, camp listings & emergency CTA* | *Unified auth with role-based routing* | *User & Organization registration with validation* |

---

### 2. User & Donor Portal

| User Dashboard | Request Blood Form | My Requests & Tracking |
|:---:|:---:|:---:|
| <img src="screenshots/04_user_dashboard.png" width="300"/> | <img src="screenshots/05_request_blood.png" width="300"/> | <img src="screenshots/06_my_requests.png" width="300"/> |
| *Active requests, donor toggle & compatibility* | *Urgency picker, hospital selection & units* | *Live request tracking with status timeline* |

| Donation History | Notifications Hub | User Profile |
|:---:|:---:|:---:|
| <img src="screenshots/07_donation_history.png" width="300"/> | <img src="screenshots/08_notifications.png" width="300"/> | <img src="screenshots/09_user_profile.png" width="300"/> |
| *Donation logs, metrics & impact statistics* | *Emergency alerts & request updates* | *Personal info, blood group & donor preferences* |

---

### 3. Hospital Portal

| Hospital Dashboard | Pending Requests Triage | Linked Blood Bank |
|:---:|:---:|:---:|
| <img src="screenshots/10_hospital_dashboard.png" width="300"/> | <img src="screenshots/11_hospital_pending_requests.png" width="300"/> | <img src="screenshots/12_hospital_linked_bloodbank.png" width="300"/> |
| *Hospital statistics, request trends & quick actions* | *Medical verification and triage pipeline* | *Direct supply chain link to blood banks* |

---

### 4. Blood Bank Portal

| Blood Bank Dashboard | Live Inventory | Camps & Drives |
|:---:|:---:|:---:|
| <img src="screenshots/14_bloodbank_dashboard.png" width="300"/> | <img src="screenshots/15_bloodbank_inventory.png" width="300"/> | <img src="screenshots/18_bloodbank_camps.png" width="300"/> |
| *Operations summary & incoming requisitions* | *Real-time stock by blood group (A/B/AB/O +/-)* | *Upcoming camp schedules & donor registrations* |

---

### 5. NGO & Drive Organizers

| NGO Dashboard | Active Emergency Requests | Donation Drives |
|:---:|:---:|:---:|
| <img src="screenshots/19_ngo_dashboard.png" width="300"/> | <img src="screenshots/20_ngo_active_requests.png" width="300"/> | <img src="screenshots/21_ngo_donation_drives.png" width="300"/> |
| *NGO activity, responses & volunteer reach* | *Urgent community needs awaiting assistance* | *Scheduled donation drives and venue details* |

---

### 6. Admin Governance & Analytics

| Admin Dashboard | Organization KYC Approvals | User Management |
|:---:|:---:|:---:|
| <img src="screenshots/23_admin_dashboard.png" width="300"/> | <img src="screenshots/24_admin_org_approvals.png" width="300"/> | <img src="screenshots/25_admin_users.png" width="300"/> |
| *Platform overview, active users & total requests* | *Verify HRF registration & approve organizations* | *Directory of registered donors and recipients* |

| Analytics & Insights | System Reports |
|:---:|:---:|
| <img src="screenshots/26_admin_analytics.png" width="400"/> | <img src="screenshots/27_admin_reports.png" width="400"/> |
| *Visual fulfillment statistics & blood group breakdown* | *Audit logs, compliance metrics & system exports* |

---

## 🛠️ System Architecture

```mermaid
graph TD
    User["👤 Donors & Patients"] -->|Create Request / Donate| Frontend["⚛️ React 18 + Vite Frontend"]
    Hospital["🏥 Hospitals"] -->|Verify & Order Blood| Frontend
    BloodBank["🩸 Blood Banks"] -->|Manage Inventory & Fulfill| Frontend
    NGO["🤝 NGOs"] -->|Organize Drives| Frontend
    Admin["🛡️ System Admin"] -->|KYC & Governance| Frontend

    Frontend -->|REST API / JWT Bearer| Backend["⚡ FastAPI Backend (Python)"]
    
    subgraph Backend Core
        Backend --> Auth["🔐 Auth & Security (bcrypt / JWT)"]
        Backend --> Services["💼 Services Layer (Requests, Inventory, Camps)"]
        Backend --> Router["🛣️ API v1 Router"]
    end

    Services --> ORM["📦 SQLAlchemy ORM"]
    ORM --> DB[("🗄️ Database (SQLite / PostgreSQL)")]
```

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State & Auth:** React Context API + LocalStorage token persistence
- **Icons & UI:** Lucide React, Custom CSS Design System
- **Mapping & Geocoding:** Leaflet & OpenStreetMap integration

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **ASGI Server:** Uvicorn
- **ORM & DB:** SQLAlchemy with SQLite (dev) / PostgreSQL (prod-ready)
- **Migrations:** Alembic
- **Validation:** Pydantic v2
- **Authentication:** OAuth2 Password Bearer with JWT tokens & passlib (bcrypt)
- **API Docs:** Interactive Swagger UI (`/docs`) & ReDoc (`/redoc`)

---

## ⚡ Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git**

---

### Backend Setup

1. **Navigate to backend directory / project root:**
   ```bash
   cd MAY2026-Team-066
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\Scripts\activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Initialize and seed the database:**
   ```bash
   python reset_db.py
   ```

5. **Start the FastAPI server:**
   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   > 📍 API will be available at: `http://localhost:8000`  
   > 📖 Interactive Swagger API Docs: `http://localhost:8000/docs`

---

### Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install npm dependencies:**
   ```bash
   npm install
   ```

3. **Start Vite development server:**
   ```bash
   npm run dev
   ```
   > 🌐 Open your browser at: `http://localhost:5173`

---

## 🔑 Demo Test Credentials

All accounts come pre-configured in seed data with password `12345678`:

| Role | Email | Password | Description |
|:---|:---|:---|:---|
| 🛡️ **Admin** | `admin@test.com` | `12345678` | System-wide admin with KYC approvals & analytics |
| 👤 **Donor User** | `donor@test.com` | `12345678` | Active donor user with donation history & requests |
| 👤 **Standard User** | `user@test.com` | `12345678` | Patient / recipient user account |
| 🏥 **Hospital** | `hospital@test.com` | `12345678` | Hospital portal for request triage & blood orders |
| 🩸 **Blood Bank** | `bloodbank@test.com` | `12345678` | Blood bank portal for inventory & fulfillment |
| 🤝 **NGO** | `ngo@test.com` | `12345678` | NGO portal for donation drives & emergency responses |

---

## 📡 API Endpoints Overview

| Module | Method | Endpoint | Description |
|:---|:---|:---|:---|
| **Auth** | `POST` | `/api/v1/auth/login` | User login (returns JWT access token) |
| **Auth** | `POST` | `/api/v1/auth/org/login` | Organization login (Hospital / Blood Bank / NGO) |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new donor or recipient |
| **Auth** | `POST` | `/api/v1/auth/org/register` | Register new organization |
| **Requests** | `GET` | `/api/v1/blood-requests/` | List all active blood requests |
| **Requests** | `POST` | `/api/v1/blood-requests/` | Create a new emergency blood request |
| **Inventory** | `GET` | `/api/v1/blood-bank/inventory` | Get live blood stock levels |
| **Inventory** | `PUT` | `/api/v1/blood-bank/inventory` | Update stock units for blood groups |
| **Camps** | `GET` | `/api/v1/camps/` | List public blood donation drives |
| **Camps** | `POST` | `/api/v1/camps/` | Create a new blood donation camp |
| **Admin** | `GET` | `/api/v1/admin/pending-orgs` | View pending organization KYC applications |
| **Admin** | `PATCH` | `/api/v1/admin/orgs/{id}/approval` | Approve or reject organization |

---

## 📁 Project Directory Structure

```text
LifeLink/
├── backend/                  # FastAPI Application
│   ├── api/v1/               # Versioned API routes (auth, users, requests, camps, etc.)
│   ├── core/                 # DB config, SQLAlchemy models, JWT security
│   ├── schemas/              # Pydantic data schemas & request validators
│   ├── services/             # Business logic layer
│   ├── main.py               # FastAPI application entrypoint
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite Application
│   ├── src/
│   │   ├── api/              # API client integration modules
│   │   ├── components/       # Reusable UI components & layouts
│   │   ├── context/          # Auth & state management providers
│   │   ├── pages/            # Role pages (Admin, Hospital, BloodBank, NGO, User)
│   │   └── App.jsx           # Main routing & protected route configuration
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite build configuration
├── screenshots/              # High-resolution application screenshots
├── reset_db.py               # Database initialization and seed script
└── README.md                 # Complete project documentation
```

---

<div align="center">

**LifeLink** — *Every drop counts. Every connection saves a life.* 🩸

</div>
