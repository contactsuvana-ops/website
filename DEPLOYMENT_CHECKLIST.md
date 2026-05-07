# Firebase Deployment Checklist

## ✅ Pre-Deployment Tasks

### Setup Firebase Project
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Firestore
- [ ] Enable Hosting
- [ ] Enable App Hosting (Cloud Run)
- [ ] Update `suvana-construction` in `.firebaserc` with your project ID

### Prepare Credentials
- [ ] Download Service Account JSON from Firebase Console
- [ ] Extract `project_id`, `client_email`, `private_key`
- [ ] Set environment variables or create `.env.production`

### Environment Variables
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Update `FIREBASE_PROJECT_ID`
- [ ] Update `FIREBASE_CLIENT_EMAIL`
- [ ] Update `FIREBASE_PRIVATE_KEY`
- [ ] Update `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- [ ] Update `VITE_API_URL` (Cloud Run URL)
- [ ] Update `VITE_BASE_URL` (Firebase Hosting URL)

### Code Changes
- [ ] Verify all TypeScript types check: `pnpm run typecheck`
- [ ] No console errors or warnings
- [ ] All environment variables documented

## 📦 Build & Test

### Local Testing
- [ ] Start Firestore emulator: `firebase emulators:start`
- [ ] Build frontend: `cd artifacts/suvana-web && PORT=3000 BASE_PATH=/ pnpm run build`
- [ ] Build backend: `cd artifacts/api-server && pnpm run build`
- [ ] Test frontend at http://localhost:3000
- [ ] Test API endpoints at http://localhost:3000/api/health
- [ ] Test admin login at http://localhost:3000/admin

### Production Build
- [ ] Run full build: `pnpm run build`
- [ ] Check no build errors
- [ ] Verify `artifacts/suvana-web/dist` exists and has files
- [ ] Verify `artifacts/api-server/dist` exists and has files

## 🚀 Deployment

### Firebase Setup
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Test configuration: `firebase projects:list`

### Deploy
- [ ] Deploy everything: `pnpm run deploy`
  - Or deploy specific:
    - Frontend only: `pnpm run deploy:hosting`
    - Backend only: `pnpm run deploy:backend`
    - Firestore only: `pnpm run deploy:firestore`

### Verify Deployment
- [ ] Frontend loads at https://suvana-construction.firebaseapp.com
- [ ] Admin panel accessible at https://suvana-construction.firebaseapp.com/admin
- [ ] Admin login works with credentials
- [ ] Submissions dashboard shows no errors
- [ ] API endpoints respond correctly
- [ ] Firestore rules deployed correctly

## 🔒 Security

### Firestore Rules
- [ ] Review `firestore.rules` for security
- [ ] Test rule restrictions locally
- [ ] Verify rules prevent unauthorized access
- [ ] Update rules if needed: `pnpm run deploy:firestore`

### Admin Credentials
- [ ] Use strong password (16+ characters, mixed case, numbers, symbols)
- [ ] Don't commit `.env.production` to git
- [ ] Rotate credentials regularly (monthly/quarterly)
- [ ] Enable audit logging for admin access

### HTTPS
- [ ] Firebase Hosting automatically provides HTTPS
- [ ] Verify SSL certificate works
- [ ] Test from different regions

## 📊 Post-Deployment Monitoring

### Day 1 (Immediately)
- [ ] Check error logs in Firebase Console
- [ ] Test all main features work
- [ ] Verify analytics are tracking
- [ ] Check Firestore usage is reasonable

### Week 1
- [ ] Monitor for any errors/crashes
- [ ] Check performance metrics
- [ ] Verify backups are working
- [ ] Test admin panel regularly

### Monthly
- [ ] Review Firestore usage and costs
- [ ] Check for any security alerts
- [ ] Update dependencies if needed
- [ ] Review analytics and user behavior

## 🔄 Rollback Plan

If deployment fails or has critical issues:

1. **Revert Hosting:**
   ```bash
   firebase hosting:channels:deploy VERSION_ID
   # or disable and redeploy old version
   ```

2. **Revert Backend:**
   ```bash
   # Redeploy previous working version
   firebase deploy --only apphosting
   ```

3. **Check Logs:**
   ```bash
   firebase hosting:log
   gcloud app logs read
   ```

## 📝 Documentation

- [ ] Update README.md with production URLs
- [ ] Document any custom configurations
- [ ] Create runbook for common issues
- [ ] Document escalation procedures

## 🎯 Success Criteria

After deployment, verify:
- ✅ Site loads in <3 seconds
- ✅ Admin panel responsive
- ✅ All form submissions work
- ✅ Contact emails are sent
- ✅ No JavaScript errors
- ✅ Mobile responsive
- ✅ Firestore is storing data correctly
- ✅ Error monitoring is working

---

**Deployment Owner:** _____________________
**Deployment Date:** _____________________
**Notes:** _____________________________

