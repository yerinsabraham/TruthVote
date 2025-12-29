ADMIN DASHBOARD IMPLEMENTATION INSTRUCTION (TruthVote)
1. Purpose of the Admin Dashboard
The Admin Dashboard is a restricted, internal control panel used solely by the platform owner (me) to manage TruthVote's core operations.
Only one email address (the platform owner's email) must have access.
The admin dashboard will handle:

Creating and managing predictions
Resolving predictions
Manually promoting or adjusting user ranks
Viewing basic system health and prediction status
[ADDITION] Viewing and moderating user reports/flags
[ADDITION] Managing platform-wide announcements or featured predictions

This dashboard is not public, not user-facing, and must never be accessible by regular users.

2. Access Control and Authentication (Critical)
Admin Access Rules

Admin access must be enforced at both frontend and backend levels
Authentication is done using Firebase Auth
Only one approved admin email is allowed (stored in environment config, not hardcoded in code)
[ADDITION] Admin status must be verified on every sensitive operation, not just on login

Example approach:
Environment Configuration:
envADMIN_EMAIL=your-admin@email.com
Backend Verification (Cloud Function):
typescript// Every admin function must start with this
const isAdmin = (email: string): boolean => {
  return email === process.env.ADMIN_EMAIL;
};

// In every admin callable function:
if (!isAdmin(context.auth.email)) {
  throw new functions.https.HttpsError(
    'permission-denied',
    'Unauthorized access'
  );
}
Frontend Protection:
typescript// Route guard
const useAdminGuard = () => {
  const user = useAuth();
  return user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
};
[ADDITION - CRITICAL] Implement custom claims in Firebase Auth:

Set admin: true claim for admin user during first login
Verify this claim in security rules and Cloud Functions
This prevents relying solely on email comparison (more secure and scalable)

typescript// Set custom claim (run once manually or in setup script)
admin.auth().setCustomUserClaims(adminUid, { admin: true });

// Verify in functions
if (!context.auth.token.admin) {
  throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
}
Admin Route Structure
Admin Dashboard URL: /admin
Reason:

Cleaner separation of concerns
Easier to protect with route guards
Easier to migrate later to AWS or another backend

Behavior:

If a non-admin user attempts to access /admin, redirect to home or show "Unauthorized"
The Admin Dashboard button or link should only render if admin is logged in
[ADDITION] Implement server-side route protection using Next.js middleware

[ADDITION] Create /middleware.ts:
typescriptexport function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Verify admin token server-side
    // Redirect if not admin
  }
}
```

---

## 3. Admin Dashboard Core Sections

The dashboard should be modular, clean, and scalable.

### A. Predictions Management

#### Create Prediction

Admin must be able to:
- Create a new prediction with:
  - **Title** (required, max 200 chars)
  - **Description** (optional, max 1000 chars, supports markdown **[ADDITION]**)
  - **Cover image** (stored in Firebase Storage, **max 2MB, auto-resize to 1200x630 [ADDITION]**)
  - **Category** (sports, politics, entertainment, culture, technology **[ADDITION]**)
  - **Start date/time** (must be >= current time **[ADDITION]**)
  - **End date/time** (must be > start time **[ADDITION]**)
  - **[ADDITION]** **Difficulty weight** (optional: set if prediction is expected to be contrarian)
  - **[ADDITION]** **Featured flag** (mark prediction as featured on homepage)
  - **[ADDITION]** **Tags** (optional keywords for filtering/search)
  
- Add prediction options:
  - Minimum: 2 options
  - Maximum: 6 options
  - Default UI should suggest Yes / No
  - Admin can rename options freely
  - **[ADDITION]** Each option can have an optional icon/emoji

**Rules:**
- Only the admin can create predictions
- There must be no frontend UI anywhere that allows users to create predictions
- **[ADDITION]** Predictions must validate dates, required fields, and image formats before submission
- **[ADDITION]** Draft predictions can be saved without publishing

#### Prediction Status

Each prediction should have a clear status:
- **Draft** (not visible to users)
- **Scheduled** (visible but voting not started) **[ADDITION]**
- **Active** (voting open)
- **Closed** (voting ended, awaiting resolution)
- **Resolved** (outcome declared, rewards distributed)
- **Cancelled** (admin cancelled before/during voting) **[ADDITION]**

Admin must be able to:
- See all predictions grouped by status
- **[ADDITION]** Filter predictions by category, date range, status
- Open any prediction to view:
  - Vote breakdown (with percentages)
  - **[ADDITION]** Total participants
  - **[ADDITION]** Voting timeline graph (votes over time)
  - **[ADDITION]** User distribution by rank (how many Novices, Amateurs, etc. voted)
- Close a prediction manually if needed
- **[ADDITION]** Edit draft or scheduled predictions
- **[ADDITION]** Delete predictions (only if draft or no votes yet)

**[ADDITION]** Implement **bulk actions**:
- Select multiple predictions
- Bulk close, bulk feature, bulk categorize

---

### B. Resolve Prediction (Very Important)

Admin must be able to:
- Select the correct option after the prediction ends
- **[ADDITION]** Add a resolution explanation (optional, shows to users)
- **[ADDITION]** Provide a source link (optional, for transparency)
- Confirm resolution with a final "Resolve" action
- **[ADDITION]** Preview impact before resolving:
  - How many users will be marked correct
  - How many users will be marked incorrect
  - Estimated rank percentage changes for top voters

**On resolution:**

The backend should:
- Lock the prediction permanently
- Calculate correct vs incorrect votes
- Trigger reward and rank progression logic
- Update user stats **atomically**
- **[ADDITION]** Generate shareable results graphics (auto-create social media cards)
- **[ADDITION]** Queue notifications to users who voted (via weekly digest, not immediate spam)
- **[ADDITION]** Log resolution details for audit trail

**Important:**
- Resolution logic must live in **Cloud Functions**, not frontend
- Frontend only sends the resolution command
- **[ADDITION]** Resolution must be **idempotent** (running it twice doesn't double-reward users)
- **[ADDITION]** Implement confirmation modal with summary before final resolution

**[ADDITION]** Allow **dispute resolution**:
- If admin realizes a mistake, allow "unresolve" within 24 hours
- Reverting a resolution must:
  - Undo rank/point changes
  - Notify affected users
  - Log the reversal

---

### C. Rank Management (Manual Override Tools)

Although ranks are mostly automatic, admin must have manual override power.

#### Promote User Rank

Admin should be able to:
- **Search for user by:**
  - Email **[ADDITION]**
  - Username **[ADDITION]**
  - User ID
- View their current:
  - Rank
  - Rank percentage
  - **[ADDITION]** Accuracy rate
  - **[ADDITION]** Total predictions
  - **[ADDITION]** Account age
- Promote them to a higher rank manually
- **[ADDITION]** Demote them to a lower rank (if needed for abuse cases)
- **[ADDITION]** Adjust their rank percentage (without changing rank)
- **[ADDITION]** Reset their stats (nuclear option for testing/abuse)

**Use cases:**
- Giveaways
- Promotions
- Special contributions
- Referrals or community rewards
- **[ADDITION]** Correcting system bugs or calculation errors

**Rules:**
- Manual promotion:
  - Must update backend rank state
  - Must sync with rank progression logic
  - Should be logged for audit purposes with:
    - Admin email
    - Timestamp
    - User affected
    - Action taken
    - Reason provided **[ADDITION]**

**Important:**
- Manual promotion should not break automatic rank calculations
- The system must still continue tracking time, accuracy, and activity after promotion
- **[ADDITION]** Manual rank changes should set a flag `manuallyAdjusted: true` on the user record

**Required:**
- Add a **"Reason" field** (required, stored in audit log)
- **[ADDITION]** Add confirmation modal showing before/after state

**[ADDITION]** Implement **bulk rank operations**:
- Promote all users in a certain rank who meet criteria
- Example: "Promote all Amateurs with 75%+ accuracy to Analyst"

---

## 4. System Health Dashboard **[NEW SECTION]**

**[ADDITION]** Create a "Dashboard" home view showing:

### Key Metrics (at-a-glance)
- Total users (with growth trend)
- Active users (last 7 days)
- Total predictions (active, resolved, pending)
- Predictions awaiting resolution (highlight if > 3 days old)
- Average votes per prediction
- Platform accuracy rate (% of users who voted correctly on resolved predictions)

### Recent Activity Feed
- Last 10 user signups
- Last 10 predictions created
- Last 10 predictions resolved
- Recent rank promotions (automatic and manual)

### System Alerts
- Predictions ending in next 24 hours (need resolution soon)
- Predictions with no votes yet
- Background jobs that failed (from Cloud Functions logs)
- Users reported by other users (if moderation is added)

### Rank Distribution Chart
- Visual breakdown of users across ranks:
  - Novice: 45%
  - Amateur: 30%
  - Analyst: 15%
  - Professional: 7%
  - Expert: 2.5%
  - Master: 0.5%

---

## 5. User Management **[NEW SECTION]**

**[ADDITION]** Create a "Users" section where admin can:

### Search & View Users
- Search by email, username, or user ID
- View user profile with:
  - Rank and progression
  - Prediction history
  - Accuracy stats
  - Account creation date
  - Last active date
  - **[ADDITION]** Voting patterns (which categories they vote on most)

### User Actions
- View detailed prediction history (with outcomes)
- **[ADDITION]** Ban/suspend user (if abuse detected)
- **[ADDITION]** Reset user password (send reset email)
- **[ADDITION]** Delete user account (with confirmation, GDPR compliance)
- **[ADDITION]** Export user data (for GDPR data requests)

### Moderation Tools **[ADDITION]**
- View flagged/reported users
- Review suspicious voting patterns (rapid voting, bot-like behavior)
- Whitelist/blacklist users

---

## 6. Content Management **[NEW SECTION]**

**[ADDITION]** Allow admin to:

### Featured Predictions
- Mark predictions as "Featured" (appear at top of user feed)
- Set featured order/priority
- Schedule featured status (auto-feature during specific dates)

### Categories Management
- Add/edit/delete prediction categories
- Set category icons and colors
- Set category visibility (hide certain categories from users)

### Announcements **[ADDITION]**
- Create platform-wide announcements (banner on homepage)
- Schedule announcement start/end dates
- Mark as dismissible or persistent
- Target specific user ranks (e.g., only show to Novices)

---

## 7. Analytics & Reporting **[NEW SECTION - OPTIONAL BUT RECOMMENDED]**

**[ADDITION]** Basic analytics dashboard:

### Prediction Analytics
- Most voted predictions (all-time, last 30 days)
- Most controversial predictions (closest to 50/50 split)
- Predictions with highest accuracy (users got it right)
- Predictions with lowest accuracy (most users were wrong)

### User Engagement
- Daily/weekly/monthly active users
- Average predictions per user
- Retention rate (users still active after 30 days)
- Rank progression rate (average time to reach each rank)

### Export Options
- Export all predictions to CSV
- Export all users to CSV (anonymized if needed)
- Export analytics data for external analysis

---

## 8. UI and UX Expectations

- Clean, professional admin UI
- **Desktop-first layout** (mobile view optional but not priority)
- **Sidebar navigation recommended:**
  - **Dashboard** (system health overview)
  - **Predictions** (create, view, edit)
  - **Resolve** (pending resolutions)
  - **Users** (search, view, manage) **[ADDITION]**
  - **Rank Management** (manual promotions)
  - **Content** (categories, announcements) **[ADDITION]**
  - **Analytics** (optional) **[ADDITION]**
  - **Settings** (future)

**[ADDITION]** Design principles:
- Use consistent color coding:
  - Green = active/success
  - Yellow = pending/warning
  - Red = closed/error
  - Blue = draft/info
- Include confirmation modals for destructive actions
- Show loading states for all async operations
- Display success/error toasts after actions
- Implement keyboard shortcuts for power users (e.g., `Ctrl+N` = new prediction)

The AI dev may improve UI structure as long as functionality stays intact.

**[ADDITION]** Use a modern admin dashboard template/library if available:
- Tailwind Admin components
- shadcn/ui admin templates
- React Admin
- Refine.dev

This speeds up development and ensures professional polish.

---

## 9. Firebase Implementation Guidelines (Migration-Ready)

### Backend Logic

- All sensitive logic must live in **Cloud Functions**:
  - Prediction creation
  - Prediction resolution
  - Rank promotion/demotion
  - User deletion
  - Bulk operations
  - **[ADDITION]** Analytics aggregation
  - **[ADDITION]** Notification queuing

- Frontend should only call functions via **HTTPS callable endpoints** or **REST API endpoints**

**[ADDITION]** Structure Cloud Functions for AWS migration:
```
/functions
  /src
    /admin
      createPrediction.ts
      resolvePrediction.ts
      promoteUser.ts
    /ranking
      (rank logic from previous instruction)
    /shared
      auth.ts (admin verification)
      database.ts (abstracted data access)
