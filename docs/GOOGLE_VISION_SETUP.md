# Google Vision API Setup Guide

This guide walks you through setting up Google Cloud Vision API for Jensify's SmartScan OCR feature.

---

## Overview

Jensify uses Google Cloud Vision API to extract text from receipt images, including:
- **Merchant name** - The business where the expense occurred
- **Total amount** - The total cost of the transaction
- **Date** - When the transaction occurred
- **Tax amount** - Sales tax charged (if visible)

### Pricing

- **Free Tier**: 1,000 OCR requests per month (resets monthly)
- **After Free Tier**: $1.50 per 1,000 requests
- **Example**: If your team uploads 50 receipts/week = ~200/month = **FREE**

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Jensify-OCR` (or your preferred name)
4. Click **Create**
5. Wait for project creation to complete (~30 seconds)

---

## Step 2: Enable Vision API

1. In Google Cloud Console, ensure your new project is selected
2. Navigate to **APIs & Services** → **Library**
3. Search for "**Cloud Vision API**"
4. Click on **Cloud Vision API** in the results
5. Click **Enable**
6. Wait for API to be enabled (~10 seconds)

---

## Step 3: Create API Key

### Option A: Using Google Cloud Console (Recommended)

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. Your API key will be created and displayed
4. **IMPORTANT**: Click **Restrict Key** to secure it:
   - Under "API restrictions", select **Restrict key**
   - Check **Cloud Vision API** only
   - Under "Application restrictions", select:
     - **HTTP referrers (web sites)** for production
     - Add your domain: `https://yourdomain.com/*`
     - For development, you can leave unrestricted or use IP restrictions
5. Click **Save**
6. Copy your API key (looks like: `AIzaSyB...`)

### Option B: Using gcloud CLI

```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project jensify-ocr

# Create API key
gcloud alpha services api-keys create \
  --display-name="Jensify OCR Key" \
  --api-target=service=vision.googleapis.com
```

---

## Step 4: Configure Jensify

### Development Environment

