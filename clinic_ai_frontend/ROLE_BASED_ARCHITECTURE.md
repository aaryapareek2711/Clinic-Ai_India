# Role-Based Architecture Guide

## 🎯 Overview

This application uses **strict role-based separation** between patient and provider experiences. This document explains why this separation exists and how it's implemented.

## ❓ Why Separate Patient and Provider Views?

### 1. **Clinical Safety**
- **Providers** see clinical decision support tools (risk scores, care gaps, diagnosis suggestions)
- **Patients** should NEVER see raw clinical data without doctor interpretation
- Exposing risk assessments directly to patients can cause anxiety and misdiagnosis

### 2. **Different Workflows**
- **Patients**: *Provide* information before visits (PreVisit workflow)
- **Providers**: *Review and analyze* information before visits (Appoint-Ready workflow)
- These are fundamentally different user journeys

### 3. **Security & Compliance**
- HIPAA requires appropriate access controls
- Providers need access to ALL patient data
- Patients should only see THEIR OWN data
- Different audit logging requirements

## 🏗️ Architecture

### Route Structure

```
app/
├── (auth)/                    # Public authentication routes
│   ├── login/
│   └── signup/
│
├── patient/                   # PATIENT-ONLY routes
│   ├── dashboard/            # Patient's main dashboard
│   ├── previsit/             # PreVisit.ai features
│   │   ├── symptoms/         # Symptom checker
│   │   ├── history/          # Medical history forms
│   │   └── checklist/        # Appointment checklist
│   ├── appointments/          # View upcoming appointments
│   ├── records/              # View personal medical records
│   └── messages/             # Secure messaging with provider
│
└── provider/                  # PROVIDER-ONLY routes
    ├── dashboard/            # Provider's main dashboard
    ├── appoint-ready/        # Appoint-Ready features
    │   ├── [appointmentId]/  # Specific appointment prep
    │   ├── context/          # Patient context building
    │   ├── risk-assessment/  # Risk stratification
    │   └── care-gaps/        # Care gap detection
    ├── patients/             # Patient list and management
    ├── schedule/             # Provider calendar
    └── clinical/             # Clinical documentation
```

## 🔐 Access Control

### Middleware Protection

The `middleware.ts` file enforces role-based access:

```typescript
// Provider trying to access patient route → Redirect to /provider/dashboard
// Patient trying to access provider route → Redirect to /patient/dashboard
```

### How It Works

1. **User logs in** → Receives auth token with role
2. **User navigates** → Middleware checks token
3. **Role verification** → Allows or redirects based on role
4. **Protected content** → Only shows authorized features

## 📊 Feature Separation

### Patient Features (PreVisit.ai)

| Feature | Purpose | Location |
|---------|---------|----------|
| Symptom Checker | Report current symptoms | `/patient/previsit/symptoms` |
| Medical History | Update personal history | `/patient/previsit/history` |
| Appointment Checklist | Pre-visit tasks | `/patient/previsit/checklist` |
| Insurance Verification | Confirm coverage | `/patient/previsit/insurance` |
| My Appointments | View scheduled visits | `/patient/appointments` |
| My Records | View personal medical data | `/patient/records` |

### Provider Features (Appoint-Ready)

| Feature | Purpose | Location |
|---------|---------|----------|
| Patient Context | View comprehensive patient summary | `/provider/appoint-ready/context` |
| Risk Stratification | Clinical risk assessment | `/provider/appoint-ready/risk-assessment` |
| Care Gap Detection | Identify missed screenings/care | `/provider/appoint-ready/care-gaps` |
| Clinical Decision Support | AI-powered recommendations | `/provider/appoint-ready/[appointmentId]` |
| Patient List | Manage all patients | `/provider/patients` |
| Schedule | Provider calendar | `/provider/schedule` |

## 🚨 Current Issue

**Problem**: Appoint-Ready features are showing on the patient dashboard

**Impact**:
- Patients see clinical risk scores → causes anxiety
- Patients see care gap alerts → confusion without context
- Violates intended architecture
- Poor user experience for both roles

