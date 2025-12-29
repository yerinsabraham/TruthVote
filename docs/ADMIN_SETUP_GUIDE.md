# Admin Dashboard Setup Guide

## Overview
The TruthVote Admin Dashboard provides complete control over platform operations including prediction management, user management, rank management, and system monitoring.

## Admin User: yerinssaibs@gmail.com
Only this email address has admin access to the platform.

---

## Initial Setup

### 1. Configure Environment Variables

The `.env.local` file has been created with:
```bash
NEXT_PUBLIC_ADMIN_EMAIL=yerinssaibs@gmail.com
```

### 2. Set Up Admin Custom Claims

**IMPORTANT:** You must run this setup script once to grant admin privileges:

```bash
npm run setup-admin
```

This script will:
- Find the user account for yerinssaibs@gmail.com
- Set custom claims (`admin: true`) on the Firebase Auth account
- Update the Firestore user document with admin role
- Create an audit log entry

**Note:** After running this script, the admin user must sign out and sign back in for the changes to take effect.

### 3. Deploy Firestore Security Rules

Deploy the updated security rules that check for admin custom claims:

```bash
firebase deploy --only firestore:rules
```

### 4. Deploy Cloud Functions

Deploy the new admin Cloud Functions:

```bash
firebase deploy --only functions
```

---

## Accessing the Admin Dashboard

1. Navigate to: `https://yourapp.com/admin` or `http://localhost:3000/admin`
2. Sign in with: **yerinssaibs@gmail.com**
3. You'll be automatically redirected to the admin dashboard

**Security Features:**
- Server-side middleware protection
- Frontend route guards
- Backend custom claims verification
- All admin actions are logged for audit

---

## Admin Dashboard Features

### 1. Dashboard (Overview)
- Total users and active users (7-day)
- Active, closed, and resolved prediction counts
- Rank distribution chart
- System alerts for predictions needing resolution

### 2. Predictions Management
**Create Predictions:**
- Question (required, max 200 chars)
- Description (optional, max 1000 chars)
- Category (select from existing)
- Start time (optional - for scheduled predictions)
- End time (required)
- Options (2-6 options, default Yes/No)

**View & Manage:**
- Filter by status: all, draft, scheduled, active, closed, resolved
- View vote breakdown and percentages
- Delete draft predictions or predictions with no votes

### 3. Resolve Predictions
- View all predictions that have ended
- See vote distribution with percentages
- Select winning option
- Add explanation and source link (optional)
- Preview impact before confirming
- Automatic user stat updates and rank recalculation

### 4. User Management
**Search Users:**
- By email, username, or user ID
- View complete profile with:
  - Current rank and progress
  - Total predictions and accuracy rate
  - Account creation and last active dates
  - Complete rank history

### 5. Rank Management
**Manual Rank Changes:**
- Search for user
- Promote or demote to any rank
- Provide mandatory reason (for audit)
- Automatic logging of all changes
- Resets rank percentage to 0
- Sets `manuallyAdjusted: true` flag

**Valid Ranks:**
- Novice
- Amateur
- Analyst
- Professional
- Expert
- Master

---

## Cloud Functions (Admin Only)

All sensitive operations are handled server-side:

### `createPrediction`
Creates a new prediction with validation
- Checks admin authentication
- Validates required fields
- Sets status based on start time
- Logs action in audit trail

### `resolvePrediction`
Resolves a prediction and updates user stats
- Verifies prediction hasn't been resolved
- Updates all voter stats atomically
- Marks votes as correct/incorrect
- Updates user prediction counts and accuracy
- Logs resolution details

### `promoteUser`
Manually changes a user's rank
- Validates rank value
- Updates user document
- Creates rank history entry
- Logs promotion with reason

### `getAdminStats`
Retrieves dashboard statistics
- User counts (total, active)
- Prediction counts by status
- Rank distribution
- Used for dashboard overview

---

## Security Implementation

### 1. Custom Claims
```typescript
// Set once via setup script
admin.auth().setCustomUserClaims(adminUid, { admin: true });

// Verified in Cloud Functions
if (!context.auth.token.admin) {
  throw new HttpsError('permission-denied', 'Unauthorized');
}
```

### 2. Firestore Rules
```javascript
function isAdmin() {
  return request.auth.token.admin == true || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### 3. Frontend Protection
```typescript
// AuthContext checks custom claims
const tokenResult = await user.getIdTokenResult();
const isAdminClaim = tokenResult.claims.admin === true;
```

### 4. Middleware Protection
Server-side route protection at `/admin/*` paths

---

## Audit Logging

All admin actions are automatically logged to the `admin_logs` collection:

**Logged Actions:**
- Prediction creation
- Prediction resolution
- User rank promotion/demotion
- Admin setup

**Log Format:**
```typescript
{
  action: string,          // e.g., 'CREATE_PREDICTION'
  adminEmail: string,      // yerinssaibs@gmail.com
  timestamp: Timestamp,
  details: {              // Action-specific details
    predictionId?: string,
    userId?: string,
    reason?: string,
    // ... more fields
  }
}
```

---

## Common Tasks

### Create a New Prediction
1. Go to **Predictions** tab
2. Click **Create Prediction**
3. Fill in all required fields
4. Add/remove options as needed
5. Click **Create Prediction**

### Resolve a Prediction
1. Go to **Resolve** tab
2. Find the ended prediction
3. Click **Resolve**
4. Select the winning option
5. Optionally add explanation and source
6. Click **Confirm Resolution**

### Promote a User
1. Go to **Rank Management** tab
2. Search for the user (by email, username, or ID)
3. Click **Change Rank**
4. Select new rank
5. Provide reason (required)
6. Click **Confirm Change**

---

## Troubleshooting

### Admin Access Not Working
1. Verify you ran `npm run setup-admin`
2. Sign out and sign back in (required for custom claims to refresh)
3. Check browser console for errors
4. Verify `.env.local` contains correct admin email

### Cloud Functions Errors
1. Check function logs: `firebase functions:log`
2. Verify functions are deployed: `firebase deploy --only functions`
3. Ensure admin custom claims are set

### Security Rules Errors
1. Deploy latest rules: `firebase deploy --only firestore:rules`
2. Check rules match the admin authentication logic
3. Verify user has custom claims set

---

## Migration Notes

When migrating to AWS (future):
- Custom claims → Cognito custom attributes
- Cloud Functions → Lambda + API Gateway
- Firestore → DynamoDB/RDS
- Admin logs → CloudWatch Logs or dedicated audit table

See `admin_dashboard.md` section 10 for detailed migration strategy.

---

## Support

For issues or questions about the admin dashboard:
1. Check the audit logs in Firestore
2. Review Cloud Function logs
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

## Security Best Practices

✅ **DO:**
- Always log out when done
- Provide clear reasons for manual rank changes
- Double-check before resolving predictions
- Review audit logs regularly

❌ **DON'T:**
- Share admin credentials
- Make bulk changes without testing first
- Delete predictions with votes
- Resolve predictions without verifying the outcome

---

Last Updated: December 28, 2025
