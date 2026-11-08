# ZENIX WEAR

Bilingual (Arabic / English) e-commerce site and owner dashboard, built with Next.js 16, Tailwind CSS 4 and PostgreSQL.

## Run it on your computer

```bash
npm install
npm run dev
```

- Store: http://localhost:3000
- Dashboard (owner only): http://localhost:3000/dashboard, with product, content and settings management under /admin

No database setup is needed locally. The site creates an embedded database in `.data/` and fills it with the starter catalogue.

To sign in locally, create a `.env.local` file (it is never committed; `.env.example` lists the variables) with `DASHBOARD_PASSWORD=` any password. `npm run admin:password` prints a strong password and the secrets for production.

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

### 2. Dashboard password and secrets
```bash
npm run admin:password
```
It prints `DASHBOARD_PASSWORD`, `DASHBOARD_SESSION_SECRET` and `SESSION_SECRET`. Add them in Vercel in step 4 and keep the password in a password manager. They are never in code or Git. Wrong passwords are limited to 5 tries, then a 15-minute wait. The old `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` variables are no longer used and can be deleted.

### 3. New-order emails
Create a free [Resend](https://resend.com) account **using ziyadawad14@gmail.com** and copy an API key. Until you verify a domain, Resend only delivers to your own account's address, which is all order alerts need. Password-reset emails to customers need a verified domain, then set `EMAIL_FROM` to an address on it.

### 4. Vercel
1. Put this folder in a GitHub repository and import it at [vercel.com](https://vercel.com).
2. Add the environment variables listed in `.env.example`.
3. Deploy, then add your domain and set `NEXT_PUBLIC_SITE_URL` to it (with `https://`). Redeploy once.

### 5. Before you announce it
Open **/admin/settings**. The **Launch checklist** shows what is still missing. Then:

- [ ] Remove the sample reviews (one button on the Reviews page).
- [ ] Add a **cost price** to every product (Products → edit), so the dashboard's profit is right.
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

Placeholder editorial photos are from Unsplash (see `public/images/editorial/CREDITS.txt`); none of them show people. All product images are generated product-only illustrations (`npm run photos:tees` re-renders the T-shirts).

### Photos of people

The site shows no photos of people except the three approved ones. To add or replace them:

1. Put `photo-1.jpg` (hero), `photo-2.jpg` (T-shirts tile) and `photo-4.jpg` (About page) in `public/approved-photos/`.
2. Run `npm run photos:approved`. It removes the Snapchat caption from photo-4, applies the dark brand grade, writes WebP copies to `public/images/approved/`, moves the originals out of `public/` into the git-ignored `approved-photos-originals/` and switches the site to the new photos.
3. Open `approved-photos-originals/preview.jpg` to check the photo-4 crop. If any of the caption is left, re-run with `--photo4-crop=0.75` (the share of the height to keep).

Until a photo is processed, its place shows a product shot or the dark brand background, never an empty box. Do not upload other photos of people from the admin.

## Dashboard

`/dashboard` (link at the bottom of the footer and the phone menu) is password protected and shows live numbers from the database, refreshed every 30 seconds. Everything is set in `config/dashboard.config.ts` (Arabic comments on each line).

- **Stock** is held from the moment an order is placed, so the last piece can never be sold twice. Cancelling or returning an order puts it back. Every change (sale, cancel, return, manual change with a reason, edit from the product page) is in the stock log.
- **Money**: a delivered cash-on-delivery order goes to the "فلوس عند شركة الشحن" wallet; record the courier's payout as a transfer to cash or bank. Paid InstaPay, wallet and card orders go to their own wallets. Expenses come out of the wallet they were paid from.
- **Profit this month** = delivered sales − cost of goods (cost price × pieces) − shipping cost (governorate fee) − expenses.
- **TV mode** (desktop): fullscreen, pages rotate; arrows to move, Esc or F to leave.
- Database changes apply themselves on the first request after a deploy (`src/lib/db/migrations.ts`). Existing data is kept.

## Project map

```
src/app/[locale]/    Store pages (/ar and /en)
src/app/dashboard/   Owner dashboard (login, overview, orders, stock, money, products, customers)
src/app/admin/       Product, content and settings management, and its server actions
config/dashboard.config.ts  Dashboard settings: pages, refresh, stock minimums, wallets, expense types, target
src/app/actions/     Checkout, tracking, forms, accounts
src/components/      UI, by area
src/lib/db/          Schema, starter data, database driver
src/lib/orders.ts    Pricing, stock and promo logic (server is the only source of truth)
src/lib/services.ts  Photo storage, email, Paymob
src/lib/i18n/        All Arabic and English text, plus policy pages
```
