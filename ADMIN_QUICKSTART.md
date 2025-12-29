# Admin Dashboard Quick Start Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [x] `.env.local` created with `NEXT_PUBLIC_ADMIN_EMAIL=yerinssaibs@gmail.com`
- [ ] Verify `.env.local` is in `.gitignore` (already configured)

### 2. Admin User Setup
**Run this command once:**
```bash
npm run setup-admin
```

Expected output:
```
Setting up admin user: yerinssaibs@gmail.com
Found user: [user-uid]
✓ Custom admin claim set successfully
✓ Firestore user document updated
✓ Audit log created

✅ Admin setup complete!
Note: User must sign out and sign back in for changes to take effect.
```

### 3. Deploy Firebase Resources

**Deploy Firestore Rules:**
```bash
firebase deploy --only firestore:rules
```

**Deploy Cloud Functions:**
```bash
firebase deploy --only functions
```

Expected functions to deploy:
- `createPrediction`
- `resolvePrediction`
- `promoteUser`
- `getAdminStats`
- (plus existing functions like `submitVote`, etc.)

### 4. Test Admin Access

1. **Sign out** from any current session
2. **Sign in** with yerinssaibs@gmail.com
3. Navigate to `/admin`
4. Verify you can access all sections:
   - [ ] Dashboard (shows stats)
   - [ ] Predictions (can view/create)
   - [ ] Resolve (shows ended predictions)
   - [ ] Users (search works)
   - [ ] Rank Management (search works)

---

## 🚀 Quick Command Reference

```bash
# Setup admin (run once)
npm run setup-admin

# Deploy everything
firebase deploy

# Deploy specific resources
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules

# Local development
npm run dev

# View function logs
firebase functions:log
```

---

## 📝 First Steps After Setup

### 1. Create Your First Prediction
- Go to **Predictions** tab
- Click **Create Prediction**
- Example:
  - Question: "Will Bitcoin reach $100,000 by end of 2024?"
  - Category: Technology
  - End Time: 2024-12-31
  - Options: Yes / No

### 2. Test Resolution Flow
- Wait for prediction to end (or set end time in past for testing)
- Go to **Resolve** tab
- Select winning option
- Add explanation
- Confirm resolution

### 3. Test Rank Management
- Go to **Rank Management**
- Search for a test user
- Try promoting them
- Check audit logs in Firestore

---

## 🔒 Security Verification

After setup, verify these security measures:

### Frontend Protection
- [ ] Non-admin users get redirected from `/admin`
- [ ] Admin navigation only shows for admin user
- [ ] AuthContext correctly identifies admin status

### Backend Protection
- [ ] Cloud Functions reject non-admin requests
- [ ] Firestore rules prevent non-admin writes to predictions
- [ ] Admin logs collection is protected

### Testing Commands
Try these as a non-admin user (should fail):
```javascript
// In browser console (will fail for non-admin)
const createPrediction = httpsCallable(functions, 'createPrediction');
await createPrediction({ question: "Test" });
// Expected: Error: permission-denied
```

---

## 🐛 Troubleshooting Checklist

### Admin Access Issues
- [ ] Ran `npm run setup-admin` successfully
- [ ] Signed out and back in after setup
- [ ] Browser cache cleared
- [ ] Correct email used (yerinssaibs@gmail.com)
- [ ] Check browser console for errors

### Function Deployment Issues
- [ ] Firebase CLI installed and logged in
- [ ] Functions deployed successfully
- [ ] Check function logs for errors
- [ ] Verify `firebase.json` configuration

### Security Rules Issues
- [ ] Latest rules deployed
- [ ] No syntax errors in rules
- [ ] Test rules in Firebase Console

---

## 📊 Monitoring

### What to Monitor
1. **Audit Logs** (`admin_logs` collection)
   - All admin actions logged
   - Review regularly for unusual activity

2. **Cloud Function Logs**
   - Check for errors
   - Monitor performance

3. **User Feedback**
   - Predictions resolving correctly?
   - Rank calculations working?

### Useful Queries

**Check recent admin actions:**
```javascript
db.collection('admin_logs')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
```

**Check predictions needing resolution:**
```javascript
db.collection('predictions')
  .where('status', '==', 'closed')
  .get()
```

---

## 🎯 Success Criteria

Your admin dashboard is fully operational when:

✅ Admin user can sign in and access `/admin`  
✅ Dashboard shows correct statistics  
✅ Can create new predictions successfully  
✅ Can resolve ended predictions  
✅ Can search and manage users  
✅ Can manually promote/demote users  
✅ All actions are logged in audit trail  
✅ Non-admin users are blocked from admin functions  

---

## 📞 Next Steps

After successful setup:

1. **Familiarize yourself** with all admin sections
2. **Create test predictions** to understand the flow
3. **Review audit logs** regularly
4. **Set up monitoring** alerts if needed
5. **Document any custom workflows** specific to your use case

---

## 🔗 Related Documentation

- [Full Admin Dashboard Specification](../admin_dashboard.md)
- [Admin Setup Guide](ADMIN_SETUP_GUIDE.md)
- [Rank System Documentation](../TRUTHRANK_COMPLETE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)

---

**Admin Email:** yerinssaibs@gmail.com  
**Setup Date:** December 28, 2025  
**Version:** 1.0
