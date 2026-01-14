# 🏭 Inventory & Warehouse Management System

> A robust, role-based, multi-warehouse inventory management system built with Django and Django REST Framework.

This system is designed to handle complex inventory operations including multi-warehouse tracking, stock transfers, purchase workflows, and role-based approvals. It is built with a backend-first approach, prioritizing data integrity, security, and scalability.

## 🚀 Key Features

### 🏢 Warehouse & Stock Management
*   **Multi-Warehouse Support:** Manage multiple centralized or distributed warehouses.
*   **Live Stock Tracking:** Real-time quantity updates and tracking.
*   **Low-Stock Alerts:** Automated email notifications when stock dips below defined thresholds.
*   **Stock Assignment:** Assign stock to specific warehouses and track movements.

### 👥 Role-Based Access Control (RBAC)
Strict permission enforcement using custom DRF permission classes.
*   **👑 Admin:** Full system access, approves transfers/promotions, manages global settings.
*   **👔 Manager:** Manages assigned warehouses, approves staff, requests transfers.
*   **👷 Staff:** Handles daily operations, subject to manager approval.
*   **👀 Viewer:** Read-only access to view stock and request purchases.

### 🔄 Workflows
*   **Purchase Requests:** Viewers execute purchase requests -> Approved by Staff/Manager -> Stock deducted.
*   **Stock Transfers:** Managers request inter-warehouse transfers -> Approved by Admin -> Atomic stock updates.
*   **Staff Lifecycle:** Registration -> Approval -> Promotion -> Dismissal.

### 📊 Dashboards & Reporting
*   **Admin Dashboard:** Global stock trends, net movement, and system-wide alerts.
*   **Warehouse Dashboard:** Specific warehouse performance, staff activity, and local alerts.
*   **PDF Reports:** Generate detailed stock movement reports (daily/weekly/monthly).

---

## 🛠️ Tech Stack

*   **Backend:** Python 3.10+, Django 5.x
*   **API:** Django REST Framework (DRF)
*   **Authentication:** Simple JWT (JSON Web Tokens)
*   **Database:** PostgreSQL (Production) / SQLite (Dev)
*   **Email:** SMTP (Gmail / Custom SMTP)
*   **Reports:** ReportLab (PDF Generation)
*   **Media:** Local Filesystem (Profile Images)

---

## 🧩 API Structure

The API is organized into logical resources. All endpoints (except login/register) require `Bearer` token authentication.

### **Authentication**
*   `POST /api/auth/register/` - Register new user
*   `POST /api/auth/login/` - Obtain Access & Refresh tokens
*   `POST /api/auth/refresh/` - Refresh Access token

### **Users & Profiles**
*   `GET /api/users/` - List users (Admin/Manager only)
*   `GET /api/profile/` - specific user profile
*   `PUT /api/profile/` - Update profile (includes image upload)

### **Warehouses & Inventory**
*   `POST /api/warehouses/` - Create warehouse
*   `POST /api/products/` - Create product
*   `GET /api/stocks/` - List stock across warehouses
*   `POST /api/stocks/assign/` - Assign initial stock to warehouse
*   `GET /api/low-stock-thresholds/` - Manage alert thresholds

### **Workflows**
*   **Purchases:**
    *   `/api/purchase-requests/` (Create)
    *   `/api/purchase-requests/approve/` (Approve/Reject)
*   **Transfers:**
    *   `/api/transfer-requests/` (Create)
    *   `/api/transfer-requests/approve/` (Approve/Reject)
*   **Staff Management:**
    *   `/api/staffs/approve/`
    *   `/api/staffs/dismiss/`
    *   `/api/managers/request-staff-promotion/`
    *   `/api/admin/demote-manager/`

### **Dashboards & Reports**
*   `GET /api/dashboard/admin/` - System-wide metrics
*   `GET /api/dashboard/warehouse/` - Warehouse-specific metrics
*   `GET /api/reports/stock-movements/` - Download PDF report

---

## ⚙️ Setup Instructions

### 1. Clone & Environment
```bash
git clone <repo-url>
cd inventory_project
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configuration
Ensure `settings.py` is configured correctly:
*   **Database:** Update `DATABASES` dict if using PostgreSQL.
*   **Email:** Configure `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` for alerts.

### 4. Database Setup
```bash
python manage.py makemigrations
python manage.py migrate
# Seed initial roles (Admin, Manager, Staff, Viewer)
python manage.py seed_roles
```

### 5. Run Server
```bash
python manage.py runserver
```

---

## 📂 Entity Relationship (ER) Model

### Core Users
*   **User** (Custom AbstractUser) -> **Role** (FK)
*   **UserProfile** (OneToOne -> User)

### Inventory
*   **Warehouse** -> **Manager** (FK)
*   **Stock** -> **Product**, **Warehouse** (M2M via Stock model)
*   **LowStockThreshold** -> **Product**, **Warehouse**

### Workflows
*   **PurchaseRequest** (Viewer -> Warehouse)
*   **TransferRequest** (Source Warehouse -> Dest Warehouse)
*   **ManagerPromotionRequest** (Staff -> Manager)

---

## 👨‍💻 Author

**Kailas**  
Computer Science Engineering Student