# TruthVote Architecture & AWS Migration Readiness

## Executive Summary

**Current State:** TruthVote is built entirely on Firebase (Hosting, Firestore, Auth, Storage, Cloud Functions).

**Future Goal:** Migrate backend to AWS (REST API + AWS services) while maintaining frontend unchanged.

**Migration Readiness Status:** ⚠️ **NEEDS REFACTORING** - Current architecture has significant Firebase coupling that will block AWS migration.

---

## 1. Current Architecture Overview

### Frontend Stack
- **Framework:** Next.js 16.1.0 (React 19.2.3)
- **Hosting:** Firebase Hosting (static export)
- **Styling:** TailwindCSS 4.0
- **State Management:** React Context (AuthContext) + Local hooks
- **UI Components:** Radix UI primitives + custom components

### Backend Stack (Firebase)
| Component | Purpose | AWS Equivalent |
|-----------|---------|----------------|
| **Firebase Auth** | User authentication (Google OAuth, Email/Password) | AWS Cognito or Custom JWT Auth |
| **Cloud Firestore** | NoSQL database for users, predictions, votes, categories | DynamoDB or RDS PostgreSQL |
| **Firebase Storage** | Image storage for poll images, avatars | Amazon S3 |
| **Cloud Functions** | ⚠️ **MISSING** - No functions deployed yet | AWS Lambda + API Gateway |
| **Firebase Hosting** | Static site hosting | S3 + CloudFront or Amplify |

### Data Flow (Current)
```
┌─────────────────────────────────────────┐
│   Next.js Frontend (Browser)            │
│   - Components (PollCard, Dashboard)    │
│   - Hooks (useVote, usePredictions)     │
└─────────────────┬───────────────────────┘
                  │
                  │ Direct Firebase SDK calls
                  │ (firestore queries, updates)
                  ▼
┌─────────────────────────────────────────┐
│   Firebase Client SDK                   │
│   - Authentication                      │
│   - Firestore queries/writes            │
│   - Storage uploads                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Firebase Backend Services             │
│   - Firestore Database                  │
│   - Firebase Auth                       │
│   - Firebase Storage                    │
│   - ⚠️ Cloud Functions (NONE DEPLOYED)  │
└─────────────────────────────────────────┘
```

---

## 2. Critical Architecture Issues

### 🚨 Issue #1: No Service Layer Abstraction

**Problem:**  
Components and hooks directly import and call Firebase SDK methods:
- `import { doc, getDoc, updateDoc } from 'firebase/firestore'` in hooks
- `import { db } from '@/lib/firebase/config'` scattered across 20+ files
- Business logic mixed with data access logic

**Files with Direct Firebase Coupling:**
- `src/hooks/useVote.ts` - Direct Firestore writes
- `src/hooks/usePredictions.ts` - Direct Firestore queries with onSnapshot
- `src/hooks/useFollow.ts` - Direct Firestore operations
- `src/hooks/useBookmark.ts` - Direct Firestore operations
- `src/hooks/useCategories.ts` - Direct Firestore queries
- `src/components/PollCard.tsx` - Uses hooks with Firebase deps
- `src/components/Dashboard.tsx` - Uses Firebase-dependent hooks
- `src/app/admin/page.tsx` - **CRITICAL** - Direct Firestore imports in admin UI
- `src/lib/badges.ts` - Direct Firestore writes
- `src/types/*.ts` - Direct `Timestamp` imports from Firebase

**Impact:**  
Changing from Firebase to AWS would require rewriting **every component and hook**.

**Solution Required:**  
Create service layer (`src/services/`) that abstracts all Firebase calls.

---

### 🚨 Issue #2: Business Logic in Frontend

**Problem:**  
Critical business logic lives in client-side hooks and components:

**Examples in `src/hooks/useVote.ts`:**
```typescript
// Lines 25-32: Vote duplicate check logic in client
const voteDoc = await getDoc(voteRef);
if (voteDoc.exists()) {
  toast.error('You have already voted on this prediction');
  return false;
}

// Lines 34-40: Vote counting logic in client
await setDoc(voteRef, {
  predictionId,
  userId: user.uid,
  option,
  votedAt: Timestamp.now(),
  ...
});

// Lines 42-58: Vote count updates in client
const updatedOptions = [...predictionData.options];
updatedOptions[optionIndex].votes = (updatedOptions[optionIndex].votes || 0) + 1;
await updateDoc(predictionRef, {
  options: updatedOptions,
  totalVotes: increment(1)
});
```

