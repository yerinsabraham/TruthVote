# TruthVote - Prediction Platform

A modern prediction and voting platform built with Next.js 15, Firebase, and TypeScript. Users make predictions on binary outcomes, earn points for accuracy, and compete on leaderboards.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Deployment:** Vercel or Firebase Hosting

## 📦 Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your Firebase credentials
```

## 🔧 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Create Storage bucket
5. Copy your Firebase config to `.env.local`

## 🏃 Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

## 🚢 Deployment

### Option A: Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Option B: Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

## 📚 Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── context/          # React Context providers
├── hooks/            # Custom React hooks
├── lib/              # Utilities and Firebase config
└── types/            # TypeScript type definitions
```

## 🔐 Environment Variables

See `.env.local.example` for required variables.

## 📖 Documentation

- [PROJECT_AUDIT.md](../PROJECT_AUDIT.md) - Analysis of original MVP
- [TRUTHVOTE_SPEC.md](../TRUTHVOTE_SPEC.md) - Technical specification

## 📄 License

MIT
