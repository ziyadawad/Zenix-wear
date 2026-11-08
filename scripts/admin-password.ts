// Usage: npm run admin:password
// Prints a strong dashboard password and the two random secrets to paste into Vercel → Environment Variables.
// It only prints to your own terminal: nothing is saved to a file or sent anywhere.
import { randomBytes, randomInt } from 'node:crypto';

// No look-alike characters (0/O, 1/l/I), so it is easy to type on a phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const password = Array.from({ length: 20 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

console.log('Copy each line into Vercel → Settings → Environment Variables (Production):\n');
console.log(`DASHBOARD_PASSWORD=${password}`);
console.log(`DASHBOARD_SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}   (only if it is not set yet)`);
console.log('\nSave the password in your phone\'s password manager. Then clear this terminal.');
