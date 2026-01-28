require('dotenv').config();
const { supabaseAdmin } = require('../src/config/database');

async function syncTicketCounts() {
    console.log('🔄 Syncing ticket counts...');

    try {
        // Get all ticket types
        const { data: ticketTypes, error: typesError } = await supabaseAdmin
            .from('ticket_types')
            .select('*');

        if (typesError) throw typesError;

        for (const type of ticketTypes) {
            // Count COMPLETED purchases for this ticket type
            // We look at 'purchases' table where payment_status = 'completed'
            // OR we can look at 'tickets' table if that's cleaner. 
            // Let's use purchases as it reflects "sold" intent most accurately including pending-but-valid?
            // No, only 'completed' purchases should count as sold.

            const { count, error: countError } = await supabaseAdmin
                .from('purchases')
                .select('*', { count: 'exact', head: true })
                .eq('ticket_type_id', type.id)
                .eq('payment_status', 'completed');

            if (countError) {
                console.error(`Error counting for ${type.name}:`, countError);
                continue;
            }

            console.log(`🎫 ${type.name}: Stored Sold = ${type.quantity_sold}, Actual Completed = ${count}`);

            if (type.quantity_sold !== count) {
                console.log(`   ⚠️ Fixing count for ${type.name} to ${count}...`);

                const { error: updateError } = await supabaseAdmin
                    .from('ticket_types')
                    .update({ quantity_sold: count })
                    .eq('id', type.id);

                if (updateError) {
                    console.error(`   ❌ Failed to update: ${updateError.message}`);
                } else {
                    console.log(`   ✅ Corrected!`);
                }
            } else {
                console.log(`   ✅ Count matches.`);
            }
        }

        console.log('✨ Sync complete!');
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

syncTicketCounts();
