/**
 * Supabase Edge Function: Stripe Direct Integration
 *
 * Each organization uses their own Stripe API key for payouts.
 * Keys are encrypted and stored in the organization_secrets table.
 *
 * Features:
 * - Manage organization Stripe API keys (set/remove/status)
 * - Create employee bank account tokens
 * - Process direct payouts to employees
 *
 * SECURITY:
 * - Stripe keys are encrypted at rest using pgcrypto
 * - Only org admins can set/remove keys
 * - Keys are retrieved via SECURITY DEFINER function
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins
const ALLOWED_ORIGINS = [
  "https://bfudcugrarerqvvyfpoz.supabase.co",
  "http://localhost:4200",
  "http://localhost:3000"
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true"
  };
}

/**
 * Get the organization's Stripe API key from encrypted storage
 * Uses the service role to call the security definer function
 */
async function getOrgStripeKey(organizationId: string): Promise<string | null> {
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await serviceClient.rpc('get_org_stripe_key', {
    p_organization_id: organizationId
  });

  if (error) {
    console.error("Failed to get org Stripe key:", error);
    return null;
  }

  return data;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Initialize Supabase client with user auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader
          }
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Parse request
    const { action, ...params } = await req.json();

    // Route to appropriate handler
    switch (action) {
      // Stripe Key Management (Admin only)
      case "set_stripe_key":
        return await handleSetStripeKey(supabaseClient, user, params, corsHeaders);
      case "get_stripe_status":
        return await handleGetStripeStatus(supabaseClient, user, params, corsHeaders);
      case "remove_stripe_key":
        return await handleRemoveStripeKey(supabaseClient, user, params, corsHeaders);
      case "test_stripe_key":
        return await handleTestStripeKey(supabaseClient, user, params, corsHeaders);

      // Payout Method Management
      case "update_payout_method":
        return await handleUpdatePayoutMethod(supabaseClient, user, params, corsHeaders);
      case "get_account_status":
        return await handleGetAccountStatus(supabaseClient, user, params, corsHeaders);

      // Bank Account Management (Employees)
      case "create_bank_account":
        return await handleCreateBankAccount(supabaseClient, user, params, corsHeaders);
      case "verify_bank_account":
        return await handleVerifyBankAccount(supabaseClient, user, params, corsHeaders);

      // Payout Processing (Finance/Admin)
      case "create_payout":
        return await handleCreatePayout(supabaseClient, user, params, corsHeaders);
      case "get_payout_status":
        return await handleGetPayoutStatus(supabaseClient, user, params, corsHeaders);

      // Legacy Connect actions - redirect to new flow
      case "create_connect_account":
      case "create_account_link":
      case "disconnect_account":
        return new Response(JSON.stringify({
          error: "Stripe Connect is no longer used. Please use set_stripe_key to configure your Stripe API key."
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });

      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});

// ============================================================================
// STRIPE KEY MANAGEMENT (Admin only)
// ============================================================================

/**
 * Set the organization's Stripe API key
 * Admin only - key is encrypted before storage
 */
async function handleSetStripeKey(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { organization_id, stripe_key } = params;

  // Validate key format
  if (!stripe_key || !stripe_key.startsWith('sk_')) {
    return new Response(JSON.stringify({
      error: "Invalid Stripe key format. Must start with 'sk_'"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Test the key first
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Store encrypted key using service role
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await serviceClient.rpc('set_org_stripe_key', {
    p_organization_id: organization_id,
    p_stripe_key: stripe_key,
    p_set_by: user.id
  });

  if (error) {
    console.error("Failed to store Stripe key:", error);
    return new Response(JSON.stringify({
      error: "Failed to store Stripe key"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Update payout method to stripe
  await supabase
    .from("organizations")
    .update({
      payout_method: "stripe",
      stripe_account_status: "active"
    })
    .eq("id", organization_id);

  return new Response(JSON.stringify({
    success: true,
    message: "Stripe API key configured successfully"
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * Get the status of the organization's Stripe configuration
 */
async function handleGetStripeStatus(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Get status using service role
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
    key_set_at: status?.set_at || null,
    payout_method: org?.payout_method || "manual",
    status: status?.has_key ? "active" : "not_connected"
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * Remove the organization's Stripe API key
 */
async function handleRemoveStripeKey(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Remove key using service role
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error } = await serviceClient.rpc('remove_org_stripe_key', {
    p_organization_id: organization_id
  });

  if (error) {
    console.error("Failed to remove Stripe key:", error);
    return new Response(JSON.stringify({
      error: "Failed to remove Stripe key"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * Test a Stripe API key before storing
 */
async function handleTestStripeKey(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { stripe_key } = params;

  if (!stripe_key || !stripe_key.startsWith('sk_')) {
    return new Response(JSON.stringify({
      valid: false,
      error: "Invalid key format"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Test the key
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  const balance = await testResponse.json();

  return new Response(JSON.stringify({
    valid: true,
    livemode: balance.livemode,
    currency: balance.available?.[0]?.currency || "usd"
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// ============================================================================
// ACCOUNT STATUS (for backward compatibility)
// ============================================================================

/**
 * Get account status - now returns org's own Stripe key status
 */
async function handleGetAccountStatus(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  // Delegate to the new status handler
  return handleGetStripeStatus(supabase, user, params, corsHeaders);
}

/**
 * Update organization payout method
 */
async function handleUpdatePayoutMethod(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // If switching to stripe, verify key is configured
  if (payout_method === "stripe") {
    const stripeKey = await getOrgStripeKey(organization_id);
    if (!stripeKey) {
      return new Response(JSON.stringify({
        error: "Please configure your Stripe API key first"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }

  await supabase
    .from("organizations")
    .update({
      payout_method
    })
    .eq("id", organization_id);

  return new Response(JSON.stringify({
    success: true,
    payout_method
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// ============================================================================
// BANK ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Create a tokenized bank account for an employee
 */
async function handleCreateBankAccount(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { organization_id, bank_account_token } = params;

  // Get org's Stripe key
  const stripeKey = await getOrgStripeKey(organization_id);
  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
        "email": user.email,
        "metadata[user_id]": user.id
      })
    });

    if (!customerResponse.ok) {
      return new Response(JSON.stringify({
        error: "Failed to create payment profile"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * Verify bank account with micro-deposits
 */
async function handleVerifyBankAccount(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { bank_account_id, amounts, organization_id } = params;

  // Get org's Stripe key
  const stripeKey = await getOrgStripeKey(organization_id);
  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

// ============================================================================
// PAYOUT PROCESSING
// ============================================================================

/**
 * Create a payout to an employee using org's Stripe key
 */
async function handleCreatePayout(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { organization_id, employee_user_id, amount_cents, expense_ids } = params;

  // Get org's Stripe key
  const stripeKey = await getOrgStripeKey(organization_id);
  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Organization has not configured Stripe. Please add your Stripe API key in settings."
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  if (!bankAccount.is_verified) {
    return new Response(JSON.stringify({
      error: "Employee's bank account is not verified"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  // Create transfer to customer's bank account using Stripe
  // Note: This creates an ACH credit transfer
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
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

/**
 * Get payout status
 */
async function handleGetPayoutStatus(
  supabase: any,
  user: any,
  params: any,
  corsHeaders: any
) {
  const { payout_id } = params;

  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payout_id)
    .single();

  if (!payout) {
    return new Response(JSON.stringify({
      error: "Payout not found"
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  return new Response(JSON.stringify(payout), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
