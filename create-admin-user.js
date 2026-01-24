// Script para crear nuevos usuarios administradores
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const readline = require('readline');

const supabaseUrl = 'https://elppseykmdjcyakmstyx.supabase.co';
const supabaseKey = 'sb_secret_v4Qcn-34fG8ismZ2H2kNvQ_D69BIxyU';
const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createAdminUser() {
    console.log('\n=== CREAR NUEVO USUARIO ADMIN ===\n');

    const username = await question('Nombre de usuario: ');
    const password = await question('Contraseña: ');

    if (!username || !password) {
        console.log('❌ Usuario y contraseña son requeridos');
        rl.close();
        return;
    }

    try {
        // Verificar si el usuario ya existe
        const { data: existing } = await supabase
            .from('admin_users')
            .select('username')
            .eq('username', username)
            .single();

        if (existing) {
            console.log(`❌ El usuario "${username}" ya existe`);
            rl.close();
            return;
        }

        // Generar hash de la contraseña
        console.log('\n🔐 Generando hash de contraseña...');
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario en la base de datos
        console.log('💾 Guardando en base de datos...');
        const { data, error } = await supabase
            .from('admin_users')
            .insert([{
                username: username,
                password_hash: passwordHash,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.log('❌ Error:', error.message);
            rl.close();
            return;
        }

        console.log('\n✅ Usuario administrador creado exitosamente!\n');
        console.log('📋 Detalles:');
        console.log('  - Usuario:', username);
        console.log('  - Contraseña:', password);
        console.log('  - Hash:', passwordHash);
        console.log('\n⚠️  IMPORTANTE: Guarda estas credenciales en un lugar seguro\n');

    } catch (error) {
        console.log('❌ Error:', error.message);
    }

    rl.close();
}

createAdminUser();
