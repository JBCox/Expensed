# Expensed Deployment & Infrastructure Plan

**Last Updated:** December 11, 2024

## Overview

This document captures all infrastructure decisions for Expensed (expensed.app).

---

## Domain

| Item | Provider | Details |
|------|----------|---------|
| **Domain** | Spaceship | `expensed.app` |
| **DNS Management** | Cloudflare | Nameservers pointed from Spaceship to Cloudflare |

---

## Hosting Stack

| Service | Provider | Tier | Purpose |
|---------|----------|------|---------|
| **Frontend** | Cloudflare Pages | Free | Angular SPA hosting |
| **Backend** | Supabase | Free/Pro | PostgreSQL, Auth, Storage, Edge Functions |
| **Edge Functions** | Cloudflare Workers | Free (100k req/day) | Email processing, custom logic |
| **CDN** | Cloudflare | Free | Built into Pages |

---

## Email Setup

### Receiving Email (Inbound)

**Provider:** Cloudflare Email Routing (Free)

| Address | Purpose | Forwards To | Status |
|---------|---------|-------------|--------|
| `support@expensed.app` | Customer support inquiries | notusceo@gmail.com | ✅ Active |
| `noreply@expensed.app` | Transactional email replies | notusceo@gmail.com | ✅ Active |
| `receipts@expensed.app` | Email-to-expense feature (future) | notusceo@gmail.com | ✅ Active |
| `hello@expensed.app` | General contact | notusceo@gmail.com | ✅ Active |
| `*@expensed.app` | Catch-all | notusceo@gmail.com | ✅ Active |

### Sending Email (Outbound)

**Provider:** Resend (Free tier: 3,000 emails/month, 100/day)

| Setting | Value |
|---------|-------|
| **SMTP Host** | `smtp.resend.com` |
| **SMTP Port** | `465` |
| **Username** | `resend` |
| **Password** | Resend API Key (stored in Supabase) |
| **Sender Address** | `noreply@expensed.app` |
| **Sender Name** | `Expensed` |

### DNS Records Added

| Type | Name | Purpose |
|------|------|---------|
| TXT | `resend._domainkey` | DKIM (email authentication) |
| TXT | `send` | SPF (sender verification) |
| MX | `send` | Resend mail server |
| MX | `@` | Cloudflare email routing (3 records) |
| TXT | `@` | SPF for Cloudflare |
| TXT | `cf2024-1._domainkey` | DKIM for Cloudflare |

### Email Notes
- **Inbound:** Cloudflare Email Routing forwards all incoming mail to Gmail
- **Outbound:** Resend sends transactional emails (password reset, invitations, notifications)
- **No personal names** on any email addresses
- Supabase configured to use Resend SMTP for all auth emails

---

## Setup Steps

