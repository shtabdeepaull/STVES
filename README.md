# STVES - Smart Traffic Verification and Enforcement System

A comprehensive web-based digital platform designed to modernize traffic law enforcement across Bangladesh.

## 🎓 Academic Project

**Institution:** Metropolitan University, Sylhet  
**Course:** CSE 436 - Final Year Project  
**Supervisor:** Abu Jafar Md. Jakaria (Senior Lecturer, Dept. of CSE)

### Developers
- Md. Jamil Ahamad Alamin (ID: 232-112-008)
- Shtabdee Paul (ID: 232-112-014)  
Batch: 33rd (Evening), Department of CSE

---

## 📋 Overview

STVES replaces manual document checking with a fast, secure, and automated digital verification process. The system integrates:

- **Vehicle Verification** - Instant compliance checking via plate number or QR code
- **Driver Validation** - Real-time license verification against BRTA database
- **E-Challan System** - Digital violation case creation with automated fine calculation
- **Role-Based Access** - Secure multi-level access for different user types

---

## 🚀 Features

### For Traffic Police Officers
- ✅ QR code scanning for instant vehicle verification
- ✅ License plate number search
- ✅ Driving license validation
- ✅ Automated violation detection
- ✅ Digital E-Challan generation
- ✅ Case history tracking

### For System Administrators
- ✅ Complete system oversight
- ✅ User management & access control
- ✅ Case review & approval workflow
- ✅ Vehicle suspension & blacklist management
- ✅ Analytics dashboard with insights
- ✅ Immutable activity logs

### For Drivers
- ✅ View license status & details
- ✅ Check violation history
- ✅ Profile management

### For Vehicle Owners
- ✅ Vehicle registration
- ✅ Document expiry tracking
- ✅ Driver assignment
- ✅ Vehicle violation history
- ✅ Safety score monitoring

---

## 🛠️ Technology Stack

### Frontend
- **React.js** - Component-based UI
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **Lucide React** - Icon library
- **QRCode.react** - QR code generation

### Backend (Documentation)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (or PostgreSQL)
- **JWT** - Authentication
- **bcrypt** - Password hashing

---

## 📁 Project Structure

```
stves/
├── src/                      # Frontend source code
│   ├── components/           # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Toast.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── pages/                # Page components by role
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── police/           # Police officer pages
│   │   ├── admin/            # Admin pages
│   │   ├── driver/           # Driver pages
│   │   └── owner/            # Vehicle owner pages
│   │
│   ├── store/                # State management
│   │   ├── database.ts       # Mock database & seed data
│   │   └── useStore.ts       # Zustand store
│   │
│   └── utils/                # Utility functions
│       ├── cn.ts
│       └── validation.ts
│
├── backend/                  # Backend documentation & code
│   ├── server.js             # Express server entry
│   ├── routes/               # API route handlers
│   │   ├── auth.js
│   │   ├── vehicles.js
│   │   ├── violations.js
│   │   ├── verification.js
│   │   ├── users.js
│   │   └── analytics.js
│   │
│   ├── middleware/           # Express middleware
│   │   └── auth.js
│   │
│   ├── models/               # Database models
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   └── Violation.js
│   │
│   ├── config/               # Configuration
│   │   └── database.js
│   │
│   └── utils/                # Backend utilities
│       └── helpers.js
│
└── public/                   # Static assets
```

---

## 🔐 User Roles & Access

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **Admin** | Full | System monitoring, user management, case approval, blacklist control |
| **Police** | Enforcement | Vehicle/driver verification, E-Challan creation, QR scanning |
| **Driver** | Personal | View license, violation history, profile management |
| **Owner** | Vehicle | Vehicle registration, driver assignment, document tracking |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@stves.gov.bd | admin123 |
| Police | police@stves.gov.bd | police123 |
| Driver | driver@stves.gov.bd | driver123 |
| Owner | owner@stves.gov.bd | owner123 |

---

## 📊 Violation Types & Fines

| Code | Violation | Fine (BDT) |
|------|-----------|------------|
| DL_EXP | Expired Driving License | ৳5,000 |
| REG_EXP | Expired Vehicle Registration | ৳10,000 |
| FIT_EXP | Expired Fitness Certificate | ৳7,000 |
| TAX_EXP | Expired Tax Token | ৳3,000 |
| INS_EXP | Expired Insurance | ৳5,000 |
| NO_DL | Driving Without License | ৳25,000 |
| UNAUTH_DRV | Unauthorized Driver | ৳15,000 |
| BLACKLIST | Blacklisted Vehicle | ৳50,000 |

---

## 🚦 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     STVES ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Traffic    │    │    System    │    │   Drivers/   │  │
│  │   Police     │    │    Admin     │    │   Owners     │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                             │                                │
│                     ┌───────▼───────┐                       │
│                     │  React.js UI  │                       │
│                     │ (Tailwind CSS)│                       │
│                     └───────┬───────┘                       │
│                             │                                │
│                     ┌───────▼───────┐                       │
│                     │ Zustand State │                       │
│                     │  Management   │                       │
│                     └───────┬───────┘                       │
│                             │                                │
│         ┌───────────────────┼───────────────────┐           │
│         │                   │                   │           │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐    │
│  │Verification │    │   E-Challan │    │    User     │    │
│  │   Engine    │    │   Module    │    │ Management  │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             │                                │
│                     ┌───────▼───────┐                       │
│                     │   Mock BRTA   │                       │
│                     │   Database    │                       │
│                     └───────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔮 Future Scope

- [ ] Direct BRTA API integration
- [ ] Native mobile applications
- [ ] AI-based violation prediction
- [ ] Offline verification mode
- [ ] Payment gateway integration
- [ ] GPS-based tracking
- [ ] National deployment

---

## 📜 License

This project is developed for academic purposes as part of the Final Year Project at Metropolitan University, Sylhet.

---

## 🙏 Acknowledgments

Special thanks to **Abu Jafar Md. Jakaria** (Senior Lecturer) for supervision and guidance throughout this project.

---

© 2025 STVES - Smart Traffic Verification and Enforcement System
