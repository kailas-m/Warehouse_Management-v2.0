# 📘 Inventory & Warehouse Management API Documentation

> **Version:** v1.0  
> **Auth:** JWT (Bearer Token)  
> **Base URL:** `/api/`

This API powers the multi-warehouse inventory management system. It follows RESTful principles and uses strictly typed JSON for requests and responses.

---

## 🔐 1. Authentication

All endpoints (except login/register) require a valid JWT Access Token in the header.

**Header Format:**
`Authorization: Bearer <access_token>`

### 🔑 Login (Obtain Tokens)
**POST** `/api/auth/login/`

Authenticate a user to receive access and refresh tokens.

**Request Body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response (200 OK):**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLC...",
  "access": "eyJ0eXAiOiJKV1QiLC..."
}
```

### 🔄 Refresh Token
**POST** `/api/auth/refresh/`

Get a new access token using a valid refresh token.

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLC..."
}
```

---

## 👥 2. User Management

### 📋 List Users
**GET** `/api/users/`

Returns a list of users based on visibility rules.

| Role | Visibility |
| :--- | :--- |
| **ADMIN** | All users |
| **MANAGER** | Self + Staff in managed warehouses |
| **STAFF/VIEWER** | Forbidden (403) |

### 👤 User Profile
**GET** `/api/profile/`  
**PUT/PATCH** `/api/profile/`

Manage the authenticated user's profile.

**Response (200 OK):**
```json
{
  "full_name": "Kailas Menon",
  "phone_number": "9876543210",
  "gender": "MALE",
  "profile_image": "/media/profiles/image.png"
}
```

> [!NOTE]
> Profile updates support `multipart/form-data` for image uploads.

---

## 🏢 3. Warehouses

### ➕ Create Warehouse
**POST** `/api/warehouses/`

**Access:** `ADMIN` only.

**Request Body:**
```json
{
  "name": "South Warehouse",
  "location": "Kochi"
}
```

---

## 📦 4. Products & Stock

### 🏷️ Create Product
**POST** `/api/products/`

**Access:** `ADMIN` only.

**Request Body:**
```json
{
  "name": "Rice Bag",
  "description": "25kg Premium",
  "price": 1200.00
}
```

### 📋 List Products
**GET** `/api/products/list/`

Visible to all authenticated users.

### 📊 List Stock
**GET** `/api/stocks/`

Returns stock levels. Managers only see stock for their own warehouses.

### 🔢 Assign Stock
**POST** `/api/stocks/assign/`

**Access:** `ADMIN` or `MANAGER` (own warehouse).

**Request Body:**
```json
{
  "product_id": 1,
  "warehouse_id": 3,
  "quantity": 300
}
```

### 📉 Low Stock Thresholds
**GET / POST** `/api/low-stock-thresholds/`

Manage alert thresholds per product/warehouse.

---

## 🛒 5. Purchase Workflow

Flow: `Viewer Request` -> `Approval (Staff/Manager/Admin)` -> `Stock Deduction`

### 🟢 Create Request
**POST** `/api/purchase-requests/`

**Access:** `VIEWER` only.

**Request Body:**
```json
{
  "warehouse": 3,
  "product": 1,
  "quantity": 10
}
```

### ✅ Approve/Reject Request
**POST** `/api/purchase-requests/approve/`

**Access:** `STAFF`, `MANAGER`, `ADMIN`.

**Request Body:**
```json
{
  "purchase_request_id": 14,
  "decision": "APPROVED" 
}
```
*Decision options: `APPROVED`, `REJECTED`*

---

## 🔁 6. Transfer Workflow

Flow: `Manager Request` -> `Admin Approval` -> `Stock Movement`

### 🟢 Create Transfer Request
**POST** `/api/transfer-requests/`

**Access:** `MANAGER` (Destination Warehouse).

**Request Body:**
```json
{
  "source_warehouse": 1,
  "destination_warehouse": 3,
  "product": 1,
  "quantity": 50
}
```

### ✅ Approve Transfer
**POST** `/api/transfer-requests/approve/`

**Access:** `ADMIN` only.

---

## 👷 7. Staff & Manager Lifecycle

### ✅ Approve Staff
**POST** `/api/staffs/approve/`
Activates a registered staff member and assigns them to a warehouse.

### 🚀 Promote to Manager
**POST** `/api/manager-promotions/approve/`
Promotes a staff to manager. Can be triggered by a request or directly by Admin.

### ⬇️ Demote Manager
**POST** `/api/admin/demote-manager/`
**Access:** `ADMIN` only.

---

## 📊 8. Dashboards

All dashboards support `?days=N` query parameter (default: 7 days).

### 🧠 Admin Dashboard
**GET** `/api/dashboard/admin/`

returns system-wide metrics, comparisons, and net movements.

### 🏬 Warehouse Dashboard
**GET** `/api/dashboard/warehouse/?warehouse_id=X`

Returns specific metrics for a warehouse.
*   **Admins**: Can view any warehouse.
*   **Managers**: Can view only their managed warehouses.

---

## 📑 9. Reports

### 📄 Stock Movement Report (PDF)
**GET** `/api/reports/stock-movements/`

Generates a PDF report of stock movements.

**Query Parameters:**
| Parameter | Required | Description |
| :--- | :--- | :--- |
| `start_date` | Yes | `YYYY-MM-DD` |
| `end_date` | Yes | `YYYY-MM-DD` |
| `warehouse_id` | No | Optional for Admins |

---

## 🔍 10. Entity Details (Drawer Support)

New comprehensive read-only endpoints designed for the UI drawer system.

### **Detailed View**
**GET** `/api/{entity}/{id}/detail/`

Supported Entities:
*   `products` - Includes stock summary
*   `stocks` - Includes warehouse & product info
*   `purchase-requests` - Includes approval history
*   `transfer-requests` - Includes approval history
*   `users` - Includes profile & role assignments

**Response Example (Stock):**
```json
{
  "id": 101,
  "product": { "id": 1, "name": "Rice Bag", "sku": "RIC-001" },
  "warehouse": { "id": 2, "name": "North Warehouse" },
  "quantity": 500,
  "last_updated": "2023-10-25T10:00:00Z"
}
```

---

## ⚠️ Common Error Codes

| Code | Meaning |
| :--- | :--- |
| **400** | Bad Request (Validation Failed) |
| **401** | Unauthorized (Missing/Invalid Token) |
| **403** | Forbidden (Role limits or Warehouse mismatch) |
| **404** | Not Found |
| **500** | Internal Server Error |

---
*Generated by **Antigravity** for Inventory Project*