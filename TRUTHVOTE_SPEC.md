# TruthVote Technical Specification

**Version:** 2.0  
**Date:** December 21, 2025  
**Stack:** Next.js 15 + Firebase (+ ThirdWeb ready)  
**Deployment:** Vercel or Firebase Hosting

---

## 1. App Purpose

TruthVote is a **public voting and prediction platform** where users predict outcomes on binary questions (Yes/No, Option A/Option B) across various categories like politics, sports, crypto, and entertainment. Users earn points when their predictions are correct, building reputation over time through accuracy percentages and leaderboard rankings. Unlike traditional betting platforms, TruthVote is **100% free to use**—no real money, tokens, or wallets required. The platform gamifies predictions through a points-based reward system, encouraging thoughtful engagement and community competition.

---

## 2. User Flow

### 2.1 First-Time Visitor
1. **Landing:** User visits `truthvote.com` → sees featured/trending polls without login
2. **Browse:** Scrolls through active polls, filtered by category (All, Politics, Sports, etc.)
3. **Preview:** Clicks poll card → views poll details, current vote distribution, time remaining
4. **Sign Up Prompt:** Attempts to vote → redirected to sign-up modal
5. **Registration:** Enters email + password → receives verification email → confirms account
6. **Login:** Returns to poll → casts vote → sees immediate feedback ("Vote recorded!")

### 2.2 Returning User
1. **Login:** Email + password (or saved session) → dashboard
2. **Dashboard Views:**
   - **Active Polls:** Open polls they can vote on
   - **My Votes:** Polls they've voted on (pending results)
   - **Results:** Resolved polls showing if they won/lost
3. **Vote:** Selects a poll → chooses Option A or B → submits (one vote per poll, immutable)
4. **Track:** Views profile → sees total points, accuracy %, correct predictions count
5. **Compete:** Checks leaderboard → compares with other users
6. **Share:** Copies poll link → shares on social media (Twitter, Discord, etc.)

### 2.3 Admin User
1. **Login:** Admin account with elevated permissions
2. **Admin Panel:** Hidden route (`/admin`) or protected menu item
3. **Create Poll:** Fills form (question, options, end time, category, image) → submits for immediate publish
4. **Resolve Poll:** Selects expired poll → marks winning option → triggers point distribution
5. **Moderate:** Reviews user-submitted polls (Phase 2) → approves or rejects
6. **Analytics:** Views platform stats (total users, polls, votes, engagement)

---

## 3. Core Features

### 3.1 Authentication
- **Firebase Authentication** (email/password)
- Email verification required
- Password reset flow
- Session persistence (remember me)
- Profile creation on first login:
  - Display name (optional)
  - Avatar (default generic icon)
  - Bio (optional, 160 chars)

### 3.2 Poll Creation (Admin)
**Form Fields:**
- Question (max 200 chars)
- Option A label (max 50 chars)
- Option B label (max 50 chars)
- Category (dropdown: Politics, Sports, Crypto, Entertainment, Science, Other)
- End date/time (datetime picker, must be future)
- Poll image (optional, uploaded to Firebase Storage)
- Source link (optional, for reference)

**Validation:**
- Question is required
- Both options are required
- End time must be at least 1 hour from now
- Category must be selected

**Creation Flow:**
1. Admin fills form → clicks "Create Poll"
2. Image uploaded to Storage (if provided) → URL saved
3. Poll document created in Firestore → status "active"
4. Redirects to poll detail page
5. Poll appears in "Active" tab immediately

### 3.3 Voting System
**Rules:**
- One vote per user per poll (enforced by Firestore security rules)
- Votes are immutable (cannot change after submission)
- Votes only allowed while poll is open (`now < endTime`)
- Vote is stored as:
  - User ID
  - Poll ID
  - Option chosen (A or B)
  - Timestamp
  - Confidence level (optional Phase 2 feature: 1-5 stars)

