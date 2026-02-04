# Interview Assistant - Open Bugs & Missing Features

## Testing Session: 2026-02-04
**Test Configuration:**
- Provider: Groq (Adaptive)
- Test Source: YouTube mock interview (1:58 - 3:20)
- Testing: Interviewer audio transcription + AI suggestions

---

## Bugs

### BUG-001: API Key Not Found After Successful Save (FIXED)
**Severity**: Critical - Blocks core functionality
**Status**: ✅ FIXED (2026-02-04)
**Steps to Reproduce**:
1. Create new account and login
2. Go to Settings > API Keys
3. Click "Add Key" for Groq
4. Enter valid Groq API key
5. Click Save - shows "Groq API key saved successfully"
6. Navigate to /interview page
7. Scroll down and click "Start Interview Session"

**Expected**: Session should start with the saved API key
**Actual**: Shows error "No API key found for groq. Please add your API key in Settings to continue."

**Evidence**: Screenshot shows success message on Settings page, but Interview page cannot find the key.

**Root Cause Identified**:
The issue is a **Zustand hydration timing race condition**. When navigating to `/interview`, the component renders and calls `loadApiKeys()` before Zustand has finished hydrating the auth token from localStorage.

**Evidence from console**:
```
CONSOLE: Failed to load API keys: Error: Session expired
```
Backend logs show: `GET /api/settings/api-keys HTTP/1.1" 401 Unauthorized`

The `fetchWithAuth` hook reads `token` from Zustand, but on initial render the token is null (not yet hydrated from localStorage). This causes 401 errors.

**Fix Required** (Multiple changes needed):

**Fix 1 - Don't logout on 401 during hydration** (Critical):
```typescript
// In useAuth.ts fetchWithAuth:
if (response.status === 401) {
  // Only logout if we actually had a token (not during hydration)
  if (token) {
    logout()
  }
  throw new Error('Session expired')
}
```

**Fix 2 - Add hydration tracking to authStore**:
```typescript
// In authStore.ts:
interface AuthState {
  // ... existing fields
  _hasHydrated: boolean
}

// In persist config:
onRehydrateStorage: () => (state) => {
  state._hasHydrated = true
}
```

**Fix 3 - Wait for hydration before loading API keys**:
```typescript
// In interview/page.tsx useEffect:
useEffect(() => {
  const loadApiKeys = async () => {
    // Wait for hydration
    if (!authStore.getState()._hasHydrated) return
    if (!isAuthenticated) return
    // ... rest of loading logic
  }
  loadApiKeys()
}, [isAuthenticated, _hasHydrated]) // Add _hasHydrated to deps
```

**Full Root Cause Analysis**:
The bug is a cascade of issues:
1. User navigates to `/interview` page
2. React component mounts and `useEffect` runs `loadApiKeys()` immediately
3. Zustand store hasn't hydrated from localStorage yet (async process)
4. `fetchWithAuth` reads `token` from Zustand state - it's `null` (not hydrated)
5. API request sent without Authorization header → 401 Unauthorized
6. `fetchWithAuth` sees 401 and calls `logout()` as a side effect
7. `logout()` CLEARS the token from localStorage (destructive!)
8. Now even localStorage is empty - user is fully logged out
9. Subsequent hydration finds empty localStorage - permanently logged out

**Key Problem**: The `logout()` call on 401 is destructive and happens before hydration completes. This wipes valid credentials.

**Workaround**: None fully works because the 401→logout cascade destroys the localStorage data.

**Resolution (2026-02-04)**:
All three fixes were implemented:
1. **authStore.ts**: Added `_hasHydrated` boolean and `setHasHydrated` action with `onRehydrateStorage` callback
2. **useAuth.ts**: Modified `fetchWithAuth` to only call `logout()` when `token` exists (prevents logout during hydration)
3. **interview/page.tsx**: Added `_hasHydrated` to useEffect dependencies, early return when not hydrated

