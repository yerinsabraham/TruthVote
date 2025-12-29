# TruthRank Migration Strategy (Firebase → AWS)

**Version:** 1.0  
**Last Updated:** December 28, 2025  
**Target:** Zero-downtime migration with rollback capability

---

## Architecture Overview

### Current State (Firebase-Native)
```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│  - RankBadge component                              │
│  - Leaderboard component                            │
│  - Direct rankService calls                         │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│          Service Layer (Backend-Agnostic)           │
│  - rankService.ts (orchestration)                   │
│  - rankEngine.ts (domain logic)                     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│         Repository Layer (Firestore-Specific)       │
│  - userRankRepository.ts                            │
│  - Firestore SDK calls                              │
│  - Firestore queries & indexes                      │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                  Firebase Backend                   │
│  - Cloud Functions (Node.js)                        │
│    • dailyRankRecalculation (cron)                  │
│    • inactivityDetection (cron)                     │
│    • rankPromotionCheck (cron)                      │
│  - Firestore Database                               │
│    • users collection (rank fields)                 │
│    • rankHistory collection                         │
│    • leaderboards cache collection                  │
│  - Cloud Scheduler                                  │
└─────────────────────────────────────────────────────┘
```

### Target State (AWS-Native)
```
┌─────────────────────────────────────────────────────┐
│             Frontend (Next.js) - UNCHANGED          │
│  - RankBadge component                              │
│  - Leaderboard component                            │
│  - Same rankService calls                           │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│     Service Layer (Backend-Agnostic) - UNCHANGED    │
│  - rankService.ts (orchestration)                   │
│  - rankEngine.ts (domain logic)                     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│        Repository Layer (DynamoDB-Specific) - NEW   │
│  - userRankRepository.dynamo.ts                     │
│  - AWS SDK v3 calls                                 │
│  - DynamoDB queries & GSIs                          │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                     AWS Backend                     │
│  - Lambda Functions (Node.js)                       │
│    • dailyRankRecalculation (EventBridge trigger)   │
│    • inactivityDetection (EventBridge trigger)      │
│    • rankPromotionCheck (EventBridge trigger)       │
│  - DynamoDB Tables                                  │
│    • Users table (with rank attributes)             │
│    • RankHistory table                              │
│    • LeaderboardCache table (TTL enabled)           │
│  - EventBridge Scheduler                            │
└─────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 0: Firebase Preparation (Current Sprint)
**Goal:** Eliminate Firebase coupling from application logic.

**Tasks:**
- ✅ Create `/lib/ranking/rankEngine.ts` (domain logic, zero Firebase imports)
- ✅ Create `/lib/repositories/userRankRepository.ts` (data access layer)
- ✅ Create `/lib/ranking/rankService.ts` (orchestration layer)
- ✅ Ensure all rank logic uses ISO 8601 UTC strings, not Firebase Timestamps
- ✅ Document formula in `/docs/rank-calculation-formula.md`
- ⏳ Implement Cloud Functions: `dailyRankRecalculation`, `inactivityDetection`, `rankPromotionCheck`
- ⏳ Deploy and test end-to-end in Firebase

**Success Criteria:**
- Zero direct Firebase SDK calls in domain logic
- All timestamps are ISO strings
- Repository layer is only place with Firestore code
- 100% test coverage on `rankEngine.ts`

---

### Phase 1: AWS Infrastructure Setup (2-3 days)

#### 1.1 Create DynamoDB Tables

**Users Table:**
```
Table Name: Users
Partition Key: userId (String)
Attributes:
  - currentRank (String)
  - rankPercentage (Number)
  - totalResolvedPredictions (Number)
  - contrarianWinsCount (Number)
  - weeklyActivityCount (Number)
  - inactivityStreaks (Number)
  - currentRankStartDate (String, ISO 8601)
  - lastRankUpdateAt (String, ISO 8601)
  - accountCreatedAt (String, ISO 8601)

GSI-1 (Leaderboard):
  Partition Key: currentRank (String)
  Sort Key: rankPercentage (Number, descending)
```

**RankHistory Table:**
```
Table Name: RankHistory
Partition Key: userId (String)
Sort Key: timestamp (String, ISO 8601)
Attributes:
  - previousRank (String)
  - newRank (String)
  - percentage (Number)
  - trigger (String: "auto_promotion" | "manual" | "demotion")
```

**LeaderboardCache Table:**
```
Table Name: LeaderboardCache
Partition Key: rankKey (String, e.g., "ANALYST_TOP100")
Attributes:
  - data (List of Maps)
  - generatedAt (String, ISO 8601)
  - ttl (Number, Unix timestamp for auto-deletion)