**Voting Flow:**
1. User clicks "Vote A" or "Vote B" button
2. Client checks if user already voted (local state + Firestore query)
3. If not voted → creates vote document in Firestore
4. Real-time listener updates vote counts on all clients
5. UI shows "You voted for [Option]" with checkmark
6. Voting buttons disabled for this user on this poll

**Vote Display:**
- Progress bar showing % for each option
- Total vote count (e.g., "1,243 votes")
- User's vote highlighted if they voted
- Option labels truncated if too long

### 3.4 Poll States
**Active:**
- `endTime > now`
- Voting is open
- Shows countdown timer ("Ends in 2 days 5 hours")
- Green status badge

**Expired:**
- `endTime < now`
- Voting is closed
- Shows "Closed" badge
- Awaits admin resolution

**Resolved:**
- Admin has marked winning option
- Shows winner badge on winning option
- Displays user's result: "You won! +10 points" or "You lost"
- Shows final vote distribution

### 3.5 Results & Points
**Point Calculation:**
- Base points for correct prediction: **10 points**
- Accuracy bonus (Phase 2): +5 points if user has >70% accuracy
- Early bird bonus (Phase 2): +2 points if voted in first 24 hours

**Point Distribution:**
1. Admin resolves poll → sets winning option (A or B)
2. Cloud Function triggered:
   - Queries all votes for this poll
   - Filters votes matching winning option
   - Updates each winning user's document:
     - Increment `totalPoints` by 10
     - Increment `correctPredictions` by 1
     - Recalculate `accuracy` = (correctPredictions / totalVotes) * 100
3. Users see updated points on next profile refresh

**Loss Handling:**
- No points deducted for wrong predictions
- Accuracy % decreases (total votes increases without correct predictions)

### 3.6 User Profiles
**Profile Page (`/profile/:userId`):**
- Display name + avatar
- Bio (if set)
- Stats card:
  - Total points
  - Accuracy % (correct predictions / total votes)
  - Total predictions
  - Correct predictions
  - Current rank on leaderboard
- Recent activity:
  - List of recent votes (last 10)
  - Shows poll question, option voted, result (won/lost)
- Edit profile button (if viewing own profile)

**Profile Edit:**
- Change display name
- Upload avatar (Firebase Storage, max 2MB, jpg/png)
- Edit bio
- Change password link

### 3.7 Leaderboards
**Global Leaderboard (`/leaderboard`):**
- Ranked list of top 100 users by total points
- Display: Rank, Avatar, Name, Points, Accuracy %
- Pagination (25 per page)
- Filters:
  - All Time (default)
  - This Month (Phase 2)
  - This Week (Phase 2)

**Ranking Logic:**
- Primary sort: Total points (descending)
- Tiebreaker: Accuracy % (descending)
- Tiebreaker 2: Total predictions (descending)

**User Highlight:**
- Current user's row highlighted in gold
- "You" badge next to their name
- Jump-to-me button if not in top 100

### 3.8 Shareable Polls
**Share Functionality:**
- Each poll has unique URL: `/poll/:pollId`
- Copy link button on poll card
- Open Graph meta tags for preview:
  - Title: Poll question
  - Description: "Vote now on TruthVote!"
  - Image: Poll image (or default banner)
  - URL: Poll detail page

**Social Preview:**
- Twitter card (summary_large_image)
- Facebook OG tags
- Discord embed support

### 3.9 Category Filtering
**Categories:**
- All (default, shows everything)
- Politics
- Sports
- Crypto
- Entertainment
- Science
- Other

**Filter UI:**
- Horizontal scrollable buttons on mobile
- Fixed button row on desktop
- Active category highlighted
- Click to toggle

**Filter Logic:**
- Client-side filtering (if <100 polls)
- Firestore query with `where("category", "==", selectedCategory)` (if >100 polls)