1. Open `expense-app/src/environments/environment.development.ts`
2. Add your API key:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  },
  apiUrl: 'http://localhost:4200',
  simulateOcr: false, // ✅ Set to false to use real OCR
  googleVisionApiKey: 'AIzaSyB...' // ✅ Paste your API key here
};
```

3. Save the file

### Production Environment

**IMPORTANT**: Never commit API keys to version control!

1. Create a `.env` file in the project root (this file is gitignored):

```bash
# .env
GOOGLE_VISION_API_KEY=AIzaSyB...
```

2. Configure your hosting platform to use environment variables:

#### Vercel
```bash
vercel env add GOOGLE_VISION_API_KEY
# Paste your API key when prompted
```

#### Netlify
1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Click **Add variable**
3. Name: `GOOGLE_VISION_API_KEY`
4. Value: Your API key

#### Firebase Hosting
```bash
firebase functions:config:set google.vision.key="AIzaSyB..."
```

3. Update `expense-app/src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  },
  simulateOcr: false,
  googleVisionApiKey: process.env['GOOGLE_VISION_API_KEY'] || ''
};
```

---

## Step 5: Test OCR

### 5.1 Run Development Server

```bash
cd expense-app
npm start
```

### 5.2 Upload a Test Receipt

1. Navigate to **Upload Receipt** in the app
2. Upload a receipt image (gas receipt, restaurant receipt, etc.)
3. Watch the SmartScan status:
   - **Processing**: OCR is running
   - **Completed**: OCR succeeded
   - **Failed**: OCR failed (check console for errors)

### 5.3 Verify Extracted Data

1. After upload completes, you'll be redirected to **New Expense** form
2. Check that the following fields are auto-filled:
   - **Merchant**: Should match the business name on the receipt
   - **Amount**: Should match the total on the receipt
   - **Date**: Should match the transaction date
   - **Tax**: Should match the sales tax (if visible)
3. Verify the **SmartScan Status** indicator shows confidence scores

### 5.4 Check Console Logs

Open browser DevTools (F12) and check for:

```
[OCR] Extraction complete: {
  merchant: "Shell Gas Station",
  amount: 45.23,
  date: "2025-11-15",
  tax: 3.45,
  confidence: {
    merchant: 0.85,
    amount: 0.9,
    date: 0.85,
    tax: 0.8,
    overall: 0.85
  }
}
```

---

## Troubleshooting

### Error: "Vision API error: 403 Forbidden"

**Cause**: API key restrictions are blocking the request

**Solutions**:
1. Check that Vision API is enabled in your project
2. Verify API key restrictions allow Vision API
3. If using HTTP referrers, ensure your domain is whitelisted
4. For development, temporarily remove restrictions to test

### Error: "No text detected in image"

**Cause**: Receipt image is poor quality or blank

**Solutions**:
1. Ensure image is clear and well-lit
2. Check that receipt text is readable
3. Try a different image format (JPEG vs PNG)
4. Ensure image is not upside down or rotated

### Error: "Failed to process receipt"

**Cause**: Network error or API quota exceeded

**Solutions**:
1. Check internet connection
2. Verify API key is correct
3. Check Google Cloud Console for quota usage:
   - Navigate to **APIs & Services** → **Dashboard**
   - Click **Cloud Vision API**
   - Check **Quotas & System Limits**
4. If quota exceeded, wait for monthly reset or upgrade billing

### Low Confidence Scores

**Cause**: Receipt text is difficult to read

**Solutions**:
1. Improve image quality:
   - Better lighting
   - Higher resolution camera
   - Flatten folded receipts
2. Manually correct extracted data in the expense form
3. OCR learns from corrections over time (future feature)

### Simulated OCR Still Running

**Cause**: `simulateOcr` flag is still `true`

**Solution**: Check `environment.development.ts` and set:
```typescript
simulateOcr: false
```

---

## Monitoring Usage

### Track OCR Requests

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Dashboard**
4. Click **Cloud Vision API**
5. View metrics:
   - **Traffic**: Requests per day
   - **Errors**: Failed requests
   - **Latency**: Response time

### Set Up Alerts

1. Navigate to **Monitoring** → **Alerting**
2. Click **+ Create Policy**
3. Configure alert for quota usage:
   - **Metric**: Cloud Vision API → Quota usage
   - **Threshold**: 80% of free tier (800 requests)
   - **Notification**: Email your team
4. Click **Save**

---

## Cost Optimization

### Tips to Stay Within Free Tier

1. **Batch Processing**: Process multiple receipts during off-hours
2. **Caching**: Store OCR results to avoid re-processing
3. **Quality Gates**: Reject poor-quality images before OCR
4. **User Education**: Train users to take clear photos
5. **Manual Override**: Allow users to skip OCR for simple receipts

### If You Exceed Free Tier

- **Cost**: $1.50 per 1,000 requests
- **Example**: 2,000 receipts/month = 1,000 free + 1,000 paid = **$1.50/month**
- **ROI**: Saves 2-3 minutes per receipt × 2,000 = **66+ hours/month**

---

## Security Best Practices

### Do Not:
- ❌ Commit API keys to version control
- ❌ Share API keys in Slack/email
- ❌ Use unrestricted API keys in production
- ❌ Hardcode keys in frontend code

### Do:
- ✅ Use environment variables
- ✅ Restrict API keys to Vision API only
- ✅ Rotate keys every 90 days
- ✅ Monitor usage for suspicious activity
- ✅ Use HTTP referrer restrictions in production

### Key Rotation

1. Create new API key in Google Cloud Console
2. Update environment variables in all environments
3. Test thoroughly
4. Delete old API key after 24 hours

---

## Next Steps

1. ✅ Set up Google Cloud project and enable Vision API
2. ✅ Create and configure API key
3. ✅ Add API key to environment files
4. ✅ Test OCR with real receipts
5. ✅ Monitor usage and costs
6. 🔄 Train team on taking clear receipt photos
7. 🔄 Implement user feedback loop for OCR accuracy

---

## Support

- **Google Cloud Vision Docs**: https://cloud.google.com/vision/docs
- **Pricing Calculator**: https://cloud.google.com/vision/pricing
- **API Reference**: https://cloud.google.com/vision/docs/reference/rest
- **Jensify Issues**: https://github.com/JBCox/Jensify/issues

---

**Last Updated**: November 15, 2025
**Version**: 1.0.0
