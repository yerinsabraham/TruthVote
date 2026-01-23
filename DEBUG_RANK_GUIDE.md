# Rank System Debugger Guide

## Access the Debug Page

**URL:** https://truthvote.io/debug-rank

You must be logged in to access this page.

---

## Features

### 📊 Real-Time Stats Display
- Current rank and percentage
- Total predictions, resolved predictions, accuracy
- Active weeks and account age
- All metrics update in real-time

### 🎮 Debug Actions

#### Basic Actions
- **📊 Simulate Vote** - Adds 1 prediction to your total
- **✅ Correct Prediction** - Adds 1 resolved prediction (correct), updates accuracy
- **❌ Wrong Prediction** - Adds 1 resolved prediction (incorrect), updates accuracy
- **📅 +1 Active Week** - Increases weekly activity count by 1

#### Time Manipulation
- **⏰ +7 Days** - Moves your account creation date 7 days into the past
- **⏰ +30 Days** - Moves your account creation date 30 days into the past
- **⏰ +60 Days** - Moves your account creation date 60 days into the past

> **Note:** Time manipulation is essential because ranks have minimum time gates (e.g., Amateur requires 7 days, Analyst requires 60 days)

#### Rank Calculation
- **🔄 Recalculate Rank** - Recalculates your rank percentage (respects rate limiting)
- **🔄 Force Recalculate** - Recalculates your rank percentage (bypasses rate limiting)

#### Auto-Growth Mode 🚀
- **START AUTO-GROWTH (1/sec)** - Automatically performs actions every second:
  - Second 1: Adds a vote
  - Second 2-3: Adds correct predictions
  - Second 4: Adds active week
  - Second 5: Recalculates rank
  - Repeats cycle...
  
  **This mode will automatically stop when you become eligible for an upgrade!**

- **⏸️ STOP AUTO-GROWTH** - Stops the auto-growth cycle

#### Utility
- **🔄 Reset to Novice** - Resets your rank to Novice with 0% (requires confirmation)
- **🔄 Reload Stats** - Refreshes your current stats from Firebase
- **🗑️ Clear Logs** - Clears the debug log display

---

## 📝 Debug Logs

The debug console shows:
- **Timestamp** - When the action occurred
- **Type** - INFO (blue), SUCCESS (green), ERROR (red), WARNING (yellow)
- **Message** - What happened
- **Data** - JSON details (when available)

All logs are also sent to your **browser console** with color coding for easy debugging.

---

## 🔍 Debugging the Rank Issue

### Step 1: Check Current State
1. Go to https://truthvote.io/debug-rank
2. Look at your current stats
3. Note your rank percentage

### Step 2: Run Auto-Growth
1. Click "🚀 START AUTO-GROWTH (1/sec)"
2. Watch the logs and stats in real-time
3. Monitor the rank percentage
4. Check browser console (F12) for detailed logs

### Step 3: Identify Blockers
When rank is recalculated, the logs will show:
- **Breakdown** - How much each factor contributes (time, accuracy, consistency, volume)
- **Blockers** - What's preventing you from upgrading (if any)
- **Eligible for upgrade** - Whether you can upgrade

### Step 4: Test Time Gates
If you see "Need X more days on platform" in blockers:
1. Stop auto-growth
2. Click "⏰ +7 Days" or "⏰ +30 Days" or "⏰ +60 Days"
3. Click "🔄 Force Recalculate"
4. Check if the blocker is resolved

---

## 🎯 What to Look For

### Common Issues

1. **Stuck at 5% Novice**
   - Check logs for calculation breakdown
   - See which score (time/accuracy/consistency/volume) is lowest
   - Time score might be 0 if time gate logic is broken

2. **Percentage Not Increasing**
   - Check if stats are actually updating in Firebase
   - Look for errors in logs
   - Check browser console for Firebase errors

3. **Time Gate Issues**
   - Even at 100%, you need minimum days on platform
   - Novice→Amateur requires 7 days
   - Use time manipulation buttons to test

4. **Rate Limiting**
   - Normal recalculation is rate-limited (1 per hour)
   - Use "Force Recalculate" to bypass
   - Auto-growth uses force mode

---

## 📊 Understanding Rank Progression

### Novice Requirements
- **Minimum Time:** 0 days
- **Min Predictions:** 3
- **Min Accuracy:** 50%
- **Min Resolved:** 5
- **Min Active Weeks:** 1

### Weight Distribution (Novice)
- Time: 50%
- Accuracy: 30%
- Consistency: 15%
- Volume: 5%

### To Reach Amateur
- Get to 100% Novice
- Account must be at least 7 days old
- Meet Amateur minimum requirements

---

## 🐛 Reporting Issues

When you find an issue, provide:
1. Screenshot of debug logs
2. Screenshot of current stats
3. Browser console logs (F12 → Console tab)
4. Description of what you expected vs what happened

Look for these in console:
- `[RANK CALC]` - Calculation logs
- `[RANK UPDATE]` - Database update logs
- `[RANK SERVICE]` - Service layer logs
- `[DEBUG RANK]` - Debug page specific logs

---

## ⚠️ Important Notes

- All changes are **LIVE** and affect your real database
- Use "Reset to Novice" if you want to start fresh
- Auto-growth will consume Firebase reads/writes
- Console logs provide the most detailed debugging info
- The page auto-reloads stats after each action

---

## 🚀 Quick Test Workflow

1. Visit https://truthvote.io/debug-rank
2. Click "🚀 START AUTO-GROWTH"
3. Open browser console (F12)
4. Watch for 30-60 seconds
5. Check what percentage you reach
6. Look for any errors or blockers in logs
7. Report findings

This should quickly reveal what's preventing rank progression!
