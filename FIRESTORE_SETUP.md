# Suvana Website - Firestore Configuration Guide

This guide explains how to configure the application to use Firebase Firestore as the database.

## Environment Variables

### Local Development with Firestore Emulator

For local development without a Firebase project:

```bash
# .env or set these environment variables
NODE_ENV=development
FIRESTORE_EMULATOR_HOST=localhost:8080
```

This will use the Firestore emulator locally.

### Production - Google Firebase Credentials

You have two options for providing Firebase credentials:

#### Option 1: Single JSON Environment Variable (Recommended)

```bash
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"your-project-id",...}'
```

Get this by:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to Service Accounts (IAM & Admin > Service Accounts)
4. Create a new service account with Firestore permissions
5. Generate a private key (JSON format)
6. Copy the entire JSON content as the FIREBASE_CREDENTIALS value

#### Option 2: Individual Environment Variables

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Setting Up Local Development

### Prerequisites

- Node.js 22+
- Java 11+ (for Firestore emulator)
- pnpm

### Installation

1. Install Firestore emulator:

```bash
npm install -g firebase-tools
firebase init emulators
```

2. Start the emulator:

```bash
firebase emulators:start
```

3. In another terminal, set environment and start the app:

```bash
export NODE_ENV=development
export FIRESTORE_EMULATOR_HOST=localhost:8080

cd artifacts/api-server
pnpm run dev
```

The API will connect to the local Firestore emulator.

## Setting Up Production

### Firebase Setup

1. **Create a Firebase project** at [firebase.google.com](https://firebase.google.com)
2. **Enable Firestore** in the Firebase console
3. **Create a service account**:
   - Go to Service Accounts in Google Cloud Console
   - Create a new service account with Firestore Admin role
   - Generate a private key (JSON format)

### Deployment

1. Set `FIREBASE_CREDENTIALS` environment variable in your deployment platform:

**Railway:**
```bash
railway link
railway variables
# Set FIREBASE_CREDENTIALS to the full JSON
```

**Vercel:**
```bash
vercel env add FIREBASE_CREDENTIALS
# Paste the full JSON
```

**Docker:**
```dockerfile
ENV FIREBASE_CREDENTIALS='{"type":"service_account",...}'
```

**Heroku:**
```bash
heroku config:set FIREBASE_CREDENTIALS='{"type":"service_account",...}'
```

2. Deploy your application

## Firestore Database Structure

### Collections

#### `submissions`
Stores all form submissions (contact and quote requests).

```typescript
{
  id: string;              // Document ID
  type: "contact" | "quote";
  name: string;
  email: string;
  phone: string;
  projectType?: string | null;    // For quote submissions
  location?: string | null;        // For quote submissions
  budget?: string | null;          // For quote submissions
  timeline?: string | null;        // For quote submissions
  message: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

#### `comments`
Internal comments on submissions (for staff use).

```typescript
{
  id: string;              // Document ID
  submissionId: string;    // Reference to submission
  content: string;
  isShared: boolean;
  createdAt: Date;
}
```

### Indexes

Auto-created by Firestore, but for production optimization, create:

1. **Submissions by type and date**
   - Collection: `submissions`
   - Fields: `type` (Ascending), `createdAt` (Descending)

2. **Submissions by projectType and date**
   - Collection: `submissions`
   - Fields: `type` (Ascending), `projectType` (Ascending), `createdAt` (Descending)

## Migration from PostgreSQL

If you're migrating from PostgreSQL:

1. **Export existing data** from PostgreSQL
2. **Transform to Firestore format** using the migration script (to be created)
3. **Import to Firestore** using the import tool
4. **Verify data integrity** in the admin dashboard
5. **Switch to Firestore** in environment variables

## Troubleshooting

### "Firebase credentials not configured"

Ensure you've set either:
- `FIREBASE_CREDENTIALS` (full JSON), or
- All three: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

For local dev, set `FIRESTORE_EMULATOR_HOST=localhost:8080`

### "Cannot connect to Firestore emulator"

1. Verify emulator is running: `firebase emulators:start`
2. Check `FIRESTORE_EMULATOR_HOST=localhost:8080` is set
3. Check firewall isn't blocking port 8080

### Data not persisting in local emulator

The local emulator doesn't persist data between restarts by default. To enable:

```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

## API Repository Pattern

The application uses a repository pattern for database operations. All data access goes through `SubmissionsRepository`:

```typescript
import { getSubmissionsRepository } from "@workspace/db";

const repo = getSubmissionsRepository();

// Create submission
const submission = await repo.createSubmission({
  type: "contact",
  name: "John Doe",
  email: "john@example.com",
  phone: "555-1234",
  message: "Hello!",
});

// List submissions
const { submissions, total } = await repo.listSubmissions({
  type: "all",
  page: 1,
  limit: 20,
});

// Get stats
const stats = await repo.getSubmissionStats();
```

This makes it easy to:
- Switch databases (add PostgreSQL support back)
- Test with mocks
- Maintain data consistency

## Production Best Practices

1. **Security**
   - Use service account credentials (never use API keys)
   - Restrict service account to Firestore only
   - Use Firestore security rules (see Firebase console)

2. **Performance**
   - Enable Cloud CDN for static content
   - Use pagination (default 20 items per page)
   - Index frequently queried fields

3. **Monitoring**
   - Enable Firestore monitoring in Cloud Console
   - Set up alerts for quota usage
   - Monitor API error rates

4. **Backups**
   - Enable automated backups in Firestore settings
   - Regularly export data to Cloud Storage

5. **Costs**
   - Monitor monthly Firestore usage
   - Set budget alerts in Google Cloud
   - Clean up old data periodically
