# Firebase Deployment Guide

## Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** created:
   - Go to https://console.firebase.google.com
   - Create a new project or use existing: `suvana-construction`
   - Enable Firestore, Hosting, and App Hosting

3. **Authentication** set up:
   ```bash
   firebase login
   ```

## Pre-Deployment Checklist

### 1. Update Firebase Project ID

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 2. Set Environment Variables

Create `.env.production` in the root directory:

```bash
# Frontend (.env.production)
VITE_API_URL=https://suvana-api-YOUR_REGION.a.run.app
VITE_BASE_URL=https://suvana-construction.firebaseapp.com

# Backend (artifacts/api-server/.env.production)
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_admin_password
```

### 3. Get Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file
4. Use the values in your environment variables

## Build Process

### Step 1: Build Frontend

```bash
cd artifacts/suvana-web
PORT=3000 BASE_PATH=/ pnpm run build
```

This creates `dist/` folder with production build.

### Step 2: Build Backend

```bash
cd artifacts/api-server
pnpm run build
```

This creates `dist/` folder with bundled backend.

### Step 3: Build Everything (Optional)

From root directory:
```bash
pnpm run build
```

## Deployment

### Option A: Deploy to Firebase Hosting + Cloud Run (Recommended)

```bash
# From root directory

# 1. Build both
pnpm run build

# 2. Deploy everything
firebase deploy
```

This will:
- Deploy frontend to Firebase Hosting
- Deploy backend to Cloud Run (via App Hosting)
- Update Firestore rules
- Set up indexes

### Option B: Deploy Frontend Only

```bash
cd artifacts/suvana-web

# Build
pnpm run build

# Deploy hosting only
firebase deploy --only hosting:suvana-web
```

### Option C: Deploy Backend Only

```bash
cd artifacts/api-server

# Build
pnpm run build

# Deploy backend only (via App Hosting)
firebase deploy --only apphosting
```

## Post-Deployment

### 1. Verify Deployment

- Frontend: https://suvana-construction.firebaseapp.com
- Backend API: Check the Cloud Run URL in Firebase Console
- Firestore: Check collections in Firebase Console

### 2. Update Frontend API URL

If backend URL is different, update in frontend environment:

```bash
cd artifacts/suvana-web
# Update .env with correct VITE_API_URL
# Rebuild and deploy
```

### 3. Test Admin Panel

1. Visit https://suvana-construction.firebaseapp.com/admin
2. Login with credentials set in `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. Verify submissions dashboard works

### 4. Monitor Logs

```bash
# View frontend logs
firebase hosting:log

# View backend logs
gcloud app logs read --service=default

# Or via Firebase Console → App Hosting
```

## Troubleshooting

### "Firestore rules error"
- Check `firestore.rules` syntax
- Run: `firebase deploy --only firestore:rules` to validate

### "Backend deployment fails"
- Check `artifacts/api-server/build.mjs`
- Verify all dependencies in `package.json`
- Check logs: `firebase deploy --debug`

### "Frontend shows 404"
- Clear browser cache
- Check `firebase.json` hosting rewrites are correct
- Verify build output in `artifacts/suvana-web/dist`

### "API requests fail"
- Check backend Cloud Run URL
- Verify environment variables are set
- Check Firestore rules allow requests
- Review backend logs in Cloud Logging

## Environment Variables for Production

### Frontend (artifacts/suvana-web/.env)

```bash
PORT=3000
BASE_PATH=/
VITE_API_URL=https://your-backend-url.run.app
```

### Backend (artifacts/api-server/.env)

```bash
NODE_ENV=production
PORT=8080
FIREBASE_PROJECT_ID=suvana-construction
FIREBASE_CLIENT_EMAIL=firebase-admin@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
```

## Rollback

If deployment has issues, rollback to previous version:

```bash
# Hosting
firebase hosting:channels:deploy VERSION_ID

# Or delete current and redeploy
firebase hosting:disable
firebase deploy
```

## Monitoring & Maintenance

### Setup Alerts

1. Firebase Console → Monitoring
2. Create alerts for:
   - High error rates
   - High response times
   - Quota usage

### Regular Checks

- Weekly: Check error logs
- Monthly: Review Firestore usage and costs
- Monthly: Update dependencies
- Quarterly: Review security settings

## Additional Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

Your application is ready for production deployment! 🚀
