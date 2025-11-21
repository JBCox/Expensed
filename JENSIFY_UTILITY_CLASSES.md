# Jensify Universal Utility Classes

## Overview

We now have a comprehensive global styling system (`_utilities.scss`) that eliminates the need to write repetitive CSS in individual components. **Use these classes instead of custom component styles** for consistency and maintainability.

## Benefits

✅ **Consistency** - All pages look identical
✅ **Less Code** - No more duplicate CSS
✅ **Fix Once** - Change applies everywhere
✅ **Faster Development** - New components automatically styled
✅ **Smaller Bundle** - Reused CSS instead of duplicates

---

## Quick Reference

### 📦 Containers

| Class | Use For | Max Width |
|-------|---------|-----------|
| `.jensify-container` | Most pages | 1200px |
| `.jensify-container-md` | Medium pages | 960px |
| `.jensify-container-sm` | Forms, details | 720px |
| `.jensify-auth-container` | Login, register pages | Full height centered |

**Example:**
```html
<div class="jensify-container-sm">
  <!-- Your form content -->
</div>
```

---

### 🃏 Cards

| Class | Use For |
|-------|---------|
| `.jensify-card` | Standard card |
| `.jensify-card-lg` | Card with larger shadow |
| `.jensify-auth-card` | Login/register card (max-width: 440px) |
| `.jensify-card-header` | Card header section |
| `.jensify-card-content` | Card body section |
| `.jensify-card-actions` | Card footer with buttons |

**Example:**
```html
<mat-card class="jensify-card">
  <div class="jensify-card-header">
    <h2 class="jensify-card-title">Edit Expense</h2>
    <p class="jensify-card-subtitle">Update expense details</p>
  </div>

  <div class="jensify-card-content">
    <!-- Form fields -->
  </div>

  <div class="jensify-card-actions">
    <button mat-button>Cancel</button>
    <button mat-raised-button color="primary">Save</button>
  </div>
</mat-card>
```

---

### 📝 Forms

| Class | Use For |
|-------|---------|
| `.jensify-form` | Form container |
| `.jensify-form-row` | 2-column grid (responsive) |
| `.jensify-form-actions` | Button group at bottom |
| `.jensify-form-section` | Divider between form groups |
| `.jensify-full-width` | Full-width field |
| `.jensify-half-width` | Half-width field (responsive) |

> **Form Fields:** Always use `mat-form-field appearance="fill"` so inputs inherit the global Jensify styling (prefix spacing, focus ring, divider handling). The outline appearance is reserved for future dark-mode experiments; if you need an exception, document it in the component.

**Example:**
```html
<form class="jensify-form">
  <div class="jensify-form-row">
    <mat-form-field class="jensify-full-width">
      <input matInput placeholder="Merchant" />
    </mat-form-field>

    <mat-form-field class="jensify-full-width">
      <input matInput placeholder="Amount" />
    </mat-form-field>
  </div>

  <div class="jensify-form-section">
    <h3 class="jensify-form-section-title">Optional Details</h3>
    <!-- More fields -->
  </div>

  <div class="jensify-form-actions">
    <button mat-button>Cancel</button>
    <button mat-raised-button color="primary">Submit</button>
  </div>
</form>
```

---

### 💬 Messages & Alerts

| Class | Use For |
|-------|---------|
| `.jensify-message-error` | Error messages |
| `.jensify-message-success` | Success messages |
| `.jensify-message-warning` | Warning messages |
| `.jensify-message-info` | Info messages |

**Example:**
```html
<div *ngIf="errorMessage" class="jensify-message-error">
  <mat-icon>error</mat-icon>
  <span>{{ errorMessage }}</span>
</div>

<div *ngIf="successMessage" class="jensify-message-success">
  <mat-icon>check_circle</mat-icon>
  <span>{{ successMessage }}</span>
</div>
```

---

### 🔘 Buttons

| Class | Use For |
|-------|---------|
| `.jensify-button` | Standard button (48px height) |
| `.jensify-button-sm` | Small button (36px height) |
| `.jensify-button-lg` | Large button (56px height) |

**Example:**
```html
<button mat-raised-button color="primary" class="jensify-button">
  <mat-icon>add</mat-icon>
  <span>Add Expense</span>
</button>
```

---

### 📐 Layout & Spacing

#### Flexbox
```html
<div class="jensify-flex jensify-gap-md">
  <!-- Flex items with 16px gap -->
</div>

<div class="jensify-flex-between">
  <!-- Space between items -->
</div>

<div class="jensify-flex-center">
  <!-- Centered content -->
</div>
```

#### Grid
```html
<div class="jensify-grid-2">
  <!-- 2-column grid (responsive) -->
</div>

<div class="jensify-grid-3">
  <!-- 3-column grid (responsive) -->
</div>
```

#### Spacing
```html
<div class="jensify-mt-lg jensify-mb-md">
  <!-- margin-top: 24px, margin-bottom: 16px -->
</div>
```