Data Access

Abstract data access logic into repository pattern
Avoid tightly coupling frontend to Firestore structure
Use service-style functions where possible
[ADDITION] All database queries should go through repository layer

Example:
typescript// Bad (tightly coupled)
const predictions = await firebase.firestore()
  .collection('predictions')
  .where('status', '==', 'active')
  .get();

// Good (abstracted)
const predictions = await predictionsRepo.findByStatus('active');
Security Rules
Firestore rules must:

Prevent non-admin writes to predictions collection
Prevent users from changing their rank
Prevent users from resolving predictions
[ADDITION] Prevent users from reading other users' private data
[ADDITION] Allow users to read their own data only

[ADDITION] Example Security Rules:
javascriptrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function
    function isAdmin() {
      return request.auth.token.admin == true;
    }
    
    // Predictions: read by all, write by admin only
    match /predictions/{predictionId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Users: read own data, write restricted
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow write: if false; // All writes via Cloud Functions
    }
    
    // Admin-only collections
    match /admin_logs/{logId} {
      allow read, write: if isAdmin();
    }
  }
}

10. Migration Awareness (AWS-Ready Documentation)
Note: Since migration strategy is already documented in the main rank system, only document admin-specific migration concerns here.
Create or update: /docs/ADMIN_DASHBOARD_MIGRATION.md
This file must document:
Admin Authentication Migration