**Examples in `src/app/admin/page.tsx`:**
```typescript
// Lines 5-6: Admin page directly imports Firestore
import { collection, query, where, orderBy, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Admin operations executed directly from frontend
const handleCreatePrediction = async (e: React.FormEvent) => {
  // ... validation in frontend
  await addDoc(collection(db, 'predictions'), { ... });
};
```

**Impact:**  
- Client can manipulate vote counts
- No server-side validation
- Cannot enforce complex business rules
- Security entirely dependent on Firestore rules
- Migration to AWS requires rewriting all logic

**Solution Required:**  
Move ALL business logic to Cloud Functions:
- `createVote(predictionId, option)` function
- `resolvePrediction(predictionId, winningOption)` function
- `createPrediction(data)` admin function
- `awardBadges(userId)` function

---

### 🚨 Issue #3: No Cloud Functions Deployed

**Problem:**  
`firebase.json` shows no Cloud Functions configured. There is NO backend business logic layer.

**Current firebase.json:**
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "hosting": { ... },
  "storage": { "rules": "storage.rules" }
  // ❌ No "functions" configuration
}
```

**Missing Functions Needed:**
1. **Vote Management:**
   - `submitVote(predictionId, option)` - Validate + record vote
   - `getVoteResults(predictionId)` - Calculate percentages

2. **Prediction Lifecycle:**
   - `createPrediction(data)` - Admin creates prediction
   - `resolvePrediction(predictionId, winningOption)` - Close + declare winner
   - `autoClosePredictions()` - Scheduled function to close expired predictions

3. **Points & Rewards:**
   - `calculatePoints(userId)` - Award points for correct predictions
   - `updateLeaderboard()` - Scheduled leaderboard refresh
   - `awardBadges(userId)` - Badge logic

4. **Admin Operations:**
   - `approvePrediction(predictionId)` - Admin approval
   - `deletePrediction(predictionId)` - Admin delete
   - `updateCategory(categoryId, data)` - Category management

**Impact:**  
Migration to AWS Lambda is impossible because there's no function code to migrate.

**Solution Required:**  
Create `functions/` directory with TypeScript Cloud Functions.

---

### 🚨 Issue #4: Security Rules Used for Business Logic

**Problem:**  
Firestore Security Rules likely contain validation logic instead of just access control.

**What Rules SHOULD Be:**
```javascript
// CORRECT: Simple access control
allow read: if request.auth != null;
allow write: if request.auth != null && request.auth.uid == resource.data.userId;
```

**What Rules PROBABLY Are:**
```javascript
// WRONG: Business logic in rules
allow write: if request.auth != null 
  && !exists(/databases/$(database)/documents/votes/$(request.auth.uid + '_' + predictionId))
  && get(/databases/$(database)/documents/predictions/$(predictionId)).data.status == 'active';
```

**Impact:**  
Business logic in rules cannot be ported to AWS. Must be rewritten in Lambda.

**Solution Required:**  
Simplify rules to access control only. Move validation to Cloud Functions.

---

### 🚨 Issue #5: Firebase Types in Core Models

**Problem:**  
Core data types directly depend on Firebase:

**src/types/poll.ts:**
```typescript
import { Timestamp } from 'firebase/firestore'; // ❌ Firebase dependency

export interface Poll {
  createdAt: Timestamp; // ❌ Firebase-specific type
  endTime: Timestamp;   // ❌ Firebase-specific type
  ...
}
```

**Impact:**  
Changing database requires changing all type definitions AND all code using those types.

**Solution Required:**  
Use backend-agnostic types:
```typescript
export interface Poll {
  createdAt: string | Date; // ✅ Standard types
  endTime: string | Date;
}
```

---

## 3. Proposed Service Layer Architecture

### Directory Structure
```
src/
  services/
    api/
      predictions.api.ts    # API client for predictions
      votes.api.ts          # API client for votes
      users.api.ts          # API client for users
      admin.api.ts          # API client for admin operations
      auth.api.ts           # API client for authentication
    
    implementations/
      firebase/
        predictions.firebase.ts  # Firebase implementation
        votes.firebase.ts
        users.firebase.ts
        admin.firebase.ts
        auth.firebase.ts
      
      rest/
        predictions.rest.ts      # Future AWS REST implementation
        votes.rest.ts
        users.rest.ts
        admin.rest.ts
        auth.rest.ts
    
    index.ts                # Service factory (switches between implementations)
