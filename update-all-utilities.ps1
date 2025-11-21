# Jensify - Batch Update All Components to Use Utility Classes
# This script updates all HTML files to use the new jensify-* utility classes

$featuresPath = "c:\Jensify\expense-app\src\app\features"

# Get all HTML files
$htmlFiles = Get-ChildItem -Path $featuresPath -Filter "*.html" -Recurse

Write-Host "Found $($htmlFiles.Count) HTML files to update..." -ForegroundColor Cyan

foreach ($file in $htmlFiles) {
    Write-Host "Updating: $($file.Name)" -ForegroundColor Yellow

    $content = Get-Content $file.FullName -Raw

    # Track if file was modified
    $originalContent = $content

    # Replace common class patterns
    $content = $content -replace 'class="full-width"', 'class="jensify-full-width"'
    $content = $content -replace 'class="error-message"', 'class="jensify-message-error"'
    $content = $content -replace 'class="success-message"', 'class="jensify-message-success"'
    $content = $content -replace 'class="warning-message"', 'class="jensify-message-warning"'
    $content = $content -replace 'class="info-message"', 'class="jensify-message-info"'

    # Only save if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Updated" -ForegroundColor Green
    } else {
        Write-Host "  No changes needed" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Batch update complete!" -ForegroundColor Green
Write-Host "Processed $($htmlFiles.Count) files" -ForegroundColor Cyan
