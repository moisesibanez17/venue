
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
    try {
        console.log('--- Inspecting Purchases ---');
        const { data: purchases, error: pError } = await supabase
            .from('purchases')
            .select('*');
        console.log('Purchases:', purchases);

        console.log('\n--- Inspecting Tickets ---');
        const { data: tickets, error: tError } = await supabase
            .from('tickets')
            .select('*');
        console.log('Tickets:', tickets);

        console.log('\n--- Inspecting Ticket Types ---');
        const { data: ticketTypes, error: ttError } = await supabase
            .from('ticket_types')
            .select('id, name, quantity_total, quantity_sold');
        console.log('Ticket Types:', ticketTypes);

        if (pError) console.error('P Error:', pError);
        if (tError) console.error('T Error:', tError);
        if (ttError) console.error('TT Error:', ttError);
    } catch (e) {
        console.error(e);
    }
}

inspectTables();