```

### Example Service Interface

**src/services/api/predictions.api.ts:**
```typescript
export interface PredictionsService {
  // Read operations
  getPrediction(id: string): Promise<Prediction>;
  listPredictions(filters?: PredictionFilters): Promise<Prediction[]>;
  getPredictionsByCategory(category: string): Promise<Prediction[]>;
  
  // Write operations (admin only)
  createPrediction(data: CreatePredictionData): Promise<Prediction>;
  updatePrediction(id: string, data: UpdatePredictionData): Promise<void>;
  deletePrediction(id: string): Promise<void>;
  
  // Resolution
  resolvePrediction(id: string, winningOption: string): Promise<void>;
}
```

**src/services/implementations/firebase/predictions.firebase.ts:**
```typescript
export class FirebasePredictionsService implements PredictionsService {
  async getPrediction(id: string): Promise<Prediction> {
    // Firebase-specific implementation
    const docRef = doc(db, 'predictions', id);
    const docSnap = await getDoc(docRef);
    return this.mapFirebaseDoc(docSnap);
  }
  // ... other methods
}
```

**src/services/implementations/rest/predictions.rest.ts:**
```typescript
export class RestPredictionsService implements PredictionsService {
  async getPrediction(id: string): Promise<Prediction> {
    // Future AWS REST implementation
    const response = await fetch(`${API_URL}/predictions/${id}`);
    return response.json();
  }
  // ... other methods
}
```

**src/services/index.ts:**
```typescript
// Service factory - switch between implementations
const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

export const predictionsService: PredictionsService = USE_FIREBASE
  ? new FirebasePredictionsService()
  : new RestPredictionsService();

export const votesService: VotesService = USE_FIREBASE
  ? new FirebaseVotesService()
  : new RestVotesService();
```

### Updated Hook (Firebase-agnostic)

**src/hooks/usePredictions.ts (REFACTORED):**
```typescript
import { predictionsService } from '@/services';

export function usePredictions(status?: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  
  useEffect(() => {
    const loadPredictions = async () => {
      // No Firebase imports - just service call
      const data = await predictionsService.listPredictions({ status });
      setPredictions(data);
    };
    loadPredictions();
  }, [status]);
  
  return { predictions, loading, error };
}
```

---

## 4. Data Models (Backend-Agnostic)

### Core Models

#### User
```typescript
interface User {
  id: string;                    // UUID
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  totalPoints: number;           // Calculated from votes
  totalVotes: number;
  correctPredictions: number;
  accuracy: number;              // Percentage (0-100)
  badges: Badge[];
  createdAt: string;             // ISO 8601
  lastActive: string;            // ISO 8601
}
```

#### Prediction
```typescript
interface Prediction {
  id: string;                    // UUID
  question: string;
  description: string | null;
  options: PredictionOption[];   // Min 2, typically 2-4
  category: string;
  subcategory: string | null;
  imageUrl: string | null;
  sourceLink: string | null;
  createdBy: string;             // User ID
  status: 'draft' | 'active' | 'closed' | 'resolved';
  published: boolean;
  startTime: string | null;      // ISO 8601
  endTime: string;               // ISO 8601
  resolutionTime: string | null; // ISO 8601
  resolved: boolean;
  winningOption: string | null;  // Option ID
  totalVotes: number;
  createdAt: string;             // ISO 8601
}
```

#### PredictionOption
```typescript
interface PredictionOption {
  id: string;                    // 'A', 'B', 'C', etc.
  label: string;                 // "Yes", "No", "Donald Trump", etc.
  votes: number;
}
```

#### Vote
```typescript
interface Vote {
  id: string;                    // Composite: `${userId}_${predictionId}`
  predictionId: string;
  userId: string;
  option: string;                // Option ID ('A', 'B', etc.)
  votedAt: string;               // ISO 8601
  isCorrect: boolean | null;     // Null until prediction resolved
  pointsAwarded: number;         // Points earned (0 if incorrect)
}
```

#### PredictionResult
```typescript
interface PredictionResult {
  predictionId: string;
  winningOption: string;
  totalVotes: number;
  optionResults: {
    optionId: string;
    votes: number;
    percentage: number;
  }[];
  correctVoters: string[];       // User IDs who voted correctly
  resolvedAt: string;            // ISO 8601
  resolvedBy: string;            // Admin user ID
}
```

#### Badge
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  condition: string;             // "Vote 10 times", "70% accuracy"
  awardedAt: string;             // ISO 8601
}
```