```

#### 1.2 Create Lambda Functions

**Lambda Configuration:**
- Runtime: Node.js 20.x
- Memory: 512 MB (adjust based on load testing)
- Timeout: 5 minutes (for batch operations)
- Environment Variables:
  - `DYNAMODB_USERS_TABLE`: Users
  - `DYNAMODB_RANK_HISTORY_TABLE`: RankHistory
  - `DYNAMODB_LEADERBOARD_CACHE_TABLE`: LeaderboardCache
  - `AWS_REGION`: us-east-1

**Lambda Functions to Create:**
1. `dailyRankRecalculation` - Scheduled daily at 2 AM UTC
2. `inactivityDetection` - Scheduled weekly on Sundays at 3 AM UTC
3. `rankPromotionCheck` - Triggered after daily recalculation completes

#### 1.3 Create EventBridge Rules

```yaml
DailyRankRecalculation:
  Schedule: cron(0 2 * * ? *)  # 2 AM UTC daily
  Target: dailyRankRecalculation Lambda

WeeklyInactivityDetection:
  Schedule: cron(0 3 ? * SUN *)  # 3 AM UTC Sundays
  Target: inactivityDetection Lambda
```

---

### Phase 2: Dual-Write Period (7 days)

**Goal:** Write to both Firebase and DynamoDB, read from Firebase only.

#### 2.1 Create Feature Flag
```typescript
// src/config/migration.ts
export const MIGRATION_CONFIG = {
  USE_AWS: false,              // Read from AWS when true
  DUAL_WRITE: true,            // Write to both systems
  AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_API_URL || '',
  FIREBASE_ENABLED: true       // Keep Firebase active
};
```

#### 2.2 Implement DynamoDB Repository
```typescript
// src/lib/repositories/userRankRepository.dynamo.ts
import { DynamoDBClient, GetItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class DynamoUserRankRepository {
  private client: DynamoDBClient;
  
  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const command = new GetItemCommand({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      Key: marshall({ userId })
    });
    
    const response = await this.client.send(command);
    if (!response.Item) {
      throw new RepositoryError('USER_NOT_FOUND', `User ${userId} not found`);
    }
    
    return unmarshall(response.Item) as UserStats;
  }

  async updateUserRank(userId: string, updates: Partial<UserStats>): Promise<void> {
    // Implementation with UpdateItemCommand
  }

  async getRankLeaderboard(rank: Rank, limit: number): Promise<LeaderboardEntry[]> {
    const command = new QueryCommand({
      TableName: process.env.DYNAMODB_USERS_TABLE,
      IndexName: 'GSI-1',
      KeyConditionExpression: 'currentRank = :rank',
      ExpressionAttributeValues: marshall({ ':rank': rank }),
      ScanIndexForward: false,  // Descending order
      Limit: limit
    });
    
    const response = await this.client.send(command);
    return response.Items?.map(item => unmarshall(item)) || [];
  }

  // Other methods...
}
```

#### 2.3 Modify Service Layer for Dual-Write
```typescript
// src/lib/ranking/rankService.ts
import { MIGRATION_CONFIG } from '@/config/migration';
import { userRankRepository as firestoreRepo } from './repositories/userRankRepository';
import { DynamoUserRankRepository } from './repositories/userRankRepository.dynamo';

const dynamoRepo = new DynamoUserRankRepository();

export class RankService {
  private async dualWrite(operation: () => Promise<void>) {
    if (MIGRATION_CONFIG.DUAL_WRITE) {
      await Promise.all([
        operation(),  // Write to Firebase
        operation()   // Write to DynamoDB (modified to use dynamoRepo)
      ]);
    } else {
      await operation();
    }
  }

  async performRankUpgrade(userId: string, userStats: UserStats, newRank: Rank) {
    // Existing logic...
    
    // Dual write
    await this.dualWrite(async () => {
      if (MIGRATION_CONFIG.FIREBASE_ENABLED) {
        await firestoreRepo.updateUserRank(userId, upgradedStats);
      }
      if (MIGRATION_CONFIG.DUAL_WRITE) {
        await dynamoRepo.updateUserRank(userId, upgradedStats);
      }
    });
  }
}
```

#### 2.4 Deploy Lambda Functions

**Package Lambda Functions:**
```bash
cd functions
npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
zip -r lambda.zip index.js node_modules/
aws lambda update-function-code --function-name dailyRankRecalculation --zip-file fileb://lambda.zip
```

**Test Lambdas Manually:**
```bash
aws lambda invoke \
  --function-name dailyRankRecalculation \
  --payload '{"manual": true, "limit": 10}' \
  response.json
