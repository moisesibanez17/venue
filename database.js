const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
// IMPORTANTE: Falta la URL del Proyecto (ej: https://xyz.supabase.co)
const supabaseUrl = 'https://elppseykmdjcyakmstyx.supabase.co';
const supabaseKey = 'sb_secret_v4Qcn-34fG8ismZ2H2kNvQ_D69BIxyU'; // Usando la Secret Key para el backend

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
