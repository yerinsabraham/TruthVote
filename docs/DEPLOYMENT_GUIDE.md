# TruthRank Deployment Guide

**Date:** December 28, 2025  
**Status:** Ready for deployment

---

## Quick Start

```bash
# 1. Deploy Firestore indexes (5-10 minutes to build)
firebase deploy --only firestore:indexes

# 2. Deploy Cloud Functions (~2-3 minutes)
firebase deploy --only functions

# 3. Initialize rank data for existing users (~1-2 minutes)
npm run seed:ranks

# 4. Test manually (optional)
# Use Firebase Console or call manualRankRecalculation function
```

---

## Detailed Steps

### Step 1: Deploy Firestore Indexes

**Command:**
```bash
cd c:\TruthVote
firebase deploy --only firestore:indexes
```

**Expected Output:**
```
=== Deploying to 'truthvote-project'...

i  firestore: reading indexes from firestore.indexes.json...
✔  firestore: deployed indexes in firestore.indexes.json successfully
   ... (list of 5 new rank-related indexes)

✔  Deploy complete!
```

**Time:** 5-10 minutes (indexes build in background)

**Verify:**
```bash
firebase firestore:indexes
```

Look for these new indexes:
- `users`: `(currentRank ASC, rankPercentage DESC)`
- `users`: `(currentRank ASC, lastRankUpdateAt ASC)`
- `users`: `(lastActive ASC, inactivityStreaks DESC)`
- `users`: `(rankPercentage DESC, currentRankStartDate ASC)`
- `rankHistory`: `(userId ASC, timestamp DESC)`

---

### Step 2: Deploy Cloud Functions

**Command:**
```bash
firebase deploy --only functions
```

**Functions being deployed:**
1. `submitVote` (existing)
2. `createPrediction` (existing)
3. `resolvePrediction` (existing)
4. `autoClosePredictions` (existing)
5. **NEW:** `dailyRankRecalculation` (scheduled)
6. **NEW:** `manualRankRecalculation` (callable)
7. **NEW:** `inactivityDetection` (scheduled)
8. **NEW:** `rankPromotionCheck` (scheduled)

**Expected Output:**
```
=== Deploying to 'truthvote-project'...

i  functions: preparing codebase for deployment...
✔  functions: 8 functions deployed successfully

Functions deployed:
- submitVote (https)
- createPrediction (https)
- resolvePrediction (https)
- autoClosePredictions (scheduled)
- dailyRankRecalculation (scheduled)
- manualRankRecalculation (https)
- inactivityDetection (scheduled)
- rankPromotionCheck (scheduled)

✔  Deploy complete!
```

**Time:** 2-3 minutes

**Verify:**
```bash
firebase functions:list
```

---

### Step 3: Initialize Rank Data

**Command:**
```bash
npm run seed:ranks
```

**What it does:**
- Reads all existing users from Firestore
- Calculates initial rank statistics:
  - `totalResolvedPredictions` (from votes with isCorrect != null)
  - `contrarianWinsCount` (from votes with isCorrect && wasContrarian)
  - `weeklyActivityCount` (unique weeks with votes in last 8 weeks)
  - `inactivityStreaks` (30+ day gaps in activity)
- Sets all users to `Novice` rank with 0% progress
- Creates initial leaderboard cache documents

**Expected Output:**
```
╔════════════════════════════════════════════════╗
║   TruthVote Rank Data Seeding Script v1.0     ║
╚════════════════════════════════════════════════╝

Starting rank data seeding...

Found 152 users

✅ user1: 23 resolved, 18 correct, 2 contrarian wins, 5 active weeks, 0 inactive periods
✅ user2: 45 resolved, 32 correct, 5 contrarian wins, 8 active weeks, 1 inactive periods
...

📦 Committed batch 1
📦 Committed batch 2

=== Rank Data Seeding Complete ===
Total users: 152
Processed: 152
Updated: 152
Skipped: 0
Errors: 0


Initializing leaderboard cache...

✅ Created leaderboard cache for Novice
✅ Created leaderboard cache for Amateur
✅ Created leaderboard cache for Analyst
✅ Created leaderboard cache for Professional
✅ Created leaderboard cache for Expert
✅ Created leaderboard cache for Master

✅ Leaderboard cache initialized

✅ All seeding operations complete!
```

**Time:** 1-2 minutes (depends on user count)

---

### Step 4: Manual Testing

**Option A: Firebase Console**

1. Go to Firebase Console → Firestore Database
2. Open `users` collection
3. Check a few user documents have new fields:
   - `currentRank: "Novice"`
   - `rankPercentage: 0`
   - `totalResolvedPredictions: <number>`
   - `weeklyActivityCount: <number>`
   - etc.

**Option B: Call Manual Recalculation Function**

```bash
# Using Firebase CLI
firebase functions:shell

# Then in the shell:
manualRankRecalculation({
  data: { userId: "USER_ID_HERE", force: true },
  auth: { uid: "ADMIN_USER_ID" }
})
```

**Option C: Test in Frontend**

1. Add RankBadge component to a page:

```tsx
import { RankBadge } from '@/components/RankBadge';
import { useAuth } from '@/context/AuthContext';

export default function TestPage() {
  const { user } = useAuth();
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Rank Badge Test</h1>
      {user && (
        <RankBadge
          userId={user.id}
          currentRank={user.currentRank}
          rankPercentage={user.rankPercentage}
          size="large"
          showProgress={true}
          showTooltip={true}
        />
      )}
    </div>
  );
}
```

2. Add RankLeaderboard component:

```tsx
import { RankLeaderboard } from '@/components/leaderboard/RankLeaderboard';

export default function LeaderboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Leaderboards</h1>
      <RankLeaderboard rank="Novice" limit={10} />
    </div>
  );
}
```

---

## Scheduled Jobs

Once deployed, these jobs will run automatically:

| Function | Schedule | Purpose |
|----------|----------|---------|
| `dailyRankRecalculation` | 2:00 AM UTC daily | Recalculate all user ranks |
| `inactivityDetection` | 3:00 AM UTC Sundays | Flag inactive users |
| `rankPromotionCheck` | 2:30 AM UTC daily | Promote eligible users |
| `autoClosePredictions` | Every 60 minutes | Close expired predictions |

**View logs:**
```bash
firebase functions:log --only dailyRankRecalculation
firebase functions:log --only inactivityDetection
firebase functions:log --only rankPromotionCheck
```

---

## Rollback Plan

If issues are detected after deployment:

**1. Disable new Cloud Functions:**
```bash
# Delete new functions (keeps existing ones)
firebase functions:delete dailyRankRecalculation
firebase functions:delete inactivityDetection
firebase functions:delete rankPromotionCheck
firebase functions:delete manualRankRecalculation
```

**2. Remove rank fields from frontend:**
```bash
# Comment out RankBadge imports in components
# Revert user type changes if needed
```

**3. Keep data intact:**
- Do NOT delete rank fields from users collection
- Keep rankHistory collection for audit trail
- Indexes remain (harmless if unused)

**4. Re-deploy after fixes:**
```bash
firebase deploy --only functions
```

---

## Monitoring

**Check deployment status:**
```bash
# List all functions
firebase functions:list

# Check specific function logs
firebase functions:log --only dailyRankRecalculation --limit 50

# Check errors
firebase functions:log --only functions --only-errors
```

**Key metrics to watch (first 24 hours):**
- ✅ `dailyRankRecalculation` completes in <10 minutes
- ✅ `processedUsers` count matches total users
- ✅ `errorCount` is 0 or <1% of total
- ✅ Leaderboard API responds in <500ms
- ✅ No 500 errors in Cloud Functions logs

**Firebase Console Monitoring:**
1. Functions → Usage → Check invocation counts
2. Firestore → Usage → Check read/write operations spike
3. Hosting → Performance → Check page load times

---

## Troubleshooting

### Issue: Indexes still building

**Symptom:** Firestore queries fail with "requires an index" error

**Solution:**
- Check index status: `firebase firestore:indexes`
- Wait for all indexes to show `READY` status
- Can take 5-10 minutes for large collections

### Issue: Cloud Functions timing out

**Symptom:** `dailyRankRecalculation` logs show timeout errors

**Solution:**
```javascript
// In functions/index.js, increase timeout:
exports.dailyRankRecalculation = onSchedule({
  schedule: "0 2 * * *",
  timeoutSeconds: 540, // Already set to 9 minutes
  memory: "1GB", // Add this if needed
  ...
});
```

### Issue: Seed script fails

**Symptom:** "User not found" or "Permission denied" errors

**Solution:**
1. Check Firebase Admin credentials in `.env`:
   ```
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account@...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

2. Verify service account has permissions:
   - Firestore Admin
   - Cloud Functions Admin

3. Re-run: `npm run seed:ranks`

### Issue: Leaderboard shows "No users"

**Symptom:** RankLeaderboard component shows empty state

**Solution:**
1. Verify users have `currentRank` field:
   ```bash
   # Check in Firestore Console
   # OR run seed script again
   npm run seed:ranks
   ```

2. Check API route is working:
   ```bash
   curl http://localhost:3000/api/leaderboard/Novice
   ```

3. Verify Firestore indexes are ready

---

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** - Check logs daily
2. **Run manual rank recalculation** - Test with a few users
3. **Implement unit tests** - Task 10 on roadmap
4. **Add monitoring dashboards** - Task 11 on roadmap
5. **User announcement** - Let users know about new rank system
6. **Gather feedback** - Adjust formula if needed

---

## Support

**Documentation:**
- [Rank Calculation Formula](./rank-calculation-formula.md)
- [AWS Migration Strategy](./rank-migration-strategy.md)
- [Implementation Summary](../TRUTHRANK_IMPLEMENTATION.md)

**Logs:**
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only dailyRankRecalculation

# Errors only
firebase functions:log --only-errors --limit 100
```

**Emergency Contact:**
- Check Firebase Console for real-time errors
- Review GitHub issues for known problems
- Rollback using steps above if critical

---

**Last Updated:** December 28, 2025  
**Next Review:** After first 24 hours of production use