```

#### 2.5 Data Synchronization Script

Create a one-time migration script to copy existing Firebase data to DynamoDB:

```typescript
// scripts/migrateRankData.ts
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

async function migrateRankData() {
  const firestore = getFirestore();
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  
  const usersSnapshot = await firestore.collection('users').get();
  const batch: any[] = [];
  
  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    
    batch.push({
      PutRequest: {
        Item: marshall({
          userId: doc.id,
          currentRank: userData.currentRank || 'Novice',
          rankPercentage: userData.rankPercentage || 0,
          totalResolvedPredictions: userData.totalResolvedPredictions || 0,
          contrarianWinsCount: userData.contrarianWinsCount || 0,
          weeklyActivityCount: userData.weeklyActivityCount || 0,
          inactivityStreaks: userData.inactivityStreaks || 0,
          currentRankStartDate: userData.currentRankStartDate || new Date().toISOString(),
          lastRankUpdateAt: userData.lastRankUpdateAt || new Date().toISOString(),
          accountCreatedAt: userData.accountCreatedAt || new Date().toISOString()
        })
      }
    });
    
    // DynamoDB batch limit is 25 items
    if (batch.length === 25) {
      await dynamoClient.send(new BatchWriteItemCommand({
        RequestItems: {
          'Users': batch
        }
      }));
      batch.length = 0;
    }
  }
  
  // Write remaining items
  if (batch.length > 0) {
    await dynamoClient.send(new BatchWriteItemCommand({
      RequestItems: {
        'Users': batch
      }
    }));
  }
  
  console.log(`Migrated ${usersSnapshot.size} users to DynamoDB`);
}

migrateRankData().catch(console.error);
```

**Run Migration:**
```bash
npx ts-node scripts/migrateRankData.ts
```

#### 2.6 Validation Checks

**Data Consistency Checker:**
```typescript
// scripts/validateMigration.ts
async function validateMigration() {
  const firestore = getFirestore();
  const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  
  const usersSnapshot = await firestore.collection('users').limit(100).get();
  let inconsistencies = 0;
  
  for (const doc of usersSnapshot.docs) {
    const firestoreData = doc.data();
    
    const dynamoResponse = await dynamoClient.send(new GetItemCommand({
      TableName: 'Users',
      Key: marshall({ userId: doc.id })
    }));
    
    if (!dynamoResponse.Item) {
      console.error(`Missing in DynamoDB: ${doc.id}`);
      inconsistencies++;
      continue;
    }
    
    const dynamoData = unmarshall(dynamoResponse.Item);
    
    if (firestoreData.currentRank !== dynamoData.currentRank) {
      console.error(`Rank mismatch for ${doc.id}: Firebase=${firestoreData.currentRank}, DynamoDB=${dynamoData.currentRank}`);
      inconsistencies++;
    }
  }
  
  console.log(`Validation complete. Inconsistencies: ${inconsistencies}`);
}
```

---

### Phase 3: Read Migration (3 days)

**Goal:** Switch reads to DynamoDB, keep dual-writes active.

#### 3.1 Enable AWS Reads
```typescript
// src/config/migration.ts
export const MIGRATION_CONFIG = {
  USE_AWS: true,               // Read from AWS now
  DUAL_WRITE: true,            // Still writing to both
  AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_API_URL,
  FIREBASE_ENABLED: true
};
```

#### 3.2 Monitor & Compare

**CloudWatch Dashboard:**
- Lambda execution times
- DynamoDB read/write latencies
- Error rates (4xx, 5xx)
- Cache hit rates

**Firestore vs. DynamoDB Query Comparison:**
```typescript
// Log both query results for comparison
const firestoreResult = await firestoreRepo.getUserStats(userId);
const dynamoResult = await dynamoRepo.getUserStats(userId);

