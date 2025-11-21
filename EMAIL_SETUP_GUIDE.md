# Email Setup Guide - kanknot.com

**Domain**: kanknot.com
**Email Service**: Resend
**Purpose**: Unified email for Jensify + KanKnot main app

---

## Overview

This guide sets up **kanknot.com** for sending emails from both:
- **Jensify** (expense management): `invitations@kanknot.com`
- **KanKnot main app**: `noreply@kanknot.com` (when ready)

One domain, one verification, multiple sender addresses.

---

## Step 1: Sign Up for Resend

1. Go to: **https://resend.com**
2. Click **"Sign Up"**
3. Free tier includes **3,000 emails/month** (perfect for starting)
4. Verify your email address

---

## Step 2: Get Your API Key

1. In Resend Dashboard → **API Keys**
2. Click **"Create API Key"**
3. Name: `Jensify + KanKnot Production`
4. **Copy the key** - it starts with `re_...`
5. **Save it securely** - you'll need it for Supabase

---

## Step 3: Add kanknot.com to Resend

1. In Resend Dashboard → **Domains**
2. Click **"Add Domain"**
3. Enter: `kanknot.com`
4. Click **"Add"**

Resend will show you **3 DNS records** to add. They'll look similar to this:

### Example DNS Records (yours will be slightly different):

| Type | Name/Host | Value/Points To | TTL |
|------|-----------|-----------------|-----|
| **TXT** | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...` (very long) | 3600 |
| **CNAME** | `resend` | `feedback-smtp.resend.com` | 3600 |
| **TXT** | `@` or blank | `v=spf1 include:_spf.resend.com ~all` | 3600 |

**Important**: Keep this page open - you'll need these exact values for GoDaddy.

---

## Step 4: Add DNS Records in GoDaddy

### Navigate to DNS Settings

1. Log into **GoDaddy**: https://dcc.godaddy.com
2. Click **"My Products"**
3. Find **kanknot.com** → Click **"DNS"**

### Add Each Record

#### Record 1: DKIM (TXT Record)

1. Click **"Add"** (or "Add Record")
2. **Type**: TXT
3. **Name**: `resend._domainkey` (copy from Resend exactly)
4. **Value**: The long `p=MIG...` string from Resend
5. **TTL**: 1 Hour (or 3600 seconds)
6. Click **"Save"**

#### Record 2: Feedback Loop (CNAME Record)

1. Click **"Add"**
2. **Type**: CNAME
3. **Name**: `resend`
4. **Value**: `feedback-smtp.resend.com`
5. **TTL**: 1 Hour
6. Click **"Save"**

#### Record 3: SPF (TXT Record)

1. Click **"Add"**
2. **Type**: TXT
3. **Name**: `@` (or leave blank - GoDaddy handles this differently)
4. **Value**: `v=spf1 include:_spf.resend.com ~all`
5. **TTL**: 1 Hour
6. Click **"Save"**

### GoDaddy-Specific Tips

- If you already have an SPF record, you need to **merge** them:
  ```
  v=spf1 include:_spf.resend.com include:other-service.com ~all
  ```
- For `@` records, GoDaddy might use blank or `@` - try what works
- TTL options: "1 Hour", "Custom: 3600", or default is fine

---

## Step 5: Wait for DNS Propagation

- **Typical time**: 10-30 minutes
- **Maximum**: Up to 48 hours (rare)
- **Check status**: https://dnschecker.org
  - Enter: `resend._domainkey.kanknot.com`
  - Should show the TXT record worldwide

---

## Step 6: Verify Domain in Resend

1. **Back in Resend** → Domains
2. Click **"Verify"** next to kanknot.com
3. If successful: Status changes to **"Verified" ✅**
4. If failed: Wait 15 more minutes and try again

**Troubleshooting**: Click "View DNS Records" in Resend to see what it's looking for vs. what it found.

---

## Step 7: Configure Supabase Secrets

### Add API Key to Supabase

1. Go to: **https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz/settings/vault**
2. Click **"New secret"**
3. **Add Secret #1**:
   - Name: `EMAIL_SERVICE_API_KEY`
   - Value: `re_...` (your actual Resend API key)
   - Click **"Save"**

4. **Add Secret #2**:
   - Name: `APP_URL`
   - Value: `http://localhost:4200` (for now)
   - When deploying: `https://jensify.kanknot.com` (or your actual URL)
   - Click **"Save"**

