---
name: mern-booking-architect
description: MERN Stack architectural guide for Computer Dept Booking System. Focuses on refactoring existing code and structuring new features securely.
---

# MERN Booking System Architect

This skill enforces MERN Stack best practices, security standards, and a clean separation of concerns for the "Computer Department Training Room Booking System". It is designed to guide development from the current 25% progress mark to completion.

## When to use this skill

- **Refactoring:** When reorganizing the initial 25% of the codebase to meet standard structures.
- **New Features:** When implementing remaining modules (e.g., Booking Logic, Admin Dashboard).
- **Security Audit:** When reviewing code for vulnerabilities (Injection, XSS, Broken Auth).
- **API Development:** When creating new Express endpoints.

## How to use it

### 1. Target Project Structure (Standardized)
Since the project is already underway, aim to align existing files into this structure. Do not mix Frontend and Backend logic.

#### **Server-Side (`/server` or `/backend`)**
* **`config/`**: Database connection (`db.js`) and Dotenv configuration.
* **`models/`**: Mongoose Schemas strictly typed.
* **`routes/`**: Definitions of endpoints (e.g., `router.post('/book', ...)`). **No logic here.**
* **`controllers/`**: Handles Request/Response, calls Services, and handles errors.
* **`services/`**: **Core Business Logic.** (e.g., `checkRoomAvailability`, `calculateDuration`). This is where the complex booking rules live.
* **`middleware/`**: Auth checks (`verifyToken`), RBAC (`isAdmin`), Validation (`express-validator`).
* **`utils/`**: Helper functions (Email sender, Date formatters).

#### **Client-Side (`/client` or `/frontend`)**
* **`src/components/`**: Reusable UI parts (Buttons, Inputs).
* **`src/pages/`**: Full views mapped to Routes.
* **`src/context/`** or **`redux/`**: Global state (AuthUser, Theme).
* **`src/services/`**: Axios/Fetch instances. Isolate API calls here (e.g., `authService.login()`).

### 2. Separation of Concerns (The "Service Layer" Pattern)
To prevent "Fat Controllers" (common in MERN), follow this flow:
1.  **Route:** Receives HTTP request -> Forward to Controller.
2.  **Controller:** Validates input -> Calls Service -> Sends HTTP Response.
3.  **Service:** Executes logic (e.g., check database for overlaps) -> Returns data/error to Controller.
4.  **Model:** Only handles DB schema and direct queries.

### 3. Security Best Practices (MERN Specific)
* **Authentication:** Use `JWT` stored securely (HttpOnly Cookies preferred over LocalStorage for sensitive apps).
* **Password:** Always hash with `bcryptjs` before saving to Schema.
* **Validation:** MUST use `express-validator` or `Joi` on the Controller level before touching the Service/DB.
* **Middleware:**
    * Use `helmet` for HTTP headers.
    * Use `cors` properly configured (whitelist specific domains).
    * Implement `rate-limiting` for Login/Booking endpoints.

### 4. Domain Rules (Computer Dept Context)
* **Booking Conflict:** Ensure the `BookingService` checks for overlapping `startTime` and `endTime` for the specific `roomId` before creating a doc.
* **Roles:**
    * `Student`: Can create `status: "pending"` bookings.
    * `Staff`: Can change status to `"approved"/"rejected"`.
* **Sanitization:** Prevent NoSQL Injection by sanitizing inputs (especially in search/filter queries).

### 5. Coding Convention
* **Async/Await:** Use `try-catch` blocks in Controllers.
* **Error Handling:** Use a centralized Error Handling Middleware in Express (do not simply `console.log` errors).
* **Variable Naming:** use `camelCase` for JS/TS variables, `PascalCase` for React Components and Mongoose Models.