### 3.10 Admin Panel (Protected)
**Route:** `/admin` (Firebase Auth + custom claims required)

**Features:**
- Create new poll (form)
- Resolve poll (select poll, mark winner)
- View all polls (table with filters)
- User management (Phase 2: ban, reset password)
- Platform stats:
  - Total users
  - Total polls
  - Total votes
  - Active users (last 7 days)

**Security:**
- Only users with `admin: true` custom claim can access
- Firestore rules block non-admins from writing to polls collection
- Cloud Functions validate admin status before resolution

---

## 4. Data Models (Firestore)

### 4.1 Collections Structure
```
users/
  {userId}/
    - email: string
    - displayName: string
    - avatarUrl: string (Storage URL)
    - bio: string
    - totalPoints: number
    - totalVotes: number
    - correctPredictions: number
    - accuracy: number (calculated)
    - createdAt: timestamp
    - lastActive: timestamp

polls/
  {pollId}/
    - question: string
    - optionA: string
    - optionB: string
    - category: string
    - imageUrl: string (optional)
    - sourceLink: string (optional)
    - createdAt: timestamp
    - endTime: timestamp
    - resolved: boolean
    - winningOption: string ("A" | "B" | null)
    - totalVotes: number
    - votesA: number
    - votesB: number
    - createdBy: string (userId)

votes/
  {voteId}/
    - userId: string
    - pollId: string
    - option: string ("A" | "B")
    - timestamp: timestamp
    - confidence: number (optional, 1-5)

categories/
  {categoryId}/
    - name: string
    - displayOrder: number
    - pollCount: number (cached)

pointHistory/ (optional, for detailed tracking)
  {entryId}/
    - userId: string
    - pollId: string
    - points: number
    - reason: string ("correct_prediction" | "accuracy_bonus")
    - timestamp: timestamp
```

### 4.2 Firestore Security Rules (Simplified)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read all users, but only write their own
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Anyone can read polls, only admins can create/update
    match /polls/{pollId} {
      allow read: if true;
      allow create: if request.auth.token.admin == true;
      allow update: if request.auth.token.admin == true;
    }
    
    // Users can only create their own votes, read their own
    match /votes/{voteId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId
                    && !exists(/databases/$(database)/documents/votes/$(request.auth.uid + '_' + request.resource.data.pollId));
    }
    
    // Categories are read-only for clients
    match /categories/{categoryId} {
      allow read: if true;
    }
  }
}
```

### 4.3 Composite Indexes (Firestore)
```
polls:
  - category (ASC), endTime (DESC)
  - resolved (ASC), endTime (DESC)
  - createdAt (DESC)

votes:
  - userId (ASC), timestamp (DESC)
  - pollId (ASC), option (ASC)

users:
  - totalPoints (DESC), accuracy (DESC)