### Verify Secrets

Run this command to check:
```bash
supabase secrets list
```

Should show:
```
EMAIL_SERVICE_API_KEY=re_***
APP_URL=http://localhost:4200
```

---

## Step 8: Deploy Edge Function

The Edge Function has been updated to use `invitations@kanknot.com`.

### Deploy to Supabase

```bash
cd c:\Jensify\supabase
supabase functions deploy send-invitation-email
```

**Expected output**:
```
Deploying Function send-invitation-email...
✅ Deployed Function send-invitation-email
```

### Verify Deployment

1. Go to: **https://supabase.com/dashboard/project/bfudcugrarerqvvyfpoz/functions**
2. You should see **"send-invitation-email"** listed
3. Click on it to see logs

---

## Step 9: Test Email Sending

### Option A: Test from Jensify UI

1. Start the app: `npm start`
2. Log in as admin
3. Go to **User Management** → Invite User
4. Enter an email you can check
5. Click **"Send Invitation"**
6. **Check your email** for the invitation!

### Option B: Test from Resend Dashboard

1. In Resend → **Emails**
2. Click **"Send Test Email"**
3. Use: `invitations@kanknot.com` as sender
4. Send to your email
5. Check if it arrives

---

## Email Configuration Summary

### Current Setup

| Purpose | Sender Email | Status |
|---------|--------------|--------|
| Jensify Invitations | `invitations@kanknot.com` | ✅ Configured |
| KanKnot Main App | `noreply@kanknot.com` | Ready to use |

### Future Email Addresses (Same Domain)

You can add more without additional DNS setup:
- `expenses@kanknot.com` - Expense notifications
- `receipts@kanknot.com` - Receipt confirmations
- `support@kanknot.com` - Customer support
- `app@kanknot.com` - General app emails

All use the same verified domain!

---

## Troubleshooting

### Email Not Sending

**Check 1: Resend API Key**
```bash
supabase secrets list
```
Should show `EMAIL_SERVICE_API_KEY` (not blank)

**Check 2: Domain Verified**
- Resend Dashboard → Domains
- kanknot.com should show "Verified"

**Check 3: Edge Function Logs**
```bash
supabase functions logs send-invitation-email
```
Look for errors

**Check 4: Test Resend Directly**
Use Resend's API tester in their dashboard

### DNS Not Verifying

**Check DNS Records**:
```bash
nslookup -type=TXT resend._domainkey.kanknot.com
```

Should return the DKIM key.

**Common Issues**:
- Typo in GoDaddy record name
- Extra spaces in Value field
- Need to wait longer (up to 1 hour typical)

### Email Goes to Spam

**Fix**:
1. Add DMARC record in GoDaddy:
   - Type: TXT
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@kanknot.com`
2. Ask recipients to mark as "Not Spam"
3. Send more emails - reputation builds over time

---

## Production Checklist

Before going live:

- [ ] Domain verified in Resend ✅
- [ ] DNS records added in GoDaddy
- [ ] API key added to Supabase secrets
- [ ] Edge Function deployed
- [ ] Test email sent and received
- [ ] Update `APP_URL` to production URL
- [ ] Optional: Add DMARC record for better deliverability
- [ ] Monitor Resend Dashboard for delivery stats

---

## Cost Breakdown

**Resend Pricing**:
- **Free tier**: 3,000 emails/month, 100 emails/day
- **Pro**: $20/month for 50,000 emails
- **Business**: $85/month for 100,000 emails

**Current usage estimate** (Jensify only):
- 10 invitations/day = 300/month
- Well within free tier ✅

**When adding KanKnot**:
- Combined likely under 3,000/month for a while
- Upgrade to Pro when you hit limits

---

## Next Steps

1. **Complete Steps 1-8** above
2. **Test sending an invitation** from Jensify
3. **Verify email arrives** and looks good
4. **When ready to deploy**:
   - Update `APP_URL` secret to your production URL
   - Deploy frontend to Vercel/Netlify
   - Test invitation flow in production

---

## Support

**Resend Documentation**: https://resend.com/docs
**Resend Support**: https://resend.com/support
**GoDaddy DNS Help**: https://www.godaddy.com/help/manage-dns-680

---

**Last Updated**: November 15, 2025
**Domain**: kanknot.com
**Status**: Ready to configure
