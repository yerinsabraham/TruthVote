# TruthVote Architecture & Database Design

## 🎯 Platform Overview
**TruthVote** is a prediction and voting platform where users make predictions on binary outcomes, earn reputation points for accuracy, and compete on leaderboards. Inspired by Polymarket but focused on **bragging rights** and **reputation** rather than financial betting.

**Target Audience:** Africa and the world  
**Core Value:** Prove your forecasting ability, build reputation, compete globally

---

## 🏗️ System Architecture

### High-Level Components
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  - Dashboard (polls grid)                                │
│  - Prediction detail pages                               │
│  - User profiles & leaderboard                           │
│  - Admin panel                                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Authentication                     │
│  - Google OAuth                                          │
│  - Email/Password                                        │
│  - Anonymous browsing (limited)                          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloud Firestore                         │
│  - users, predictions, votes, analytics                  │
│  - Real-time listeners                                   │
│  - Security rules enforcement                            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               Firebase Cloud Functions                   │
│  - Resolve predictions (calculate winners)               │
│  - Award points                                          │
│  - Update leaderboards                                   │
│  - Send notifications                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (Firestore)

### Collection: `users`
Stores user profiles, authentication data, and statistics.

```typescript
{
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  authProvider: 'google' | 'email';
  
  // Reputation & Stats
  points: number;                 // Total points earned
  totalVotes: number;             // Total predictions made
  correctVotes: number;           // Correct predictions
  accuracyRate: number;           // correctVotes / totalVotes (%)
  
  // Roles & Permissions
  role: 'admin' | 'verified' | 'user';
  isVerified: boolean;            // Email verified
  canCreatePolls: boolean;        // Permission to create predictions
  
  // Metadata
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  bio?: string;
  country?: string;
  
  // Social
  followersCount: number;
  followingCount: number;
  
  // Gamification
  badges: string[];               // ['early-adopter', 'prophet', 'streak-master']
  streak: number;                 // Days with at least 1 correct vote
  level: number;                  // 1-100 based on points
}
```

**Indexes:**
- `points DESC` (leaderboard)
- `accuracyRate DESC, totalVotes DESC` (top predictors)
- `country, points DESC` (regional leaderboards)

---

### Collection: `predictions`
Core prediction markets (polls).

```typescript
{
  id: string;                     // Auto-generated
  question: string;               // "Will Bitcoin reach $100k by Dec 2024?"
  description?: string;           // Additional context
  
  // Options
  optionA: string;                // "Yes"
  optionB: string;                // "No"
  voteCountA: number;
  voteCountB: number;
  
  // Metadata
  category: string;               // "Finance", "Politics", "Sports", etc.
  imageUrl?: string;              // Featured image
  tags: string[];                 // ["crypto", "bitcoin", "2024"]
  
  // Creator
  createdBy: string;              // User UID
  creatorName: string;
  
  // Status & Timing
  status: 'pending' | 'active' | 'resolved' | 'cancelled';
  createdAt: Timestamp;
  startDate: Timestamp;           // When voting opens
  endDate: Timestamp;             // When voting closes
  resolvedAt?: Timestamp;
  resolvedBy?: string;            // Admin UID who resolved
  
  // Resolution
  resolvedOption?: 'A' | 'B' | 'cancelled';
  resolutionSource?: string;      // Link to proof
  resolutionNotes?: string;
  
  // Engagement
  viewCount: number;
  commentCount: number;
  shareCount: number;
  
  // Moderation
  isApproved: boolean;            // Admin approval required
  approvedBy?: string;            // Admin UID
  approvedAt?: Timestamp;
  isFeatured: boolean;            // Show on homepage
  reportCount: number;
}
```

