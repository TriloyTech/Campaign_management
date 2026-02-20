# CampaignPulse - Digital Marketing Campaign Tracker

A comprehensive full-stack SaaS application for digital marketing agencies to manage clients, campaigns, and track revenue with unit-based pricing. Built with Next.js, MongoDB, and a modern React UI.

![CampaignPulse](https://img.shields.io/badge/CampaignPulse-v2.0-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![MongoDB](https://img.shields.io/badge/MongoDB-Database-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Credentials](#demo-credentials)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)

---

## 🎯 Overview

**CampaignPulse** is a multi-tenant SaaS platform designed for digital marketing agencies to:

- **Manage multiple organizations/agencies** under a single Super Admin
- **Track clients and campaigns** with detailed financial metrics
- **Monitor revenue** through unit-based deliverable tracking
- **Collaborate with team members** with role-based access control
- **Audit all activities** with comprehensive logging

### Business Problem Solved

Marketing agencies often struggle with:
1. Tracking projected vs. earned revenue across multiple campaigns
2. Managing deliverables (posts, videos, content) at a granular level
3. Providing appropriate access to team members without exposing sensitive financial data
4. Maintaining oversight across multiple client accounts

CampaignPulse solves these problems with a clean, intuitive interface and powerful backend.

---

## ✨ Features

### 🏢 Multi-Tenant Architecture
- **Super Admin** can manage multiple organizations/agencies
- Organization switcher for viewing different agency data
- Data isolation between organizations
- Create, edit, and delete organizations

### 👥 Client Management
- Add and manage client profiles
- Track client contact information
- View client-specific revenue breakdown
- Filter campaigns by client

### 📊 Campaign Management
- Create campaigns with multiple service line items
- Auto-generate deliverables based on quantity
- Track campaign status (Active, Paused, Completed)
- Assign team members to campaigns
- View projected vs. earned revenue

### 💰 Financial Tracking (BDT Currency)
- **Projected Revenue**: Total value of all campaign line items
- **Earned Revenue**: Value of completed/delivered items
- **Pending Revenue**: Projected minus Earned
- Per-client revenue breakdown
- Monthly revenue charts

### 📦 Service Catalog
- Define services with default rates (e.g., "Static Post" = ৳1,600)
- Customize rates per campaign
- Track service usage across campaigns

### ✅ Deliverable Management
- Individual tracking of each deliverable unit
- Status workflow: `Pending` → `In Progress` → `Review` → `Delivered`
- Optional proof URL submission
- Automatic revenue recalculation on status change

### 👤 Team Management
- Invite team members with different roles
- Assign designation and department
- Super Admin can assign members to specific organizations
- Role-based feature visibility

### 📝 Audit Logging
- Track all create, update, and delete actions
- Filter by entity type and action
- View activity timeline on dashboard
- Admin-only access to audit logs

### 🔐 User Profile & Security
- Update personal information (name, email, phone, designation)
- Change password with verification
- Role badge display
- Organization info display

### 📅 Date Filters
- Filter dashboard data by: Today, This Week, This Month, All Time
- Applied to financial calculations and campaign lists

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js App Router                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │Dashboard │ │Campaigns │ │ Clients  │ │ Services │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Team    │ │AuditLogs │ │  Profile │ │   Orgs   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   API Context     │                        │
│                    │ (Org ID + Role)   │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    API Routes       │
                    │  /api/[[...path]]   │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                         BACKEND                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │                    Route Handler                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │  Auth   │ │ Clients │ │Campaigns│ │Services │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │  Team   │ │Dashboard│ │  Orgs   │ │  Logs   │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │     MongoDB       │                        │
│                    │    Database       │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18 |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend** | Next.js API Routes |
| **Database** | MongoDB |
| **Authentication** | Custom JWT-based auth |
| **State Management** | React useState/useEffect |

---

## 📊 Database Schema

### Collections

#### `organizations`
```javascript
{
  id: UUID,
  name: String,           // "Digital Dynamix Agency"
  industry: String,       // "Digital Marketing"
  address: String,
  phone: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### `users`
```javascript
{
  id: UUID,
  email: String,          // Unique
  password: String,       // Hashed (PBKDF2)
  name: String,
  role: String,           // "super_admin" | "admin" | "team_member"
  organizationId: UUID,
  designation: String,    // "Managing Director"
  department: String,     // "Management"
  phone: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### `clients`
```javascript
{
  id: UUID,
  organizationId: UUID,
  name: String,           // "Tech Solutions Ltd"
  contactPerson: String,
  email: String,
  phone: String,
  industry: String,
  status: String,         // "active" | "inactive"
  createdAt: Date
}
```

#### `service_catalog`
```javascript
{
  id: UUID,
  organizationId: UUID,
  name: String,           // "Static Post Design"
  defaultRate: Number,    // 1600 (BDT)
  description: String,
  createdAt: Date
}
```

#### `campaigns`
```javascript
{
  id: UUID,
  organizationId: UUID,
  clientId: UUID,
  clientName: String,
  name: String,           // "Q2 Social Media Campaign"
  type: String,           // "retainer" | "one-time" | "custom"
  status: String,         // "active" | "paused" | "completed"
  startDate: String,
  endDate: String,
  assignedTo: [UUID],     // Array of user IDs
  totalProjected: Number, // Calculated from line items
  totalEarned: Number,    // Calculated from delivered items
  createdAt: Date,
  updatedAt: Date
}
```

#### `line_items`
```javascript
{
  id: UUID,
  campaignId: UUID,
  serviceId: UUID,
  serviceName: String,
  quantity: Number,       // 8
  rate: Number,           // 1600
  total: Number,          // 12800
  createdAt: Date
}
```

#### `deliverables`
```javascript
{
  id: UUID,
  campaignId: UUID,
  lineItemId: UUID,
  serviceName: String,
  unitIndex: Number,      // 1, 2, 3... (which unit of the quantity)
  status: String,         // "pending" | "in_progress" | "review" | "delivered"
  proofUrl: String,       // Optional URL to proof
  assignedTo: UUID,
  rate: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### `activity_logs`
```javascript
{
  id: UUID,
  organizationId: UUID,
  userId: UUID,
  userName: String,
  action: String,         // "created" | "modified" | "deleted" | "updated"
  entityType: String,     // "client" | "campaign" | "service" | "deliverable"
  entityId: UUID,
  details: String,        // Human-readable description
  createdAt: Date
}
```

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user + organization |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |
| PUT | `/api/auth/password` | Change password |

### Organizations (Super Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List all organizations |
| GET | `/api/organizations/:id` | Get organization details |
| POST | `/api/organizations` | Create organization |
| PUT | `/api/organizations/:id` | Update organization |
| DELETE | `/api/organizations/:id` | Delete organization |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients (org-scoped) |
| GET | `/api/clients/:id` | Get client details |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client (Admin only) |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List services (org-scoped) |
| POST | `/api/services` | Create service |
| PUT | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service (Admin only) |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns (with filters) |
| GET | `/api/campaigns/:id` | Get campaign with line items & deliverables |
| POST | `/api/campaigns` | Create campaign (auto-generates deliverables) |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign + related data |

**Query Parameters:**
- `status` - Filter by campaign status
- `clientId` - Filter by client
- `type` - Filter by campaign type
- `dateRange` - Filter by date (today/week/month)

### Deliverables

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deliverables` | List deliverables |
| PUT | `/api/deliverables/:id` | Update status/proof (recalculates revenue) |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard data (financials, stats) |
| GET | `/api/dashboard/revenue-chart` | Get monthly revenue chart data |

**Query Parameters:**
- `organizationId` - For Super Admin to scope data
- `dateRange` - Filter by date

### Team

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/team` | List team members |
| POST | `/api/team/invite` | Invite new team member |

### Activity Logs (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity-logs` | List activity logs |

**Query Parameters:**
- `entityType` - Filter by entity
- `action` - Filter by action type
- `limit` - Number of records

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seed` | Create demo data (development) |

---

## 👥 User Roles & Permissions

### Super Admin
- ✅ Manage all organizations (CRUD)
- ✅ View and switch between any organization's data
- ✅ Create users in any organization
- ✅ All Admin permissions across all orgs
- ✅ Create other Super Admins

### Admin
- ✅ Full access to own organization
- ✅ Manage clients, campaigns, services
- ✅ View financial data
- ✅ Invite team members
- ✅ View audit logs
- ✅ Delete records
- ❌ Cannot access other organizations
- ❌ Cannot manage organizations

### Team Member (Custom Access)
- ✅ View assigned campaigns only
- ✅ Update deliverable status
- ✅ View clients and services (read-only)
- ✅ Update own profile
- ❌ Cannot view financial data
- ❌ Cannot create/delete records
- ❌ Cannot access audit logs

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/campaign-pulse.git
cd campaign-pulse
```

2. **Install dependencies**
```bash
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB** (if not using cloud)
```bash
mongod --dbpath /path/to/data
```

5. **Run development server**
```bash
yarn dev
```

6. **Load demo data** (optional)
- Visit the app and click "Load demo data for testing"
- Or call `POST /api/seed`

---

## ⚙️ Environment Variables

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=campaign_tracker

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# CORS (optional)
CORS_ORIGINS=*
```

---

## 🔑 Demo Credentials

After loading demo data (`POST /api/seed`):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@agency.com | super123 |
| Admin (Org 1) | admin@agency.com | admin123 |
| Admin (Org 2) | admin2@agency.com | admin123 |
| Team Member (Org 1) | member@agency.com | member123 |
| Team Member (Org 2) | member2@agency.com | member123 |

### Demo Organizations

1. **Digital Dynamix Agency** (Digital Marketing)
   - 4 Clients
   - 7 Services
   - 3 Active Campaigns

2. **CreativeEdge Media** (Social Media)
   - 2 Clients
   - 3 Services
   - 1 Active Campaign

---

## 📸 Screenshots

### Dashboard
- Financial overview with Projected/Earned/Pending revenue
- Monthly revenue chart
- Deliverable status pie chart
- Client revenue breakdown
- Recent activity feed

### Campaign Management
- Campaign list with progress indicators
- Campaign detail with line items
- Deliverable status management
- Revenue tracking per campaign

### Team Management
- Team member cards with role badges
- Organization assignment (Super Admin)
- Designation and department display

### Profile Settings
- Personal information editing
- Password change with verification
- Role and organization display

---

## 🗺 Roadmap

### Version 2.1 (Planned)
- [ ] Multi-organization membership for users
- [ ] Email notifications for deliverable updates
- [ ] File/image upload for deliverable proofs
- [ ] Export reports to PDF/Excel

### Version 2.2 (Future)
- [ ] Client portal (read-only access for clients)
- [ ] Invoice generation
- [ ] Time tracking integration
- [ ] Calendar view for deadlines

### Version 3.0 (Long-term)
- [ ] White-labeling support
- [ ] Custom branding per organization
- [ ] Advanced analytics and AI insights
- [ ] Mobile app (React Native)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📞 Support

For support, email support@campaignpulse.com or join our Slack community.

---

**Built with ❤️ for Digital Marketing Agencies**