```

---

## 5. Folder Structure (Next.js 15 App Router)

```
truthvote/
├── public/
│   ├── assets/
│   │   ├── banner.png
│   │   ├── logo.svg
│   │   └── default-avatar.png
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home/dashboard
│   │   ├── globals.css          # Global styles
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── signup/
│   │   │   └── page.tsx         # Signup page
│   │   ├── poll/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Dynamic poll detail
│   │   ├── profile/
│   │   │   └── [userId]/
│   │   │       └── page.tsx     # User profile
│   │   ├── leaderboard/
│   │   │   └── page.tsx         # Leaderboard
│   │   ├── admin/
│   │   │   └── page.tsx         # Admin panel
│   │   └── api/                 # API Routes
│   │       ├── polls/
│   │       │   └── route.ts     # Poll CRUD operations
│   │       ├── votes/
│   │       │   └── route.ts     # Vote submission
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── route.ts # Future: Payment webhooks
│   ├── components/
│   │   ├── ui/                  # Radix UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── select.tsx
│   │   │   └── tabs.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── poll/
│   │   │   ├── PollCard.tsx
│   │   │   ├── PollDetail.tsx
│   │   │   ├── PollProgress.tsx
│   │   │   ├── PollTimer.tsx
│   │   │   └── VoteButtons.tsx
│   │   ├── admin/
│   │   │   ├── CreatePollForm.tsx
│   │   │   ├── ResolvePollForm.tsx
│   │   │   └── AdminStats.tsx
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx
│   │   │   ├── StatsDisplay.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.tsx
│   │   │   └── RankBadge.tsx
│   │   └── providers/
│   │       └── Providers.tsx    # Client-side providers wrapper
│   ├── hooks/
│   │   ├── useAuth.ts           # Firebase Auth hook
│   │   ├── usePolls.ts          # Fetch polls from Firestore
│   │   ├── useVote.ts           # Vote submission logic
│   │   ├── useProfile.ts        # User profile data
│   │   └── useLeaderboard.ts    # Leaderboard data
│   ├── context/
│   │   ├── AuthContext.tsx      # Global auth state
│   │   └── ThemeContext.tsx     # Dark mode (optional)
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts        # Firebase initialization
│   │   │   ├── auth.ts          # Auth methods
│   │   │   ├── firestore.ts     # Firestore helpers
│   │   │   └── storage.ts       # Storage uploads
│   │   ├── blockchain/          # Future: ThirdWeb integration
│   │   │   ├── config.ts        # ThirdWeb client (disabled)
│   │   │   └── contracts.ts     # Contract instances
│   │   └── utils.ts             # Utility functions (cn, etc.)
│   ├── types/
│   │   ├── poll.ts              # Poll type definitions
│   │   ├── user.ts              # User type definitions
│   │   └── vote.ts              # Vote type definitions
│   └── middleware.ts            # Next.js middleware (auth checks)
├── .env.local                   # Environment variables (gitignored)
├── .firebaserc                  # Firebase project config
├── firebase.json                # Firebase config
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore indexes
├── storage.rules                # Storage security rules
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── components.json              # shadcn/ui config
├── package.json                 # Dependencies
└── README.md                    # Setup instructions
```

---

## 6. Authentication Logic

### 6.1 Firebase Auth Setup
```typescript
// src/lib/firebase/config.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### 6.2 Sign Up Flow
```typescript
// src/services/firebase/auth.ts
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export async function signUp(email: string, password: string, displayName: string) {
  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // 2. Send verification email
  await sendEmailVerification(user);
  
  // 3. Update profile with display name
  await updateProfile(user, { displayName });
  
  // 4. Create user document in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: displayName,
    avatarUrl: '',
    bio: '',
    totalPoints: 0,
    totalVotes: 0,
    correctPredictions: 0,
    accuracy: 0,
    createdAt: new Date(),
    lastActive: new Date()
  });
  
  return user;
}
```

### 6.3 Login Flow
```typescript
export async function login(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Update last active timestamp
  await updateDoc(doc(db, 'users', userCredential.user.uid), {
    lastActive: new Date()
  });
  
  return userCredential.user;
}
```

### 6.4 Auth Context
```typescript
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Check admin status from custom claims
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(!!tokenResult.claims.admin);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 6.5 Protected Routes
```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/" />;
  
  return <>{children}</>;
}
```

---

## 7. Technical Implementation Details

### 7.1 Next.js Configuration
```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
```

### 7.2 Environment Variables
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Future: Blockchain (disabled by default)
# NEXT_PUBLIC_THIRDWEB_CLIENT_ID=
# NEXT_PUBLIC_CONTRACT_ADDRESS=

# Future: Payments
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
```

### 7.3 Tailwind Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0076a3',
        secondary: '#6c757d',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### 7.4 Firebase Cloud Function Example