| Class | Value |
|-------|-------|
| `.jensify-mt-sm` | margin-top: 8px |
| `.jensify-mt-md` | margin-top: 16px |
| `.jensify-mt-lg` | margin-top: 24px |
| `.jensify-mt-xl` | margin-top: 32px |
| Same for `mb-*`, `p-*` | bottom margin, padding |

---

### 🔤 Typography

| Class | Use For | Size |
|-------|---------|------|
| `.jensify-page-title` | Page headings | 2rem (32px) |
| `.jensify-page-subtitle` | Page subheadings | 1rem (16px) |
| `.jensify-section-title` | Section headings | 1.25rem (20px) |
| `.jensify-text-center` | Centered text | - |
| `.jensify-text-muted` | Muted color text | - |

**Example:**
```html
<h1 class="jensify-page-title">My Expenses</h1>
<p class="jensify-page-subtitle">Track and manage your expenses</p>
```

---

### 🔗 Links

```html
<a routerLink="/login" class="jensify-link">Login</a>

<a routerLink="/help" class="jensify-link-muted">Need help?</a>
```

---

### 📱 Responsive Utilities

| Class | Effect |
|-------|--------|
| `.jensify-hide-mobile` | Hidden on mobile (< 768px) |
| `.jensify-hide-desktop` | Hidden on desktop (≥ 768px) |
| `.jensify-show-mobile` | Only show on mobile |
| `.jensify-show-desktop` | Only show on desktop |

**Example:**
```html
<div class="jensify-hide-mobile">
  <!-- Desktop-only sidebar -->
</div>

<div class="jensify-show-mobile">
  <!-- Mobile-only menu -->
</div>
```

---

### 🏗️ Empty & Loading States

```html
<div class="jensify-empty-state">
  <mat-icon>inbox</mat-icon>
  <h3>No expenses yet</h3>
  <p>Click "Add Expense" to get started</p>
</div>

<div class="jensify-loading">
  <mat-spinner diameter="32"></mat-spinner>
  <span>Loading expenses...</span>
</div>
```

---

## Migration Guide

### Before (Component-Specific CSS)

```scss
// login.component.scss
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--jensify-surface-soft);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: var(--jensify-danger-soft);
  border: 1px solid var(--jensify-danger-border);
  color: var(--jensify-danger);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

```html
<div class="login-container">
  <mat-card class="login-card">
    <div *ngIf="errorMessage" class="error-message">
      <mat-icon>error</mat-icon>
      <span>{{ errorMessage }}</span>
    </div>

    <form>
      <!-- form fields -->
    </form>
  </mat-card>
</div>
```

### After (Using Utility Classes)

```scss
// login.component.scss
// Empty! No component-specific styles needed
```

```html
<div class="jensify-auth-container">
  <mat-card class="jensify-auth-card">
    <div *ngIf="errorMessage" class="jensify-message-error">
      <mat-icon>error</mat-icon>
      <span>{{ errorMessage }}</span>
    </div>

    <form class="jensify-form">
      <!-- form fields -->
    </form>
  </mat-card>
</div>
```

**Result:**
- **38 lines of SCSS → 0 lines** ✅
- Looks identical
- Fixes apply globally
- Easier to maintain

---

## Best Practices

### ✅ DO

- **Use utility classes** for common patterns (containers, forms, messages)
- **Combine classes** to build complex layouts
- **Reference this guide** when building new components
- **Remove duplicate CSS** from component files

### ❌ DON'T

- Don't write custom CSS for containers, cards, forms, or messages
- Don't use inline styles when a utility class exists
- Don't create component-specific versions of these patterns

### When to Use Component-Specific Styles

Only write component-specific CSS for:
- **Truly unique** UI elements (custom graphics, animations)
- **Complex component logic** (data visualizations, charts)
- **Third-party library overrides** that don't apply globally

---

## Complete Example: Expense Form

### HTML
```html
<div class="jensify-container-sm">
  <mat-card class="jensify-card">
    <div class="jensify-card-header">
      <h2 class="jensify-card-title">New Expense</h2>
      <p class="jensify-card-subtitle">Add a new expense to your account</p>
    </div>

    <div class="jensify-card-content">
      <div *ngIf="errorMessage" class="jensify-message-error">
        <mat-icon>error</mat-icon>
        <span>{{ errorMessage }}</span>
      </div>

      <form class="jensify-form" [formGroup]="expenseForm">
        <div class="jensify-form-row">
          <mat-form-field class="jensify-full-width">
            <mat-label>Merchant</mat-label>
            <input matInput formControlName="merchant" />
          </mat-form-field>

          <mat-form-field class="jensify-full-width">
            <mat-label>Amount</mat-label>
            <input matInput type="number" formControlName="amount" />
          </mat-form-field>
        </div>

        <mat-form-field class="jensify-full-width">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option value="fuel">Fuel</mat-option>
            <mat-option value="meals">Meals</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="jensify-form-section">
          <h3 class="jensify-form-section-title">Additional Details</h3>
          <mat-form-field class="jensify-full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3"></textarea>
          </mat-form-field>
        </div>
      </form>
    </div>

    <div class="jensify-card-actions">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" class="jensify-button" (click)="save()">
        <mat-icon>save</mat-icon>
        <span>Save Expense</span>
      </button>
    </div>
  </mat-card>
