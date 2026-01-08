# TruthVote Admin Dashboard - Architecture & Implementation Plan

> **Document Created:** January 7, 2026  
> **Status:** Planning Phase - No Implementation Yet  
> **Purpose:** Complete redesign of the Admin Dashboard with AI-assisted prediction creation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Design Philosophy](#target-design-philosophy)
4. [New Architecture Overview](#new-architecture-overview)
5. [UI/UX Design System](#uiux-design-system)
6. [Feature Modules](#feature-modules)
7. [API & Integration Requirements](#api--integration-requirements)
8. [Data Models](#data-models)
9. [Implementation Phases](#implementation-phases)
10. [Manual Action Items for Owner](#manual-action-items-for-owner)
11. [Technical Checklist](#technical-checklist)

---

## 🎯 Executive Summary

### What We're Building
A sophisticated, Firebase Console-style admin dashboard that:
- Provides **AI-assisted content discovery** from Nigerian/African news sources
- Enables **rapid prediction creation** (30 seconds vs 30 minutes)
- Offers a **dense, professional UI** with detailed information panels
- Maintains **editorial control** while automating tedious tasks

### Key Principles
1. **Semi-Automation**: AI discovers and drafts, human approves
2. **Information Density**: Firebase Console-style - compact, detailed, no oversized elements
3. **Efficiency**: One-click actions, minimal friction
4. **Quality Control**: You remain the gatekeeper

---

## 📊 Current State Analysis

### Existing Admin Components

| Component | File | Current State | Issues |
|-----------|------|---------------|--------|
| **AdminLayout** | `src/components/admin/AdminLayout.tsx` | Basic sidebar navigation | Buttons too large, lacks detail panels |
| **DashboardOverview** | `src/components/admin/DashboardOverview.tsx` | Simple stats cards | Cards too spacious, missing activity feeds |
| **PredictionsManager** | `src/components/admin/PredictionsManager.tsx` | Full CRUD functionality (1416 lines) | Works but UI is bulky |
| **ResolveManager** | `src/components/admin/ResolveManager.tsx` | Basic resolution flow | Good, needs compact styling |
| **UsersManager** | `src/components/admin/UsersManager.tsx` | User search & view | Missing bulk operations |
| **RankManager** | `src/components/admin/RankManager.tsx` | Manual rank changes | Works, needs compact UI |

### Current Navigation Structure
```
Admin Dashboard
├── Dashboard (stats overview)
├── Predictions (create/manage)
├── Resolve (end predictions)
├── Users (search users)
└── Rank Management (manual promotions)
```

### Current UI Problems
1. **Oversized Elements**: Buttons, cards, and text are too large
2. **Wasted Space**: Too much padding, not enough information density
3. **No News Integration**: Manual content discovery
4. **No Activity Feed**: Can't see recent platform activity
5. **No Quick Actions**: Every action requires multiple clicks
6. **Missing Sidebar Details**: Clicking sidebar only changes main content, no detail panels

---

## 🎨 Target Design Philosophy

### Firebase Console Style Guide

We want to emulate the Firebase Console approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ≡ TruthVote Admin                                    🔔  👤 Admin       │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│ ▼ Dashboard  │  Dashboard Overview                           ⟳ Refresh │
│              │  ─────────────────────────────────────────────────────── │
│   Overview   │                                                          │
│   Activity   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│   Analytics  │  │Users    │ │Active   │ │Votes    │ │Pending  │        │
│              │  │1,247    │ │12 preds │ │Today    │ │5 resolve│        │
│ ▼ Content    │  │+23 today│ │↑ 3      │ │847      │ │⚠ Action │        │
│              │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│   🔥 Trends  │                                                          │
│   📝 Create  │  ┌─────────────────────────────────────────────────────┐ │
│   📋 Manage  │  │ 🔥 TRENDING TOPICS (Auto-Updated 5m ago)   [Config] │ │
│   ✓ Resolve  │  ├─────────────────────────────────────────────────────┤ │
│              │  │ ⚽ AFCON: Nigeria vs Egypt │ BBC │ Jan 10 │ [+Create]│ │
│ ▼ Users      │  │ 🎵 Burna Boy Album Drop   │ Pulse│ Feb 1  │ [+Create]│ │
│              │  │ 🗳️ Lagos Election Update  │ PT   │ Mar 15 │ [+Create]│ │
│   Search     │  │ ⚽ EPL: Arsenal vs City   │ Goal │ Jan 8  │ [+Create]│ │
│   Ranks      │  └─────────────────────────────────────────────────────┘ │
│   Leaderboard│                                                          │
│              │  ┌──────────────────────┐ ┌──────────────────────────┐   │
│ ▼ Settings   │  │ RECENT ACTIVITY      │ │ QUICK ACTIONS            │   │
│              │  ├──────────────────────┤ ├──────────────────────────┤   │
│   Categories │  │ • User voted on #123 │ │ [Create Prediction]      │   │
│   Sources    │  │ • New user signup    │ │ [Resolve Pending (5)]    │   │
│   API Keys   │  │ • Prediction created │ │ [View All Users]         │   │
│              │  └──────────────────────┘ └──────────────────────────┘   │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Design Tokens

| Element | Current | Target |
|---------|---------|--------|
| **Base Font Size** | 16px | 13-14px |
| **Card Padding** | 24px | 12-16px |
| **Button Size** | Large (40px height) | Compact (28-32px height) |
| **Sidebar Width** | 256px | 220px collapsed, 320px expanded with details |
| **Header Height** | 64px | 48px |
| **Spacing Scale** | 4, 8, 16, 24, 32 | 2, 4, 8, 12, 16, 24 |
| **Border Radius** | 8px | 4-6px |
| **Table Row Height** | 64px | 36-40px |

### Color System (Professional/Muted)

```css
/* Primary Actions */
--primary: #1a73e8;        /* Google Blue - primary actions */
--primary-hover: #1557b0;

/* Status Colors */
--success: #34a853;        /* Green - resolved, success */
--warning: #fbbc04;        /* Yellow - pending, needs attention */
--error: #ea4335;          /* Red - errors, urgent */
--info: #4285f4;           /* Blue - info, active */

/* Neutral Palette */
--bg-primary: #f8f9fa;     /* Main background */
--bg-secondary: #ffffff;   /* Cards, panels */
--bg-tertiary: #e8eaed;    /* Hover states */
--border: #dadce0;         /* Borders */
--text-primary: #202124;   /* Main text */
--text-secondary: #5f6368; /* Secondary text */
--text-tertiary: #80868b;  /* Muted text */
```

---

## 🏗️ New Architecture Overview

### Restructured Navigation

```
Admin Dashboard (New Structure)
│
├── 📊 DASHBOARD
│   ├── Overview (stats, alerts, quick actions)
│   ├── Activity Feed (real-time platform activity)
│   └── Analytics (charts, trends - future)
│
├── 📰 CONTENT DISCOVERY (NEW)
│   ├── 🔥 Trending Topics (AI-curated news feed)
│   ├── 📌 Saved Topics (dismissed for later)
│   └── ⚙️ Sources Config (manage RSS/API sources)
│
├── 📝 PREDICTIONS
│   ├── Quick Create (from trending topic)
│   ├── Manual Create (full form)
│   ├── Active Predictions (manage live)
│   ├── Drafts (unpublished)
│   ├── Scheduled (future start)
│   └── Archive (resolved history)
│
├── ✅ RESOLUTION CENTER
│   ├── Pending Resolution (needs action)
│   ├── Recently Resolved (last 7 days)
│   └── Disputed (flagged by users - future)
│
├── 👥 USERS
│   ├── User Search
│   ├── User Directory (browse all)
│   ├── Rank Management
│   └── Leaderboard View
│
├── 📊 CATEGORIES
│   ├── Manage Categories
│   └── Subcategories
│
└── ⚙️ SETTINGS
    ├── API Configuration
    ├── News Sources
    ├── Admin Logs
    └── System Health
```

### Component Architecture

```
src/components/admin/
├── layout/
│   ├── AdminShell.tsx          # Main layout wrapper
│   ├── AdminSidebar.tsx        # Compact collapsible sidebar
│   ├── AdminHeader.tsx         # Slim header with notifications
│   ├── AdminBreadcrumb.tsx     # Navigation breadcrumb
│   └── DetailPanel.tsx         # Right-side detail panel
│
├── dashboard/
│   ├── DashboardOverview.tsx   # Redesigned with density
│   ├── StatsGrid.tsx           # Compact stat cards
│   ├── ActivityFeed.tsx        # Real-time activity
│   ├── QuickActions.tsx        # Common action buttons
│   └── AlertsBanner.tsx        # Pending items alert
│
├── content-discovery/          # NEW - AI-assisted content
│   ├── TrendingTopics.tsx      # Main trending feed
│   ├── TopicCard.tsx           # Individual topic item
│   ├── SourcesManager.tsx      # Configure news sources
│   ├── TopicFilters.tsx        # Category/source filters
│   └── DismissedTopics.tsx     # Saved for later
│
├── predictions/
│   ├── PredictionsTable.tsx    # Dense table view
│   ├── PredictionRow.tsx       # Single table row
│   ├── QuickCreate.tsx         # AI-assisted creation
│   ├── ManualCreate.tsx        # Full creation form
│   ├── PredictionDetail.tsx    # Detail panel view
│   ├── PredictionFilters.tsx   # Status/category filters
│   └── BulkActions.tsx         # Multi-select operations
│
├── resolution/
│   ├── ResolutionQueue.tsx     # Pending resolutions list
│   ├── ResolutionModal.tsx     # Resolution dialog
│   └── ResolutionHistory.tsx   # Past resolutions
│
├── users/
│   ├── UserSearch.tsx          # Search interface
│   ├── UserDirectory.tsx       # Browse all users
│   ├── UserDetail.tsx          # User profile panel
│   ├── RankManager.tsx         # Rank changes
│   └── UserTable.tsx           # Dense user list
│
├── categories/
│   ├── CategoryManager.tsx     # CRUD for categories
│   └── SubcategoryEditor.tsx   # Subcategory management
│
├── settings/
│   ├── APIConfiguration.tsx    # API keys management
│   ├── SourcesConfig.tsx       # News source settings
│   ├── AdminLogs.tsx           # Action audit log
│   └── SystemHealth.tsx        # Status checks
│
└── shared/
    ├── DataTable.tsx           # Reusable dense table
    ├── StatusBadge.tsx         # Status indicators
    ├── ActionMenu.tsx          # Dropdown actions
    ├── ConfirmDialog.tsx       # Confirmation modal
    ├── SearchInput.tsx         # Search component
    ├── FilterBar.tsx           # Filter controls
    ├── Pagination.tsx          # Table pagination
    └── EmptyState.tsx          # No data display
```

---

## 🔌 API & Integration Requirements

### Required External APIs

#### 1. OpenAI GPT-4 API (Required)
**Purpose:** Analyze headlines, generate prediction drafts, score relevance

**You Need To:**
- [ ] Create OpenAI account at https://platform.openai.com/
- [ ] Generate API key
- [ ] Add billing method (estimated $20-50/month)
- [ ] Provide API key for secure storage

**Environment Variable:**
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

**Usage:**
- Analyze news headlines for prediction-worthiness
- Generate suggested questions and options
- Extract event dates from articles

---

#### 2. Twitter/X API (Recommended)
**Purpose:** Fetch Nigeria trending topics

**You Need To:**
- [ ] Apply for Twitter Developer access at https://developer.twitter.com/
- [ ] Choose Basic tier (~$100/month) or Free tier (limited)
- [ ] Generate API keys (Bearer Token)
- [ ] Provide credentials

**Environment Variables:**
```
TWITTER_BEARER_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_API_KEY=xxxxxxxxxxxxxx
TWITTER_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** Free tier has severe limits. Basic tier recommended for production.

---

#### 3. RSS Feed Sources (Free)
**Purpose:** Aggregate news from Nigerian/African sources

**No signup needed - these are public RSS feeds:**

| Source | RSS URL | Category |
|--------|---------|----------|
| BBC Sport Africa | `https://feeds.bbci.co.uk/sport/africa/rss.xml` | Sports |
| Premium Times | `https://www.premiumtimesng.com/feed` | Politics/News |
| Pulse Nigeria | `https://www.pulse.ng/rss` | Entertainment |
| The Cable | `https://www.thecable.ng/feed` | News |
| Vanguard | `https://www.vanguardngr.com/feed/` | News |
| Goal.com Africa | `https://www.goal.com/feeds/en/news` | Sports |
| Legit.ng | `https://www.legit.ng/rss` | General |
| NotJustOk | `https://notjustok.com/feed/` | Music |

**These will be configured in the admin dashboard Sources Config section.**

---

#### 4. Image APIs (Optional, Free Tier Available)

**Unsplash API:**
- [ ] Create account at https://unsplash.com/developers
- [ ] Create application
- [ ] Get Access Key (50 requests/hour free)

```
UNSPLASH_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxx
```

**OR Pexels API:**
- [ ] Create account at https://www.pexels.com/api/
- [ ] Get API Key (200 requests/hour free)

```
PEXELS_API_KEY=xxxxxxxxxxxxxxxxxxxxxx
```

---

### Firebase Functions to Create

| Function | Trigger | Purpose |
|----------|---------|---------|
| `fetchTrendingTopics` | Scheduled (every 2 hours) | Fetch from RSS feeds, analyze with GPT-4 |
| `analyzeTopic` | HTTP Callable | On-demand topic analysis |
| `generatePredictionDraft` | HTTP Callable | Create AI-suggested prediction |
| `fetchTwitterTrends` | Scheduled (every 1 hour) | Get Nigeria trending hashtags |
| `searchImages` | HTTP Callable | Fetch relevant images |
| `getActivityFeed` | HTTP Callable | Get recent platform activity |
| `batchCreatePredictions` | HTTP Callable | Create multiple predictions |
| `exportData` | HTTP Callable | Export predictions/users |

---

## 📦 Data Models

### New Firestore Collections

#### `trending_topics` Collection
```typescript
interface TrendingTopic {
  id: string;                    // Auto-generated
  headline: string;              // News headline
  summary?: string;              // AI-generated summary
  source: string;                // e.g., "BBC Sport Africa"
  sourceUrl: string;             // Link to original article
  sourceIcon?: string;           // Source logo URL
  category: string;              // Sports, Politics, Entertainment, etc.
  eventDate?: Timestamp;         // When the event occurs (if applicable)
  relevanceScore: number;        // 0-100, AI-determined
  isPredictionWorthy: boolean;   // AI determination
  predictionSuggestion?: {       // AI-generated suggestion
    question: string;
    options: string[];
    endDate: Timestamp;
  };
  imageUrl?: string;             // Relevant image
  keywords: string[];            // Extracted keywords
  fetchedAt: Timestamp;          // When we fetched this
  dismissed: boolean;            // Admin dismissed
  dismissedAt?: Timestamp;
  dismissedBy?: string;          // Admin user ID
  usedForPrediction: boolean;    // Already created prediction
  predictionId?: string;         // If used, link to prediction
  region: string;                // 'NG', 'AFRICA', 'GLOBAL'
}
```

#### `news_sources` Collection
```typescript
interface NewsSource {
  id: string;
  name: string;                  // e.g., "BBC Sport Africa"
  type: 'rss' | 'twitter' | 'api';
  url: string;                   // RSS feed URL or API endpoint
  category: string;              // Default category for this source
  isActive: boolean;
  icon?: string;                 // Source logo
  fetchFrequency: number;        // Minutes between fetches
  lastFetched?: Timestamp;
  articlesCount: number;         // Total articles fetched
  predictionsMade: number;       // Predictions created from this source
  reliability: number;           // 0-100 quality score
  createdAt: Timestamp;
}
```

#### `admin_activity` Collection
```typescript
interface AdminActivity {
  id: string;
  action: 'prediction_created' | 'prediction_resolved' | 'user_rank_changed' | 
          'topic_dismissed' | 'category_updated' | 'source_added' | 'login' | 
          'settings_changed';
  adminId: string;
  adminEmail: string;
  targetType?: 'prediction' | 'user' | 'topic' | 'category' | 'source';
  targetId?: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
  ipAddress?: string;
}
```

#### `platform_activity` Collection (for Activity Feed)
```typescript
interface PlatformActivity {
  id: string;
  type: 'vote' | 'signup' | 'prediction_active' | 'prediction_resolved' | 
        'rank_change' | 'comment' | 'share';
  userId?: string;
  userName?: string;
  predictionId?: string;
  predictionQuestion?: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
}
```

#### Update `predictions` Collection
```typescript
// Add these fields to existing Prediction type
interface PredictionExtended extends Prediction {
  // AI-Assisted Creation Metadata
  createdFromTopic?: string;       // trending_topics ID
  aiGenerated?: boolean;           // Was this AI-suggested?
  aiConfidence?: number;           // AI confidence score 0-100
  originalHeadline?: string;       // Source headline
  sourceArticleUrl?: string;       // Link to source article
  
  // Enhanced Tracking
  viewCount?: number;              // How many views
  shareCount?: number;             // How many shares
  bookmarkCount?: number;          // How many bookmarks
  engagementScore?: number;        // Calculated engagement
  
  // Scheduling
  publishAt?: Timestamp;           // Scheduled publish time
  scheduledBy?: string;            // Who scheduled it
}
```

---

## 🛠️ Implementation Phases

### Phase 0: Prerequisites (You Do This)
**Duration:** Before development starts

- [ ] **OpenAI API Setup**
  - Create account at https://platform.openai.com/
  - Add payment method
  - Generate API key
  - Send API key securely

- [ ] **Twitter API Setup** (Optional but recommended)
  - Apply at https://developer.twitter.com/
  - Wait for approval (can take days)
  - Generate credentials
  - Send Bearer Token

- [ ] **Unsplash/Pexels Setup** (Optional)
  - Create developer account
  - Get API key
  - Send API key

- [ ] **Confirm RSS Sources**
  - Review the RSS feeds listed above
  - Add any other Nigerian news sources you want

---

### Phase 1: Foundation & UI Redesign
**Duration:** 2-3 days  
**Focus:** New layout, design system, compact styling

**Tasks:**
1. Create new `AdminShell.tsx` layout component
2. Build compact `AdminSidebar.tsx` with collapsible sections
3. Create slim `AdminHeader.tsx` with notifications
4. Implement design tokens (CSS variables)
5. Build shared components (DataTable, StatusBadge, etc.)
6. Restyle existing components with compact styling

**Deliverables:**
- [ ] New admin layout shell
- [ ] Responsive compact sidebar
- [ ] Shared UI components library
- [ ] CSS design system

---

### Phase 2: Dashboard Redesign
**Duration:** 1-2 days  
**Focus:** Information-dense dashboard

**Tasks:**
1. Redesign `DashboardOverview.tsx` with compact stats
2. Create `ActivityFeed.tsx` component
3. Build `QuickActions.tsx` panel
4. Add `AlertsBanner.tsx` for pending items
5. Implement real-time updates

**Deliverables:**
- [ ] Compact stats grid
- [ ] Live activity feed
- [ ] Quick action buttons
- [ ] Pending alerts system

---

### Phase 3: Content Discovery System
**Duration:** 3-4 days  
**Focus:** AI-assisted news aggregation

**Tasks:**
1. Create `fetchTrendingTopics` Cloud Function
2. Implement RSS feed parsing
3. Integrate OpenAI for analysis
4. Build `TrendingTopics.tsx` UI
5. Create `SourcesManager.tsx` configuration
6. Add topic dismissal/save functionality

**Deliverables:**
- [ ] Automated news fetching (every 2 hours)
- [ ] AI-powered topic analysis
- [ ] Trending topics dashboard widget
- [ ] Source management interface

---

### Phase 4: Quick Create Flow
**Duration:** 2-3 days  
**Focus:** AI-assisted prediction creation

**Tasks:**
1. Create `generatePredictionDraft` Cloud Function
2. Build `QuickCreate.tsx` component
3. Implement one-click topic → prediction flow
4. Add AI suggestion editing
5. Auto-fetch relevant images
6. Create draft → publish workflow

**Deliverables:**
- [ ] One-click prediction drafting
- [ ] AI-suggested questions and options
- [ ] Auto-date detection
- [ ] Image suggestions

---

### Phase 5: Predictions Table Redesign
**Duration:** 1-2 days  
**Focus:** Dense, sortable predictions management

**Tasks:**
1. Create `PredictionsTable.tsx` with sorting/filtering
2. Build `PredictionRow.tsx` compact row component
3. Add `BulkActions.tsx` for multi-select
4. Implement `PredictionDetail.tsx` side panel
5. Add pagination

**Deliverables:**
- [ ] Dense table view
- [ ] Inline quick actions
- [ ] Bulk operations
- [ ] Detail panel on click

---

### Phase 6: Resolution Center
**Duration:** 1 day  
**Focus:** Streamlined resolution workflow

**Tasks:**
1. Redesign `ResolutionQueue.tsx`
2. Improve resolution modal UX
3. Add resolution history view
4. Quick resolve buttons

**Deliverables:**
- [ ] Streamlined resolution UX
- [ ] One-click common resolutions
- [ ] Resolution history

---

### Phase 7: User Management
**Duration:** 1 day  
**Focus:** User directory and management

**Tasks:**
1. Create `UserDirectory.tsx` browse view
2. Redesign `UserSearch.tsx`
3. Build `UserDetail.tsx` side panel
4. Compact `RankManager.tsx`

**Deliverables:**
- [ ] Browsable user directory
- [ ] Compact user search
- [ ] User detail panel

---

### Phase 8: Settings & Polish
**Duration:** 1-2 days  
**Focus:** Configuration and final touches

**Tasks:**
1. Build `APIConfiguration.tsx` for API key management
2. Create `AdminLogs.tsx` audit view
3. Add `SystemHealth.tsx` status page
4. Final styling polish
5. Mobile responsiveness
6. Error handling

**Deliverables:**
- [ ] API key management UI
- [ ] Admin audit logs
- [ ] System health dashboard
- [ ] Polished final product

---

## 📋 Manual Action Items for Owner

### Before Development Starts

| Priority | Task | Time Needed | Notes |
|----------|------|-------------|-------|
| 🔴 HIGH | OpenAI API Setup | 15 min | Required for AI features |
| 🟡 MEDIUM | Twitter API Application | 30 min + wait | May take days for approval |
| 🟢 LOW | Unsplash/Pexels API | 10 min | Optional, enhances images |

### Information Needed From You

1. **OpenAI API Key:** `sk-xxxxxxxxxxxxxxxxxxxxxxxxx`
2. **Twitter Bearer Token:** (if obtained) `AAAAxxxxxxxxxxxxxxxxx`
3. **Image API Key:** (Unsplash or Pexels)

### How to Send API Keys Securely
- Option 1: Add to Firebase environment config (we'll set up together)
- Option 2: Add to `.env.local` file (never commit to git)
- Option 3: Add to Firebase Secret Manager

---

## ✅ Technical Checklist

### Existing Features to Preserve
- [x] Admin authentication check (`isAdmin` from AuthContext)
- [x] Create prediction functionality
- [x] Resolve prediction functionality
- [x] User search
- [x] Rank management
- [x] Category management
- [x] Trending management
- [x] Image upload to Firebase Storage
- [x] All existing Cloud Functions

### New Dependencies to Install
```bash
npm install rss-parser          # Parse RSS feeds
npm install openai              # OpenAI SDK
npm install date-fns            # Date utilities
npm install @tanstack/react-table  # Powerful table component
npm install recharts            # Charts (optional)
```

### Environment Variables Needed
```env
# .env.local (client-side safe)
NEXT_PUBLIC_APP_NAME=TruthVote

# Server-side only (add via Firebase Functions config)
OPENAI_API_KEY=sk-xxxxxxxxx
TWITTER_BEARER_TOKEN=xxxxxxx
UNSPLASH_ACCESS_KEY=xxxxxxx
```

### Firebase Functions Config
```bash
firebase functions:config:set openai.key="sk-xxxxxxxx"
firebase functions:config:set twitter.bearer="xxxxxxxx"
firebase functions:config:set unsplash.key="xxxxxxxx"
```

### Firestore Indexes Needed
```
# firestore.indexes.json additions
{
  "collectionGroup": "trending_topics",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "dismissed", "order": "ASCENDING" },
    { "fieldPath": "relevanceScore", "order": "DESCENDING" },
    { "fieldPath": "fetchedAt", "order": "DESCENDING" }
  ]
}
```

### Security Rules Updates
```javascript
// firestore.rules additions
match /trending_topics/{topicId} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}

match /news_sources/{sourceId} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}

match /admin_activity/{activityId} {
  allow read: if isAdmin();
  allow write: if false; // Only server can write
}

match /platform_activity/{activityId} {
  allow read: if isAdmin();
  allow write: if false; // Only server can write
}
```

---

## 📊 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Prerequisites | You do this | None |
| Phase 1: Foundation | 2-3 days | None |
| Phase 2: Dashboard | 1-2 days | Phase 1 |
| Phase 3: Content Discovery | 3-4 days | Phase 1, OpenAI API |
| Phase 4: Quick Create | 2-3 days | Phase 3 |
| Phase 5: Predictions Table | 1-2 days | Phase 1 |
| Phase 6: Resolution Center | 1 day | Phase 1 |
| Phase 7: User Management | 1 day | Phase 1 |
| Phase 8: Settings & Polish | 1-2 days | All phases |

**Total Estimated Time: 13-19 days** (with APIs ready)

---

## 💰 Estimated Costs

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| OpenAI GPT-4 API | $20-50 | Based on usage, ~500 analyses/month |
| Twitter API Basic | $100 | Optional, for trending topics |
| Unsplash/Pexels | $0 | Free tier sufficient |
| Firebase | Existing | No change |
| **Total** | **$20-150/month** | Depending on Twitter usage |

### Without Twitter API: $20-50/month
This still gives you:
- RSS feed aggregation
- AI-powered topic analysis
- AI prediction drafting
- All other features

---

## 🚀 Next Steps

1. **Review this document** - Confirm the architecture meets your needs
2. **Complete API signups** - OpenAI (required), Twitter (recommended)
3. **Send API keys securely** - We'll configure them properly
4. **Confirm start** - Begin Phase 1 implementation

Once you've completed the manual tasks and confirmed, I'll create a detailed TODO list and we'll implement one phase at a time, validating each before moving to the next.

---

## ❓ Questions for You

1. **Budget Confirmation:** Are you okay with the estimated $20-150/month for APIs?
2. **Twitter API:** Do you want to proceed with Twitter integration, or start without it?
3. **Priority Features:** Any specific features you want prioritized?
4. **Design Preferences:** Any specific design elements from Firebase Console you particularly like?
5. **Additional Sources:** Are there other Nigerian news sources you'd like to include?

---

*Document will be updated as we progress through implementation phases.*
