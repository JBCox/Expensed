# Jensify - Expense Management Platform

Full-featured expense management platform built with Angular 20+ and Supabase.

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/JBCox/Jensify.git
cd Jensify/expense-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

**IMPORTANT:** Environment files contain sensitive credentials and are NOT committed to version control.

Copy the example files and fill in your Supabase credentials:

```bash
# Copy example files
copy src\environments\environment.ts.example src\environments\environment.ts
copy src\environments\environment.development.ts.example src\environments\environment.development.ts
```

Edit both files and replace placeholders with your actual Supabase credentials:

```typescript
// src/environments/environment.ts
export const environment = {
  production: true,
  supabase: {
    url: 'https://your-project-id.supabase.co',  // Replace with your URL
    anonKey: 'your-anon-key-here'  // Replace with your anon key
  },
  simulateOcr: false
};
```

**Where to find your Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy your Project URL and anon/public key

### 4. Database Setup

Run the database migrations:

```bash
cd ../supabase
supabase db push
```

## Development server

To start a local development server, run:

```bash
npm start
# or
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
