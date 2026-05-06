# 🎓 LMS Platform API — TS Academy Capstone (Group 1)

> A production-grade Learning Management System REST API built with Node.js, Express, and MongoDB — inspired by Udemy's architecture.

[![Node.js](https://img.shields.io/badge/Node.js-≥18.0-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Authentication](#-authentication)
- [Error Handling](#-error-handling)
- [Security](#-security)

---

## ✨ Features

| Module | Highlights |
|--------|-----------|
| **Auth** | JWT (15min) + Refresh tokens (7d), MFA/TOTP, Google & GitHub OAuth, email verification, password reset |
| **Courses** | Full lifecycle: draft → pending → published, thumbnail/promo-video upload, admin approval workflow |
| **Curriculum** | Sections & lectures with drag-and-drop reorder, chunked video upload, Cloudinary transcoding pipeline |
| **Enrollment** | Free & paid enrollment, per-lecture progress tracking, video resume position |
| **Payments** | Stripe Checkout + webhooks, 30-day refund window, coupon engine, instructor payout requests |
| **Certificates** | Auto-generated PDF certificates with QR verification code, Cloudinary storage |
| **Search** | Full-text search across courses, instructors, categories with autocomplete |
| **Quizzes** | Timed quizzes with auto-grading, pass/fail, attempt history & detailed results |
| **Assignments** | File/text submissions, instructor grading with feedback |
| **Reviews** | 1-5 star reviews (enrolled only), instructor responses, helpful votes, report/moderation |
| **Q&A** | Course discussion threads with upvoting and instructor "mark correct" |
| **Analytics** | Instructor & admin dashboards: revenue, enrollments, completion rates |
| **Notifications** | Real-time via Socket.io + email, per-user preferences |
| **Media** | Multipart video upload, signed HLS/DASH streaming URLs, VTT/SRT captions |
| **Health** | Liveness + readiness probes, Prometheus metrics endpoint |

---

## 🛠 Tech Stack

```
Runtime:     Node.js ≥ 18
Framework:   Express 4.18
Database:    MongoDB (Mongoose 8)
Auth:        JWT + bcryptjs + Passport.js (Google/GitHub OAuth)
Payments:    Stripe
Storage:     Cloudinary (images, videos, PDFs)
Email:       Nodemailer (SMTP/Gmail)
Real-time:   Socket.io
Validation:  express-validator
Security:    Helmet, CORS, express-mongo-sanitize, HPP, rate limiting
Docs:        Swagger UI (OpenAPI 3.0)
Logging:     Winston
MFA:         speakeasy (TOTP) + qrcode
PDF:         pdfkit
```

---

## 📁 Project Structure

```
src/
├── app.js                    # Express entry point + Socket.io setup
├── config/
│   ├── passport.js           # Google & GitHub OAuth strategies
│   └── socket.js             # Socket.io authentication & room management
├── controllers/
│   ├── auth.controller.js    # Register, login, MFA, OAuth callbacks
│   ├── course.controller.js  # CRUD, approval workflow, thumbnails
│   ├── curriculum.controller.js  # Sections, lectures, video upload
│   ├── enrollment.controller.js  # Enrollment, progress tracking
│   ├── payment.controller.js     # Stripe checkout, webhooks, payouts
│   ├── quiz.controller.js        # Quizzes, assignments, grading
│   └── certificate.controller.js # PDF generation, verification
├── models/
│   ├── User.model.js         # User schema with MFA, OAuth, refresh tokens
│   ├── Course.model.js       # Course with full-text search indexes
│   └── index.js              # All other models (16 schemas)
├── routes/
│   ├── auth.routes.js        # /api/v1/auth/*
│   ├── user.routes.js        # /api/v1/users/*
│   ├── course.routes.js      # /api/v1/courses/* + instructor + admin
│   ├── curriculum.routes.js  # Sections & lectures
│   ├── enrollment.routes.js  # Enrollment & progress
│   ├── payment.routes.js     # Payments, coupons, payouts
│   ├── review.routes.js      # Reviews & ratings
│   ├── category.routes.js    # Categories & tags
│   ├── search.routes.js      # Full-text search
│   ├── quiz.routes.js        # Quizzes & assignments
│   ├── certificate.routes.js # Certificate generation
│   ├── wishlist.routes.js    # Wishlist
│   ├── cart.routes.js        # Shopping cart
│   ├── notification.routes.js # Notifications
│   ├── qa.routes.js          # Q&A discussions
│   ├── analytics.routes.js   # Instructor & admin analytics
│   ├── media.routes.js       # File uploads & streaming
│   ├── health.routes.js      # Health checks
│   └── admin.routes.js       # Platform settings & audit logs
├── middlewares/
│   ├── auth.middleware.js    # protect, restrictTo, optionalAuth
│   ├── errorHandler.js       # RFC 7807 error responses
│   ├── rateLimiter.js        # Auth/public/strict rate limiters
│   ├── upload.middleware.js  # Multer configurations
│   └── validate.middleware.js # express-validator pipe
├── services/
│   ├── email.service.js      # Nodemailer with HTML templates
│   ├── cloudinary.service.js # Image, video, PDF upload helpers
│   └── notification.service.js # In-app + email notifications
└── utils/
    ├── AppError.js           # Custom operational error class
    ├── catchAsync.js         # Async error wrapper
    ├── tokenHelper.js        # JWT access + refresh token generators
    ├── ApiFeatures.js        # Filter, sort, paginate query builder
    └── logger.js             # Winston logger
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- Stripe account (test keys)
- Cloudinary account
- Gmail / SMTP account

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-group/lms-backend.git
cd lms-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Start development server
npm run dev

# 5. Open API docs
open http://localhost:5000/api/docs
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lms_db
JWT_SECRET=your_32+_char_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
INSTRUCTOR_REVENUE_SHARE=70
CERTIFICATE_THRESHOLD=80
```

---

## 📡 API Overview

**Base URL:** `https://api.yourplatform.com/api/v1`

| # | Module | Endpoints |
|---|--------|-----------|
| 1 | Authentication & Authorization | 15 |
| 2 | Users & Profiles | 12 |
| 3 | Courses | 17 |
| 4 | Curriculum (Sections & Lectures) | 14 |
| 5 | Enrollment & Student Access | 9 |
| 6 | Payments & Billing | 18 |
| 7 | Reviews & Ratings | 8 |
| 8 | Categories & Tags | 8 |
| 9 | Search | 3 |
| 10 | Quizzes & Assignments | 12 |
| 11 | Certificates | 5 |
| 12 | Wishlist & Cart | 9 |
| 13 | Notifications | 6 |
| 14 | Q&A / Discussion | 9 |
| 15 | Analytics & Reporting | 10 |
| 16 | Media / File Management | 8 |
| 17 | System & Health | 6 |
| **Total** | | **169** |

---

## 🔑 Authentication

All protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

**Token lifecycle:**
1. Login → receive `accessToken` (15 min) + `refreshToken` (7 days)
2. Access token expires → call `POST /api/v1/auth/refresh-token` with `refreshToken`
3. New access + refresh token issued (rotation)
4. Logout → refresh token invalidated

**Roles:** `student` | `instructor` | `admin`

---

## ⚠️ Error Handling

All errors follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807):

```json
{
  "success": false,
  "type": "about:blank",
  "title": "Request Error",
  "status": 422,
  "detail": "Email already registered"
}
```

**All success responses:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

## 🛡️ Security

- **Helmet** — HTTP security headers
- **CORS** — configured for `FRONTEND_URL` only
- **Rate limiting** — 100 req/min (auth), 20 req/min (public), 5/15min (login attempts)
- **MongoDB Sanitize** — prevents NoSQL injection
- **HPP** — prevents HTTP parameter pollution  
- **Password hashing** — bcrypt with cost factor 12
- **JWT rotation** — refresh tokens rotated on every use
- **Input validation** — express-validator on all body params
- **GDPR** — soft-delete on `DELETE /users/me`

---

## 📖 API Documentation

Interactive Swagger docs available at `/api/docs` when running the server.

For full Postman collection, import the `docs/LMS_API.postman_collection.json` file.

---

## 👥 Team — Group 1

TS Academy Backend Development Capstone Project
