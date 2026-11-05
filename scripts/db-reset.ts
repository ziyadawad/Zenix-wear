// Local only: empties the embedded database and refills it with the starter catalogue.
// Stop the dev server first: the embedded database allows one process at a time.
// Usage: npm run db:reset
import { openDriver } from '../src/lib/db/index';
import { seedIfEmpty } from '../src/lib/db/seed';

async function main() {
  if (process.env.DATABASE_URL || process.env.VERCEL) {
    console.error('Refusing to run: DATABASE_URL is set. This command is only for the local embedded database.');
    process.exit(1);
  }
  const driver = await openDriver();
  await driver.exec(`
    TRUNCATE collections, products, product_variants, customers, addresses, wishlist, orders,
             promo_codes, shipping_rates, reviews, settings, newsletter, stock_alerts, messages, rate_limits CASCADE;
    ALTER SEQUENCE order_number_seq RESTART WITH 10001;
  `);
  await seedIfEmpty(driver);
  await driver.close();
  console.log('Local database reset to the starter catalogue.');
}
main().catch((e) => { console.error(e); process.exit(1); });
