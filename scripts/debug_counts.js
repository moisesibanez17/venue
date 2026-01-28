require('dotenv').config();
const { supabaseAdmin } = require('../src/config/database');

async function debugCounts() {
    console.log('Debugging Ticket Counts...');

    // Get all events
    const { data: events, error: eError } = await supabaseAdmin
        .from('events')
        .select('id, title');

    if (eError) {
        console.error(eError);
        return;
    }

    for (const event of events) {
        console.log(`\nEvent: ${event.title} (${event.id})`);

        // Count tickets by status
        const { data: tickets, error: tError } = await supabaseAdmin
            .from('tickets')
            .select('status, id, purchase_id')
            .eq('event_id', event.id);

        if (tError) {
            console.error(tError);
            continue;
        }

        const counts = {};
        let total = 0;
        tickets.forEach(t => {
            counts[t.status] = (counts[t.status] || 0) + 1;
            total++;
        });

        console.log('Ticket Status Breakdown:', counts);
        console.log('Total Tickets in DB:', total);

        // Check Purchases
        const { data: purchases, error: pError } = await supabaseAdmin
            .from('purchases')
            .select('id, quantity, payment_status')
            .eq('event_id', event.id);

        if (pError) { console.error(pError); continue; }

        console.log('Purchases:', purchases.length);
        let purchaseTotal = 0;
        purchases.forEach(p => {
            console.log(` - Purchase ${p.id}: Quantity ${p.quantity} (${p.payment_status})`);
            if (p.payment_status === 'completed') purchaseTotal += p.quantity;
        });
        console.log('Total Expected Valid Tickets from Completed Purchases:', purchaseTotal);
    }
}

debugCounts();
