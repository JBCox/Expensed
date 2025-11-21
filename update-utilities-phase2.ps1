# Phase 2: Add jensify-card and jensify-button to remaining files

$featuresPath = "c:\Jensify\expense-app\src\app\features"

# List of files to update (exclude already updated ones)
$filesToUpdate = @(
    "expenses\expense-edit\expense-edit.html",
    "expenses\expense-form\expense-form.html",
    "expenses\receipt-list\receipt-list.html",
    "expenses\receipt-upload\receipt-upload.html",
    "finance\dashboard\dashboard.html",
    "home\employee-dashboard\employee-dashboard.html",
    "home\finance-dashboard\finance-dashboard.html",
    "home\home\home.html",
    "home\home-dashboard\home-dashboard.html",
    "mileage\trip-list\trip-list.html",
    "organization\setup\organization-setup.component.html"
)

foreach ($relPath in $filesToUpdate) {
    $filePath = Join-Path $featuresPath $relPath
    if (-Not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath" -ForegroundColor Yellow
        continue
    }

    Write-Host "Updating $relPath..." -ForegroundColor Cyan
    $content = Get-Content $filePath -Raw
    $originalContent = $content

    # Add jensify-card to mat-card elements (avoid duplicates)
    $content = $content -replace '(<mat-card)(\s+class=")', '$1 class="jensify-card '
    $content = $content -replace '(<mat-card)(?!\s+class)', '$1 class="jensify-card"'

    # Add jensify-button to buttons (avoid duplicates)
    $content = $content -replace '(<button[^>]*mat-[^>]*?)(?<!class=")>', '$1 class="jensify-button">'
    $content = $content -replace '(<button[^>]*class="[^"]*?)(")', '$1 jensify-button$2'

    # Fix any double jensify-card or jensify-button
    $content = $content -replace 'jensify-card jensify-card', 'jensify-card'
    $content = $content -replace 'jensify-button jensify-button', 'jensify-button'

    if ($content -ne $originalContent) {
        Set-Content $filePath $content -NoNewline
        Write-Host "  Updated!" -ForegroundColor Green
    } else {
        Write-Host "  No changes needed" -ForegroundColor Gray
    }
}

Write-Host "`nPhase 2 complete!" -ForegroundColor Green