</div>
```

### SCSS
```scss
// expense-form.component.scss
// No styles needed! Everything is handled by utilities
```

---

## Advanced Utility Classes (Phase 2+ Components)

### 📊 Dashboards

| Class | Use For |
|-------|---------|
| `.jensify-dashboard-header` | Dashboard page header with metrics |
| `.jensify-quick-actions` | Quick action button section |
| `.jensify-recent-activity` | Recent activity feed section |
| `.jensify-hero-copy` | Hero/landing page copy block |
| `.jensify-expense-item` | Activity list item with icon |

**Example:**
```html
<div class="jensify-dashboard-header">
  <div class="header-content">
    <h1>My Dashboard</h1>
    <p>Welcome back!</p>
  </div>
</div>

<div class="jensify-quick-actions">
  <h2>Quick Actions</h2>
  <div class="jensify-action-buttons">
    <button mat-raised-button color="primary">Upload Receipt</button>
  </div>
</div>
```

### 👥 User Management & Organization

| Class | Use For |
|-------|---------|
| `.jensify-user-avatar` | Circular user avatar with initial |
| `.jensify-user-cell` | Table cell with avatar + info |
| `.jensify-user-info` | User name + email container |
| `.jensify-table-container` | Responsive table wrapper |
| `.jensify-tab-content` | Tab panel content padding |
| `.jensify-members-table` | Member list table styling |
| `.jensify-invitations-table` | Invitations table styling |

**Example:**
```html
<div class="jensify-table-container">
  <table mat-table class="jensify-members-table">
    <ng-container matColumnDef="user">
      <td mat-cell *matCellDef="let member">
        <div class="jensify-user-cell">
          <div class="jensify-user-avatar">JD</div>
          <div class="jensify-user-info">
            <div class="jensify-user-name">John Doe</div>
            <div class="jensify-user-email">john@example.com</div>
          </div>
        </div>
      </td>
    </ng-container>
  </table>
</div>
```

### ✉️ Invitations

| Class | Use For |
|-------|---------|
| `.jensify-invitation-item` | Invitation list item |
| `.jensify-invitation-info` | Invitation details container |
| `.jensify-invitation-icon` | Invitation icon container |
| `.jensify-invitation-details` | Org name, role, expiration |
| `.jensify-create-org-prompt` | Create organization prompt card |

**Example:**
```html
<div class="jensify-invitation-item">
  <div class="jensify-invitation-info">
    <div class="jensify-invitation-icon">
      <mat-icon>mail</mat-icon>
    </div>
    <div class="jensify-invitation-details">
      <p class="organization-name">Acme Corp</p>
      <span class="role-badge">Employee</span>
    </div>
  </div>
  <button mat-raised-button color="primary">Accept</button>
</div>
```

### 🎨 Icon Containers

| Class | Use For |
|-------|---------|
| `.jensify-email-icon` | Large email icon (64px circle) |
| `.jensify-action-button` | Icon button with label (dashboard actions) |

**Example:**
```html
<div class="jensify-email-icon">
  <mat-icon>email</mat-icon>
</div>

<a routerLink="/upload" class="jensify-action-button">
  <mat-icon>camera_alt</mat-icon>
  <span>Upload Receipt</span>
</a>
```

### 🪟 Dialogs & Modals

| Class | Use For |
|-------|---------|
| `.jensify-existing-pane` | Dialog pane for selecting existing items |

**Example:**
```html
<div class="jensify-existing-pane">
  <h3>Attach Existing Receipt</h3>
  <div class="receipt-list">
    <div class="receipt-option">...</div>
  </div>
</div>
```

### 📦 Additional Spacing & Layout

| Class | Effect |
|-------|--------|
| `.jensify-flex-wrap` | flex-wrap: wrap |
| `.jensify-text-italic` | font-style: italic |
| `.jensify-loading-container` | Centered loading state (300px min-height) |
| `.jensify-mt-xs` | margin-top: 4px |
| `.jensify-mb-0` | margin-bottom: 0 |

**Example:**
```html
<div class="jensify-flex jensify-gap-md jensify-flex-wrap">
  <!-- Wrapping flex container -->
</div>

<p class="jensify-text-italic jensify-mb-0">
  Additional info here
</p>

<div class="jensify-loading-container">
  <mat-spinner></mat-spinner>
</div>
```

---

## Need a New Utility?

If you find yourself writing the same CSS pattern in multiple components:

1. **Add it to `_utilities.scss`**
2. **Follow the naming convention**: `jensify-[category]-[variant]`
3. **Document it** in this guide
4. **Use CSS variables** for values (colors, spacing, etc.)

---

**Questions?** Check the `_utilities.scss` file for full implementation details.

**Next Steps:** Start migrating existing components to use these utilities!
