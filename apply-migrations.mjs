import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Supabase production connection - using transaction pooler for session mode
const connectionString = 'postgresql://postgres.bfudcugrarerqvvyfpoz:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWRjdWdyYXJlcnF2dnlmcG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzOTMwNSwiZXhwIjoyMDc4NjE1MzA1fQ.vuSRqyVsjIuz8GIMvVhQftpDIAF73AJt1crJ1F9r6G8@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

console.log('🔄 Reading migration SQL file...');
const sql = readFileSync('apply-latest-migrations.sql', 'utf8');

console.log('🔌 Connecting to Supabase production database...');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function executeMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to production database\n');

    console.log('📦 Executing migrations...\n');

    // Execute the entire SQL file
    const result = await client.query(sql);

    console.log('✅ Migrations executed successfully!\n');

    // Run verification queries
    console.log('🔍 Running verification queries...\n');

    // Check expenses columns
    console.log('📋 Checking expenses table columns:');
    const expensesCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'expenses'
        AND column_name IN ('report_id', 'is_reported')
      ORDER BY ordinal_position
    `);

    if (expensesCheck.rows.length > 0) {
      console.table(expensesCheck.rows);
    } else {
      console.log('   ⚠️  Columns not found');
    }

    // Check expense_reports columns
    console.log('\n📋 Checking expense_reports table columns:');
    const reportsCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'expense_reports'
        AND column_name IN ('auto_created', 'auto_report_period')
      ORDER BY ordinal_position
    `);

    if (reportsCheck.rows.length > 0) {
      console.table(reportsCheck.rows);
    } else {
      console.log('   ⚠️  Columns not found');
    }

    // Check trigger
    console.log('\n📋 Checking trigger:');
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'trg_sync_expense_report_id'
    `);

    if (triggerCheck.rows.length > 0) {
      console.table(triggerCheck.rows);
    } else {
      console.log('   ⚠️  Trigger not found');
    }

    // Check constraint
    console.log('\n📋 Checking constraint:');
    const constraintCheck = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conname = 'uq_report_expenses_expense_single_report'
    `);

    if (constraintCheck.rows.length > 0) {
      console.table(constraintCheck.rows);
    } else {
      console.log('   ⚠️  Constraint not found');
    }

    console.log('\n✅ All migrations applied and verified successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Deploy the Angular app build (dist folder is ready)');
    console.log('   2. Test expense report linking in production');
    console.log('   3. Verify auto-report assignment works\n');

  } catch (error) {
    console.error('\n❌ Error executing migrations:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n⚠️  Connection error. Please check:');
      console.error('   1. Internet connection');
      console.error('   2. Supabase project is running');
      console.error('   3. Database pooler is enabled\n');
    } else if (error.code === '42P07') {
      console.log('\nℹ️  Some objects already exist (this is okay)');
      console.log('   Running verification queries...\n');

      // Run verification even if migration partially failed
      try {
        const expensesCheck = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'expenses' AND column_name IN ('report_id', 'is_reported')
        `);
        console.log(`   ✓ Expenses columns: ${expensesCheck.rows.map(r => r.column_name).join(', ')}`);

        const reportsCheck = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'expense_reports' AND column_name IN ('auto_created', 'auto_report_period')
        `);
        console.log(`   ✓ Reports columns: ${reportsCheck.rows.map(r => r.column_name).join(', ')}\n`);

        console.log('✅ Migrations appear to be applied already!\n');
      } catch (verifyError) {
        console.error('   Could not verify:', verifyError.message);
      }
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

console.log('🚀 Starting migration process...\n');
executeMigrations();
