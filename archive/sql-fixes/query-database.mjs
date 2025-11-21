import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfudcugrarerqvvyfpoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWRjdWdyYXJlcnF2dnlmcG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzkzMDUsImV4cCI6MjA3ODYxNTMwNX0.hWAIKd3Pf9k35gkVmenuxLG1pPlOStdJP0d7B09LYnw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Querying Jensify Database...\n');

// Get table counts
async function queryDatabase() {
  try {
    // First, let's try to query some common tables
    console.log('Attempting to query tables...\n');

    // Query users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);

    if (usersError) {
      console.log('⚠️  users error:', usersError.message);
    } else {
      console.log('👥 Users:', users?.length || 0);
      if (users && users.length > 0) {
        console.log(JSON.stringify(users, null, 2));
      }
    }
    console.log('');

    // Query organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    if (orgsError) {
      console.log('⚠️  organizations error:', orgsError.message);
    } else {
      console.log('📊 Organizations:', orgs?.length || 0);
      if (orgs && orgs.length > 0) {
        console.log(JSON.stringify(orgs, null, 2));
      }
    }
    console.log('');

    // Query expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, merchant, amount, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (expensesError) throw expensesError;
    console.log('💰 Recent Expenses:', expenses?.length || 0);
    if (expenses && expenses.length > 0) {
      expenses.forEach(exp => {
        console.log(`  - $${exp.amount} at ${exp.merchant} (${exp.category}) - ${exp.status}`);
      });
    }
    console.log('');

    // Query invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('id, email, role, status, created_at')
      .limit(5);

    if (invitationsError) throw invitationsError;
    console.log('✉️  Invitations:', invitations?.length || 0);
    if (invitations && invitations.length > 0) {
      invitations.forEach(inv => console.log(`  - ${inv.email} (${inv.role}) - ${inv.status}`));
    }
    console.log('');

    // Query receipts table
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*')
      .limit(5);

    if (receiptsError) {
      console.log('⚠️  receipts error:', receiptsError.message);
    } else {
      console.log('📄 Receipts:', receipts?.length || 0);
      if (receipts && receipts.length > 0) {
        console.log(JSON.stringify(receipts, null, 2));
      }
    }
    console.log('');

    // Get counts
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: expenseCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    const { count: receiptCount } = await supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true });

    const { count: invitationCount } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true });

    console.log('📈 Total Counts:');
    console.log(`  Organizations: ${orgCount || 0}`);
    console.log(`  Users: ${userCount || 0}`);
    console.log(`  Expenses: ${expenseCount || 0}`);
    console.log(`  Receipts: ${receiptCount || 0}`);
    console.log(`  Invitations: ${invitationCount || 0}`);

  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    console.error('Details:', error);
  }
}

queryDatabase();
