const fs = require('fs');
require('dotenv').config({ path: '../.env' }); // Apunta al .env en la raíz

const targetPath = './src/environments/environment.ts';

const envConfigFile = `export const environment = {
    production: false,
    supabaseUrl: '${process.env.SUPABASE_URL}',
    supabaseKey: '${process.env.SUPABASE_KEY}',
    apiUrl: '${process.env.API_URL || 'http://127.0.0.1:8000/api'}'
};
`;

fs.writeFile(targetPath, envConfigFile, function (err) {
    if (err) { throw console.error(err); }
    console.log('Variables de entorno generadas en ' + targetPath);
});