Firebase Auth custom claims → AWS Cognito user pools with custom attributes
Environment variable approach → AWS Systems Manager Parameter Store or Secrets Manager

Cloud Functions → AWS Lambda

Map each admin Cloud Function to a Lambda function
Use AWS API Gateway for HTTP endpoints
Authentication via Cognito authorizers

Firestore → DynamoDB/RDS

How admin queries map to DynamoDB scan/query operations
OR: If using RDS, how to structure admin tables

File Storage Migration

Firebase Storage → AWS S3
Prediction cover images bucket migration
Update image URLs after migration

Specific Admin Function Mappings
Firebase FunctionAWS EquivalentcreatePredictionLambda + API Gateway POST /admin/predictionsresolvePredictionLambda + API Gateway POST /admin/predictions/{id}/resolvepromoteUserLambda + API Gateway POST /admin/users/{id}/promoteScheduled jobsAWS EventBridge + Lambda
Do NOT repeat the general migration strategy already covered in the rank system documentation.

11. Security Best Practices [NEW SECTION]
[ADDITION] Admin dashboard must implement:
Rate Limiting

Limit admin API calls to prevent accidental abuse
Example: Max 100 prediction creations per hour

Audit Logging

Log every admin action with:

Action type
Timestamp
Admin email
Affected resource (prediction ID, user ID, etc.)
Before/after state (for rank changes)
IP address [ADDITION]


