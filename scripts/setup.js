import fs from 'node:fs';
import path from 'node:path';
import { appRoot } from '../src/config.js';

const envPath = path.join(appRoot, '.env');
const examplePath = path.join(appRoot, '.env.example');
const dataPath = path.join(appRoot, 'data');

fs.mkdirSync(dataPath, { recursive: true });

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('.env oluşturuldu. ntfy kullanacaksanız NTFY_TOPIC değerini düzenleyin.');
} else {
  console.log('Var olan .env korundu.');
}

console.log(`Veri klasörü hazır: ${dataPath}`);
console.log('Gerit’i başlatmak için: npm start');
