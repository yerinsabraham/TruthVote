# Social Media Preview Implementation

## Overview
TruthVote now includes dynamic Open Graph meta tags for rich social media previews when sharing predictions on Twitter, Facebook, WhatsApp, and other platforms.

## How It Works

### 1. **Share URL Format**
When users share a prediction, the URL includes both the ID and a SEO-friendly slug:
```
https://truthvote-1de81.web.app/prediction?id=abc123&q=will-bitcoin-reach-100k-in-2025
```

### 2. **Dynamic Meta Tags**
The prediction page ([src/app/prediction/page.tsx](src/app/prediction/page.tsx)) dynamically updates Open Graph and Twitter Card meta tags when a prediction loads:

**Meta Tags Updated:**
- `og:title` - The prediction question
- `og:description` - First 2-3 options (e.g., "Yes vs No" or "Option A, Option B, Option C... and more")
- `og:image` - The prediction image (or TruthVote logo if none)
- `og:url` - Current page URL
- `twitter:card` - Summary with large image
- `twitter:title`, `twitter:description`, `twitter:image` - Twitter-specific tags

### 3. **Preview Card Content**
When a prediction link is shared, social platforms display:
- **Title**: The prediction question
- **Description**: The voting options
- **Image**: The prediction's image
- **Branding**: "TruthVote" site name

Example preview:
```
┌─────────────────────────────────────┐
│ [Prediction Image]                  │
│                                     │
│ Will Bitcoin reach $100k in 2025?  │
│ Yes vs No - Make your prediction    │
│ on TruthVote                        │
│                                     │
│ 🔗 truthvote-1de81.web.app          │
└─────────────────────────────────────┘
```

## Share Tracking

### ShareButton Component
Location: [src/components/ShareButton.tsx](src/components/ShareButton.tsx)

**Features:**
- Generates SEO-friendly slugs from questions
- Tracks shares via Cloud Function
- Supports Twitter, WhatsApp, copy link, and native share
- Awards users 2% rank bonus per share (max 20%)

**Share Methods:**
```typescript
- Twitter: Opens tweet composer with prediction URL
- WhatsApp: Opens WhatsApp with pre-filled message
- Copy: Copies URL to clipboard
- Native Share: Uses device's native share dialog
```

### Cloud Function Integration
Function: `trackShare` in [functions/index.js](functions/index.js)

**What it does:**
- Records share event in Firestore
- Increments user's `totalShares` count
- Updates ranking calculations with share bonus

**Share Bonus Formula:**
```javascript
shareBonus = Math.min(20, totalShares * 2)
volumeScore = baseVolume + shareBonus
```

## Implementation Details

### Static Export Limitation
Since TruthVote uses Next.js static export (`output: 'export'`), server-side rendering is not available. Meta tags are injected client-side when the prediction loads.

**Why client-side?**
- Static export doesn't support API routes or SSR
- Firebase Hosting serves pre-built static files
- Meta tags are updated via JavaScript after page load

**Social Media Crawlers:**
Most modern social platforms (Twitter, Facebook, LinkedIn, WhatsApp) execute JavaScript and will pick up the dynamically injected meta tags. However, for best results with all crawlers, server-side rendering would be ideal.

### Future Enhancements

**Option 1: Dynamic OG Images**
Generate custom preview images showing:
- Question title
- Visual voting options
- TruthVote branding
- Category badge

Could use:
- Cloudinary or similar service for dynamic image generation
- Firebase Cloud Function to generate images server-side
- Pre-generated images at build time

**Option 2: Server-Side Rendering**
Remove `output: 'export'` and deploy to Vercel/Cloud Run:
- True SSR with `generateMetadata`
- Dynamic OG image generation with `@vercel/og`
- Better SEO and social sharing

**Option 3: Pre-rendering**
Use Firebase Hosting dynamic links or cloud functions to serve dynamic meta tags:
- Intercept requests to `/prediction` routes
- Generate HTML with proper meta tags
- Serve to social media crawlers

## Testing Social Previews

### Twitter
Share a prediction URL on Twitter and check the preview card before posting.

### Facebook
Use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/):
1. Enter prediction URL
2. Click "Scrape Again" to refresh
3. View preview card

### WhatsApp
Paste a prediction URL in WhatsApp chat - preview should appear automatically.

### LinkedIn
Use the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/):
1. Enter prediction URL
2. View preview

## Files Modified

### New Files
- [src/app/prediction/layout.tsx](src/app/prediction/layout.tsx) - Prediction route layout

### Modified Files
- [src/app/prediction/page.tsx](src/app/prediction/page.tsx) - Added dynamic meta tag injection
- [src/components/ShareButton.tsx](src/components/ShareButton.tsx) - Updated with slug generation and tracking

## Deployment Status
✅ **Deployed to:** https://truthvote-1de81.web.app
✅ **Cloud Functions:** Share tracking active
✅ **Meta Tags:** Dynamically injected on prediction pages

## How to Share
1. Open any prediction page
2. Click the share icon
3. Choose platform (Twitter, WhatsApp, etc.)
4. Preview card shows question, options, and image
5. Clicking the preview takes users to the prediction page
