# Santa Fe Tracker (vehicle cost tracker)

Multi-user web app for tracking fuel, maintenance, insurance and registration across vehicles.
It replaces the single-user Claude Artifact tracker.

**Stack:** Next.js 16 · PostgreSQL (Drizzle ORM) · Better Auth (email + password) · Stripe (optional) · Resend (optional)

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

`npm run dev` starts a private Postgres server stored in `.data/postgres`, applies database migrations, and then starts the app. Stop it with **Ctrl+C** so Postgres shuts down cleanly. It recovers on its own if it doesn't.

While `RESEND_API_KEY` is empty, no email is actually sent. Verification and password-reset emails are printed in the terminal and appended to `.data/outbox.log`, so you can open the links from there.

## Import the original tracker's data (one time)

1. Run `npm run dev` and sign up with your real email. Confirm it using the link in `.data/outbox.log`.
2. Do a dry run. It shows the before and after totals and saves nothing:
   ```bash
   npm run import:legacy -- "C:/Users/jarin/Downloads/santa-fe-tracker-data-export.json" --email YOUR_EMAIL --dry-run
   ```
3. Run the same command without `--dry-run`.

The import runs as a single transaction. It refuses to run if the file doesn't match the handoff totals (45 fuel / $3,235.74, 16 maintenance / $5,377.97, 29 insurance & registration / $10,655.53). It rolls everything back if the database totals don't match the file afterwards. Re-running it updates records instead of duplicating them. Three suspect fuel records are imported unchanged and flagged **Needs review** on the Fuel tab.

You can also import a file from the browser under **Account → Import**, which shows a preview before saving anything.

To give yourself Pro features without paying, add your email to `FOUNDER_EMAILS` in `.env.local`.

## Checks

```bash
npm run typecheck
npm test
npm run lint
```

## Going public (all have free tiers)

| Need | Service | Env vars |
|---|---|---|
| Database | [Neon](https://neon.tech) Postgres | `DATABASE_URL` |
| Email | [Resend](https://resend.com) (verify your domain) | `RESEND_API_KEY`, `EMAIL_FROM` |
| Hosting | [Vercel](https://vercel.com) (Hobby is free but non-commercial; Pro is about $20/month once you charge) | set all vars in the dashboard |
| Payments | [Stripe](https://stripe.com) (no monthly fee) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` |

Steps:
1. Create the Neon database and set `DATABASE_URL`. Run `npm run db:migrate` once, and again whenever the schema changes.
2. Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public URL.
3. To migrate your local data: download a JSON backup from **Account**, or re-run `import:legacy` against the new `DATABASE_URL`.
4. Stripe:
   - Create a "Pro" product with monthly and yearly prices.
   - Add a webhook to `https://YOUR_DOMAIN/api/billing/webhook` for `checkout.session.completed` and `customer.subscription.*`.
   - Turn on the customer portal.
5. Pick the final product name with `NEXT_PUBLIC_APP_NAME`.
6. Have [the privacy policy](src/app/privacy/page.tsx) and [terms](src/app/terms/page.tsx) drafts reviewed.

## Where things are

- `src/db/schema.ts`: the database tables. Every table has a `user_id`, and every query filters on it.
- `src/server/actions.ts`: all writes, including validation and the duplicate and odometer warnings.
- `src/server/data.ts`: all reads, scoped to the signed-in user.
- `src/lib/calc.ts`: dashboard and report math, ported from the original app.
- `src/lib/legacy-import.ts` and `src/db/import-core.ts`: the verified importer.
- `src/lib/plans.ts`: Free and Pro limits and features.
- `docs/market-research.md`: competitor research and feature ideas.