#### LeaderboardEntry
```typescript
interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  totalPoints: number;
  accuracy: number;
  totalVotes: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}
```

### Model Relationships
```
User (1) ─────< (N) Vote
User (1) ─────< (N) Prediction (as creator)
User (1) ─────< (N) Badge

Prediction (1) ──< (N) Vote
Prediction (1) ──< (N) PredictionOption
Prediction (1) ──< (1) PredictionResult

Vote (N) ────> (1) Prediction
Vote (N) ────> (1) User
```

---

## 5. Migration Readiness Assessment

### ✅ Migration-Ready Components
| Component | Status | Reason |
|-----------|--------|--------|
| Next.js Frontend | ✅ Ready | Static build, no backend dependency |
| UI Components | ✅ Ready | Pure React, no Firebase imports |
| TailwindCSS Styles | ✅ Ready | Framework-agnostic |
| Type Definitions | ⚠️ Needs Update | Remove `Timestamp` imports |

### ❌ Migration-Blocking Components
| Component | Status | Blocker | Refactor Needed |
|-----------|--------|---------|-----------------|
| Hooks (useVote, usePredictions, etc.) | ❌ Blocked | Direct Firebase SDK calls | Create service layer |
| Admin Pages | ❌ Blocked | Direct Firestore operations | Call admin API functions |
| AuthContext | ❌ Blocked | Firebase Auth SDK | Abstract auth provider |
| Data Models | ⚠️ Partial | Firebase Timestamp type | Use ISO strings or Date |
| Business Logic | ❌ Missing | No Cloud Functions | Implement functions first |

### Migration Complexity Estimate
| Task | Effort | Risk |
|------|--------|------|
| Create service layer | 2-3 days | Low |
| Refactor hooks to use services | 1-2 days | Medium |
| Implement Cloud Functions (Firebase) | 3-5 days | Medium |
| Abstract AuthContext | 1 day | Low |
| Update type definitions | 0.5 days | Low |
| Test Firebase functions | 1-2 days | Medium |
| **Phase 1 Total (Firebase Refactor)** | **8-13 days** | **Medium** |
| Implement AWS Lambda functions | 3-5 days | Medium |
| Create REST API (API Gateway) | 2-3 days | Medium |
| Switch services to REST mode | 0.5 days | Low |
| AWS infrastructure (Terraform/CDK) | 2-3 days | High |
| Migration testing | 2-3 days | High |
| **Phase 2 Total (AWS Migration)** | **9-14 days** | **High** |

---

## 6. Migration Path (Step-by-Step)

### Phase 0: Preparation (Current State → Refactored Firebase)
**Goal:** Make codebase migration-ready without changing infrastructure.

#### Step 1: Create Service Layer
```bash
mkdir -p src/services/api
mkdir -p src/services/implementations/firebase
mkdir -p src/services/implementations/rest
```

Create interfaces:
- `predictions.api.ts` - Define PredictionsService interface
- `votes.api.ts` - Define VotesService interface
- `users.api.ts` - Define UsersService interface
- `admin.api.ts` - Define AdminService interface
- `auth.api.ts` - Define AuthService interface

Implement Firebase versions:
- `predictions.firebase.ts` - Move Firestore logic from hooks
- `votes.firebase.ts` - Centralize vote operations
- `users.firebase.ts` - User profile operations
- `admin.firebase.ts` - Admin-only operations
- `auth.firebase.ts` - Wrap Firebase Auth

Create service factory:
- `services/index.ts` - Export service instances

#### Step 2: Implement Cloud Functions
```bash
mkdir functions
cd functions
firebase init functions
```

Implement key functions:
- `submitVote(data: { predictionId, userId, option })`
- `createPrediction(data: CreatePredictionData)` (admin)
- `resolvePrediction(data: { predictionId, winningOption })` (admin)
- `calculateUserPoints(userId)` (internal)
- `awardBadges(userId)` (internal)
- `autoClosePredictions()` (scheduled)