if (firestoreResult.currentRank !== dynamoResult.currentRank) {
  logger.error('Data inconsistency detected', { userId, firestoreResult, dynamoResult });
}
```

#### 3.3 Performance Testing

**Load Test:**
- Simulate 1000 concurrent rank recalculations
- Target: <500ms p99 latency
- Monitor DynamoDB throttling errors

**Rollback Criteria:**
- Error rate > 1%
- p99 latency > 1 second
- Data inconsistency > 0.1%

---

### Phase 4: Full Cutover (1 day)

#### 4.1 Disable Firebase Writes
```typescript
// src/config/migration.ts
export const MIGRATION_CONFIG = {
  USE_AWS: true,
  DUAL_WRITE: false,           // Stop writing to Firebase
  AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_API_URL,
  FIREBASE_ENABLED: false      // Deactivate Firebase
};
```

#### 4.2 Archive Firebase Data

**Backup Firestore Data:**
```bash
gcloud firestore export gs://truthvote-backup/rank-archive-2025-12-28
```

#### 4.3 Decommission Firebase Resources

**Turn Off Cloud Functions:**
```bash
firebase functions:delete dailyRankRecalculation
firebase functions:delete inactivityDetection
firebase functions:delete rankPromotionCheck
```

**Optionally Delete Firestore Collections:**
```bash
# Keep read-only for 30 days as backup
firebase firestore:delete --all-collections --force --only-collections rankHistory,leaderboards
```

---

## Rollback Plan

### Critical Issue Detected

**Trigger Conditions:**
- Error rate > 5% for 10 minutes
- Data loss detected (user rank reset to 0)
- AWS service outage > 1 hour

**Rollback Steps (Execute in <5 minutes):**

1. **Revert Feature Flag:**
   ```typescript
   export const MIGRATION_CONFIG = {
     USE_AWS: false,           // Read from Firebase
     DUAL_WRITE: false,        // Write only to Firebase
     FIREBASE_ENABLED: true
   };
   ```

2. **Deploy Rollback:**
   ```bash
   git revert HEAD~3..HEAD
   npm run build
   vercel --prod
   ```

3. **Re-enable Firebase Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```

4. **Notify Team:**
   - Slack alert: "AWS migration rolled back to Firebase"
   - Incident log created

---

## Cost Comparison

### Firebase (Current)

**Cloud Functions:**
- Invocations: 720/month (daily + weekly jobs) × 3 functions = ~2,200/month
- Compute time: ~30 seconds per invocation
- Cost: **~$5/month**

**Firestore:**
- Reads: 500k/month (rank lookups, leaderboards)
- Writes: 50k/month (rank updates, history)
- Storage: <1 GB
- Cost: **~$15/month**

**Total Firebase: ~$20/month**

---

### AWS (Target)

**Lambda:**
- Invocations: 720/month × 3 functions = ~2,200/month
- Compute time: 512 MB × 30 seconds per invocation
- Cost: **~$2/month**

**DynamoDB:**
- Provisioned capacity: 5 RCU, 5 WCU
- On-demand pricing for burst traffic
- Storage: <1 GB
- Cost: **~$10/month**

**EventBridge:**
- Scheduled rules: 3 rules
- Cost: **~$0 (included in free tier)**

**Total AWS: ~$12/month (40% savings)**

---

## Testing Checklist

### Pre-Migration
- [ ] All rank calculations produce identical results in Firebase vs. DynamoDB
- [ ] Load test: 1000 concurrent rank updates complete successfully
- [ ] Data migration script tested on staging environment
- [ ] Rollback procedure tested and timed (<5 minutes)

### During Migration
- [ ] Dual-write period: Zero inconsistencies detected for 7 days
- [ ] Read migration: Error rate <0.1% for 72 hours
- [ ] Performance: p99 latency <500ms maintained

### Post-Migration
- [ ] Firebase data backed up to Cloud Storage
- [ ] Firebase functions decommissioned
- [ ] AWS CloudWatch alarms configured
- [ ] Team trained on new AWS infrastructure

---

## Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 0: Firebase Prep | 3 days | Cloud Functions deployed and tested |
| Phase 1: AWS Setup | 3 days | DynamoDB tables + Lambdas created |
| Phase 2: Dual-Write | 7 days | Data consistency validated |
| Phase 3: Read Migration | 3 days | AWS reads at 100%, monitoring green |
| Phase 4: Full Cutover | 1 day | Firebase decommissioned |
| **Total** | **17 days** | Migration complete |

---

## Success Metrics

1. **Zero Data Loss:** All user rank data preserved
2. **Zero Downtime:** No service interruptions during migration
3. **Performance:** Latency improves by 20% (Firebase 200ms → AWS 160ms)
4. **Cost:** Monthly infrastructure cost reduced by 40%
5. **Maintainability:** Code coupling reduced from 80% to <10%

---

## Post-Migration Monitoring

**Week 1:**
- Daily data consistency checks
- Manual verification of top 100 users' ranks
- Monitor CloudWatch alarms for anomalies

**Week 2-4:**
- Weekly consistency checks
- Performance benchmarking
- Cost analysis report

**Month 2+:**
- Monthly audits
- Archive old Firebase data after 60 days
- Document lessons learned

---

## Contact & Escalation

**Migration Lead:** [TBD]  
**On-Call Engineer:** [TBD]  
**Escalation Path:** Slack #truthvote-migration → Engineering Manager → CTO

**Emergency Rollback Authority:** Any engineer can trigger rollback if error rate > 5%

---

**Document Version:** 1.0  
**Last Review:** December 28, 2025  
**Next Review:** Post-migration (estimated January 15, 2026)
