# OCR Edge Function Deployment Guide

## ⚠️ CRITICAL SECURITY FIX

**The Google Vision API key was previously exposed in client-side code. This has now been fixed by moving OCR processing to a secure Supabase Edge Function.**

## What Was Fixed

### Before (INSECURE ❌)
```typescript
// Client-side code (EXPOSED IN BROWSER)
const API_KEY = 'AIzaSyAH9y654zIAMc8do0a9i6Qc9TEbKnCKw9Y';
const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`);
```

**Problems:**
- API key visible in browser DevTools
- Anyone could steal the key and abuse your Google Cloud quota
- Financial risk: attackers could rack up charges
- Security audit failure

### After (SECURE ✅)
```typescript
// Client calls secure Edge Function
const response = await fetch(`${supabaseUrl}/functions/v1/process-receipt`, {
  headers: { 'Authorization': `Bearer ${userToken}` },
  body: JSON.stringify({ image_base64: image })
});

// Edge Function handles API key securely (server-side)
const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY'); // Stored as secret
const result = await callGoogleVisionAPI(apiKey, image);
```

**Benefits:**
- ✅ API key never exposed to client
- ✅ User authentication required
- ✅ Rate limiting via Supabase
- ✅ Audit logging of all requests
- ✅ No financial risk from key theft

---

## Deployment Steps

### 1. Revoke the Exposed API Key (URGENT)

**DO THIS FIRST** to prevent ongoing abuse:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find API key: `AIzaSyAH9y654zIAMc8do0a9i6Qc9TEbKnCKw9Y`
3. Click **Delete** or **Revoke**
4. Confirm deletion

### 2. Create a New Google Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **API Key**
3. Copy the new API key (you'll need it in step 4)
4. **Restrict the API key** (important for security):
   - Click **Edit API key**
   - Under "API restrictions", select **Restrict key**
   - Choose **Cloud Vision API** only
   - Save

### 3. Set Up Supabase CLI

If you haven't already:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
cd c:/Jensify
supabase link --project-ref bfudcugrarerqvvyfpoz
```

### 4. Set the API Key as a Supabase Secret

```bash
# Set the secret (replace YOUR_NEW_API_KEY with the key from step 2)
supabase secrets set GOOGLE_VISION_API_KEY=YOUR_NEW_API_KEY

# Verify the secret is set
supabase secrets list
```

Expected output:
```
NAME
GOOGLE_VISION_API_KEY
```

### 5. Deploy the Edge Function

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

### 6. Test the Edge Function

```bash
# Get a test JWT token from your app (login and copy from DevTools → Application → Local Storage → jensify-auth)
export JWT_TOKEN="your_jwt_token_here"

# Test the function
curl -i --location --request POST 'https://bfudcugrarerqvvyfpoz.supabase.co/functions/v1/process-receipt' \
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
  "tax": 1.23,
  "rawText": "...",
  "confidence": {
    "overall": 0.78,
    "merchant": 0.85,
    "amount": 0.75,
    "date": 0.80,
    "tax": 0.70
  }
}
```

### 7. Verify the Fix in Your App

1. Start the Angular dev server:
   ```bash
   cd expense-app
   npm start
   ```

2. Login to the app

3. Upload a receipt image

4. Check the browser DevTools **Network** tab:
   - ✅ You should see a request to `/functions/v1/process-receipt`
   - ✅ You should NOT see any requests to `vision.googleapis.com`
   - ✅ The API key should NOT appear anywhere in the network traffic

5. Verify OCR works:
   - The receipt should be processed
   - Merchant name, amount, date extracted
   - No errors in console

---

## Troubleshooting

### Error: "Missing authorization header"

**Cause**: User is not logged in or session expired
**Fix**: Login again and ensure the JWT token is included

### Error: "GOOGLE_VISION_API_KEY not configured"

**Cause**: The secret wasn't set properly
**Fix**: Run `supabase secrets set GOOGLE_VISION_API_KEY=your_key` again

### Error: "OCR Edge Function error: 403"

**Cause**: API key doesn't have permission for Vision API
**Fix**:
1. Go to Google Cloud Console
2. Enable **Cloud Vision API** for your project
3. Ensure API key has **Cloud Vision API** restriction

### Error: "Function deployment failed"

**Cause**: CLI not linked to project or authentication issue
**Fix**:
```bash
supabase logout
supabase login
supabase link --project-ref bfudcugrarerqvvyfpoz
supabase functions deploy process-receipt
```

### Testing Locally

To test the Edge Function locally before deploying:

```bash
# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve process-receipt --env-file .env.local

# Test locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-receipt' \
  --header "Authorization: Bearer $JWT_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"image_base64":"..."}'
```

Create `.env.local`:
```bash
GOOGLE_VISION_API_KEY=your_api_key_here
```

---

## Security Checklist

Before deploying to production, verify:

- [ ] Old API key has been revoked in Google Cloud Console
- [ ] New API key has been created with Vision API restriction only
- [ ] New API key is set as Supabase secret (NOT in code)
- [ ] Edge Function is deployed and working
- [ ] Client-side code no longer contains `googleVisionApiKey`
- [ ] environment.ts and environment.development.ts have no API keys
- [ ] Testing confirms OCR works via Edge Function
- [ ] No direct calls to `vision.googleapis.com` from client
- [ ] Git history doesn't contain the new API key (it should only be in Supabase secrets)

---

## Monitoring

### View Function Logs

```bash
# View recent logs
supabase functions logs process-receipt

# Tail logs in real-time
supabase functions logs process-receipt --tail

# Filter by level
supabase functions logs process-receipt --level error
```

### Monitor API Usage

1. Go to [Google Cloud Console → APIs & Services → Metrics](https://console.cloud.google.com/apis/dashboard)
2. Select **Cloud Vision API**
3. Monitor:
   - Request count (should be <1000/month for free tier)
   - Error rate
   - Latency

### Set Up Alerts

1. In Supabase Dashboard, go to **Logs**
2. Create alerts for:
   - Edge Function errors
   - High error rates
   - Unusual traffic patterns

---

## Cost Considerations

**Google Vision API Pricing:**
- Free tier: 1,000 images/month
- Over 1,000: $1.50 per 1,000 images

**Supabase Edge Functions:**
- Free tier: 500,000 invocations/month
- Over that: $2 per 1,000,000 invocations

**Total cost estimate (assuming 500 receipts/month):**
- Google Vision: $0 (free tier)
- Supabase: $0 (free tier)

---

## Next Steps

After deploying:

1. ✅ Revoke old API key
2. ✅ Deploy Edge Function with new key
3. ✅ Test in development
4. ✅ Deploy frontend to production
5. ✅ Monitor logs for errors
6. ✅ Set up billing alerts in Google Cloud

---

## Support

If you encounter issues:

1. Check Supabase function logs: `supabase functions logs process-receipt`
2. Check Google Cloud Vision API dashboard for errors
3. Review this guide's troubleshooting section
4. Contact support: [Supabase Discord](https://discord.supabase.com) or [Google Cloud Support](https://cloud.google.com/support)

---

**Last Updated**: November 15, 2025
**Security Fix**: API key exposure vulnerability patched