```typescript
// functions/src/resolvePolls.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const resolvePoll = functions.https.onCall(async (data, context) => {
  // Check admin authorization
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { pollId, winningOption } = data;
  const db = admin.firestore();

  // Update poll
  await db.collection('polls').doc(pollId).update({
    resolved: true,
    winningOption: winningOption
  });

  // Get all votes for this poll
  const votesSnapshot = await db.collection('votes')
    .where('pollId', '==', pollId)
    .where('option', '==', winningOption)
    .get();

  // Award points to winners
  const batch = db.batch();
  votesSnapshot.forEach(voteDoc => {
    const userId = voteDoc.data().userId;
    const userRef = db.collection('users').doc(userId);
    
    batch.update(userRef, {
      totalPoints: admin.firestore.FieldValue.increment(10),
      correctPredictions: admin.firestore.FieldValue.increment(1)
    });
  });

  await batch.commit();
  
  return { success: true };
});
```

---

## 8. UI/UX Specifications

### 8.1 Color Palette
- **Primary:** `#0076a3` (Blue - trust, knowledge)
- **Secondary:** `#6c757d` (Gray - neutral)
- **Success:** `#28a745` (Green - correct predictions)
- **Danger:** `#dc3545` (Red - incorrect predictions)
- **Warning:** `#ffc107` (Yellow - pending states)
- **Background:** `#ffffff` (Light mode) / `#1a1a1a` (Dark mode - Phase 2)
- **Text:** `#212529` (Light mode) / `#f8f9fa` (Dark mode - Phase 2)

### 8.2 Typography
- **Font Family:** System font stack (fast loading)
  - `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Headings:** Bold, larger sizes (H1: 2rem, H2: 1.5rem, H3: 1.25rem)
- **Body:** Regular, 1rem (16px)
- **Small Text:** 0.875rem (14px) for metadata

### 8.3 Component Specifications

**Poll Card:**
- Shadow: `shadow-md` on hover
- Border radius: `rounded-lg` (8px)
- Padding: `p-4` (16px)
- Image aspect ratio: 16:9
- Progress bar height: 8px
- Max width: 400px

**Vote Buttons:**
- Height: 40px
- Full width on mobile
- Half width on desktop
- Hover effect: Slight background darken
- Active state: Border highlight
- Disabled state: Gray + reduced opacity

**Leaderboard Row:**
- Hover: Light background
- Current user: Gold highlight
- Avatar size: 40x40px
- Rank badge: Circle, 32x32px

### 8.4 Responsive Breakpoints
- **Mobile:** `< 640px` (default)
- **Tablet:** `640px - 1024px`
- **Desktop:** `> 1024px`

---

## 9. Development Roadmap

### Phase 1: Core MVP (Week 1-2)
- ✅ Project setup (Next.js 15 + TypeScript + Tailwind)
- ✅ Firebase configuration (Auth, Firestore, Storage)
- ✅ Authentication flow (signup, login, logout)
- ✅ Poll display (list, detail page with SSR)
- ✅ Voting system (submit vote, real-time updates)
- ✅ Basic user profile (points, accuracy)
- ✅ Admin poll creation
- ✅ Admin poll resolution
- ✅ API routes for server-side operations

### Phase 2: Enhancement (Week 3)
- ✅ Category filtering
- ✅ Leaderboard page
- ✅ User profile edit
- ✅ Shareable poll links
- ✅ Poll search functionality
- ✅ Responsive design refinement

### Phase 3: Polish & Deploy (Week 4)
- ✅ Loading states and skeletons
- ✅ Error handling and toasts
- ✅ Performance optimization
- ✅ SEO meta tags
- ✅ Firebase Hosting deployment
- ✅ Custom domain setup (optional)

### Phase 4: Advanced Features (Future)
- 📋 Comments/discussion on polls
- 📋 Badges and achievements
- 📋 Email notifications
- 📋 Dark mode
- 📋 User-submitted polls (with approval queue)
- 📋 Trending algorithm
- 📋 Weekly/monthly leaderboards
- 📋 Confidence levels (1-5 stars)
- 📋 Streak tracking

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Utility functions (formatters, validators)
- Firebase service wrappers
- React hooks (with React Testing Library)

### 10.2 Integration Tests
- Auth flow (signup → login → logout)
- Vote submission and retrieval
- Poll creation and resolution
- Point distribution logic

### 10.3 Manual Testing Checklist
- [ ] Sign up with email
- [ ] Email verification works
- [ ] Login persists after refresh
- [ ] Vote is recorded correctly
- [ ] Cannot vote twice on same poll
- [ ] Poll expires at correct time
- [ ] Admin can create poll
- [ ] Admin can resolve poll
- [ ] Points are awarded to winners
- [ ] Leaderboard updates
- [ ] Profile stats are accurate
- [ ] Responsive on mobile
- [ ] Fast loading times

---

## 11. Deployment Instructions

### 11.1 Firebase Project Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Select:
# - Hosting (static files)
# - Firestore (database)
# - Storage (file uploads)
# - Functions (Cloud Functions)
```

