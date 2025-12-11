/**
 * Supabase Edge Function: Stripe Direct Integration
 * ==================================================
 *
 * SECURITY ARCHITECTURE:
 * ----------------------
 * 1. AES-256-GCM encryption for Stripe API keys
 * 2. PBKDF2 key derivation (100,000 iterations)
 * 3. Per-organization salt and IV
 * 4. Master Encryption Key (MEK) stored in environment only
 * 5. Rate limiting enforced at database level
 * 6. Complete audit trail for compliance
 *
 * ENCRYPTION FLOW:
 * ---------------
 * Encrypt: plaintext -> PBKDF2(MEK + salt + orgId) -> AES-256-GCM -> ciphertext
 * Decrypt: ciphertext -> PBKDF2(MEK + salt + orgId) -> AES-256-GCM -> plaintext
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * ------------------------------
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 * - ENCRYPTION_MASTER_KEY (32+ char secret key)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Allowed origins for CORS (includes localhost for development)
const ALLOWED_ORIGINS = [
  "https://expensed.app",
  "https://www.expensed.app",
  "https://bfudcugrarerqvvyfpoz.supabase.co",
  "http://localhost:4200",
  "http://localhost:4201",
  "http://127.0.0.1:4200"
];

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: "AES-GCM",
  keyLength: 256,
  ivLength: 12,       // 96 bits for GCM
  saltLength: 16,     // 128 bits
  pbkdf2Iterations: 100000,
  hashAlgorithm: "SHA-256"
};

// ============================================================================
// CORS HELPERS
// ============================================================================

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true"
  };
}

// ============================================================================
// ENCRYPTION UTILITIES (AES-256-GCM via Web Crypto API)
// ============================================================================

/**
 * Derives an encryption key from the master key using PBKDF2
 */
async function deriveKey(
  masterKey: string,
  salt: Uint8Array,
  organizationId: string
): Promise<CryptoKey> {
  // Combine master key with organization ID for per-org key isolation
  const keyMaterial = new TextEncoder().encode(masterKey + organizationId);

  // Import as raw key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
      hash: ENCRYPTION_CONFIG.hashAlgorithm
    },
    baseKey,
    {
      name: ENCRYPTION_CONFIG.algorithm,
      length: ENCRYPTION_CONFIG.keyLength
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a Stripe API key using AES-256-GCM
 */
async function encryptStripeKey(
  stripeKey: string,
  organizationId: string
): Promise<{
  encryptedKey: string;
  iv: string;
  salt: string;
  keyHash: string;
}> {
  const masterKey = Deno.env.get("ENCRYPTION_MASTER_KEY");
  if (!masterKey || masterKey.length < 32) {
    throw new Error("ENCRYPTION_MASTER_KEY not configured or too short (min 32 chars)");
  }

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.saltLength));
  const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));

  // Derive encryption key
  const encryptionKey = await deriveKey(masterKey, salt, organizationId);

  // Encrypt the Stripe key
  const encodedKey = new TextEncoder().encode(stripeKey);
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_CONFIG.algorithm,
      iv: iv
    },
    encryptionKey,
    encodedKey
  );

  // Create SHA-256 hash of plaintext for integrity verification
  const hashBuffer = await crypto.subtle.digest(
    ENCRYPTION_CONFIG.hashAlgorithm,
    encodedKey
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return base64 encoded values
  return {
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    keyHash: keyHash
  };
}

/**
 * Decrypts a Stripe API key using AES-256-GCM
 */
async function decryptStripeKey(
  encryptedKey: string,
  iv: string,
  salt: string,
  organizationId: string,
  expectedHash?: string
): Promise<string> {
  const masterKey = Deno.env.get("ENCRYPTION_MASTER_KEY");
  if (!masterKey || masterKey.length < 32) {
    throw new Error("ENCRYPTION_MASTER_KEY not configured or too short");
  }

  // Decode base64 values
  const encryptedData = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

  // Derive decryption key
  const decryptionKey = await deriveKey(masterKey, saltBytes, organizationId);

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_CONFIG.algorithm,
      iv: ivBytes
    },
    decryptionKey,
    encryptedData
  );

  const stripeKey = new TextDecoder().decode(decryptedData);

  // Verify hash if provided
  if (expectedHash) {
    const hashBuffer = await crypto.subtle.digest(
      ENCRYPTION_CONFIG.hashAlgorithm,
      new TextEncoder().encode(stripeKey)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (actualHash !== expectedHash) {
      throw new Error("Key integrity check failed - hash mismatch");
    }
  }

  return stripeKey;
}

