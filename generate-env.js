const fs = require('fs');
const path = require('path');
require('dotenv').config();

const environment = {
  production: true,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY
};

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');
const content = `export const environment = ${JSON.stringify(environment, null, 2)};`;

fs.writeFileSync(targetPath, content);

// Also generate development environment
const devEnvironment = {
  ...environment,
  production: false
};

const devTargetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
fs.writeFileSync(devTargetPath, `export const environment = ${JSON.stringify(devEnvironment, null, 2)};`); 