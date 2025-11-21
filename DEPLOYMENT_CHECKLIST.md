# 🚀 Deployment Checklist - Phase 1 Critical Fixes

**Date**: November 15, 2025
**Status**: ✅ All fixes complete, pending deployment

---

## ⚠️ CRITICAL - DO FIRST

### 1. 🔑 Revoke Exposed Google API Key
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [ ] Find API key: `AIzaSyAH9y654zIAMc8do0a9i6Qc9TEbKnCKw9Y`
- [ ] Click **Delete** or **Revoke**
- [ ] Confirm deletion
- [ ] **DO THIS IMMEDIATELY** - Key is publicly exposed in git history

---

## 🔑 Create New Restricted API Key

### 2. Generate New Google Vision API Key
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [ ] Click **Create Credentials** → **API Key**
- [ ] Copy the new API key (save securely - you'll need it in step 4)
- [ ] Click **Edit API key**
- [ ] Under "API restrictions", select **Restrict key**
- [ ] Choose **Cloud Vision API** only
- [ ] Save restrictions
- [ ] Store new key in password manager/secrets vault

---

## 🛠️ Supabase Setup

### 3. Install and Link Supabase CLI (if not done)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
cd c:/Jensify
supabase link --project-ref bfudcugrarerqvvyfpoz
```

### 4. Set API Key as Supabase Secret
```bash
# Replace YOUR_NEW_API_KEY with the key from step 2
supabase secrets set GOOGLE_VISION_API_KEY=YOUR_NEW_API_KEY

# Verify the secret is set
supabase secrets list
```

Expected output:
```
NAME
GOOGLE_VISION_API_KEY
```

---

## 📦 Deploy Edge Function

### 5. Deploy OCR Processing Function
```bash
# Deploy the process-receipt function
supabase functions deploy process-receipt

# Verify deployment
supabase functions list
```

Expected output:
```
NAME              STATUS
process-receipt   ACTIVE
```

### 6. Test Edge Function
```bash
# Get JWT token from your app (login and copy from DevTools → Application → Local Storage → jensify-auth)
export JWT_TOKEN="your_jwt_token_here"

# Test the function
curl -i --location --request POST \
  'https://bfudcugrarerqvvyfpoz.supabase.co/functions/v1/process-receipt' \
  --header "Authorization: Bearer $JWT_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

Expected response (200 OK):
```json
{
  "merchant": "Test Merchant",
  "amount": 12.34,
  "date": "2025-11-15",
  ...
}
```

---

## 🗄️ Run Database Migrations

### 7. Apply RLS Recursion Fixes
```bash
# Push all pending migrations to Supabase
supabase db push
```

Migrations to be applied:
- ✅ `20251115_fix_storage_rls_recursion.sql` - Fixes storage bucket RLS
- ✅ `20251115_fix_mileage_rls_recursion.sql` - Fixes mileage module RLS

### 8. Verify RLS Policies
```bash
# Check that policies were created successfully
supabase db remote --database postgres --command "
  SELECT schemaname, tablename, policyname
  FROM pg_policies
  WHERE policyname LIKE '%Finance%'
  ORDER BY tablename;
"
```

---

## ✅ Verify Fixes in Development

### 9. Test OCR Locally
- [ ] Start dev server: `cd expense-app && npm start`
- [ ] Login to the app at `http://localhost:4200`
- [ ] Navigate to **Upload Receipt**
- [ ] Upload a receipt image
- [ ] Open DevTools → Network tab
- [ ] Verify you see request to `/functions/v1/process-receipt`
- [ ] Verify NO requests to `vision.googleapis.com`
- [ ] Verify API key does NOT appear in network traffic
- [ ] Verify OCR extracts merchant, amount, date correctly

### 10. Test CSV Export
- [ ] Navigate to **Expense List**
- [ ] Create a test expense with merchant name starting with `=test`
- [ ] Click **Export to CSV**
- [ ] Open CSV in Excel/Google Sheets
- [ ] Verify merchant is escaped: `"'=test"` (not executed as formula)

### 11. Test Memory Leaks (Optional)
- [ ] Open DevTools → Performance → Memory
- [ ] Take heap snapshot
- [ ] Navigate through app (login → upload → expenses → logout)
- [ ] Take another heap snapshot
- [ ] Compare: detached DOM nodes should be minimal
- [ ] No exponential growth in subscriptions

---

## 🧪 Run Full Test Suite

### 12. Run Tests with Coverage
```bash
cd expense-app
npm test -- --browsers=ChromeHeadless --watch=false --code-coverage
```

Expected results:
- [ ] ✅ **85/85 tests passing (100%)**
- [ ] ✅ No failures
- [ ] ✅ Code coverage ≥ 70%

---

## 🚀 Deploy to Production

### 13. Build Production Bundle
```bash
cd expense-app
npm run build

# Check bundle size
ls -lh dist/expense-app/browser/
```

### 14. Deploy Frontend
Choose your deployment platform:

**Option A: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist/expense-app/browser
```

**Option C: Firebase Hosting**
```bash
npm install -g firebase-tools
firebase deploy --only hosting
```

### 15. Update Supabase Secrets for Production
```bash
# Update APP_URL to your production domain
# Go to: https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz/settings/vault
# Find APP_URL secret → Edit → Change value to your production URL
# Example: https://jensify.kanknot.com or https://your-vercel-url.vercel.app
```

- [ ] Update `APP_URL` secret in Supabase Vault to production URL
- [ ] Verify invitation emails will use production links

### 16. Verify Production Deployment
- [ ] Visit production URL
- [ ] Test login flow
- [ ] Test receipt upload (OCR should work via Edge Function)
- [ ] Check browser DevTools → Network tab
- [ ] Verify NO API key exposure
- [ ] Test CSV export
- [ ] Test invitation email (should have production URL in link)

---

## 📊 Monitor & Verify

### 17. Monitor Edge Function Logs
```bash
# View recent logs
supabase functions logs process-receipt

# Tail logs in real-time
supabase functions logs process-receipt --tail
```

### 18. Monitor Google Vision API Usage
- [ ] Go to [Google Cloud Console → APIs & Services → Metrics](https://console.cloud.google.com/apis/dashboard)
- [ ] Select **Cloud Vision API**
- [ ] Monitor request count (should be <1000/month for free tier)
- [ ] Set up billing alerts

### 19. Security Verification
- [ ] Old API key has been revoked ✅
- [ ] New API key is restricted to Vision API only ✅
- [ ] New API key is stored only in Supabase secrets ✅
- [ ] No API keys in environment files ✅
- [ ] No API keys in git history (new key never committed) ✅
- [ ] OCR works via Edge Function ✅
- [ ] CSV injection prevention works ✅
- [ ] APP_URL updated to production domain ✅
- [x] **Email domain verified (kanknot.com)** ✅
- [x] **Email API key stored in Supabase secrets** ✅
- [x] **Invitation Edge Function deployed** ✅

---

## 📝 Post-Deployment Tasks

### 20. Update Documentation
- [x] Mark deployment date in `CRITICAL_FIXES_COMPLETED.md` ✅
- [x] Created `ORGANIZATION_MULTI_TENANCY_DEPLOYMENT_COMPLETE.md` ✅
- [x] Created `EMAIL_SETUP_GUIDE.md` ✅
- [ ] Update `README.md` with new setup instructions
- [ ] Archive old API key reference from documentation

### 21. Create Git Tag
```bash
git tag -a v0.1.1-security-fixes -m "Phase 1 critical fixes: API key security, memory leaks, RLS recursion"
git push origin v0.1.1-security-fixes
```

---

## 🎯 Success Criteria

All items must be checked before considering deployment complete:

- [ ] Old API key revoked
- [ ] New restricted API key created and stored securely
- [ ] Edge Function deployed and working
- [ ] Database migrations applied
- [ ] All 85 tests passing
- [ ] OCR works in production
- [ ] No API key visible in browser
- [ ] CSV export properly sanitized
- [ ] No memory leaks
- [ ] Production monitoring set up
- [ ] APP_URL secret updated to production domain
- [ ] Invitation emails use production URLs
- [x] **Email domain verified (kanknot.com)** ✅
- [x] **Email Edge Function deployed** ✅
- [x] **Organization multi-tenancy critical bugs fixed** ✅
- [ ] **User testing completed for organization flow**

---

## 🆘 Rollback Plan (if needed)

If issues occur in production:

1. **OCR Not Working**:
   ```bash
   # Check Edge Function logs
   supabase functions logs process-receipt --level error

   # Verify secret is set
   supabase secrets list
   ```

2. **Database Issues**:
   ```bash
   # Rollback migrations (run SQL from migration comments)
   # See rollback sections in:
   # - 20251115_fix_storage_rls_recursion.sql
   # - 20251115_fix_mileage_rls_recursion.sql
   ```

3. **Frontend Issues**:
   - Revert to previous deployment
   - Check browser console for errors

---

## 📞 Support Resources

- **Supabase Discord**: https://discord.supabase.com
- **Google Cloud Support**: https://cloud.google.com/support
- **Project Issues**: https://github.com/JBCox/Jensify/issues

---

**Last Updated**: November 15, 2025
**Prepared By**: Claude Code Assistant
**Status**: ✅ Ready for deployment
