# Invitation Flow Bug - Fix Tracking Log

## Problem Statement
When a user accepts an invitation:
1. Admin sends invite - **WORKS**
2. User clicks invite link - accept-invitation page loads - **WORKS**
3. User clicks "Create Account" - **WORKS**
4. User registers and confirms email - **PARTIALLY WORKS** (email confirms)
5. **BUG**: Page doesn't load after email confirmation
6. **BUG**: User signs in manually and is redirected to "Create Organization" instead of accepting invitation
7. **BUG**: 4 duplicate notifications appear

## Symptoms
- [ ] 4 duplicate notifications on invite send
- [ ] Email confirmation page doesn't load/redirect properly
- [ ] User ends up at organization setup instead of accepting invitation
- [ ] Invitation token lost during auth flow

---

## Fix Attempts Log

### Attempt 1-6 (Previous Session)
- Various notification deduplication attempts
- Organization context fixes
- **Result**: Problem persisted

### Attempt 7 (Current Session - December 11, 2024)
**Commit**: `65e4daf fix(auth): preserve invitation token through registration flow`

**Root Cause Identified**:
`auth-callback.ts` was removing `pending_invitation_token` from localStorage BEFORE the redirect completed. If redirect failed, token was gone.

**Files Modified**:
1. `auth-callback.ts` - Don't remove token, add 10s timeout fallback
2. `accept-invitation.component.ts` - Remove token after successful load
3. `login.component.ts` - Check for pending token when already authenticated
4. `register.component.ts` - Check for pending token when already authenticated
5. `auth.guard.ts` - Safety net check before redirecting to org setup

**Pushed to GitHub**: YES (master branch)

**Result**: UNKNOWN - User reports no change

---

## Deployment Verification

### ROOT CAUSE FOUND - December 11, 2024 @ 4:00 PM CST

**THE FIXES WERE NEVER DEPLOYED!**

Cloudflare Pages deploys from `main` branch, but ALL fixes were pushed to `master` branch!

```
$ git log main..master --oneline
65e4daf fix(auth): preserve invitation token through registration flow
b5e71f5 fix(invitations): prevent double-submission in invite form
b4d5bef fix(notifications): prevent duplicate notifications from realtime subscription
... (22+ commits total)
```

**22+ commits were on master but NOT on main** - NONE of the fixes were ever deployed to production!

### Fix Applied
```bash
git checkout main
git merge master --no-edit
git push origin main
# Result: 13b975f..65e4daf  main -> main
```

All commits now pushed to `main`. Cloudflare should build and deploy within 2-5 minutes.

### GitHub Repo
- Remote: `https://github.com/JBCox/Expensed.git`
- **Production branch: `main` (NOT master!)**
- All future pushes MUST go to `main`

---

## Notification Issue - FIXED (December 11, 2024 @ 4:37 PM CST)

### Root Cause
The `tap(async () => {...})` operator in RxJS doesn't properly handle async functions - it fires and forgets. This caused timing issues where notifications could be triggered multiple times.

### Evidence from Database
2 notifications per invite ~1.5 seconds apart:
- 22:23:12.538 - "Invitation sent to josh.cox@corvaer.com"
- 22:23:14.129 - "Invitation sent to josh.cox@corvaer.com"

### Fix Applied
**Commit**: `b4d0840 fix(notifications): move success notifications to component handlers`

**Changes**:
1. **invitation.service.ts**: Removed `showSuccess` from `tap()` operators for:
   - `createInvitation()`
   - `createBulkInvitations()`
   - `resendInvitation()`
2. **user-management.component.ts**: Added `showSuccess` to subscribe handlers instead

This ensures exactly ONE notification per successful operation, because the component's subscribe handler only fires once when the observable completes.

### Deployment
- Pushed to `main` branch
- Deployed via Wrangler CLI to Cloudflare Pages
- Preview URL: https://0e62b57f.expensed.pages.dev
- Test data cleaned (josh.cox@corvaer.com deleted)

---

---

## ACTUAL ROOT CAUSE FOUND - December 11, 2024 @ 5:30 PM CST

### The Real Problem: Supabase URL Configuration

**The invitation flow code was CORRECT all along!** The issue was a **Supabase configuration problem**.

### Evidence from Supabase Auth Logs

Almost all auth requests showed:
```
referer: http://localhost:3000
```

Even for production traffic hitting expensed.app!

### Root Cause

**Supabase URL Configuration was wrong:**

| Setting | Wrong Value | Correct Value |
|---------|-------------|---------------|
| Site URL | `http://localhost:3000` | `https://expensed.app` |
| Redirect URLs | Old Netlify URLs only | Added `https://expensed.app/**` |

### Why This Broke the Invitation Flow

1. User clicks invitation link on `expensed.app`
2. User clicks "Create Account" → token stored in `localStorage` on `expensed.app` domain
3. User registers → Supabase sends confirmation email
4. **Email confirmation link pointed to `localhost:3000`** (from Site URL config!)
5. User clicks link → browser goes to wrong domain (or nowhere)
6. User manually navigates to `expensed.app` and logs in
7. **localStorage on `expensed.app` has the token, but the auth callback never ran properly**
8. Auth guard sees no organization → redirects to "Create Organization"

### The localStorage Domain Scope Issue

`localStorage` is **domain-scoped**:
- Token stored on `expensed.app` ≠ accessible on `localhost:3000`
- If Supabase redirects email confirmation to wrong domain, token is "lost"

### Fix Applied

User updated Supabase Dashboard → Authentication → URL Configuration:

**Site URL**: `https://expensed.app`

**Redirect URLs**:
- `https://expensed.app/auth/callback`
- `https://expensed.app/**`
- `http://localhost:3000/auth/callback`
- `http://localhost:4200/auth/callback`

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Duplicate notifications | RxJS `tap(async)` fires and forgets | Move `showSuccess` to component subscribe handlers |
| User redirected to create org | Supabase Site URL = localhost:3000 | Update to `https://expensed.app` |
| Token "lost" after email confirm | Email links redirected to wrong domain | Add correct redirect URLs to Supabase |

---

## Next Steps

1. **TEST FULL INVITATION FLOW** on production:
   - Send new invitation from admin
   - Click invite link → accept-invitation page
   - Click "Create Account" → register
   - Complete registration → confirm email
   - Click email confirmation link → **should land on accept-invitation**
   - Accept invitation → should join invited organization

2. **Verify diagnostic logs** in browser console:
   - `[INVITATION FLOW] Token stored:` - when clicking Create Account
   - `[AUTH CALLBACK] Checking for pending token:` - after email confirmation
   - `[LOGIN] Checking for pending token:` - if user logs in manually

---

## Diagnostic Logs Added

For debugging, these console logs were added and should remain for now:

```typescript
// accept-invitation.component.ts
console.log('%c[INVITATION FLOW] Token stored:', 'background: #4CAF50; color: white;', token);

// auth-callback.ts
console.log('%c[AUTH CALLBACK] Checking for pending token:', 'background: #2196F3; color: white;', token);

// auth.guard.ts
console.log('%c[AUTH GUARD] Safety net check:', 'background: #FF9800; color: white;', {...});

// login.component.ts
console.log('%c[LOGIN] Checking for pending token:', 'background: #9C27B0; color: white;', token);

// app.ts
console.log('%c EXPENSED VERSION: 2024-12-11-v2 ', 'background: #ff5900; color: white;', ...);
```

These can be removed after confirming the fix works in production.