/**
 * Get the organization's Stripe API key from encrypted storage
 */
async function getOrgStripeKey(
  serviceClient: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  // Call the SECURITY DEFINER function to get encrypted data
  const { data, error } = await serviceClient.rpc('get_org_stripe_key', {
    p_organization_id: organizationId
  });

  if (error) {
    console.error("Failed to get org Stripe key:", error);
    return null;
  }

  // Check for rate limit or not found
  if (!data?.success) {
    if (data?.code === 'RATE_LIMIT_EXCEEDED') {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }
    return null;
  }

  // Decrypt the key
  try {
    return await decryptStripeKey(
      data.encrypted_key,
      data.iv,
      data.salt,
      organizationId,
      data.key_hash
    );
  } catch (decryptError) {
    console.error("Failed to decrypt Stripe key:", decryptError);
    throw new Error("Failed to decrypt Stripe key - key may be corrupted");
  }
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client with user auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse request
    const { action, ...params } = await req.json();

    // Service client for privileged operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Route to appropriate handler
    switch (action) {
      // Stripe Key Management (Admin only)
      case "set_stripe_key":
        return await handleSetStripeKey(supabaseClient, serviceClient, user, params, corsHeaders);
      case "get_stripe_status":
        return await handleGetStripeStatus(supabaseClient, serviceClient, user, params, corsHeaders);
      case "remove_stripe_key":
        return await handleRemoveStripeKey(supabaseClient, serviceClient, user, params, corsHeaders);
      case "test_stripe_key":
        return await handleTestStripeKey(supabaseClient, serviceClient, user, params, corsHeaders);

      // Payout Method Management
      case "update_payout_method":
        return await handleUpdatePayoutMethod(supabaseClient, serviceClient, user, params, corsHeaders);
      case "get_account_status":
        return await handleGetStripeStatus(supabaseClient, serviceClient, user, params, corsHeaders);

      // Bank Account Management (Employees)
      case "create_bank_account":
        return await handleCreateBankAccount(supabaseClient, serviceClient, user, params, corsHeaders);
      case "verify_bank_account":
        return await handleVerifyBankAccount(supabaseClient, serviceClient, user, params, corsHeaders);

      // Payout Processing (Finance/Admin)
      case "create_payout":
        return await handleCreatePayout(supabaseClient, serviceClient, user, params, corsHeaders);
      case "get_payout_status":
        return await handleGetPayoutStatus(supabaseClient, user, params, corsHeaders);

      // Audit & Status
      case "get_secret_audit_log":
        return await handleGetSecretAuditLog(supabaseClient, user, params, corsHeaders);

      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// ============================================================================
// STRIPE KEY MANAGEMENT (Admin only)
// ============================================================================

/**
 * Set the organization's Stripe API key
 * Admin only - key is encrypted with AES-256-GCM before storage
 */
async function handleSetStripeKey(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string; email?: string },
  params: { organization_id: string; stripe_key: string },
  corsHeaders: Record<string, string>
) {
  const { organization_id, stripe_key } = params;

  // Validate key format
  if (!stripe_key || (!stripe_key.startsWith('sk_test_') && !stripe_key.startsWith('sk_live_'))) {
    return new Response(JSON.stringify({
      error: "Invalid Stripe key format. Must start with 'sk_test_' or 'sk_live_'"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Verify admin role
  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (memberError || !membership || membership.role !== "admin") {
    return new Response(JSON.stringify({
      error: "Only organization admins can configure Stripe"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Test the key against Stripe API first
  const testResponse = await fetch("https://api.stripe.com/v1/balance", {
    headers: {
      "Authorization": `Bearer ${stripe_key}`
    }
  });

  if (!testResponse.ok) {
    const error = await testResponse.json();
    return new Response(JSON.stringify({
      error: "Invalid Stripe API key",
      message: error.error?.message || "Key validation failed"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Verify master encryption key is configured
  const masterKey = Deno.env.get("ENCRYPTION_MASTER_KEY");
  if (!masterKey || masterKey.length < 32) {
    console.error("ENCRYPTION_MASTER_KEY not configured!");
    return new Response(JSON.stringify({
      error: "Server encryption not configured. Contact administrator."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Encrypt the key
  let encryptedData;
  try {
    encryptedData = await encryptStripeKey(stripe_key, organization_id);
  } catch (encryptError) {
    console.error("Encryption failed:", encryptError);
    return new Response(JSON.stringify({
      error: "Failed to encrypt key. Contact administrator."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Determine key mode and extract metadata
  const keyMode = stripe_key.startsWith('sk_test_') ? 'test' : 'live';
  const keyPrefix = stripe_key.substring(0, 8);
  const keyLast4 = stripe_key.slice(-4);

  // Store encrypted key via SECURITY DEFINER function
  const { data, error } = await serviceClient.rpc('set_org_stripe_key', {
    p_organization_id: organization_id,
    p_encrypted_key: encryptedData.encryptedKey,
    p_iv: encryptedData.iv,
    p_salt: encryptedData.salt,
    p_key_hash: encryptedData.keyHash,
    p_key_last_four: keyLast4,
    p_key_mode: keyMode,
    p_key_prefix: keyPrefix,
    p_set_by: user.id,
    p_encryption_version: 1
  });

  if (error) {
    console.error("Failed to store Stripe key:", error);
    return new Response(JSON.stringify({
      error: "Failed to store Stripe key",
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Check for rate limit
  if (data && !data.success) {
    return new Response(JSON.stringify({
      error: data.error || "Failed to store key",
      code: data.code
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Update organization payout method
  await supabase
    .from("organizations")
    .update({
      payout_method: "stripe",
      stripe_account_status: "active"
    })
    .eq("id", organization_id);

  return new Response(JSON.stringify({
    success: true,
    message: "Stripe API key configured successfully",
    key_mode: keyMode,
    key_last4: keyLast4,
    rotated: data?.rotated || false
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Get the status of the organization's Stripe configuration
 * Returns non-sensitive metadata only
 */
async function handleGetStripeStatus(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { organization_id: string },
  corsHeaders: Record<string, string>
) {
  const { organization_id } = params;

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({
      error: "Not a member of this organization"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get status via SECURITY DEFINER function
  const { data: status, error } = await serviceClient.rpc('get_org_stripe_status', {
    p_organization_id: organization_id
  });

  if (error) {
    console.error("Failed to get Stripe status:", error);
    return new Response(JSON.stringify({
      connected: false,
      has_key: false,
      payout_method: "manual"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get payout method from organization
  const { data: org } = await supabase
    .from("organizations")
    .select("payout_method")
    .eq("id", organization_id)
    .single();

  return new Response(JSON.stringify({
    connected: status?.has_key || false,
    has_key: status?.has_key || false,
    key_last4: status?.key_last4 || null,
    key_mode: status?.key_mode || null,
    key_prefix: status?.key_prefix || null,
    key_set_at: status?.set_at || null,
    last_accessed_at: status?.last_accessed_at || null,
    access_count: status?.access_count || 0,
    was_rotated: status?.was_rotated || false,
    rotated_at: status?.rotated_at || null,
    expires_at: status?.expires_at || null,
    payout_method: org?.payout_method || "manual",
    status: status?.has_key ? "active" : "not_connected"
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Remove the organization's Stripe API key
 */
async function handleRemoveStripeKey(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { organization_id: string },
  corsHeaders: Record<string, string>
) {
  const { organization_id } = params;

  // Verify admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || membership.role !== "admin") {
    return new Response(JSON.stringify({
      error: "Only admins can remove Stripe configuration"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Remove key via SECURITY DEFINER function
  const { data, error } = await serviceClient.rpc('remove_org_stripe_key', {
    p_organization_id: organization_id
  });

  if (error) {
    console.error("Failed to remove Stripe key:", error);
    return new Response(JSON.stringify({
      error: "Failed to remove Stripe key"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (data && !data.success) {
    return new Response(JSON.stringify({
      error: data.error || "Failed to remove key",
      code: data.code
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Update organization status
  await supabase
    .from("organizations")
    .update({
      payout_method: "manual",
      stripe_account_status: "not_connected"
    })
    .eq("id", organization_id);

  return new Response(JSON.stringify({
    success: true,
    message: "Stripe configuration removed"
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Test a Stripe API key before storing
 */
async function handleTestStripeKey(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { stripe_key: string; organization_id: string },
  corsHeaders: Record<string, string>
) {
  const { stripe_key, organization_id } = params;

  if (!organization_id) {
    return new Response(JSON.stringify({
      error: "Organization ID is required"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Verify user is an admin of the organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || membership.role !== "admin") {
    return new Response(JSON.stringify({
      error: "Only organization admins can test Stripe keys"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Basic format validation
  if (!stripe_key || (!stripe_key.startsWith('sk_test_') && !stripe_key.startsWith('sk_live_'))) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Invalid key format. Must start with 'sk_test_' or 'sk_live_'"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Check rate limit
  const { data: rateCheck } = await serviceClient.rpc('check_secret_rate_limit', {
    p_organization_id: organization_id,
    p_operation: 'key_test',
    p_max_attempts: 5
  });

  if (rateCheck === false) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Rate limit exceeded. Please wait before testing again."
    }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Test the key against Stripe
  const testResponse = await fetch("https://api.stripe.com/v1/balance", {
    headers: {
      "Authorization": `Bearer ${stripe_key}`
    }
  });

  if (!testResponse.ok) {
    const error = await testResponse.json();
    return new Response(JSON.stringify({
      valid: false,
      error: error.error?.message || "Invalid key"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const balance = await testResponse.json();
  const keyMode = stripe_key.startsWith('sk_test_') ? 'test' : 'live';

  return new Response(JSON.stringify({
    valid: true,
    livemode: balance.livemode,
    key_mode: keyMode,
    currency: balance.available?.[0]?.currency || "usd",
    available_balance: balance.available?.[0]?.amount || 0,
    pending_balance: balance.pending?.[0]?.amount || 0
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Get secret access audit log (Admin only)
 */
async function handleGetSecretAuditLog(
  supabase: SupabaseClient,
  user: { id: string },
  params: { organization_id: string; limit?: number; offset?: number },
  corsHeaders: Record<string, string>
) {
  const { organization_id, limit = 50, offset = 0 } = params;

  // Verify admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || membership.role !== "admin") {
    return new Response(JSON.stringify({
      error: "Only admins can view audit logs"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get audit logs (RLS will enforce org access)
  const { data: logs, error } = await supabase
    .from("secret_access_log")
    .select("*")
    .eq("organization_id", organization_id)
    .order("performed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to get audit logs:", error);
    return new Response(JSON.stringify({
      error: "Failed to retrieve audit logs"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    logs: logs || [],
    count: logs?.length || 0
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ============================================================================
// PAYOUT METHOD MANAGEMENT
// ============================================================================

/**
 * Update organization payout method
 */
async function handleUpdatePayoutMethod(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { organization_id: string; payout_method: string },
  corsHeaders: Record<string, string>
) {
  const { organization_id, payout_method } = params;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || membership.role !== "admin") {
    return new Response(JSON.stringify({
      error: "Only admins can change payout method"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // If switching to stripe, verify key is configured
  if (payout_method === "stripe") {
    const stripeKey = await getOrgStripeKey(serviceClient, organization_id);
    if (!stripeKey) {
      return new Response(JSON.stringify({
        error: "Please configure your Stripe API key first"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  await supabase
    .from("organizations")
    .update({ payout_method })
    .eq("id", organization_id);

  return new Response(JSON.stringify({
    success: true,
    payout_method
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ============================================================================
// BANK ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Create a tokenized bank account for an employee
 */
async function handleCreateBankAccount(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string; email?: string },
  params: { organization_id: string; bank_account_token: string },
  corsHeaders: Record<string, string>
) {
  const { organization_id, bank_account_token } = params;

  // Get org's Stripe key
  let stripeKey: string | null;
  try {
    stripeKey = await getOrgStripeKey(serviceClient, organization_id);
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get Stripe key"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({
      error: "Not a member of this organization"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get or create Stripe customer
  let customerId: string;
  const { data: existing } = await supabase
    .from("employee_bank_accounts")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .single();

  if (existing?.stripe_customer_id) {
    customerId = existing.stripe_customer_id;
  } else {
    const customerResponse = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "email": user.email || "",
        "metadata[user_id]": user.id,
        "metadata[organization_id]": organization_id
      })
    });

    if (!customerResponse.ok) {
      return new Response(JSON.stringify({
        error: "Failed to create payment profile"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const customer = await customerResponse.json();
    customerId = customer.id;
  }

  // Attach bank account token
  const bankResponse = await fetch(
    `https://api.stripe.com/v1/customers/${customerId}/sources`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "source": bank_account_token
      })
    }
  );

  if (!bankResponse.ok) {
    const error = await bankResponse.text();
    console.error("Bank account error:", error);
    return new Response(JSON.stringify({
      error: "Failed to add bank account"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const bankAccount = await bankResponse.json();

  // Check if first account
  const { count } = await supabase
    .from("employee_bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("organization_id", organization_id);

  const isFirst = (count || 0) === 0;

  // Save to database
  const { data: saved, error: saveError } = await supabase
    .from("employee_bank_accounts")
    .insert({
      user_id: user.id,
      organization_id,
      stripe_bank_account_id: bankAccount.id,
      stripe_customer_id: customerId,
      bank_name: bankAccount.bank_name,
      account_holder_name: bankAccount.account_holder_name,
      last_four: bankAccount.last4,
      is_default: isFirst,
      verification_status: "pending"
    })
    .select()
    .single();

  if (saveError) {
    return new Response(JSON.stringify({
      error: "Failed to save bank account"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    bank_account: {
      id: saved.id,
      bank_name: bankAccount.bank_name,
      last_four: bankAccount.last4,
      is_default: isFirst
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Verify bank account with micro-deposits
 */
async function handleVerifyBankAccount(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { bank_account_id: string; amounts: number[]; organization_id: string },
  corsHeaders: Record<string, string>
) {
  const { bank_account_id, amounts, organization_id } = params;

  // Get org's Stripe key
  let stripeKey: string | null;
  try {
    stripeKey = await getOrgStripeKey(serviceClient, organization_id);
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get Stripe key"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: bankAccount } = await supabase
    .from("employee_bank_accounts")
    .select("stripe_bank_account_id, stripe_customer_id")
    .eq("id", bank_account_id)
    .eq("user_id", user.id)
    .single();

  if (!bankAccount) {
    return new Response(JSON.stringify({
      error: "Bank account not found"
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const verifyResponse = await fetch(
    `https://api.stripe.com/v1/customers/${bankAccount.stripe_customer_id}/sources/${bankAccount.stripe_bank_account_id}/verify`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "amounts[0]": amounts[0].toString(),
        "amounts[1]": amounts[1].toString()
      })
    }
  );

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    return new Response(JSON.stringify({
      error: "Verification failed",
      message: error.error?.message
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  await supabase
    .from("employee_bank_accounts")
    .update({
      is_verified: true,
      verification_status: "verified",
      verified_at: new Date().toISOString()
    })
    .eq("id", bank_account_id);

  return new Response(JSON.stringify({
    success: true,
    verified: true
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ============================================================================
// PAYOUT PROCESSING
// ============================================================================

/**
 * Create a payout to an employee using org's Stripe key
 */
async function handleCreatePayout(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  user: { id: string },
  params: { organization_id: string; employee_user_id: string; amount_cents: number; expense_ids: string[] },
  corsHeaders: Record<string, string>
) {
  const { organization_id, employee_user_id, amount_cents, expense_ids } = params;

  // Get org's Stripe key
  let stripeKey: string | null;
  try {
    stripeKey = await getOrgStripeKey(serviceClient, organization_id);
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get Stripe key"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe. Please add your Stripe API key in settings."
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Verify finance/admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership || !['admin', 'finance'].includes(membership.role)) {
    return new Response(JSON.stringify({
      error: "Only finance or admin can create payouts"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Get employee's bank account
  const { data: bankAccount } = await supabase
    .from("employee_bank_accounts")
    .select("id, stripe_customer_id, stripe_bank_account_id, is_verified")
    .eq("user_id", employee_user_id)
    .eq("organization_id", organization_id)
    .eq("is_default", true)
    .single();

  if (!bankAccount) {
    return new Response(JSON.stringify({
      error: "Employee has no bank account configured"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!bankAccount.is_verified) {
    return new Response(JSON.stringify({
      error: "Employee's bank account is not verified"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Create payout record first
  const { data: payoutRecord, error: payoutError } = await supabase
    .from("payouts")
    .insert({
      organization_id,
      user_id: employee_user_id,
      bank_account_id: bankAccount.id,
      amount_cents,
      payout_method: "stripe_ach",
      status: "processing",
      expense_ids,
      initiated_by: user.id,
      initiated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (payoutError) {
    console.error("Failed to create payout record:", payoutError);
    return new Response(JSON.stringify({
      error: "Failed to create payout record"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Create transfer via Stripe
  const transferResponse = await fetch("https://api.stripe.com/v1/transfers", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      "amount": amount_cents.toString(),
      "currency": "usd",
      "destination": bankAccount.stripe_customer_id,
      "metadata[payout_id]": payoutRecord.id,
      "metadata[employee_id]": employee_user_id,
      "metadata[expense_ids]": expense_ids.join(",")
    })
  });

  if (!transferResponse.ok) {
    const error = await transferResponse.json();
    console.error("Stripe transfer failed:", error);

    // Update payout as failed
    await supabase
      .from("payouts")
      .update({
        status: "failed",
        failure_reason: error.error?.message || "Transfer failed",
        failed_at: new Date().toISOString()
      })
      .eq("id", payoutRecord.id);

    return new Response(JSON.stringify({
      error: "Payout failed",
      message: error.error?.message || "Transfer failed"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const transfer = await transferResponse.json();

  // Update payout record with Stripe details
  await supabase
    .from("payouts")
    .update({
      stripe_payout_id: transfer.id,
      status: "in_transit"
    })
    .eq("id", payoutRecord.id);

  // Mark expenses as reimbursed
  if (expense_ids && expense_ids.length > 0) {
    await supabase
      .from("expenses")
      .update({
        status: "reimbursed",
        reimbursed_at: new Date().toISOString(),
        reimbursed_by: user.id
      })
      .in("id", expense_ids);
  }

  return new Response(JSON.stringify({
    success: true,
    payout: {
      id: payoutRecord.id,
      amount_cents,
      status: "in_transit",
      stripe_transfer_id: transfer.id
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

/**
 * Get payout status
 * SECURITY: Verify user has access to this payout's organization
 */
async function handleGetPayoutStatus(
  supabase: SupabaseClient,
  user: { id: string },
  params: { payout_id: string },
  corsHeaders: Record<string, string>
) {
  const { payout_id } = params;

  // First get the payout to find its organization
  const { data: payout } = await supabase
    .from("payouts")
    .select("*, organization_id")
    .eq("id", payout_id)
    .single();

  if (!payout) {
    return new Response(JSON.stringify({
      error: "Payout not found"
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // SECURITY: Verify user is a member of this payout's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", payout.organization_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return new Response(JSON.stringify({
      error: "Access denied"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify(payout), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