**Files Modified**:
- `frontend/stores/authStore.ts`
- `frontend/hooks/useAuth.ts`
- `frontend/app/interview/page.tsx`
- `backend/main.py` (hardcoded CORS origins for testing)
- `backend/config.py` (extended default CORS origins)
- `backend/.env` (updated ALLOWED_ORIGINS)

**Verification**: TypeScript typecheck passed. Browser E2E verification pending (browser automation issues).

---

### BUG-002: Disclaimer Button Click Not Responsive (Minor)
**Severity**: Minor - Workaround exists
**Steps to Reproduce**:
1. Navigate to /interview page
2. Try clicking "I Understand - Continue" button

**Expected**: Modal should close on button click
**Actual**: Playwright click doesn't work, but JavaScript click does

**Note**: This may be a Playwright-specific issue with React event handlers. Manual testing needed to confirm if this affects real users.

---

### BUG-003: bcrypt/passlib Incompatibility with Python 3.14 (FIXED)
**Severity**: Critical - Blocks login functionality
**Status**: ✅ FIXED (2026-02-04)
**Steps to Reproduce**:
1. Install bcrypt 5.0.0 with passlib 1.7.4
2. Try to login with any account

**Expected**: Login should work
**Actual**: 500 Internal Server Error with traceback:
```
AttributeError: module 'bcrypt' has no attribute '__about__'
ValueError: password cannot be longer than 72 bytes
```

**Root Cause**:
- passlib 1.7.4 is incompatible with bcrypt 5.0.0
- passlib tries to access `_bcrypt.__about__.__version__` which doesn't exist in newer bcrypt

**Fix Applied**:
```bash
pip install bcrypt==4.0.1
```

**Note**: Any accounts created with bcrypt 5.0.0 may have corrupt password hashes. New accounts need to be created after the fix.

---

## Missing Features

*(Missing features will be logged during testing)*

---

## Test Results Summary

### Testing Completed (E2E Session: 2026-02-04)
| Test | Status | Notes |
|------|--------|-------|
| Landing Page | ✅ PASS | Loads correctly, navigation works |
| Signup Flow | ✅ PASS | Creates account successfully |
| Login Flow | ✅ PASS | Authenticates and stores JWT (after BUG-003 fix) |
| Dashboard | ✅ PASS | Shows user stats, quick actions, sidebar navigation |
| Settings - API Keys | ✅ PASS | Can add/save/update Groq API key |
| Interview Page Load | ✅ PASS | **BUG-001 VERIFIED FIXED** - No session expired error |
| Interview Setup UI | ✅ PASS | All options visible: Provider, Response Style, Verbosity |
| Start Interview Session | ⏳ MANUAL | Requires screen share permission (browser limitation) |
| Audio Transcription | ⏳ MANUAL | Requires screen share with YouTube video |
| AI Suggestions | ⏳ MANUAL | Requires full interview flow |

### Manual Testing Required
The following tests require manual browser testing due to Playwright limitations with media permissions:

1. **Start Interview Session**
   - Open http://localhost:3000/interview
   - Accept disclaimer
   - Fill in job description and resume (optional)
   - Select Adaptive (Groq) provider
   - Click "Start Interview Session"
   - Grant screen share permission (select YouTube tab with audio)

2. **Test with YouTube Mock Interview**
   - URL: https://www.youtube.com/watch?v=srw4r3htm4U&t=188s
   - Time range: 1:58 - 3:20
   - Play the video while screen sharing
   - Verify: Transcript appears in real-time
   - Verify: AI suggestions generate after interviewer finishes speaking

### Testing Limitations
1. **Browser Automation**: Cannot grant microphone/screen share permissions programmatically
2. **Playwright on Windows**: Persistent browser contexts occasionally crash

### Bugs Found
| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| BUG-001 | **CRITICAL** | Auth hydration race condition causes logout on page navigation | ✅ FIXED |
| BUG-002 | Minor | Disclaimer button needs JS click (may be Playwright-specific) | Open |
| BUG-003 | **CRITICAL** | bcrypt 5.0.0 incompatible with passlib 1.7.4 | ✅ FIXED |

