// Creates tables, fills them with the starter catalogue if empty, and creates the storage buckets.
// Usage: npm run db:setup (reads DATABASE_URL from .env.local or the environment)
import { SCHEMA_SQL } from '../src/lib/db/schema';
import { seedIfEmpty } from '../src/lib/db/seed';
import { openDriver } from '../src/lib/db/index';

async function buckets() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return console.log('Storage: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set, skipping buckets.');
  for (const [id, pub] of [['zenix-media', true], ['zenix-private', false]] as const) {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: id, public: pub, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }),
    });
    const text = await res.text();
    if (res.ok || /already exists/i.test(text)) console.log(`Storage bucket ready: ${id} (${pub ? 'public' : 'private'})`);
    else throw new Error(`Could not create bucket ${id}: ${res.status} ${text}`);
  }
}

async function main() {
  const driver = await openDriver();
  if (process.env.DATABASE_URL) {
    await driver.exec(SCHEMA_SQL);
    console.log('Schema ready.');
  }
  console.log((await seedIfEmpty(driver)) ? 'Starter catalogue added.' : 'Database already has data; seed skipped.');
  await buckets();
  await driver.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