Deploy:
```bash
firebase deploy --only functions
```

#### Step 3: Refactor Hooks to Use Services
Update hooks to use service layer instead of direct Firebase:
- `useVote.ts` → calls `votesService.submitVote()`
- `usePredictions.ts` → calls `predictionsService.listPredictions()`
- `useFollow.ts` → calls `usersService.followUser()`
- `useBookmark.ts` → calls `usersService.bookmarkPrediction()`

#### Step 4: Refactor Admin Pages
Update `src/app/admin/page.tsx`:
- Remove direct Firestore imports
- Call `adminService.createPrediction()` instead of `addDoc()`
- Call `adminService.resolvePrediction()` instead of `updateDoc()`

#### Step 5: Abstract Auth
Create `src/services/implementations/firebase/auth.firebase.ts`:
```typescript
export class FirebaseAuthService implements AuthService {
  async signIn(email: string, password: string): Promise<User> { ... }
  async signOut(): Promise<void> { ... }
  async getCurrentUser(): Promise<User | null> { ... }
}
```

Update `AuthContext.tsx` to use `authService`.

#### Step 6: Update Type Definitions
Replace Firebase types:
```typescript
// Before
import { Timestamp } from 'firebase/firestore';
createdAt: Timestamp;

// After
createdAt: string; // ISO 8601 string
```

Update all model files:
- `src/types/poll.ts`
- `src/types/user.ts`
- `src/types/vote.ts`

#### Step 7: Simplify Security Rules
Move validation from rules to Cloud Functions:
```javascript
// Before (business logic in rules)
allow create: if request.auth != null 
  && !exists(/databases/$(database)/documents/votes/$(voteId))
  && get(/databases/$(database)/documents/predictions/$(predictionId)).data.status == 'active';

// After (simple access control)
allow create: if request.auth != null;
// Validation happens in Cloud Function
```

---

### Phase 1: AWS Infrastructure Setup
**Goal:** Prepare AWS environment (parallel to Firebase).

#### AWS Services Mapping
| Firebase Service | AWS Service | Configuration |
|------------------|-------------|---------------|
| Firebase Auth | AWS Cognito | User pool + identity pool |
| Cloud Firestore | DynamoDB | 5 tables: Users, Predictions, Votes, Categories, Badges |
| Firebase Storage | S3 | Public bucket + CloudFront CDN |
| Cloud Functions | Lambda + API Gateway | REST API endpoints |
| Firebase Hosting | S3 + CloudFront | Static site hosting |

#### Step 1: Setup AWS Account & IAM
- Create AWS account
- Setup IAM roles for Lambda execution
- Create S3 bucket for frontend hosting
- Create S3 bucket for images

#### Step 2: Setup DynamoDB Tables
Create tables:
```
users (PK: id)
predictions (PK: id, GSI: category, status)
votes (PK: id, GSI: userId, predictionId)
categories (PK: id)
badges (PK: userId, SK: badgeId)
```

#### Step 3: Setup AWS Cognito
- Create user pool
- Configure Google OAuth provider
- Setup email/password authentication
- Create identity pool for API access

#### Step 4: Setup API Gateway + Lambda
Create Lambda functions (same logic as Cloud Functions):
- `POST /api/votes` - Submit vote
- `GET /api/predictions` - List predictions
- `GET /api/predictions/:id` - Get prediction
- `POST /api/predictions` - Create prediction (admin)
- `PUT /api/predictions/:id/resolve` - Resolve prediction (admin)
- `GET /api/users/:id` - Get user profile
- `GET /api/leaderboard` - Get leaderboard

Deploy Lambda functions:
```bash
# Using AWS SAM or Terraform
sam build
sam deploy --guided
```

#### Step 5: Implement REST Service Layer
Create AWS REST implementations:
- `services/implementations/rest/predictions.rest.ts`
- `services/implementations/rest/votes.rest.ts`
- `services/implementations/rest/users.rest.ts`
- `services/implementations/rest/admin.rest.ts`
- `services/implementations/rest/auth.rest.ts` (Cognito)

#### Step 6: Setup Environment Variables
```env
# .env.production.aws
NEXT_PUBLIC_USE_FIREBASE=false
NEXT_PUBLIC_API_URL=https://api.truthvote.com
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_CLIENT_ID=...
```

---

