export const environment = {
  production: true,
  supabase: {
    url: 'https://bfudcugrarerqvvyfpoz.supabase.co',
    // SECURITY: Anon key is SAFE to expose in frontend code
    // - Protected by Row Level Security (RLS) policies
    // - Only grants public (anon) role permissions
    // - Service role key is NEVER exposed to client
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWRjdWdyYXJlcnF2dnlmcG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzkzMDUsImV4cCI6MjA3ODYxNTMwNX0.hWAIKd3Pf9k35gkVmenuxLG1pPlOStdJP0d7B09LYnw'
  },
  apiUrl: 'https://expensed.app', // Production URL
  simulateOcr: false,
  // Google Vision API key removed - now handled securely in Supabase Edge Function
  // OCR processing is done server-side via Edge Function: /functions/v1/process-receipt
  // Google Maps API key removed - now handled securely in Supabase Edge Function
  // Maps calls are proxied server-side via Edge Function: /functions/v1/google-maps-proxy
  // Set API key with: supabase secrets set GOOGLE_MAPS_API_KEY=your_key
  stripe: {
    // SECURITY: Stripe publishable key is SAFE to expose in frontend code
    // - Publishable keys (pk_*) are meant to be public
    // - Only used for Stripe.js initialization and creating tokens
    // - Secret key (sk_*) is NEVER exposed and only used server-side
    // TODO: Replace with pk_live_* key before production deployment
    // Get from Stripe Dashboard > Developers > API keys > Publishable key
    publishableKey: 'pk_test_51SbVxrCm7JRiPJhimwpQhitpuAgIyjfpTmLvwSFxbWHetxjNFKyKItieTaUlcBRpbZ0MFdpz5CY1VXO3HOleqwg800deWY675R'
  }
};