### 11.2 Build and Deploy

**Option A: Vercel (Recommended for Next.js)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Deploy Firestore rules separately
firebase deploy --only firestore:rules,storage:rules
```

**Option B: Firebase Hosting**
```bash
# Build Next.js app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules,storage:rules
```

### 11.3 Environment Variables
Add to Firebase Hosting config:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 12. Success Metrics

### 12.1 Launch Goals (Month 1)
- 100+ registered users
- 50+ active polls
- 1,000+ votes cast
- 80%+ user retention (week 1)

### 12.2 Growth Targets (Month 3)
- 1,000+ registered users
- 200+ polls created
- 10,000+ votes cast
- Daily active users: 20%

### 12.3 Technical KPIs
- Page load time: < 2 seconds
- Time to interactive: < 3 seconds
- Firestore read operations: < 10,000/day (free tier)
- Storage usage: < 5GB (free tier)
- Cloud Function executions: < 125,000/month (free tier)

---

## 13. Risk Mitigation

### 13.1 Security
- **Risk:** Fake votes via bot accounts
- **Mitigation:** reCAPTCHA on signup, rate limiting, email verification required

### 13.2 Scalability
- **Risk:** Firestore free tier limits
- **Mitigation:** Cache leaderboard in state, batch writes, optimize queries

### 13.3 Data Integrity
- **Risk:** Vote manipulation or duplicate votes
- **Mitigation:** Firestore security rules, composite unique keys (userId + pollId)

### 13.4 Admin Abuse
- **Risk:** Admins resolving polls incorrectly
- **Mitigation:** Admin action logging, immutable resolution history

---

## 14. Future Considerations

### 14.1 Monetization (If Desired)
- Premium tier (early voting, exclusive polls)
- Sponsored polls (brands pay for visibility)
- Affiliate links in poll sources

### 14.2 Community Features
- User following/followers
- Private polls (invite-only)
- Poll collections (curated lists)

### 14.3 Mobile App
- React Native version
- Push notifications
- Offline voting (queued sync)

---

## Conclusion

This specification provides a complete blueprint for building TruthVote as a modern, accessible, and scalable prediction platform. The React + Vite + Firebase stack ensures fast development, real-time capabilities, and serverless scalability. The focus on gamification through points and leaderboards will drive engagement without the complexity of real-money betting.

**Next Steps:**
1. ✅ Review and approve this specification
2. 🔄 Initialize React + Vite project
3. ⏳ Set up Firebase project
4. ⏳ Build authentication flow
5. ⏳ Implement poll creation and voting
6. ⏳ Deploy to Firebase Hosting

**Estimated Timeline:** 3-4 weeks to MVP launch  
**Estimated Cost:** $0 (Firebase free tier sufficient for MVP)

---

**Document Status:** Ready for Development  
**Approval Required:** Yes  
**Last Updated:** December 21, 2025