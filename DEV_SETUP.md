# Local Development Setup

## Quick Start: Local Supabase for Testing

### 1. Install Supabase CLI
```powershell
# If not already installed
scoop install supabase
```

### 2. Start Local Supabase
```powershell
cd C:\Jensify\supabase
supabase start
```

This will:
- Start local Postgres database (port 54322)
- Start local Supabase services (API on port 54321)
- Run all migrations automatically
- Run seed.sql to create test data

**Local URLs:**
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323 (Visual DB editor)
- Inbucket (emails): http://127.0.0.1:54324

### 3. Get Local Credentials
```powershell
supabase status
```

Copy the output and update your Angular environment:

### 4. Create Local Environment File
Create `expense-app/src/environments/environment.development.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'http://127.0.0.1:54321',
    anonKey: 'YOUR_LOCAL_ANON_KEY_FROM_SUPABASE_STATUS'
  }
};
```

### 5. Test Users (password: password123)
After starting local Supabase, create test users:

```powershell
# Create admin user
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Create manager user  
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@test.com","password":"password123"}'

# Create finance user
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"finance@test.com","password":"password123"}'

# Create employee user
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@test.com","password":"password123"}'
```

Or use the Supabase Studio at http://127.0.0.1:54323

### 6. Quick DB Edits

**Via SQL Editor in Studio:**
```sql
-- Change user role
UPDATE organization_members 
SET role = 'admin' 
WHERE user_id = 'USER_ID_HERE';

-- Add user to org
INSERT INTO organization_members (organization_id, user_id, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'USER_ID', 'manager', true);

-- Create fake expense
INSERT INTO expenses (user_id, organization_id, merchant, amount, category, expense_date, status)
VALUES ('USER_ID', '00000000-0000-0000-0000-000000000001', 'Test Merchant', 99.99, 'Meals', CURRENT_DATE, 'submitted');
```

**Via PowerShell:**
```powershell
# Reset database (clears data, reruns migrations + seed)
supabase db reset

# Apply new migrations
supabase db push

# Run custom SQL
supabase db execute --file your-script.sql
```

### 7. Benefits of Local Development

✅ **Instant changes** - No cloud sync delays
✅ **Free resets** - `supabase db reset` starts fresh anytime
✅ **Test emails** - Check at http://127.0.0.1:54324
✅ **Full control** - Direct DB access via Studio
✅ **Fast iteration** - Edit migrations, reset, test
✅ **No prod risk** - Completely isolated

### 8. Switching Back to Production

Just change your environment file back to production URLs, or use:

```powershell
ng serve --configuration=production
```

### 9. Common Commands

```powershell
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset database (fresh start)
supabase db reset

# View logs
supabase logs

# Open Studio
start http://127.0.0.1:54323
```

## Quick Test User Setup Script

Create `create-test-users.ps1`:

```powershell
$anonKey = "YOUR_ANON_KEY_HERE"
$apiUrl = "http://127.0.0.1:54321"

$users = @(
    @{email="admin@test.com"; role="admin"},
    @{email="manager@test.com"; role="manager"},
    @{email="finance@test.com"; role="finance"},
    @{email="employee@test.com"; role="employee"}
)

foreach ($user in $users) {
    Write-Host "Creating $($user.email)..." -ForegroundColor Cyan
    
    $body = @{
        email = $user.email
        password = "password123"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/signup" `
        -Headers @{
            "apikey" = $anonKey
            "Content-Type" = "application/json"
        } `
        -Body $body
        
    Write-Host "  ✓ Created" -ForegroundColor Green
}

Write-Host "`nAll test users created! Password: password123" -ForegroundColor Green
```

Run: `.\create-test-users.ps1`

---

This setup gives you a **local playground** where you can quickly create users, test roles, and iterate fast without affecting production! 🚀
