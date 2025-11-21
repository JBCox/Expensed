# Final batch: Update remaining dashboard and list pages
$files = @(
    "expense-app\src\app\features\approvals\approval-queue\approval-queue.html",
    "expense-app\src\app\features\home\employee-dashboard\employee-dashboard.html",
    "expense-app\src\app\features\home\finance-dashboard\finance-dashboard.html",
    "expense-app\src\app\features\mileage\trip-list\trip-list.html",
    "expense-app\src\app\features\expenses\receipt-list\receipt-list.html",
    "expense-app\src\app\features\home\home\home.html",
    "expense-app\src\app\features\home\home-dashboard\home-dashboard.html",
    "expense-app\src\app\features\finance\dashboard\dashboard.html"
)

foreach ($relPath in $files) {
    $filePath = "c:\Jensify\$relPath"
    if (-Not (Test-Path $filePath)) {
        Write-Host "Skip: $relPath (not found)" -ForegroundColor Gray
        continue
    }

    Write-Host "Updating: $relPath" -ForegroundColor Cyan
    $content = Get-Content $filePath -Raw

    # Add jensify-container to root divs (common patterns)
    $content = $content -replace '<div class="approval-queue-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="employee-dashboard-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="finance-dashboard-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="trip-list-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="receipt-list-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="dashboard-container">', '<div class="jensify-container">'
    $content = $content -replace '<div class="home-container">', '<div class="jensify-container">'

    # Add jensify-card to mat-card
    $content = $content -replace '(<mat-card)(?!\s+class)', '$1 class="jensify-card"'
    $content = $content -replace '(<mat-card\s+class="(?!.*jensify-card)[^"]*)"', '$1 jensify-card"'

    # Add jensify-button to buttons
    $content = $content -replace '(<button[^>]*mat-[^>]*?)(?<!\s+class="[^"]*jensify-button[^"]*")>', '$1 class="jensify-button">'
    $content = $content -replace '(<button[^>]*class="(?!.*jensify-button)([^"]*)")([^>]*)>', '<button class="$2 jensify-button"$3>'

    # Clean up duplicates
    $content = $content -replace 'jensify-card jensify-card', 'jensify-card'
    $content = $content -replace 'jensify-button jensify-button', 'jensify-button'
    $content = $content -replace 'class="jensify-card ([^"]+) jensify-card"', 'class="jensify-card $1"'
    $content = $content -replace 'class=" jensify-button"', 'class="jensify-button"'
    $content = $content -replace 'class=" jensify-card"', 'class="jensify-card"'

    Set-Content $filePath $content -NoNewline
    Write-Host "  Done!" -ForegroundColor Green
}

Write-Host "`nAll remaining files updated!" -ForegroundColor Green
