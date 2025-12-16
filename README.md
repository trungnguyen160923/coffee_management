# N.S Coffee – Microservices Coffee Management System

This repository contains a **microservices-based coffee shop management system** for both
internal staff (admin/manager/staff) and external customers (web ordering site).
It covers day‑to‑day operations (orders, reservations, stock, notifications) and
HR/payroll features (shifts, payroll, rewards & penalties).

---

## High‑Level Architecture

The system is split into multiple Spring Boot services and two React frontends,
all routed through an API Gateway.

### Backend Services

- **api-gateway**
  - Single entry point for all clients.
  - Routes `/auth-service/**`, `/profiles/**`, `/order-service/**`, `/catalogs/**`, `/notifications/**`.
  - Handles authentication filter, JWT propagation and service discovery.

- **auth**
  - User accounts, login, JWT issuance and validation.
  - Roles: `ADMIN`, `MANAGER`, `STAFF`, `CUSTOMER`.
  - Endpoints:
    - `/auth-service/auth/token`, `/auth-service/auth/logout`
    - `/auth-service/auth/change-password`
    - `/auth-service/users/me` – current logged‑in user
    - `/auth-service/users` – admin CRUD / management endpoints
    - `/auth-service/users-v2/create-customer`, `/create-manager`, `/create-staff`
  - Integrates with `profile-service` via Feign clients to enrich user info.

- **profile-service**
  - HR‑related data for **admin, manager, staff, customer**:
    - `customer_profiles`, `manager_profiles`, `staff_profiles`, payroll and holiday tables.
  - Shift & assignment management, validation rules, and scheduled jobs.
  - Payroll domain (salary, overtime, insurance, dependents) and rewards/penalties.
  - Exposed endpoints (examples):
    - `/profiles/customer-profiles/me` – view/update current customer profile (dob, bio, avatar).
    - `/profiles/manager-profiles/**`, `/profiles/staff-profiles/**` – manager/staff HR data.
    - `/profiles/payrolls/**`, `/profiles/allowances/**`, `/profiles/bonuses/**` etc.

- **order-service**
  - Online ordering, cart, and checkout.
  - Reservations (table bookings) and simple public tracking endpoints.
  - Communicates with catalog and stock services for availability & pricing.

- **catalog-service**
  - Product catalog, categories, sizes and stock management.
  - Provides product details to both web-app (customer) and internal FE (`fe_coffee_manager`).

- **notification-service**
  - Centralized notifications (email, in-app) for orders, reservations and system events.

Each service has its own `application.yaml`/`application-prod.yaml` with environment‑based overrides.
SQL DDL and seed data live under `sql/` (e.g. `profile_db.sql`).  

---

## Frontends

### 1. Internal Management UI – `fe_coffee_manager`

React + TypeScript app for **admins, managers, staff**.

Key modules:

- **Authentication & Layout**
  - Role‑based routing (`admin`, `manager`, `staff`).
  - Shared sidebar + top header with avatar menu and **Account Settings** entry.

- **Account Settings (internal)**
  - Routes (examples):
    - `/admin/account`, `/manager/account`, `/staff/account`
  - Features:
    - View personal information (fullname, email, phone, role).
    - Change password with client‑side validation and eye‑icon toggle.
    - Role‑specific details:
      - **Admin**: admin level, notes; can edit fullname, email, phone.
      - **Manager**: branch info, identity card, hire date, salary, insurance salary, overtime rate, dependents.
        - Manager can edit: fullname, phone, identity card.
      - **Staff**: branch, employment type (FULL_TIME/PART_TIME), pay type (MONTHLY/HOURLY),
        base/hourly salary, insurance salary, overtime rate, dependents, staff business roles, proficiency level.
        - Staff can edit: fullname, phone. Identity card & roles are read‑only.

- **Shift & Staff Scheduling**
  - Manager views and manages **staff shifts**, templates and role requirements per shift.
  - Integration with **staff business roles** (`BARISTA_STAFF`, `CASHIER_STAFF`, `SERVER_STAFF`, …).

- **Payroll & HR**
  - **ManagerPayrollManagement** – calculate, recalculate, approve and export payrolls for branch staff.
  - **AdminPayrollReports** – cross‑branch statistics and multi‑mode Excel exports.
  - **AdminPayrollTemplates / ManagerPayrollTemplates** – system vs branch‑level templates for
    allowances, bonuses, penalties.
  - **ManagerBonusPenaltyAllowanceManagement** – manage rewards, penalties, allowances with
    batch actions and exports.

> FE tech stack: React, TypeScript, Vite, Tailwind/utility classes, `lucide-react` for icons,
> and `xlsx` (SheetJS) for Excel export.


### 2. Customer Web App – `web-app`

React app for **customers** to browse menu, place orders, manage bookings and profile.
Styled with the N.S Coffee dark chalkboard theme.

Main pages:

- **Public pages**
  - Home (`/coffee`), Menu, Services, About, Contact, Product Detail.
  - Public order & reservation tracking: `/track-order/:orderId`, `/track-reservation/:reservationId`.

- **Auth**
  - `/auth/login`, `/auth/register`, `/auth/forgot-password` using `authService` on API Gateway.

- **Cart & Checkout**
  - `/coffee/cart` for both guest & authenticated users.
  - `/coffee/checkout` (protected) and `/coffee/guest-checkout` for guest orders.

- **Customer Dashboard (protected)**
  - Dropdown under customer name in header:
    - **Account Settings** → `/users/account`
    - **My Bookings** → `/users/bookings`
    - **My Orders** → `/users/orders`
    - **Manage Addresses** → `/users/addresses`

- **Customer Account Settings**
  - Modern dark UI aligned with N.S Coffee theme.
  - Features:
    - View personal info: fullname, email (read‑only), phone, date of birth, bio.
    - Edit: fullname, phone, date of birth, bio.
    - Email is **not editable** (note shown to contact support).
    - Change password with eye icon toggle for all password fields.
    - Header name updates live when `fullname` is changed.

---

## Development Setup

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+ and npm / yarn
- Docker & Docker Compose (for Kafka and optional infra)

### Backend – run services locally

From repo root (each in its own terminal):

```bash
# API Gateway
cd api-gateway
mvn spring-boot:run

# Auth service
cd auth
mvn spring-boot:run

# Profile service
cd profile-service
mvn spring-boot:run

# Order service
cd order-service
mvn spring-boot:run

# Catalog service
cd catalog-service
mvn spring-boot:run

# Notification service
cd notification-service
mvn spring-boot:run
```

Configure DB connections, Kafka, and other infra via each service’s `application.yaml` /
`application-prod.yaml`. Default API Gateway base URL in frontends is:

```text
http://localhost:8000/api
```

### Frontend – internal management UI

```bash
cd fe_coffee_manager
npm install
npm run dev
```

### Frontend – customer web app

```bash
cd web-app
npm install
npm start
```

The customer app is typically available at `http://localhost:3000/coffee`.

---

## Kafka & Supporting Infrastructure

If you need Kafka and other infrastructure used in some modules, start via Docker:

```bash
docker-compose up -d
```

---

## Notes

- This README gives a **high‑level overview** of the whole system.
- For deeper details of the payroll logic and rewards/penalties auto‑application,
  see the documentation under `docs/` (e.g. `auto-apply-rewards-penalties-design.md`).
