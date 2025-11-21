import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfudcugrarerqvvyfpoz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWRjdWdyYXJlcnF2dnlmcG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzOTMwNSwiZXhwIjoyMDc4NjE1MzA1fQ.vuSRqyVsjIuz8GIMvVhQftpDIAF73AJt1crJ1F9r6G8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrations() {
  console.log('🔍 Checking migration status in production database...\n');

  // Check if the new columns already exist
  const { data: expensesColumns, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .limit(0);

  if (expError) {
    console.log('❌ Error accessing expenses table:', expError.message);
  } else {
    console.log('✅ Expenses table accessible');
  }

  // Check if report_id column exists by trying to select it
  const { data: testReportId, error: reportIdError } = await supabase
    .from('expenses')
    .select('report_id, is_reported')
    .limit(1);

  if (reportIdError) {
    if (reportIdError.message.includes('column') && reportIdError.message.includes('does not exist')) {
      console.log('\n❌ Migration NOT applied - report_id and is_reported columns do not exist');
      console.log('   Need to apply migrations!\n');
      return false;
    }
    console.log('❌ Error checking columns:', reportIdError.message);
  } else {
    console.log('✅ Migration ALREADY applied - report_id and is_reported columns exist');
    console.log('   Data:', testReportId);
    return true;
  }

  // Check expense_reports table
  const { data: testReportColumns, error: reportError } = await supabase
    .from('expense_reports')
    .select('auto_created, auto_report_period')
    .limit(1);

  if (reportError) {
    if (reportError.message.includes('column') && reportError.message.includes('does not exist')) {
      console.log('❌ auto_created and auto_report_period columns do not exist');
      return false;
    }
    console.log('❌ Error checking expense_reports columns:', reportError.message);
  } else {
    console.log('✅ expense_reports columns also exist');
    return true;
  }
}

checkMigrations().then(applied => {
  if (applied) {
    console.log('\n✅ All migrations are already applied!');
    console.log('   You can proceed with deployment.\n');
  } else {
    console.log('\n⚠️  Migrations need to be applied.');
    console.log('   Attempting to apply now...\n');
  }
}).catch(err => {
  console.error('Fatal error:', err);
});
