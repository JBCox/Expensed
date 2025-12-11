# Stripe Setup Guide

This guide covers setting up Stripe for Expensed billing and subscription management.

## Prerequisites

- Stripe account (https://dashboard.stripe.com)
- Supabase project with Edge Functions enabled
- Access to environment variables configuration

## 1. Stripe Account Setup

### Create Products and Prices

In Stripe Dashboard → Products, create the following:

| Product | Monthly Price | Annual Price | Features |
|---------|---------------|--------------|----------|
| Starter | $29/month | $290/year | 10 users, 100 receipts/month |
| Professional | $79/month | $790/year | 25 users, unlimited receipts |
| Business | $199/month | $1990/year | 100 users, advanced features |
| Enterprise | Custom | Custom | Unlimited, dedicated support |

### Get Price IDs

After creating products, copy the price IDs (format: `price_xxxxx`) and update your database:

```sql
-- Update subscription_plans with Stripe IDs
UPDATE subscription_plans
SET
  stripe_product_id = 'prod_YOUR_PRODUCT_ID',
  stripe_monthly_price_id = 'price_YOUR_MONTHLY_PRICE_ID',
  stripe_annual_price_id = 'price_YOUR_ANNUAL_PRICE_ID'
WHERE name = 'starter';

-- Repeat for each plan
```

## 2. Webhook Configuration

### Required Webhook Events

Configure webhooks in Stripe Dashboard → Developers → Webhooks:

**Endpoint URL:** `https://bfudcugrarerqvvyfpoz.supabase.co/functions/v1/stripe-webhooks`

**Events to subscribe:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Plan change, renewal
- `customer.subscription.deleted` - Subscription canceled
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed
- `customer.created` - New customer
- `customer.deleted` - Customer removed

### Get Webhook Secret

After creating the webhook, copy the signing secret (`whsec_xxxxx`) and add to environment variables.

## 3. Environment Variables

Add these to Supabase Edge Functions secrets:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxxxx          # or sk_test_xxxxx for testing
STRIPE_WEBHOOK_SECRET=whsec_xxxxx        # From webhook settings

# App Configuration
APP_URL=https://expensed.app             # Your production URL
```

### Setting Secrets via Supabase CLI

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set APP_URL=https://expensed.app
```

## 4. Testing Webhooks Locally

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

### Forward Webhooks to Local

```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to local Edge Function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks

# Note the webhook signing secret (whsec_xxxxx) shown in output
# Use this for local testing
```

### Trigger Test Events

```bash
# Trigger a test checkout session completion
stripe trigger checkout.session.completed

# Trigger subscription events
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

## 5. Testing Checkout Flow

### Test Mode Cards

| Scenario | Card Number | CVC | Expiry |
|----------|-------------|-----|--------|
| Success | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Decline | 4000 0000 0000 0002 | Any | Any |
| Requires Auth | 4000 0025 0000 3155 | Any | Any |
| Insufficient Funds | 4000 0000 0000 9995 | Any | Any |

### Test Flow

1. Login to Expensed as org admin
2. Go to Organization → Billing
3. Click "Upgrade to Starter"
4. Use test card `4242 4242 4242 4242`
5. Complete checkout
6. Verify webhook received and subscription activated

## 6. Production Checklist

Before going live:

- [ ] Switch from test keys (`sk_test_`) to live keys (`sk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Update `APP_URL` environment variable
- [ ] Test complete checkout flow with real card (refund after)
- [ ] Verify all webhook events are being received
- [ ] Check audit logs for subscription events
- [ ] Test email notifications for billing events

## 7. Troubleshooting

### Webhook Signature Verification Failed

- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint
- Check that raw body is being used (not parsed JSON)

### Checkout Session Not Creating Subscription

- Verify Stripe price IDs are correct in database
- Check Edge Function logs for errors
- Ensure customer has valid payment method

### Subscription Status Not Updating

- Check webhook endpoint is receiving events
- Verify webhook events are enabled in Stripe Dashboard
- Check `stripe-webhooks` Edge Function logs

## 8. Monitoring

### Stripe Dashboard

- Monitor failed payments: Dashboard → Payments → Failed
- View subscriptions: Dashboard → Billing → Subscriptions
- Check webhook deliveries: Developers → Webhooks → [endpoint] → Attempts

### Supabase Logs

```bash
# View Edge Function logs
supabase functions logs stripe-billing
supabase functions logs stripe-webhooks
```

### Audit Trail

Query the `subscription_audit_log` table for billing events:

```sql
SELECT * FROM subscription_audit_log
WHERE action LIKE '%subscription%'
ORDER BY created_at DESC
LIMIT 50;
```
