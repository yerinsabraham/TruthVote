# Admin Dashboard - Quick Reference Card

## 🔑 Admin Credentials
**Email:** yerinssaibs@gmail.com  
**Access URL:** `/admin`

---

## ⚡ Quick Commands

```bash
# One-time setup (run first!)
npm run setup-admin

# Deploy all
firebase deploy

# Deploy specific
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting

# Local dev
npm run dev

# View logs
firebase functions:log
```

---

## 🎯 Dashboard Sections

| Section | Purpose | Key Actions |
|---------|---------|-------------|
| **Dashboard** | System overview | View stats, alerts |
| **Predictions** | Manage predictions | Create, view, filter, delete |
| **Resolve** | End predictions | Select winner, add explanation |
| **Users** | User info | Search, view profiles, history |
| **Rank** | Change ranks | Promote/demote with reason |

---

## 📋 Common Tasks

### Create Prediction
1. **Predictions** → **Create Prediction**
2. Fill: Question, Category, End Time
3. Add/edit options (2-6)
4. **Create Prediction**

### Resolve Prediction
1. **Resolve** tab
2. Find ended prediction
3. **Resolve** → Select winner
4. (Optional) Add explanation & source
5. **Confirm Resolution**

### Change User Rank
1. **Rank** tab
2. Search user (email/username/ID)
3. **Change Rank** → Select new rank
4. Enter reason (required)
5. **Confirm Change**

---

## 🔒 Security Checks

✅ Custom claims set (`npm run setup-admin`)  
✅ Security rules deployed  
✅ Functions deployed  
✅ Non-admin users blocked  
✅ All actions logged in `admin_logs`  

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access `/admin` | 1. Run `npm run setup-admin`<br>2. Sign out & back in |
| Functions error | Check logs: `firebase functions:log` |
| Stats not loading | Verify `getAdminStats` function deployed |
| Search not working | Check Firestore indexes |

---

## 📊 Status Colors

🟢 **Green** - Active  
🔵 **Blue** - Scheduled  
🟡 **Yellow** - Closed  
⚫ **Gray** - Resolved  
🟣 **Purple** - Draft  

---

## 🔍 Search Options

**Users & Rank Management:**
- Email: `user@example.com`
- Username: `JohnDoe`
- User ID: `uid123abc...`

---

## 📝 Required Fields

### Create Prediction
- ✅ Question
- ✅ Category
- ✅ End Time
- ✅ Options (min 2)

### Resolve Prediction
- ✅ Winning Option

### Change Rank
- ✅ New Rank
- ✅ Reason

---

## 🎨 Prediction Statuses

1. **Draft** - Not visible to users
2. **Scheduled** - Visible, voting not started
3. **Active** - Voting open
4. **Closed** - Voting ended, needs resolution
5. **Resolved** - Complete, rewards distributed

---

## 📈 Dashboard Metrics

- **Total Users** - All registered users
- **Active Users** - Last 7 days
- **Active Predictions** - Currently open for voting
- **Resolved Predictions** - Completed
- **Rank Distribution** - Users per rank

---

## 🔐 Admin Functions

| Function | Purpose | Auth Required |
|----------|---------|---------------|
| `createPrediction` | Create new prediction | ✅ Admin |
| `resolvePrediction` | Resolve & distribute rewards | ✅ Admin |
| `promoteUser` | Change user rank | ✅ Admin |
| `getAdminStats` | Dashboard statistics | ✅ Admin |

---

## 📚 Documentation Links

- **Setup Guide:** `docs/ADMIN_SETUP_GUIDE.md`
- **Quick Start:** `ADMIN_QUICKSTART.md`
- **Full Spec:** `admin_dashboard.md`
- **Implementation:** `ADMIN_IMPLEMENTATION_COMPLETE.md`

---

## ⚠️ Important Notes

1. **Always provide reasons** for manual rank changes
2. **Double-check** before resolving predictions
3. **Review audit logs** regularly
4. **Sign out/in** after running setup-admin
5. **Test in dev** before using in production

---

## 🎯 Success Indicators

✅ Admin can sign in  
✅ All dashboard sections load  
✅ Can create predictions  
✅ Can resolve predictions  
✅ Can search users  
✅ Can change ranks  
✅ Actions appear in audit logs  

---

## 🆘 Emergency Contacts

- **Cloud Function Logs:** `firebase functions:log`
- **Firestore Console:** Firebase Console → Firestore
- **Auth Console:** Firebase Console → Authentication

---

**Last Updated:** December 28, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