**Solution**:
1. ✅ Created middleware for route protection
2. ✅ Separated features into correct route groups
3. ⏳ Need to update navigation to be role-aware
4. ⏳ Need to create separate layouts for patient vs provider

## 🔄 User Flow

### Patient Login Flow
```
1. Login → Receive 'patient' token
2. Redirect to /patient/dashboard
3. See: Upcoming appointments, Tasks, Messages
4. Can access: PreVisit features, Records, Appointments
5. Cannot access: Provider routes (blocked by middleware)
```

### Provider Login Flow
```
1. Login → Receive 'provider' token
2. Redirect to /provider/dashboard
3. See: Patient list, Schedule, Upcoming visits
4. Can access: Appoint-Ready features, Clinical tools, All patient data
5. Cannot access: Patient routes (blocked by middleware)
```

## 🎨 UI Differences

### Patient Dashboard
```tsx
- Welcome message with patient name
- Upcoming appointments card
- PreVisit checklist (if appointment coming up)
- Recent messages from provider
- Quick actions: "Schedule Appointment", "View Records"
```

### Provider Dashboard
```tsx
- Today's schedule
- Patient list with appoint-ready status
- Pending tasks (notes to complete, prescriptions to review)
- Statistics (patients seen, pending approvals)
- Quick actions: "View Schedule", "New Patient", "Clinical Inbox"
```

## 📝 Implementation Checklist

### ✅ Completed
- [x] Created middleware for route protection
- [x] Created auth utilities
- [x] Documented architecture

### ⏳ In Progress
- [ ] Create patient-specific layout (`app/patient/layout.tsx`)
- [ ] Create provider-specific layout (`app/provider/layout.tsx`)
- [ ] Move Appoint-Ready components to provider routes
- [ ] Move PreVisit components to patient routes
- [ ] Create role-aware navigation
- [ ] Update dashboard components

### 🔜 Next Steps
- [ ] Implement actual JWT authentication
- [ ] Add role-based data fetching
- [ ] Create audit logging
- [ ] Add permission checks in API routes
- [ ] Implement session management
- [ ] Add 2FA for providers

## 🧪 Testing

### Test Scenarios

**1. Patient Access Control**
```bash
# Login as patient
# Try to access: /provider/appoint-ready
# Expected: Redirect to /patient/dashboard
# Status: ❌ Should be blocked
```

**2. Provider Access Control**
```bash
# Login as provider
# Try to access: /patient/previsit/symptoms
# Expected: Redirect to /provider/dashboard
# Status: ❌ Should be blocked
```

**3. Correct Dashboard**
```bash
# Login as patient → See patient dashboard
# Login as provider → See provider dashboard
# Status: ✅ Working correctly
```

## 🔑 Key Principles

1. **Never mix patient and provider features** on the same page
2. **Clinical data** = Provider eyes only
3. **Patient data input** = Patient-facing forms
4. **Always redirect** unauthorized access attempts
5. **Log all access** for HIPAA compliance
6. **Clear separation** in code, routes, and UI

## 📚 References

- `CLAUDE.md` - Project architecture overview
- `Updated_Azure_Frontend_Deployment_Plan.md` - Detailed feature specs
- `middleware.ts` - Route protection implementation
- `lib/auth/middleware.ts` - Auth utilities

## ❓ FAQ

**Q: Can a provider view the patient portal?**
A: No. Providers have a completely separate interface designed for clinical workflows.

**Q: Can a patient see their risk score?**
A: No. Risk scores are clinical tools for providers. Patients see simplified, contextual health information through their dashboard.

**Q: What happens if someone manually types a wrong URL?**
A: Middleware automatically redirects them to their role-appropriate dashboard.

**Q: How do we handle admin users?**
A: Admin role will be added with access to both patient and provider routes plus admin-specific features.

## 🎓 Best Practices

1. **Always check user role** before rendering components
2. **Use middleware** for route protection (don't rely on UI hiding)
3. **Separate data fetching** - patients get limited data, providers get full access
4. **Different analytics** - track patient vs provider usage separately
5. **Role-specific error messages** - don't expose internal structure

---

**Remember**: Patient safety and user experience depend on proper role separation!
