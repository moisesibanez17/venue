const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  Supabase environment variables not configured');
    console.error('Required: SUPABASE_URL, SUPABASE_KEY');
    throw new Error('Missing Supabase configuration');
}

// Client for user operations (respects RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (using same key - update with service role key if needed)
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase clients initialized');

module.exports = {
    supabase,
    supabaseAdmin
};
