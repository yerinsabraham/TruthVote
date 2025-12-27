# TruthVote - Firebase Deployment Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd truthvote
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your Firebase credentials
# Get these from: https://console.firebase.google.com/ > Project Settings
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔥 Firebase Setup

### Initial Firebase Setup
```bash
# Login to Firebase (one-time setup)
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select:
# - Firestore
# - Hosting
# - Storage
```

### Deploy to Firebase
```bash
# Deploy everything (hosting + rules)
npm run deploy:all

# Or deploy only hosting (faster)
npm run deploy
```

Your site will be live at: `https://your-project.firebaseapp.com`

---

## 📁 Project Structure

```
truthvote/
├── src/
│   ├── app/              # Next.js pages (App Router)
│   ├── components/       # React components
│   │   └── OptimizedImage.tsx  # Custom image optimization
│   ├── lib/
│   │   └── firebase/     # Firebase SDK & helpers
│   │       ├── config.ts
│   │       ├── auth.ts
│   │       ├── firestore.ts
│   │       └── storage.ts    # Image upload with compression
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── public/              # Static assets
├── out/                 # Build output (generated)
├── firebase.json        # Firebase hosting config
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
└── .env.local           # Environment variables (DO NOT COMMIT)
```

---

## 🖼️ Image Optimization

### How It Works
1. **Upload Compression** - Images are automatically compressed before upload (max 1920px width, 80% quality)
2. **File Size Limit** - Max 5MB per image
3. **CDN Caching** - Firebase Storage serves images via global CDN with 1-year cache
4. **Lazy Loading** - Images load only when visible

### Usage in Components
```tsx
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage 
  src={pollImageUrl}
  alt="Poll image"
  width={800}
  height={600}
  className="rounded-lg"
/>
```

### Upload Images
```tsx
import { uploadPollImage } from '@/lib/firebase/storage';

const url = await uploadPollImage(pollId, file);
// Returns: https://firebasestorage.googleapis.com/...
```

---

## 🌐 Environment Variables

Required variables in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Get these from: **Firebase Console > Project Settings > General > Your apps**

---

## 📊 Monitoring Progress

### Check Deployment Status
```bash
firebase hosting:channel:list
```

### View Logs
```bash
firebase functions:log
```

### Analytics Dashboard
Visit: https://console.firebase.google.com/project/YOUR_PROJECT/overview

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint

# Firebase
npm run deploy           # Deploy hosting only
npm run deploy:all       # Deploy hosting + rules
firebase serve           # Test locally before deploy

# Database
firebase firestore:delete --all-collections  # DANGER: Delete all data
```

---

## 🚨 Before First Deploy

- [ ] Set up `.env.local` with Firebase credentials
- [ ] Test locally with `npm run dev`
- [ ] Review `firestore.rules` security rules
- [ ] Review `storage.rules` security rules
- [ ] Build successfully with `npm run build`
- [ ] Deploy with `npm run deploy`

---

## 📈 Next Steps

1. **Custom Domain** - Add your domain in Firebase Hosting settings
2. **Performance** - Enable Firebase Performance Monitoring
3. **Analytics** - Set up Google Analytics 4
4. **Monitoring** - Enable Cloud Logging for errors
5. **Backups** - Schedule Firestore exports

---

## 🐛 Troubleshooting

### Build fails
```bash
# Clear cache and rebuild
rm -rf .next out node_modules
npm install
npm run build
```

### Firebase deploy fails
```bash
# Re-login to Firebase
firebase logout
firebase login
```

### Images not loading
- Check Storage rules allow public read
- Verify image URLs in Firestore are correct
- Check browser console for CORS errors

---

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage](https://firebase.google.com/docs/storage)
