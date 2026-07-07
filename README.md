# GearUp

GearUp is a backend API for a gear rental and rental management platform. It allows customers to browse gear items, providers to manage their inventory, admins to oversee the system, and users to make rentals and payments.

## 1. Project Overview

This project is built as a RESTful API using Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL. The system supports:

- User authentication and role-based authorization
- Customer, Provider, and Admin accounts
- Gear item browsing and management
- Rental order creation and tracking
- Payment flow with Stripe integration
- Review creation and moderation
- Category management

## 2. Tech Stack

### Core
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL

### Authentication & Security
- JWT (access and refresh tokens)
- bcryptjs for password hashing
- cookie-parser for token storage
- CORS for cross-origin access

### Payments
- Stripe SDK

### Development Tools
- tsx for development runtime
- tsup for build output
- dotenv for environment configuration

## 3. Project Structure

- src/app.ts: main Express application setup
- src/module/: route-based feature modules
- src/middlewares/: authentication and error handling
- prisma/schema/: Prisma models and enums
- generated/prisma/: generated Prisma client

## 4. Model Design Plan

The database is designed around a rental marketplace flow.

### Main Models

1. Users
   - Stores user identity and role
   - Roles: CUSTOMER, PROVIDER, ADMIN

2. Profiles
   - Stores profile details such as photo, address, and phone
   - Linked one-to-one with Users

3. Category
   - Groups gear items into categories

4. GearItems
   - Represents available rental gear
   - Belongs to one Category and one Provider (Users)

5. RentalOrders
   - Stores a rental booking request from a customer
   - Contains startDate, endDate, totalPrice, and status

6. RentalItems
   - Junction details for products included in a rental order

7. Payments
   - Stores payment status and transaction records for each rental order

8. Reviews
   - Stores customer feedback and ratings for gear items

### Relationship Summary

- Users 1-to-1 Profiles
- Users 1-to-many GearItems
- Users 1-to-many RentalOrders
- Users 1-to-many Payments
- Users 1-to-many Reviews
- Category 1-to-many GearItems
- GearItems 1-to-many RentalItems
- RentalOrders 1-to-many RentalItems
- RentalOrders 1-to-1 Payments
- GearItems 1-to-many Reviews

### Database Constraint Example

Rating must be between 1 and 5:

```sql
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_rating_range_check"
CHECK (rating >= 1 AND rating <= 5);
```

## 5. Authentication & Authorization

The API uses JWT-based authentication. After login, the server sets access and refresh tokens in HTTP-only cookies.

Supported roles:
- CUSTOMER
- PROVIDER
- ADMIN

### Auth Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout
- POST /api/auth/refresh-token

## 6. API Endpoints

Below are the main endpoints with example request bodies and response JSON formats.

### 6.1 Register User

POST /api/auth/register

Request body:

```json
{
  "name": "Pranta Barua",
  "email": "pranta.admin@mail.com",
  "password": "1234",
  "role": "ADMIN",
  "profilePhoto": "https://example.com/profile.jpg",
  "address": "Chittagong",
  "phone": "012564565"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "name": "Pranta Barua",
    "email": "pranta.admin@mail.com",
    "role": "ADMIN"
  }
}
```

### 6.2 Login User

POST /api/auth/login

Request body:

```json
{
  "email": "pranta.admin@mail.com",
  "password": "1234"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### 6.3 Get Current User Profile

GET /api/auth/me

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "uuid",
    "name": "Pranta Barua",
    "email": "pranta.admin@mail.com",
    "role": "ADMIN"
  }
}
```

### 6.4 Update Profile

PATCH /api/users/profile

Request body:

```json
{
  "name": "Pranta Barua",
  "profilePhoto": "https://example.com/new-profile.jpg",
  "address": "Chittagong",
  "phone": "014345565"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "name": "Pranta Barua",
    "profilePhoto": "https://example.com/new-profile.jpg",
    "address": "Chittagong",
    "phone": "014345565"
  }
}
```

### 6.5 Get All Gear Items

GET /api/gear

Example response:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gears fetched successfully",
  "data": [
    {
      "id": "gear-uuid",
      "title": "Camping Tent",
      "description": "Waterproof 4-person tent",
      "brand": "North Face",
      "pricePerDay": 25,
      "stock": 5,
      "availableStock": 4,
      "categoryId": "category-uuid",
      "providerId": "provider-uuid"
    }
  ]
}
```

### 6.6 Create Gear Item

POST /api/provider/gear

Request body:

```json
{
  "title": "Camping Tent",
  "description": "Waterproof 4-person tent",
  "brand": "North Face",
  "pricePerDay": 25,
  "stock": 5,
  "availableStock": 4,
  "categoryId": "category-uuid"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Gear created successfully",
  "data": {
    "id": "gear-uuid",
    "title": "Camping Tent",
    "description": "Waterproof 4-person tent",
    "brand": "North Face",
    "pricePerDay": 25,
    "stock": 5,
    "availableStock": 4
  }
}
```

### 6.7 Create Rental Order

POST /api/rentals

Request body:

```json
{
  "customerId": "customer-uuid",
  "startDate": "2026-07-10",
  "endDate": "2026-07-12",
  "totalPrice": 50,
  "status": "PENDING"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Rental order created successfully",
  "data": {
    "id": "rental-order-uuid",
    "customerId": "customer-uuid",
    "startDate": "2026-07-10",
    "endDate": "2026-07-12",
    "totalPrice": 50,
    "status": "PENDING"
  }
}
```

### 6.8 Create Payment

POST /api/payments/create

Request body:

```json
{
  "amount": 50,
  "rentalOrderId": "rental-order-uuid"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payment created successfully",
  "data": {
    "id": "payment-uuid",
    "amount": 50,
    "status": "PENDING"
  }
}
```

### 6.9 Create Review

POST /api/reviews

Request body:

```json
{
  "rating": 5,
  "comment": "Excellent gear and fast service",
  "gearItemId": "gear-uuid"
}
```

Example response:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Review created successfully",
  "data": {
    "id": "review-uuid",
    "rating": 5,
    "comment": "Excellent gear and fast service",
    "gearItemId": "gear-uuid"
  }
}
```

## 7. Admin Routes

Admin users can access:

- GET /api/admin/users
- PATCH /api/admin/users/:id
- GET /api/admin/gear
- POST /api/admin/gear
- PATCH /api/admin/gear/:id
- DELETE /api/admin/gear/:id
- GET /api/admin/rentals
- DELETE /api/admin/rentals/:id
- POST /api/admin/categories
- PATCH /api/admin/categories/:id
- DELETE /api/admin/categories/:id

## 8. Notes

- The API uses standardized response format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {}
}
```

- The project is currently structured as a backend service and can be extended with frontend UI, image upload, order tracking, and advanced filtering in the future.



