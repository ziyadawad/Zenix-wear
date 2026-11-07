# ZENIX WEAR

Bilingual (Arabic / English) e-commerce site and owner dashboard, built with Next.js 16, Tailwind CSS 4 and PostgreSQL.

## Run it on your computer

```bash
npm install
npm run dev
```

- Store: http://localhost:3000
- Admin: http://localhost:3000/admin

No database setup is needed locally. The site creates an embedded database in `.data/` and fills it with the starter catalogue.

To sign in to the admin, create a `.env.local` file (it is never committed; `.env.example` lists the variables) with `ADMIN_EMAIL` set to your email, plus the two lines printed by:

```bash
npm run admin:password -- "choose-a-long-password"
```

To go back to a clean starter catalogue, stop the server and run `npm run db:reset`. This only works on the local database.

## Go live (about 30 minutes)

### 1. Neon (database) and Vercel Blob (photo storage)
1. In your Vercel project, open **Storage** and connect a Neon Postgres database. Choose an EU region such as Frankfurt, which is close to Egypt and to the server region set in `vercel.json`. This adds `DATABASE_URL`.
2. Still in **Storage**, create a **Blob** store, set its access to **Private**, and connect it to the project. A store's access cannot be changed later. Uploads need a private store because payment screenshots are kept there; product photos are served publicly by the site through `/api/media`.
3. To set up a new, empty database, put `DATABASE_URL` in `.env.local` and run:
   ```bash
   npm run db:setup
   ```
   This creates the tables and the starter catalogue. Afterwards, remove `DATABASE_URL` from `.env.local` if you want to keep using the local database for development. While it is set, `npm run dev` works on the live database.

### 2. Admin password and session secret
```bash
npm run admin:password -- "choose-a-long-password"
```
Copy the two printed lines into Vercel in the next step. Use a different password from your local one.

### 3. New-order emails
Create a free [Resend](https://resend.com) account **using ziyadawad14@gmail.com** and copy an API key. Until you verify a domain, Resend only delivers to your own account's address, which is all order alerts need. Password-reset emails to customers need a verified domain, then set `EMAIL_FROM` to an address on it.

### 4. Vercel
1. Put this folder in a GitHub repository and import it at [vercel.com](https://vercel.com).
2. Add the environment variables listed in `.env.example`.
3. Deploy, then add your domain and set `NEXT_PUBLIC_SITE_URL` to it (with `https://`). Redeploy once.

### 5. Before you announce it
Open **/admin**. The **Launch checklist** on the dashboard shows what is still missing. Then:

- [ ] Remove the sample reviews (one button on the dashboard).
- [ ] Replace placeholder photos and products with your own.
- [ ] Set real stock counts: the starter stock numbers are made up.
- [ ] Check the **InstaPay and wallet details** in Settings. They default to 01003965158.
- [ ] Check **shipping fees** per governorate. The starter fees are estimates.
- [ ] Add your social links in Settings.
- [ ] Have someone review the policy pages, especially for your actual exchange terms.
- [ ] Place one real test order and confirm the email arrives.

## Day to day (Admin, works well on a phone)

| Area | What you can do |
|---|---|
| Dashboard | Sales today / 7 days / month, best sellers, low stock, launch checklist |
| Orders | Filter, change status, print invoice, one-click WhatsApp, view transfer screenshots |
| Products | Add/edit, photos per colour, stock per size and colour, sale prices, tags, collections |
| Promo codes | Percentage or fixed, expiry, usage limit, minimum order, first-order-only |
| Shipping fees | Fee per governorate |
| Homepage | Hero, announcement bar, category photos, featured collection and products, gallery |
| Reviews | Approve, hide, delete, choose which appear on the homepage |
| Inbox | Contact messages, back-in-stock requests, newsletter emails |
| Settings | Free-shipping threshold, payment details, social links, tracking pixels |

Cancelling an order puts its items back in stock.

**Tracking pixels:** paste your Facebook, TikTok and Google Analytics IDs in Settings. Page views, product views, add to cart, checkout and purchase events are then sent automatically.

**Back-in-stock requests** are collected in the Inbox with WhatsApp and email links; messaging those customers is a manual step.

## Card payments (Paymob)

The integration is prepared and stays hidden until these are set in Vercel: `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_HMAC_SECRET`.

In the Paymob dashboard, set the transaction processed callback to `https://your-domain.com/api/paymob/webhook`. Run a test-mode payment before going live: this flow has not been run against a real Paymob account.

## Replacing the photos

Everything can be replaced from the admin. Recommended sizes: products 1200×1500 (4:5), hero 2400×1350, category tiles 1200×1500. Photos are shrunk on your phone before uploading and served as WebP/AVIF automatically.

The logos in `public/brand/` were cut from the supplied JPEGs. The wordmark source is only 831 px wide: if you have a vector (SVG) or high-resolution version, replace `wordmark.webp` for sharper rendering on large screens.

Placeholder editorial photos are from Unsplash (see `public/images/editorial/CREDITS.txt`). The non-tee product images are generated illustrations.

## Project map

```
src/app/[locale]/    Store pages (/ar and /en)
src/app/admin/       Owner dashboard and its server actions
src/app/actions/     Checkout, tracking, forms, accounts
src/components/      UI, by area
src/lib/db/          Schema, starter data, database driver
src/lib/orders.ts    Pricing, stock and promo logic (server is the only source of truth)
src/lib/services.ts  Photo storage, email, Paymob
src/lib/i18n/        All Arabic and English text, plus policy pages
```