### Phase 2: Gradual Migration
**Goal:** Switch from Firebase to AWS with minimal downtime.

#### Step 1: Data Migration
Export data from Firestore:
```bash
gcloud firestore export gs://truthvote-backup
```

Transform and import to DynamoDB:
```typescript
// Migration script
async function migrateUsers() {
  const firestoreUsers = await exportFirestoreCollection('users');
  for (const user of firestoreUsers) {
    await dynamodb.putItem({
      TableName: 'Users',
      Item: transformUser(user), // Convert Timestamp → ISO string
    });
  }
}
```

#### Step 2: Parallel Running
Run both Firebase and AWS simultaneously:
- Writes go to both systems (dual-write)
- Reads come from Firebase (primary)
- Validate AWS data consistency

#### Step 3: Switch Reads to AWS
Update environment variable:
```env
NEXT_PUBLIC_USE_FIREBASE=false
```

Service factory automatically uses REST implementations.

#### Step 4: Monitor & Validate
- Compare response times (Firebase vs AWS)
- Monitor error rates
- Validate data consistency
- Test all user flows

#### Step 5: Decommission Firebase
Once AWS is stable:
- Stop dual-writes
- Archive Firebase data
- Delete Firebase project (or downgrade to free tier)

---

## 7. Critical Next Steps (Immediate Actions)

### Priority 1: Create Service Layer (Week 1)
1. ✅ Create `src/services/` directory structure
2. ✅ Define service interfaces (`api/*.ts`)
3. ✅ Implement Firebase services (`implementations/firebase/*.ts`)
4. ✅ Create service factory (`services/index.ts`)
5. ✅ Update one hook as proof-of-concept (`useVote.ts`)

### Priority 2: Implement Cloud Functions (Week 2)
1. ✅ Initialize Firebase Functions project
2. ✅ Implement `submitVote` function
3. ✅ Implement `createPrediction` function (admin)
4. ✅ Implement `resolvePrediction` function (admin)
5. ✅ Deploy and test functions

### Priority 3: Refactor All Hooks (Week 3)
1. ✅ Update `usePredictions.ts` to use `predictionsService`
2. ✅ Update `useFollow.ts` to use `usersService`
3. ✅ Update `useBookmark.ts` to use `usersService`
4. ✅ Update `useCategories.ts` to use `categoriesService`
5. ✅ Remove all direct Firebase imports from hooks

### Priority 4: Abstract Auth (Week 4)
1. ✅ Create `AuthService` interface
2. ✅ Implement `FirebaseAuthService`
3. ✅ Update `AuthContext` to use service
4. ✅ Test authentication flows

---

## 8. Long-Term Architectural Decisions

### Decision 1: Monolithic Functions vs Microservices
**Current:** Cloud Functions (Firebase) or Lambda (AWS)  
**Recommendation:** Start with monolithic Lambda functions, split later if needed.  
**Reason:** Faster development, easier testing, lower complexity.

### Decision 2: Database Choice (AWS)
**Options:**
- **DynamoDB:** NoSQL, fully managed, scales automatically
- **RDS PostgreSQL:** Relational, better for complex queries
- **Aurora Serverless:** Best of both worlds, expensive

**Recommendation:** DynamoDB initially (mirrors Firestore design), consider Aurora later.

### Decision 3: Real-Time Updates
**Current:** Firestore `onSnapshot` for real-time predictions  
**AWS Options:**
- WebSockets (API Gateway + Lambda)
- AppSync (GraphQL subscriptions)
- Polling (simpler, less real-time)

**Recommendation:** Start with polling (5-second intervals), add WebSockets if needed.

### Decision 4: Image Storage & CDN
**Current:** Firebase Storage  
**AWS:** S3 + CloudFront  
**Recommendation:** CloudFront for global CDN, use signed URLs for private images.

### Decision 5: CI/CD Pipeline
**Current:** Manual `npm run deploy`  
**Future:** GitHub Actions workflow:
```yaml
- Build Next.js app
- Run tests
- Deploy Lambda functions
- Deploy frontend to S3
- Invalidate CloudFront cache
```

---

## 9. Cost Comparison (Estimated Monthly)

### Firebase (Current)
| Service | Usage | Cost |
|---------|-------|------|
| Firestore | 100K reads, 50K writes | $0.60 |
| Firebase Auth | 5K active users | Free |
| Firebase Storage | 10GB storage, 50GB transfer | $2.30 |
| Cloud Functions | 1M invocations | Free |
| Firebase Hosting | 10GB transfer | Free |
| **Total** | | **~$3/month** |