Store logs in separate Firestore collection: /admin_logs
Never delete audit logs (retention: infinite or per legal requirement)

Input Validation

Validate all admin inputs server-side (never trust frontend)
Sanitize prediction descriptions (prevent XSS if markdown is used)
Validate image uploads (file type, size, dimensions)
Validate date ranges (end > start, start >= now)

Error Handling

Never expose internal errors to frontend
Log detailed errors server-side
Show generic error messages to admin frontend
Implement Sentry or similar error tracking


12. Testing Requirements [NEW SECTION]
[ADDITION] Admin dashboard must be tested:
Manual Testing Checklist

 Admin login with correct email works
 Non-admin email is blocked
 Create prediction (all fields, with image)
 Edit draft prediction
 Delete draft prediction
 Close active prediction manually
 Resolve closed prediction
 View vote breakdown for resolved prediction
 Promote user manually (with reason)
 Demote user manually
 Search for user by email
 View leaderboard for each rank
 Check system health metrics
 Test on mobile (basic responsiveness)

Automated Tests (if time allows)

Unit tests for admin verification logic
Integration tests for prediction creation flow
Integration tests for resolution flow
Security tests for unauthorized access attempts


13. Non-Negotiables

No admin logic in frontend only
No user-created predictions (ever)
No rank changes without backend verification
[ADDITION] No destructive actions without confirmation modals
[ADDITION] All admin actions must be logged
[ADDITION] Admin authentication must be verified on every sensitive operation
Everything must be automatable and scalable
[ADDITION] Admin dashboard must work on desktop browsers (Chrome, Firefox, Safari)


14. Implementation Priority [NEW SECTION]
[ADDITION] Build in this order:
Phase 1 (MVP - Must Have)

Admin authentication and route protection
Create prediction (basic form)
View all predictions (list with status filter)
Resolve prediction (select correct option)
Manual rank promotion (single user)

Phase 2 (Enhanced - Should Have)

Edit/delete predictions
Prediction analytics (vote breakdown)
User search and view
System health dashboard
Audit logging

Phase 3 (Advanced - Nice to Have)

Bulk operations
Advanced analytics
Featured predictions management
Announcements
User moderation tools


15. Final Notes

Admin dashboard is for internal use only—prioritize functionality over polish
However, keep UI clean enough that you can use it efficiently daily
Document any non-obvious workflows in /docs/ADMIN_USAGE.md for future reference
If adding features beyond this spec, document them before implementing
[ADDITION] Create a /admin/README.md with:

How to access admin dashboard
How to set up admin user (custom claims)
Common tasks and workflows
Troubleshooting guide




Key Improvements Summary
What I added:

Custom claims for admin verification (more secure than email comparison)
Server-side route protection (Next.js middleware)
Prediction scheduling and cancellation (better lifecycle management)
Resolution preview and dispute handling (safety before finalizing)
System health dashboard (at-a-glance platform overview)
User management section (search, view, moderate users)
Content management (featured predictions, announcements)
Analytics section (basic reporting and insights)
Security best practices (rate limiting, audit logging, input validation)
Testing checklist (ensure quality before launch)
Implementation priority phases (helps dev know what to build first)
Bulk operations (efficiency for managing multiple items)
Confirmation modals (prevent accidental destructive actions)
UI/UX design principles (consistency and usability)