# Expensed Web Assets

Complete set of logo assets for the Expensed webapp.

## Brand Color
- **Primary Orange:** `#E87722`

## Directory Structure

```
expensed-web-assets/
├── favicons/           # Browser tab icons
│   ├── favicon.ico     # Multi-size ICO (16, 32, 48, 64)
│   └── favicon-*.png   # Individual PNG sizes
│
├── app-icons/          # PWA & mobile app icons
│   ├── apple-touch-icon*.png   # iOS home screen
│   ├── android-chrome-*.png    # Android home screen
│   ├── icon-*.png              # PWA icons
│   └── mstile-*.png            # Windows tiles
│
├── social/             # Social media sharing
│   ├── og-image.png        # Open Graph (1200x630)
│   ├── twitter-card.png    # Twitter (1200x600)
│   └── social-square.png   # Instagram/Square (1200x1200)
│
├── ui-assets/          # In-app usage
│   ├── logo-*.png              # Square logo variants
│   ├── logo-horizontal-*.png   # Header/nav logos
│   ├── text-only-*.png         # Text wordmark
│   └── stacked-*.png           # Stacked logo+text
│
├── original/           # Original uploaded files
│
├── manifest.json       # PWA manifest
├── browserconfig.xml   # Windows tile config
└── html-head-snippet.html  # Copy/paste HTML tags
```

## Quick Setup for Angular

1. Copy `favicon.ico` from `favicons/` → `src/favicon.ico`

2. Create directory structure in `src/assets/`:
   ```
   src/assets/
   ├── favicons/
   ├── icons/      (contents of app-icons/)
   ├── social/
   └── images/     (contents of ui-assets/)
   ```

3. Copy `manifest.json` → `src/manifest.json`

4. Copy `browserconfig.xml` → `src/browserconfig.xml`

5. Add to `src/index.html` `<head>`:
   - Copy contents from `html-head-snippet.html`

6. Update `angular.json` assets array:
   ```json
   "assets": [
     "src/favicon.ico",
     "src/assets",
     "src/manifest.json",
     "src/browserconfig.xml"
   ]
   ```

## Usage in Components

```typescript
// In your Angular component
logoUrl = 'assets/images/logo-64.png';
headerLogo = 'assets/images/logo-horizontal-h48.png';
```

```html
<!-- Template -->
<img [src]="logoUrl" alt="Expensed" />
```

## Recommended Usage by Context

| Context | Recommended Asset |
|---------|------------------|
| Browser tab | favicon.ico |
| Nav header | logo-horizontal-h32.png or h48 |
| Login page | stacked-256.png |
| Loading spinner | logo-64.png or logo-128.png |
| Email signature | logo-horizontal-h64.png |
| Mobile app icon | icon-192x192.png / icon-512x512.png |
| Social share | og-image.png |

---
Generated for the Expensed expense management app.
