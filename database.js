const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
// IMPORTANTE: Falta la URL del Proyecto (ej: https://xyz.supabase.co)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
