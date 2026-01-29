
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    try {
        const { count: purchaseCount, error: pError } = await supabase
            .from('purchases')
            .select('*', { count: 'exact', head: true });

        const { count: ticketCount, error: tError } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true });

        const { data: ticketTypes, error: ttError } = await supabase
            .from('ticket_types')
            .select('name, quantity_total, quantity_sold');

        console.log('--- Database Stats ---');
        console.log('Purchases:', purchaseCount);
        console.log('Tickets:', ticketCount);
        console.log('Ticket Types:', ticketTypes);

        if (pError) console.error('Purchase Error:', pError);
        if (tError) console.error('Ticket Error:', tError);
        if (ttError) console.error('TicketType Error:', ttError);
    } catch (e) {
        console.error(e);
    }
}

checkStats();