**Indexes:**
- `status, endDate DESC` (active polls)
- `status, category, endDate DESC` (category filtering)
- `createdBy, createdAt DESC` (user's predictions)
- `isApproved, status` (pending approval queue)

---

### Collection: `votes`
Individual user votes on predictions.

```typescript
{
  id: string;                     // Auto-generated
  predictionId: string;           // Reference to prediction
  userId: string;                 // User UID
  
  // Vote Data
  option: 'A' | 'B';
  votedAt: Timestamp;
  
  // Result (populated after resolution)
  isCorrect?: boolean;
  pointsEarned?: number;          // 10 points for correct, 0 for wrong
  
  // Metadata
  predictionQuestion: string;     // Denormalized for easy querying
  predictionCategory: string;
}
```

**Indexes:**
- `userId, votedAt DESC` (user's vote history)
- `predictionId, userId` (check if user already voted)
- `userId, isCorrect` (user's correct votes)

**Security Rule:** User can only vote once per prediction (enforced in Firestore rules)

---

### Collection: `categories`
Predefined categories for predictions.

```typescript
{
  id: string;                     // "politics", "sports", etc.
  name: string;                   // "Politics"
  description: string;
  icon: string;                   // Emoji or icon name
  color: string;                  // Hex color
  isActive: boolean;
  predictionCount: number;        // Total predictions in category
  order: number;                  // Display order
}
```

**Default Categories:**
- Politics
- Sports
- Entertainment
- Technology
- Finance
- Science
- World Events

---

### Collection: `analytics` (aggregated stats)
Pre-computed analytics for performance.

```typescript
{
  id: string;                     // Date or period (e.g., "2024-12-21")
  
  // Platform Stats
  totalUsers: number;
  activeUsers: number;            // Users who voted this period
  totalPredictions: number;
  activePredictions: number;
  totalVotes: number;
  
  // Category Breakdown
  categoriesStats: {
    [category: string]: {
      predictions: number;
        votes: number;
    }
  };
  
  // Top Performers
  topUsers: Array<{
    uid: string;
    name: string;
    points: number;
    accuracy: number;
  }>;
  
  updatedAt: Timestamp;
}
```

---

### Collection: `reports` (moderation)
User reports for inappropriate content.

```typescript
{
  id: string;
  reportedBy: string;             // User UID
  targetType: 'prediction' | 'user' | 'comment';
  targetId: string;
  reason: string;                 // "spam", "misleading", "offensive", etc.
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  reviewedBy?: string;            // Admin UID
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
}
```

---

## 🔐 Authentication & Authorization

### Authentication Methods
1. **Google Sign-In** (Primary - fastest onboarding)
2. **Email/Password** (Alternative)
3. **Guest Browsing** (Read-only, no voting)

### User Roles & Permissions

| Role | Create Predictions | Vote | View | Resolve | Admin Panel |
|------|-------------------|------|------|---------|-------------|
| **Guest** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **User** | ❌ (default) | ✅ | ✅ | ❌ | ❌ |
| **Verified** | ✅ (needs approval) | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ (instant) | ✅ | ✅ | ✅ | ✅ |

### Role Assignment Rules
- **User**: Default role after signup
- **Verified**: Granted after user has 50+ points and 70%+ accuracy
- **Admin**: Manually assigned by platform owner

---

## 📊 Prediction Creation Workflow

### 🏆 **RECOMMENDED APPROACH:** User-Created with Admin Approval

**Why?**
- ✅ Scalable: Community-driven content
- ✅ Engaging: Users invested in their own predictions
- ✅ Quality Control: Admin approval prevents spam/abuse
- ✅ Growth: More predictions = more activity

**Workflow:**
```
1. User creates prediction → status: "pending"
2. Admin reviews in approval queue
3. Admin approves → status: "active", voting opens
   OR Admin rejects → prediction archived
4. Voting period ends automatically
5. Admin manually resolves with proof
6. Cloud Function awards points to winners
```

### Alternative: Admin-Only Creation
**Pros:** Higher quality, no spam  
**Cons:** Not scalable, less engaging, bottleneck  
**Use case:** MVP stage with small user base

**Decision:** Start with **user-created + approval**, gives flexibility to switch to admin-only if needed.

---

## 🎮 Voting System

### Mechanics
1. **One vote per user per prediction** (immutable)
2. **No vote changes** after submission (maintains integrity)
3. **Votes locked when prediction ends**
4. **Points awarded after admin resolves:**
   - ✅ Correct vote: **+10 points**
   - ❌ Wrong vote: **0 points**
   - 🚫 Cancelled prediction: **0 points** (votes refunded)

### Vote Validation
```typescript
// Firestore Security Rules
match /votes/{voteId} {
  allow create: if 
    request.auth != null &&
    !exists(/databases/$(database)/documents/votes/$(getUserVote())) &&
    predictionIsActive();
  
  allow read: if request.auth != null;
  allow update, delete: if false; // Immutable
}
```

---

## 🏆 Gamification & Reputation

### Points System
- **Correct vote:** +10 points
- **Voting streak bonus:** +5 points (7 days)
- **Early voter bonus:** +2 points (first 100 voters)
- **Create approved prediction:** +20 points

### Accuracy Calculation
```
accuracyRate = (correctVotes / totalVotes) * 100
```

### Leaderboards
1. **Global Leaderboard** (top 100 by points)
2. **Regional Leaderboards** (by country)
3. **Category Leaders** (top in each category)
4. **Rising Stars** (highest accuracy with 20+ votes)

### Badges
- 🏅 **Prophet**: 90%+ accuracy with 100+ votes
- 🔥 **Streak Master**: 30-day voting streak
- 🌟 **Early Adopter**: First 1000 users
- 👑 **Top 10**: In global top 10
- 📈 **Trending Predictor**: Created 5+ featured predictions

### Levels
```
Level 1: 0-100 points
Level 2: 100-300 points
Level 3: 300-600 points
...
Level 100: 50,000+ points
```

---

## 👥 Guest vs Authenticated User Limitations

### Guest Users (Not Logged In)
**Can:**
- ✅ View all active/resolved predictions
- ✅ See leaderboards
- ✅ Browse categories
- ✅ See vote distributions (percentages)

**Cannot:**
- ❌ Vote on predictions
- ❌ Create predictions
- ❌ View individual user profiles
- ❌ Comment on predictions
- ❌ See their own statistics
- ❌ Earn points/badges

**Call-to-Action:** Prominent "Sign in to vote" buttons on polls

### Authenticated Users
Full access to voting, statistics, profiles, and leaderboards.

---

## 🔒 Security & Data Protection

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read all profiles, update only their own
    match /users/{userId} {
      allow read: if true;
      allow update: if request.auth.uid == userId && 
                       !request.resource.data.diff(resource.data)
                         .affectedKeys().hasAny(['points', 'role', 'isAdmin']);
    }
    
    // Predictions readable by all, writable with conditions
    match /predictions/{predictionId} {
      allow read: if true;
      allow create: if request.auth != null && 
                       userCanCreatePolls() &&
                       request.resource.data.status == 'pending';
      allow update: if isAdmin() && validResolution();
    }
    
    // Votes: one per user per prediction
    match /votes/{voteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       !userAlreadyVoted() &&
                       predictionIsActive();
      allow update, delete: if false; // Immutable
    }
    
    // Admin-only collections
    match /analytics/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update: if isAdmin();
    }
  }
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Voting Platform (Week 1)
- [x] Authentication (Google + Email)
- [ ] User profiles with stats
- [ ] Prediction browsing & filtering
- [ ] Voting system (one vote per user)
- [ ] Basic leaderboard
- [ ] Guest vs logged-in differentiation

### Phase 2: User-Generated Content (Week 2)
- [ ] User prediction creation form
- [ ] Admin approval queue
- [ ] Admin resolution interface
- [ ] Points calculation on resolution
- [ ] Email notifications

### Phase 3: Gamification (Week 3)
- [ ] Badges & achievements
- [ ] Streak tracking
- [ ] Level system
- [ ] Regional leaderboards
- [ ] Category-specific leaders

### Phase 4: Social & Engagement (Week 4)
- [ ] Comments on predictions
- [ ] User following system
- [ ] Activity feed
- [ ] Share to social media
- [ ] Weekly digest emails

### Phase 5: Analytics & Polish (Week 5+)
- [ ] Admin dashboard with analytics
- [ ] User analytics (performance over time)
- [ ] Trending predictions algorithm
- [ ] SEO optimization
- [ ] Mobile app (React Native)

---

## 🔧 Technical Recommendations

### Backend: Firebase (Current Choice) ✅
**Pros:**
- Real-time updates for live vote counts
- Built-in authentication
- Generous free tier
- Scales automatically
- No server management

**Cons:**
- Query limitations (no complex joins)
- Vendor lock-in

**Alternative:** Supabase (PostgreSQL, more flexible queries, open source)

### Prediction Resolution
**Recommended:** Manual admin resolution with proof link  
**Why:** Binary outcomes often need human judgment (e.g., "Will Trump win?" depends on defining "win")

**Future:** Semi-automated resolution using news APIs (Reuters, AP) for objective events

### Vote Immutability
**Recommended:** Votes are **immutable** (can't change after submission)  
**Why:**
- Prevents gaming the system
- Maintains prediction integrity
- Simpler to audit
- Reflects real forecasting (you commit to a prediction)

### Real-time Updates
Use Firestore listeners for:
- Vote count updates
- Leaderboard changes
- Prediction status changes

### Caching Strategy
- Cache leaderboards (update every 5 minutes)
- Cache category counts (update hourly)
- Cache user profiles (update on-demand)

---

## 🌍 Regional & Localization

### Multi-Region Support
- Store user `country` field
- Regional leaderboards
- Category preferences by region
- Time zone handling for end dates

### Future: Multi-Language
- English (default)
- French (Africa)
- Swahili (East Africa)
- Portuguese (Angola, Mozambique)

---

## 📱 Mobile Considerations

### Responsive Design (Current)
- Mobile-first CSS
- Touch-friendly buttons
- Optimized for 3G networks

### Future: Native App
- React Native with Firebase
- Push notifications for prediction results
- Offline vote queuing

---

## 🎯 Success Metrics (KPIs)

### User Engagement
- Daily Active Users (DAU)
- Average votes per user
- User retention (7-day, 30-day)
- Voting streak length

### Content Quality
- Prediction approval rate
- Average votes per prediction
- Prediction resolution time
- User-created vs admin-created ratio

### Platform Health
- Accuracy distribution (are users getting better?)
- Category diversity
- Regional growth
- Spam/report rate

---

## ❓ Questions & Clarifications Needed

1. **Prediction Creation:**
   - Should we start with user-created (with approval) or admin-only?
   - **Recommendation:** User-created with approval ✅
   
2. **Vote Changes:**
   - Allow users to change their vote before end date?
   - **Recommendation:** No changes (immutable) ✅
   
3. **Points for Wrong Votes:**
   - Penalize wrong votes (-5 points)?
   - **Recommendation:** No penalty (0 points), keeps it fun ✅
   
4. **Verification Required:**
   - Force email verification before voting?
   - **Recommendation:** Yes (prevents spam accounts) ✅
   
5. **Admin Team:**
   - How many admins initially?
   - **Recommendation:** Start with 1-2, expand as needed

6. **Prediction Limits:**
   - Max active predictions per user?
   - **Recommendation:** 5 pending, unlimited approved ✅

7. **Resolution Timeline:**
   - Max days to resolve after end date?
   - **Recommendation:** 7 days, then auto-cancel if unresolved ✅

---

## 🚦 Next Steps

1. **Review & Approve Architecture**
2. **Implement Phase 1 (Core Platform)**
   - Google Sign-In integration
   - Firestore schema setup
   - Voting system with security rules
   - User profile pages
   - Basic leaderboard
3. **Test with Seed Data**
4. **Deploy & Gather Feedback**
5. **Iterate to Phase 2**

---

**Decision Points Summary:**
- ✅ Firebase/Firestore for backend
- ✅ User-created predictions with admin approval
- ✅ Immutable votes (no changes)
- ✅ Manual admin resolution with proof
- ✅ Email verification required
- ✅ Google Sign-In + Email/Password auth
- ✅ Guest viewing allowed (no voting)
- ✅ Points awarded on resolution: +10 for correct, 0 for wrong
- ✅ Start simple (Phase 1), expand incrementally

**Ready to implement?** Let me know if you want to adjust anything! 🚀
