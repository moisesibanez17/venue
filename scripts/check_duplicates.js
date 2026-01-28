require('dotenv').config();
const { supabaseAdmin } = require('../src/config/database');

async function checkDuplicates() {
    console.log('Checking for duplicate tickets...');

    const { data: purchases, error: pError } = await supabaseAdmin
        .from('purchases')
        .select('id, quantity, user_id, event_id, total');

    if (pError) {
        console.error('Error fetching purchases:', pError);
        return;
    }

    const { data: tickets, error: tError } = await supabaseAdmin
        .from('tickets')
        .select('id, purchase_id, ticket_number');

    if (tError) {
        console.error('Error fetching tickets:', tError);
        return;
    }

    console.log(`Found ${purchases.length} purchases and ${tickets.length} tickets.`);

    let duplicateFound = false;

    for (const purchase of purchases) {
        const purchaseTickets = tickets.filter(t => t.purchase_id === purchase.id);

        if (purchaseTickets.length > purchase.quantity) {
            console.log('⚠️ Duplication Found!');
            console.log(`Purchase ID: ${purchase.id}`);
            console.log(`Expected Quantity: ${purchase.quantity}`);
            console.log(`Actual Tickets: ${purchaseTickets.length}`);
            console.log('Ticket IDs:', purchaseTickets.map(t => t.id));
            duplicateFound = true;
        }
    }

    if (!duplicateFound) {
        console.log('✅ No duplicates found.');
    }
}

checkDuplicates();
