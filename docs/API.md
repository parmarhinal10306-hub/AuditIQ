# API Documentation

## Authentication APIs

### Register User
* **Method:** POST
* **Endpoint:** `/api/auth/register`
* **Authentication required:** No
* **Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
* **Query/URL parameters:** None
* **Success response:** 201 Created
```json
{
  "success": true,
  "data": {
    "_id": "60d0fe4f5311236168a109ca",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "token": "eyJhbGci..."
  }
}
```
* **Error response:** 400 Bad Request
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

### Login User
* **Method:** POST
* **Endpoint:** `/api/auth/login`
* **Authentication required:** No
* **Request body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
* **Query/URL parameters:** None
* **Success response:** 200 OK
```json
{
  "success": true,
  "data": {
    "_id": "60d0fe4f5311236168a109ca",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "token": "eyJhbGci..."
  }
}
```
* **Error response:** 400/401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

## Audit APIs

### Create Audit
* **Method:** POST
* **Endpoint:** `/api/audits`
* **Authentication required:** Yes (Bearer Token)
* **Request body:**
```json
{
  "url": "https://example.com"
}
```
* **Query/URL parameters:** None
* **Success response:** 201 Created
```json
{
  "success": true,
  "message": "Audit completed successfully",
  "data": {
    "_id": "60d0fe4f5311236168a109cb",
    "url": "https://example.com",
    "fetchedUrl": "https://example.com/",
    "status": "completed",
    "seoScore": 95,
    "aeoScore": 90,
    "geoScore": 85,
    "createdAt": "2023-10-21T10:00:00Z"
  }
}
```
* **Error response:** 400/422/500
```json
{
  "success": false,
  "message": "Please provide a valid URL"
}
```

### Get All Audits
* **Method:** GET
* **Endpoint:** `/api/audits`
* **Authentication required:** Yes (Bearer Token)
* **Request body:** None
* **Query/URL parameters:** 
  * `page` (optional) - defaults to 1
  * `limit` (optional) - defaults to 10 (max 50)
* **Success response:** 200 OK
```json
{
  "success": true,
  "data": [
    { /* Audit Object */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```
* **Error response:** 401 Unauthorized

### Get Single Audit
* **Method:** GET
* **Endpoint:** `/api/audits/:id`
* **Authentication required:** Yes (Bearer Token)
* **Request body:** None
* **Query/URL parameters:** 
  * `id` - The ID of the audit to retrieve
* **Success response:** 200 OK
```json
{
  "success": true,
  "data": { /* Detailed Audit Object */ }
}
```
* **Error response:** 403/404 Not Found
```json
{
  "success": false,
  "message": "Audit not found."
}
```

### Delete Audit
* **Method:** DELETE
* **Endpoint:** `/api/audits/:id`
* **Authentication required:** Yes (Bearer Token)
* **Request body:** None
* **Query/URL parameters:** 
  * `id` - The ID of the audit to delete
* **Success response:** 200 OK
```json
{
  "success": true,
  "message": "Audit deleted successfully."
}
```
* **Error response:** 403/404 Not Found
```json
{
  "success": false,
  "message": "Not authorized to delete this audit."
}
```

---

## Dashboard APIs

### Get Dashboard Overview
* **Method:** GET
* **Endpoint:** `/api/dashboard/overview`
* **Authentication required:** Yes (Bearer Token)
* **Request body:** None
* **Query/URL parameters:** None
* **Success response:** 200 OK
```json
{
  "success": true,
  "data": {
    "totalAudits": 4,
    "completedAudits": 4,
    "avgSeoScore": 85,
    "avgAeoScore": 90,
    "avgGeoScore": 80,
    "criticalCount": 5,
    "warningCount": 10,
    "passedCount": 50
  }
}
```
* **Error response:** 401 Unauthorized

### Get Recent Audits
* **Method:** GET
* **Endpoint:** `/api/dashboard/recent-audits`
* **Authentication required:** Yes (Bearer Token)
* **Request body:** None
* **Query/URL parameters:** None
* **Success response:** 200 OK
```json
{
  "success": true,
  "data": {
    "audits": [
      { /* Audit Summary Object */ }
    ],
    "recommendationsSummary": {
      "high": [],
      "medium": [],
      "low": []
    }
  }
}
```
* **Error response:** 401 Unauthorized