### Step 1: Add Domain to Cloudflare
1. Create free Cloudflare account at cloudflare.com
2. Add site: `expensed.app`
3. Cloudflare scans existing DNS records
4. Note the 2 nameservers provided (e.g., `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)

### Step 2: Update Nameservers at Spaceship
1. Log into Spaceship
2. Go to Domain Management → expensed.app → DNS/Nameservers
3. Change nameservers to Cloudflare's (from Step 1)
4. Save and wait 5-30 minutes for propagation

### Step 3: Set Up Cloudflare Email Routing
1. In Cloudflare dashboard → expensed.app → Email → Email Routing
2. Enable Email Routing
3. Add destination address (your personal Gmail)
4. Verify destination email
5. Create routing rules:
   - `support@expensed.app` → Gmail
   - `*@expensed.app` (catch-all) → Gmail (optional)

### Step 4: Deploy Frontend to Cloudflare Pages ✅ **COMPLETE**
1. ✅ In Cloudflare dashboard → Workers & Pages → Create
2. ✅ Connected GitHub repo: `JBCox/Expensed`
3. ✅ Configured build:
   - Build command: `npm run build`
   - Build output directory: `dist/expense-app/browser`
   - Root directory: `expense-app`
4. ✅ Set environment variables:
   - `SUPABASE_URL` (from Supabase dashboard)
   - `SUPABASE_ANON_KEY` (from Supabase dashboard)
   - **Note**: Sensitive keys (GOOGLE_VISION_API_KEY, GOOGLE_MAPS_API_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY, ENCRYPTION_MASTER_KEY) are stored in Supabase Secrets, NOT in Cloudflare Pages
5. ✅ Deployed successfully (December 11, 2024)

### Step 5: Configure Custom Domain ✅ **COMPLETE**
1. ✅ In Cloudflare Pages project → Custom domains
2. ✅ Added `expensed.app` (December 11, 2024)
3. ✅ DNS records auto-configured

---

## Environment Variables

### Cloudflare Pages Environment Variables ✅ **CONFIGURED**

Set in Cloudflare Pages dashboard (December 11, 2024):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Secrets ✅ **CONFIGURED**

These are stored securely in Supabase and used by Edge Functions (December 11, 2024):

```
GOOGLE_VISION_API_KEY=your-vision-key
GOOGLE_MAPS_API_KEY=your-maps-key
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
ENCRYPTION_MASTER_KEY=your-32-byte-hex-key
```

**Security Note**: Production `environment.ts` is now tracked in git and contains only public keys (Supabase URL, Supabase Anon Key). All sensitive keys are stored in Supabase Secrets.

### Stripe Configuration ✅ **UPDATED**

Stripe keys were updated to new account (December 11, 2024):
- Previous keys (sk_test_51Q...) have been deprecated
- New production keys (sk_live_51R...) configured in Supabase Secrets
- Old test keys removed from all environment files
- Webhook endpoints updated in Stripe dashboard

---

## Future: Email-to-Expense Feature

Using Cloudflare Email Workers to process incoming emails at `receipts@expensed.app`:

1. User forwards/sends receipt to `receipts@expensed.app`
2. Cloudflare Email Worker receives email
3. Worker extracts attachments (images/PDFs)
4. Calls Supabase Edge Function for OCR
5. Creates expense automatically
6. Sends confirmation email to user

This is a Phase 2+ feature - document exists for planning.

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Cloudflare Pages | $0 (Free tier) |
| Cloudflare Email Routing | $0 (Free) |
| Cloudflare Workers | $0 (Free tier: 100k requests/day) |
| Resend (Email Sending) | $0 (Free tier: 3k emails/month) |
| Supabase | $0-25 (Free tier → Pro when needed) |
| Spaceship Domain | ~$12/year |
| **Total** | **~$1/month** (domain cost amortized) |

---

## Migration from Netlify

Previous hosting was on Netlify (suspended due to credit limit). Migration steps:

1. ✅ Code is ready (same build process)
2. ✅ Domain added to Cloudflare (December 8, 2024)
3. ✅ Nameservers updated at Spaceship → Cloudflare
4. ✅ Email routing configured (inbound via Cloudflare)
5. ✅ Email sending configured (outbound via Resend)
6. ✅ Supabase SMTP configured to use Resend
7. ✅ Deploy frontend to Cloudflare Pages (December 11, 2024)
8. ✅ Custom domain expensed.app configured
9. ✅ Environment variables configured (December 11, 2024)
10. ✅ Netlify can now be disconnected

**Migration Complete**: December 11, 2024

---

## Quick Reference

- **Domain Registrar:** Spaceship
- **DNS/CDN/Hosting:** Cloudflare
- **Email (Inbound):** Cloudflare Email Routing → Gmail
- **Email (Outbound):** Resend (SMTP)
- **Backend/Database/Auth:** Supabase
- **App URL:** https://expensed.app
- **Support Email:** support@expensed.app
- **Transactional Email:** noreply@expensed.app

---

*This document should be updated whenever infrastructure decisions change.*
