// Creates tables and fills them with the starter catalogue if empty.
// Usage: npm run db:setup (reads DATABASE_URL from .env.local or the environment)
import { SCHEMA_SQL } from '../src/lib/db/schema';
import { seedIfEmpty } from '../src/lib/db/seed';
import { openDriver } from '../src/lib/db/index';

async function main() {
  const driver = await openDriver();
  if (process.env.DATABASE_URL) {
    await driver.exec(SCHEMA_SQL);
    console.log('Schema ready.');
  }
  console.log((await seedIfEmpty(driver)) ? 'Starter catalogue added.' : 'Database already has data; seed skipped.');
  await driver.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