### AWS (Projected)
| Service | Usage | Cost |
|---------|-------|------|
| DynamoDB | 100K reads, 50K writes | $1.25 |
| Cognito | 5K active users | Free (first 50K) |
| S3 + CloudFront | 10GB storage, 50GB transfer | $5 |
| Lambda | 1M invocations | Free |
| API Gateway | 1M requests | $3.50 |
| **Total** | | **~$10/month** |

**Note:** Costs scale differently. AWS becomes more cost-effective at higher scale.

---

## 10. Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Export full Firebase backup before migration
- Run parallel systems during transition
- Implement data validation scripts
- Keep Firebase active for 30 days post-migration

### Risk 2: Authentication Breaking
**Mitigation:**
- Migrate users to Cognito gradually
- Support both auth systems temporarily
- Provide password reset flow
- Test OAuth providers extensively

### Risk 3: Performance Degradation
**Mitigation:**
- Load test AWS infrastructure before switch
- Setup CloudWatch monitoring
- Have rollback plan ready
- Monitor response times closely

### Risk 4: Cost Overruns
**Mitigation:**
- Setup AWS billing alerts
- Use reserved capacity where possible
- Monitor usage daily during first month
- Optimize queries and caching

---

## 11. Success Criteria

### Phase 0 Success (Firebase Refactor)
- ✅ All hooks use service layer (no direct Firebase imports)
- ✅ All business logic in Cloud Functions
- ✅ Admin operations call functions (not direct Firestore)
- ✅ Type definitions backend-agnostic
- ✅ Security rules simplified (access control only)
- ✅ Switching `USE_FIREBASE` flag doesn't break frontend

### Phase 1 Success (AWS Migration)
- ✅ All data migrated to AWS (100% accuracy)
- ✅ Authentication works (Cognito or custom)
- ✅ All API endpoints functional
- ✅ Response times < 200ms (p95)
- ✅ Zero data loss
- ✅ User experience unchanged

### Phase 2 Success (AWS Production)
- ✅ Firebase fully decommissioned
- ✅ AWS costs within budget
- ✅ 99.9% uptime
- ✅ CI/CD pipeline automated
- ✅ Monitoring and alerts active

---

## 12. Appendix: Key Files to Refactor

### High Priority (Week 1-2)
- [ ] `src/hooks/useVote.ts` - Most critical, handles voting logic
- [ ] `src/hooks/usePredictions.ts` - Core data fetching
- [ ] `src/app/admin/page.tsx` - Admin operations with direct Firestore
- [ ] `src/context/AuthContext.tsx` - Auth abstraction needed

### Medium Priority (Week 3)
- [ ] `src/hooks/useFollow.ts` - User interactions
- [ ] `src/hooks/useBookmark.ts` - User interactions
- [ ] `src/hooks/useCategories.ts` - Simple data fetch
- [ ] `src/lib/badges.ts` - Badge logic should be in function

### Low Priority (Week 4)
- [ ] `src/types/poll.ts` - Update Timestamp types
- [ ] `src/types/user.ts` - Update Timestamp types
- [ ] `src/types/vote.ts` - Update Timestamp types
- [ ] `src/components/Comments.tsx` - May have Firebase deps
- [ ] `src/components/ActivityFeed.tsx` - May have Firebase deps

---

## Conclusion

**Current Status:** ⚠️ **HIGH FIREBASE COUPLING** - Migration would require complete rewrite.

**Recommended Path:**
1. **Now:** Refactor to service layer (1-2 weeks)
2. **Next:** Implement Cloud Functions (1-2 weeks)
3. **Then:** Build confidence with Firebase functions (1 month)
4. **Later:** Migrate to AWS when business needs justify it (3-6 months)

**Key Principle:** Every new feature MUST use the service layer. No new direct Firebase calls in components/hooks.

**Migration Timeline:**
- Phase 0 (Refactor): 2-3 weeks
- Phase 1 (AWS Setup): 1-2 weeks
- Phase 2 (Migration): 1-2 weeks
- **Total:** 4-7 weeks for full AWS migration

**Bottom Line:** Build for Firebase now, prepare for AWS later. Clean architecture makes migration possible.
