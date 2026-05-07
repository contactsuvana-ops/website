# Admin Authentication Setup

The admin dashboard is now protected with a simple yet secure authentication system.

## How It Works

1. **Hidden Link** - The admin link is hidden from the navbar
2. **Direct Access** - When someone visits `/admin` directly, they see a login modal
3. **Backend Validation** - Credentials are validated against environment variables
4. **Session Storage** - Upon successful login, authentication is stored in sessionStorage
5. **24-Hour Expiry** - Sessions automatically expire after 24 hours
6. **Logout** - Users can logout from the dashboard header

## Configuration

Set these environment variables on your backend (api-server):

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=yourSecurePassword123
```

Or create a `.env` file in `artifacts/api-server/`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourSecurePassword123
```

### Default Credentials (Development Only)

If not set, defaults are:
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT**: Change these in production!

## Files Modified/Created

### Frontend
- **`src/hooks/use-admin-auth.ts`** - Authentication hook with session management
- **`src/components/admin/AdminAuthModal.tsx`** - Login modal component
- **`src/components/admin/ProtectedAdminRoute.tsx`** - Route protection wrapper
- **`src/pages/AdminPage.tsx`** - Added logout button
- **`src/components/layout/Navbar.tsx`** - Removed admin links

### Backend
- **`src/routes/admin.ts`** - POST `/api/admin/authenticate` endpoint
- **`src/routes/index.ts`** - Registered admin router

## API Endpoint

### POST `/api/admin/authenticate`

**Request:**
```json
{
  "username": "admin",
  "password": "yourPassword"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "hex-encoded-session-token"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

## Security Features

1. **Session Storage** - Uses sessionStorage (cleared when browser closes)
2. **No Tokens Exposed** - Authentication state doesn't expose raw credentials
3. **24-Hour Expiry** - Sessions automatically expire for added security
4. **Login Modal** - Cannot be dismissed without authentication
5. **Logout Function** - Users can logout anytime from the dashboard

## Testing Locally

1. Start the backend:
   ```bash
   cd artifacts/api-server
   PORT=3000 FIRESTORE_EMULATOR_HOST=localhost:8080 NODE_ENV=development pnpm run dev
   ```

2. Start the frontend:
   ```bash
   cd artifacts/suvana-web
   PORT=5173 BASE_PATH=/ pnpm run dev
   ```

3. Visit http://localhost:5173/admin

4. Enter credentials:
   - Username: `admin`
   - Password: `admin123`

5. After login, you'll see the submissions dashboard

6. Click "Logout" in the top right to logout

## Enhancement Ideas (Future)

For even greater security, consider:

1. **Database Storage** - Store hashed passwords in database instead of environment variables
2. **Rate Limiting** - Add failed login attempt limits
3. **Audit Logging** - Log all admin actions
4. **Two-Factor Authentication** - Add 2FA support
5. **JWT Tokens** - Use JWT for more robust session management
6. **HTTPS Only** - Enforce HTTPS in production
7. **IP Whitelisting** - Restrict admin access to specific IP addresses

## Troubleshooting

**"Invalid credentials" error**
- Check that environment variables are set correctly
- Verify credentials match what you configured
- Check backend logs for authentication attempts

**"Cannot access dashboard after login"
- Check browser console for errors
- Verify sessionStorage is enabled
- Clear browser cache and try again

**"Session expired"
- Sessions expire after 24 hours
- Login again when this happens
- This is by design for security

---

Admin authentication is now integrated and production-ready! 🔐
