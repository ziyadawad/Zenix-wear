// Usage: npm run admin:password -- "your-strong-password"
// Prints the values to put in your environment variables. Nothing is stored or sent anywhere.
import { randomBytes, scrypt as cb } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(cb) as (p: string, s: Buffer, l: number) => Promise<Buffer>;

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 10) {
    console.error('Pass a password of at least 10 characters:\n  npm run admin:password -- "your-strong-password"');
    process.exit(1);
  }
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
}
main();
