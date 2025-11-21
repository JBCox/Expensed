# Process Receipt OCR - Supabase Edge Function

## Overview

This Edge Function securely processes receipt images using Google Vision API. The Google API key is stored as a secret in Supabase and never exposed to the client.

## Setup

### 1. Set the Google Vision API Key as a Secret

```bash
# Set the secret (replace with your actual API key)
supabase secrets set GOOGLE_VISION_API_KEY=your_actual_api_key_here

# Verify the secret is set
supabase secrets list
```

### 2. Deploy the Function

```bash
# Deploy the function
supabase functions deploy process-receipt

# Verify deployment
supabase functions list
```

## Usage

### From Frontend (Angular)

```typescript
const response = await fetch(
  `${environment.supabase.url}/functions/v1/process-receipt`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      image_base64: base64Image,
      receipt_id: receiptId, // Optional: auto-update receipt record
    }),
  }
);

const ocrResult = await response.json();
```

### Request

```json
{
  "image_base64": "base64_encoded_image_data",
  "receipt_id": "uuid-of-receipt" // Optional
}
```

### Response

```json
{
  "merchant": "Shell Gas Station",
  "amount": 45.67,
  "date": "2025-11-15",
  "tax": 3.45,
  "rawText": "Full extracted text...",
  "confidence": {
    "overall": 0.78,
    "merchant": 0.85,
    "amount": 0.75,
    "date": 0.80,
    "tax": 0.70
  }
}
```

## Security

- ✅ Google Vision API key never exposed to client
- ✅ User authentication required (JWT token)
- ✅ User can only process their own receipts
- ✅ CORS configured for your domain
- ✅ Rate limiting via Supabase

## Environment Variables

The function requires these environment variables:

- `GOOGLE_VISION_API_KEY` - Google Cloud Vision API key (secret)
- `SUPABASE_URL` - Automatically provided by Supabase
- `SUPABASE_ANON_KEY` - Automatically provided by Supabase

## Testing Locally

```bash
# Start local development server
supabase functions serve process-receipt

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/process-receipt' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"image_base64":"iVBORw0KGgoAAAANSUh..."}'
```

## Error Handling

The function returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (missing image_base64)
- `401` - Unauthorized (missing or invalid token)
- `500` - Server error (Vision API failure, etc.)

## Performance

- Average processing time: 1-3 seconds
- Google Vision API free tier: 1,000 images/month
- Concurrent execution: Handled by Supabase Edge Runtime

## Monitoring

View function logs:

```bash
# View recent logs
supabase functions logs process-receipt

# Tail logs in real-time
supabase functions logs process-receipt --tail
```
