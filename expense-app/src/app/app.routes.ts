import { Routes } from "@angular/router";
import {
  adminGuard,
  authGuard,
  financeGuard,
  managerGuard,
} from "./core/guards/auth.guard";

/**
 * Application routes configuration
 * Defines all routes and their authentication requirements
 */
export const routes: Routes = [
  // Default route - authenticated home dashboard
  {
    path: "",
    redirectTo: "/home",
    pathMatch: "full",
  },
  {
    path: "home",
    canActivate: [authGuard], // Temporarily disabled for UI verification
    loadComponent: () =>
      import("./features/home/home/home").then((m) => m.Home),
    title: "Home - Expensed",
    data: { breadcrumb: "Home", breadcrumbIcon: "home" },
  },

  // Authentication routes (public)
  {
    path: "auth",
    children: [
      {
        path: "login",
        loadComponent: () =>
          import("./features/auth/login/login.component").then((m) =>
            m.LoginComponent
          ),
        title: "Sign In - Expensed",
      },
      {
        path: "register",
        loadComponent: () =>
          import("./features/auth/register/register.component").then((m) =>
            m.RegisterComponent
          ),
        title: "Create Account - Expensed",
      },
      {
        path: "forgot-password",
        loadComponent: () =>
          import("./features/auth/forgot-password/forgot-password.component")
            .then((m) => m.ForgotPasswordComponent),
        title: "Reset Password - Expensed",
      },
      {
        path: "reset-password",
        loadComponent: () =>
          import("./features/auth/reset-password/reset-password").then((m) =>
            m.ResetPasswordComponent
          ),
        title: "Set New Password - Expensed",
      },
      {
        path: "confirm-email",
        loadComponent: () =>
          import("./features/auth/confirm-email/confirm-email").then((m) =>
            m.ConfirmEmailComponent
          ),
        title: "Confirm Email - Expensed",
      },
      {
        path: "accept-invitation",
        loadComponent: () =>
          import(
            "./features/auth/accept-invitation/accept-invitation.component"
          ).then((m) => m.AcceptInvitationComponent),
        title: "Accept Invitation - Expensed",
      },
      {
        path: "callback",
        loadComponent: () =>
          import("./features/auth/auth-callback/auth-callback").then(
            (m) => m.AuthCallbackComponent
          ),
        title: "Verifying... - Expensed",
      },
      {
        path: "",
        redirectTo: "login",
        pathMatch: "full",
      },
    ],
  },

  // Admin hub route
  {
    path: "admin",
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import("./features/organization/admin-hub/admin-hub.component")
        .then((m) => m.AdminHubComponent),
    title: "Admin - Expensed",
    data: { breadcrumb: "Admin", breadcrumbIcon: "admin_panel_settings" },
  },

  // Organization routes
  {
    path: "organization",
    canActivate: [authGuard],
    data: { breadcrumb: "Organization", breadcrumbIcon: "business" },
    children: [
      {
        path: "setup",
        loadComponent: () =>
          import("./features/organization/setup/organization-setup.component")
            .then((m) => m.OrganizationSetupComponent),
        title: "Organization Setup - Expensed",
        data: { breadcrumb: "Setup" },
      },
      {
        path: "settings",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/company-settings/company-settings.component"
          ).then((m) => m.CompanySettingsComponent),
        title: "Company Settings - Expensed",
        data: { breadcrumb: "Company Settings" },
      },
      {
        path: "users",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/user-management/user-management.component"
          ).then((m) => m.UserManagementComponent),
        title: "User Management - Expensed",
        data: { breadcrumb: "User Management" },
      },
      {
        path: "mileage-settings",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/mileage-settings/mileage-settings.component"
          ).then((m) => m.MileageSettingsComponent),
        title: "Mileage Settings - Expensed",
        data: { breadcrumb: "Mileage Settings" },
      },
      {
        path: "budgets",
        canActivate: [financeGuard],
        loadComponent: () =>
          import(
            "./features/organization/budget-management/budget-management.component"
          ).then((m) => m.BudgetManagementComponent),
        title: "Budget Management - Expensed",
        data: { breadcrumb: "Budgets" },
      },
      {
        path: "gl-codes",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/gl-code-settings/gl-code-settings.component"
          ).then((m) => m.GlCodeSettingsComponent),
        title: "GL Code Mappings - Expensed",
        data: { breadcrumb: "GL Codes" },
      },
      {
        path: "payouts",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/payout-settings/payout-settings.component"
          ).then((m) => m.PayoutSettingsComponent),
        title: "Payout Settings - Expensed",
        data: { breadcrumb: "Payout Settings" },
      },
      {
        path: "policies",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/policy-settings/policy-settings.component"
          ).then((m) => m.PolicySettingsComponent),
        title: "Expense Policies - Expensed",
        data: { breadcrumb: "Expense Policies" },
      },
      {
        path: "delegation",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/delegation-settings/delegation-settings.component"
          ).then((m) => m.DelegationSettingsComponent),
        title: "Delegation Settings - Expensed",
        data: { breadcrumb: "Delegation" },
      },
      {
        path: "currency",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/currency-settings/currency-settings.component"
          ).then((m) => m.CurrencySettingsComponent),
        title: "Currency Settings - Expensed",
        data: { breadcrumb: "Currency" },
      },
      {
        path: "per-diem",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/per-diem-settings/per-diem-settings.component"
          ).then((m) => m.PerDiemSettingsComponent),
        title: "Per Diem Settings - Expensed",
        data: { breadcrumb: "Per Diem" },
      },
      {
        path: "tax",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/tax-settings/tax-settings.component"
          ).then((m) => m.TaxSettingsComponent),
        title: "Tax & VAT Settings - Expensed",
        data: { breadcrumb: "Tax & VAT" },
      },
      {
        path: "vendors",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/vendor-management/vendor-management.component"
          ).then((m) => m.VendorManagementComponent),
        title: "Vendor Management - Expensed",
        data: { breadcrumb: "Vendors" },
      },
      {
        path: "email-expense",
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            "./features/organization/email-expense-settings/email-expense-settings.component"
          ).then((m) => m.EmailExpenseSettingsComponent),
        title: "Email-to-Expense - Expensed",
        data: { breadcrumb: "Email-to-Expense" },
      },
    ],
  },

  // Protected routes - require authentication
  {
    path: "expenses",
    canActivate: [authGuard],
    data: { breadcrumb: "Expenses", breadcrumbIcon: "receipt_long" },
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/expenses/expense-list/expense-list").then((m) =>
            m.ExpenseList
          ),
        title: "My Expenses - Expensed",
        data: { breadcrumb: "My Expenses" },
      },
      {
        path: "upload",
        redirectTo: "/receipts",
        pathMatch: "full",
      },
      {
        path: "new",
        loadComponent: () =>
          import("./features/expenses/expense-form/expense-form").then((m) =>
            m.ExpenseFormComponent
          ),
        title: "New Expense - Expensed",
        data: { breadcrumb: "New Expense" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./features/expenses/expense-detail/expense-detail").then(
            (m) => m.ExpenseDetailComponent,
          ),
        title: "Expense Details - Expensed",
        data: { breadcrumb: "Details" },
      },
      {
        path: ":id/edit",
        loadComponent: () =>
          import("./features/expenses/expense-edit/expense-edit").then((m) =>
            m.ExpenseEditComponent
          ),
        title: "Edit Expense - Expensed",
        data: { breadcrumb: "Edit" },
      },
    ],
  },

  // Approvals routes - managers and above can approve, admins can configure
  {
    path: "approvals",
    canActivate: [authGuard, managerGuard],
    data: { breadcrumb: "Approvals", breadcrumbIcon: "task_alt" },
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/approvals/approval-queue/approval-queue").then((m) =>
            m.ApprovalQueue
          ),
        title: "Approval Queue - Expensed",
        data: { breadcrumb: "Queue" },
      },
      {
        path: "settings",
        canActivate: [adminGuard],
        loadComponent: () =>
          import("./features/approvals/approval-settings/approval-settings").then((m) =>
            m.ApprovalSettings
          ),
        title: "Approval Settings - Expensed",
        data: { breadcrumb: "Settings" },
      },
    ],
  },

  // Reports routes - group expenses into reports for batch submission
  {
    path: "reports",
    canActivate: [authGuard],
    data: { breadcrumb: "Reports", breadcrumbIcon: "folder_open" },
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/reports/report-list/report-list").then((m) =>
            m.ReportListComponent
          ),
        title: "Expense Reports - Expensed",
        data: { breadcrumb: "All Reports" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./features/reports/report-detail/report-detail").then((m) =>
            m.ReportDetailComponent
          ),
        title: "Report Details - Expensed",
        data: { breadcrumb: "Details" },
      },
    ],
  },

  {
    path: "receipts",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/expenses/receipt-list/receipt-list").then((m) =>
        m.ReceiptList
      ),
    title: "Receipts - Expensed",
    data: { breadcrumb: "Receipts", breadcrumbIcon: "receipt" },
  },
  {
    path: "mileage",
    canActivate: [authGuard],
    data: { breadcrumb: "Mileage", breadcrumbIcon: "directions_car" },
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/mileage/trip-list/trip-list").then((m) =>
            m.TripList
          ),
        title: "Mileage Trips - Expensed",
        data: { breadcrumb: "Trips" },
      },
      {
        path: "new",
        loadComponent: () =>
          import("./features/mileage/trip-form/trip-form").then((m) =>
            m.TripForm
          ),
        title: "New Mileage Trip - Expensed",
        data: { breadcrumb: "New Trip" },
      },
      {
        path: ":id",
        loadComponent: () =>
          import("./features/mileage/trip-detail/trip-detail").then((m) =>
            m.TripDetailComponent
          ),
        title: "Trip Details - Expensed",
        data: { breadcrumb: "Details" },
      },
      {
        path: ":id/edit",
        loadComponent: () =>
          import("./features/mileage/trip-form/trip-form").then((m) =>
            m.TripForm
          ),
        title: "Edit Mileage Trip - Expensed",
        data: { breadcrumb: "Edit" },
      },
    ],
  },

  // Profile routes - user settings and bank accounts
  {
    path: "profile",
    canActivate: [authGuard],
    data: { breadcrumb: "Profile", breadcrumbIcon: "person" },
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./features/profile/profile-settings/profile-settings.component").then(
            (m) => m.ProfileSettingsComponent
          ),
        title: "Profile Settings - Expensed",
        data: { breadcrumb: "Settings" },
      },
      {
        path: "notifications",
        loadComponent: () =>
          import("./features/profile/notification-preferences/notification-preferences.component").then(
            (m) => m.NotificationPreferencesComponent
          ),
        title: "Notification Preferences - Expensed",
        data: { breadcrumb: "Notifications" },
      },
      {
        path: "bank-accounts",
        loadComponent: () =>
          import("./features/profile/bank-accounts/bank-accounts.component").then(
            (m) => m.BankAccountsComponent
          ),
        title: "Bank Accounts - Expensed",
        data: { breadcrumb: "Bank Accounts" },
      },
    ],
  },

  // Finance routes
  {
    path: "finance",
    canActivate: [authGuard, financeGuard],
    data: { breadcrumb: "Finance", breadcrumbIcon: "account_balance" },
    children: [
      {
        path: "",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./features/finance/dashboard/dashboard").then((m) =>
            m.FinanceDashboardComponent
          ),
        title: "Finance Dashboard - Expensed",
        data: { breadcrumb: "Dashboard", breadcrumbIcon: "dashboard" },
      },
      {
        path: "analytics",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
    ],
  },

  // Wildcard route - redirect to login
  {
    path: "**",
    redirectTo: "/auth/login",
  },
];
