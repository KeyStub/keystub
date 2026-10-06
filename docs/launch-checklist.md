# KeyStub launch checklist

Source of truth for progress (Claude updates it as steps are confirmed). The detailed, clickable version is `docs/keystub-setup.html`, published at https://claude.ai/artifact/Jape1cB2BcABwCb8utMrVC. Updated 2026-10-05.

Domain registrant: Jarin's own legal name (individual); .ca registered under Canadian presence rules.

**Founding date (brand story):** September 30, 2026, when work on turning the personal tracker into KeyStub began. The official/legal date will be the AMA trade name registration date (step 07). Origin: tracking began July 29, 2024, when Jarin bought the Santa Fe.

## Decisions made
- **Name:** KeyStub (capital S, single b).
- **Structure:** sole proprietorship trade name under Jarin's name, like The Vinyl Hut. Reuse the existing CRA business number. Incorporate before taking public payments if the accountant agrees.
- **Domains:** Porkbun, keystub.com + keystub.ca (optional .app, keystubb.com).
- **Email:** Google Workspace Business Starter, login admin@keystub.com (private super admin, used only to sign in to Google) plus free aliases accounts@ (all third-party service sign-ups, using email sign-up rather than "Continue with Google"), support@ (public, default "send as"), hello@, billing@ (Stripe). keystub.com is the primary domain; keystub.ca redirects to it and can be added as a free Workspace alias domain. Kept separate from The Vinyl Hut.
- **Passwords:** Google Password Manager in a separate "KeyStub" Chrome profile signed in as admin@keystub.com; Google Authenticator for two-step codes.
- **Bank:** Venn (backup: EQ Bank Business).
- **Stack:** Next.js + Postgres + Better Auth; GitHub (code), Neon (database), Vercel (hosting), Resend (app emails), Stripe (payments, later).
- **Pricing idea:** Free (2 vehicles) / Pro about $3/month or $24/year.

## Already done
- [x] App built and tested locally (Documents\santa-fe-tracker)
- [x] Import verified on a test account: 45 / $3,235.74 · 16 / $5,377.97 · 29 / $10,655.53
- [x] Competitor research (docs/market-research.md)
- [x] Name chosen: KeyStub (docs/brand-names.html)

## Phase 1: claim the name (today)
- [ ] 01 Quick trademark search (CIPO + USPTO); check @keystub is free on Instagram, X, Facebook, YouTube (TikTok optional)
- [ ] 02 KeyStub Chrome profile (Google Password Manager) + Google Authenticator on phone
- [x] 03 Buy keystub.com + keystub.ca at Porkbun (WHOIS privacy on, auto-renew on, two-step login)

## Phase 2: business email & social accounts
- [ ] 04 Google Workspace Business Starter on keystub.com; verify the domain via Porkbun DNS. IN PROGRESS (2026-10-05): verification TXT, MX and SPF confirmed live; DKIM (google._domainkey TXT) still to add before "Turn on Gmail" completes; sign-up saved jarin@keystub.com as the login; rename it to admin@ in the Admin console once verified (old address becomes an alias)
- [x] 05 DONE 2026-10-05: aliases jarin@, support@, sales@, billing@, hello@, accounts@, subscriptions@; KeyStub logo uploaded in Admin console. (Confirm Gmail send-as support@ is default and DKIM verified.) Aliases accounts@/support@/hello@/billing@, Gmail "send as" support@ by default, 2-Step Verification, switch the Porkbun account email to accounts@keystub.com; optional: keystub.ca as a user alias domain
- [x] 06 DONE 2026-10-05: Instagram (business account), X and Facebook Page created as @keystubapp; YouTube waiting (~Nov 4); TikTok skipped. Social accounts: Instagram (accounts@, business account), Facebook Page (from Jarin's personal profile, linked to Instagram), X (accounts@), YouTube channel reserved (admin@; may say "not yet eligible" on a new Workspace), TikTok optional. Handle @keystubapp everywhere (keystub taken on Instagram), display name KeyStub, public email support@, two-factor on each

## Phase 3: make it official
- [ ] 07 PAID 2026-10-05, waiting on documents to sign + final confirmation. Register the KeyStub trade name ONLINE via AMA Business Suite (https://ama.ab.ca/business/register-sole-proprietorship → Sign In), $59 all-in; download the registration PDF (1–3 business days)
- [ ] 08 Look up the existing business number in CRA My Business Account
- [ ] 09 Open Venn (sole proprietor, KeyStub; needs AMA PDF, business number, SIN, ID); move Porkbun and Workspace billing onto the Venn card
- [ ] 10 MD of Pincher Creek: NO business licence. Ask MD Planning & Development (403-627-3130, info@mdpinchercreek.ab.ca) whether a computer-only home office needs a home occupation development permit (Bylaw 1349-23 s.6.80/15/47). If yes: Development Permit Application Form + site plan, $100 (home occupation is a permitted use in Agriculture and GCR districts; $150 if discretionary). The Vinyl Hut never applied: ask about it in the same call
- [x] 11 DONE 2026-10-05: KeyStub Records folder in Drive; simple bookkeeping (spreadsheet or Wave)

## Phase 4: put the app online (with Claude)
- [ ] 12 GitHub account → Claude creates a private repo and pushes the code
- [ ] 13 Neon project "keystub" in AWS US East (N. Virginia), to sit next to Vercel iad1 → connection string saved in Google Password Manager (never pasted in chat)
- [ ] 14 Vercel (Hobby, via GitHub) → import repo, add settings, deploy; Claude runs migrations and checks
- [ ] 15 Real account on the live site → dry-run then real import → verify the 45/16/29 totals; review 3 flagged records
- [ ] 16 Resend on keystub.com → API key → Claude switches app emails to noreply@keystub.com
- [ ] 17 (PART DONE 2026-10-05: app renamed to KeyStub locally; brand colours, Archivo + IBM Plex Sans, logo, favicon/app icons, share image, installable app manifest, new homepage) Rename to KeyStub, logo and colours; delete Porkbun parking records (ALIAS @ → pixie.porkbun.com, CNAME * → uixie.porkbun.com); connect keystub.com (and .ca redirect) in Vercel

## Phase 5: before charging anyone
- [ ] 18 Accountant: incorporate? GST across both businesses? bookkeeping
- [ ] 19 Trademark filing decision; legal review of privacy policy and terms
- [ ] 20 Stripe: login accounts@, public receipt email billing@ (test mode → verification → payouts to Venn → live)
- [ ] 21 Launch (Vercel paid plan if charging); next features: bank-statement import, receipt scanning

## Product decisions (2026-10-05)
- **One site for all countries:** keystub.com serves Canada and the US; keystub.ca forwards to it. The country is detected automatically (Vercel geolocation) to default currency and units; users can change them in Account settings; the pricing page has a CAD/USD toggle. Stripe offers both currencies on the same Pro plan.
- **Hosting map:** Porkbun (domains/DNS) · Vercel (site + app) · Neon US East (database) · Google Workspace (staff email) · Resend (app email) · GitHub (code) · Stripe (payments, later).
- **Data location:** Neon has no Canadian region, so data lives in the US East; disclose this in the privacy policy. A Canadian Postgres host is an option later if data staying in Canada becomes a selling point.

## Later: product work before a US launch
- [ ] Per-user units and currency: km/mi, L/gal, L/100 km / MPG, CAD/USD, defaulted from the visitor's country
- [ ] Pricing page CAD/USD toggle; Stripe prices in both currencies
- [ ] Privacy policy: add the "data stored in the United States" disclosure

## Account register (2026-10-05)
| Account | Sign in with | Public email | Status |
|---|---|---|---|
| Google Workspace | admin@keystub.com (renamed from jarin@; jarin@ kept as alias) | support@ (send-as) | Set up: aliases jarin/support/sales/billing/hello/accounts/subscriptions, logo uploaded |
| Porkbun | accounts@keystub.com (switch from personal email) | — | Created; domains bought |
| Chrome profile (Google Password Manager) | admin@keystub.com | — | To do |
| Instagram | accounts@ | support@ | Created @keystubapp, business account |
| Facebook Page | Jarin's personal Facebook (Page admin) | support@ | Created |
| X | accounts@ | support@ | Created @keystubapp |
| YouTube | admin@ (Google sign-in) | support@ | Waiting: "not yet eligible" until the Workspace account is 30 days old (about Nov 4, 2026) or $30 USD is charged; create @keystubapp then |
| TikTok (optional) | accounts@ | support@ | Skipped: needs its own phone number (Jarin's is on his personal account); revisit if KeyStub gets a phone line |
| CRA My Business Account | existing CRA sign-in | — | Exists |
| Venn | accounts@ | — | To do |
| Wave (optional) | accounts@ | — | To do |
| GitHub | accounts@ | — | To do |
| Neon | accounts@ (email sign-up) | — | To do |
| Vercel | Continue with GitHub | — | To do |
| Resend | accounts@ | — | To do |
| Stripe | accounts@ | billing@ | To do |

## Brand kit (2026-10-05)
- Logo: car key whose head is a ticket stub. Files in `brand/` (SVG with outlined text + PNG), zipped as `KeyStub-brand-kit.zip`; guide published at https://claude.ai/artifact/1t3TgQcmma1br6vdGxCVVL
- Colours: Navy #18263F (primary) · Ticket Yellow #F4C430 (accent; never text on white) · Paper #F2F4F7 · Ink #16202F · Slate #47546A · White
- Fonts: Archivo ExtraBold 800 (logo, headlines) · IBM Plex Sans 400/500/600 (body). Both free Google Fonts.
- Tagline: "Know what your car really costs."
- To do in step 17: apply these colours, fonts and the icon to the app itself (it still uses the original tracker's colours and system fonts).

## Later: mobile apps (Play Store / App Store)
- [ ] Goal: publish KeyStub to Google Play and the Apple App Store after the web app is proven.
- [ ] Google Play Console developer account (one-time ~$25 USD); Apple Developer Program (~$99 USD/year; a D-U-N-S number is needed if enrolling as an organization rather than an individual). Sign up with accounts@keystub.com.
- Registered business activity (AMA, 144 chars): "Development and operation of web and mobile software applications for tracking personal vehicle expenses, fuel, maintenance and ownership costs."

## Notes (2026-10-05)
- AMA Business Suite owner profile: recommended to use Jarin's personal email (the owner profile covers both KeyStub and The Vinyl Hut); business contact = accounts@keystub.com. If jarin@keystub.com is kept on the AMA profile, do NOT delete the jarin@ alias in Google Admin.
- Owner occupation on registration: "Business Owner" (match The Vinyl Hut's registration).
- Homepage example card shows Jarin's real Santa Fe totals with "*Based on real data" footnote (Jarin's choice, 2026-10-05). Fuel-economy figure removed (it came from a test entry).

## Product roadmap (requested by Jarin, 2026-10-05)
Shown on the website as "Coming soon" until built.
- [ ] **Custom categories**: users add their own (car washes, detailing, accessories…). Free: up to 3; Pro: unlimited (`PLANS.maxCustomCategories`).
- [ ] **Scheduled payments**: recurring costs (e.g. insurance on the 15th monthly) auto-logged on schedule; user confirms or edits the amount. Free + Pro.
- [ ] **Smart reminders**: learn each user's rhythm (insurance day of month; typical days between fill-ups). If an expected entry is 2–3 days late, nudge. In-app for Free; email + phone push for Pro. Needs Resend (email) and, later, web push / mobile app.
- [ ] **Receipt scanning** (Pro): photo of a gas or shop receipt → AI reads station, total, litres, $/L, grade, date → pre-filled form the user confirms. Needs an Anthropic API key (about 1–2¢ per scan).
- [ ] Bank-statement import (Pro), from earlier research.
- [x] Website: /coming-soon page (linked in header and footer; removed from homepage); dedicated /pricing page with comparison table and FAQ; nav "Pricing" goes there; footer links Pricing / Privacy / Terms; homepage mentions manual vehicle entry (VIN optional), "etc." in hero, real-data card without title.

## Pricing idea under consideration: lifetime tier (2026-10-05)
- Jarin asked about a one-time "lifetime Pro" option alongside $24/yr.
- Recommendation: decide at launch (step 21), not now. If offered, make it a limited "Founding member" deal (e.g. first 100–250 customers, about $79 CAD, ≈ 3.3 years of Pro), with fair-use limits on per-use-cost features like receipt scanning. Technically simple (Stripe one-time payment → plan = pro, status = lifetime). Ask the accountant how to record lifetime revenue and GST.

## Taxes: GST/HST registration (raised 2026-10-05, decide at accountant meeting, step 18)
- Registration is free (CRA My Business Account → add a GST/HST program account to the existing business number; or 1-800-959-5525). GST number = BN + RT0001.
- As a sole proprietor, registration covers Jarin personally, so BOTH The Vinyl Hut and KeyStub. Registering means TVH must also start charging 5% GST.
- Mandatory once combined sales from both businesses exceed $30,000 in four consecutive quarters (or a single quarter); register within 29 days. No need to stop service.
- Pros of early registration: input tax credits on business costs from the registration date; ready for growth. Cons: TVH charges GST immediately; returns to file (choose annual); usually committed for 1+ year.
- Recommendation: don't register yet; decide before Stripe goes live. Bring TVH's approximate annual sales to the accountant. If registered, use Stripe Tax for per-province GST/HST.

## Free trial (built 2026-10-05)
- Every new account gets a **30-day Pro trial, no card needed** (`TRIAL_DAYS` in src/lib/plans.ts; set at sign-up via a Better Auth hook; column `user.trial_ends_at`, migration 0001).
- When it ends the account drops to Free and keeps all data; vehicles beyond 2 stay visible but no new ones can be added.
- Pricing button: "Start 30-day free trial" with the no-card note; homepage, sign-up page and pricing FAQ mention it; Account page shows "Pro trial: N days left".
- Later (with Stripe): optional reminder email ~5 days before the trial ends.

## Design overhaul (2026-10-05)
- References from Jarin: outofspecstudios.com/testing, outofspecdeals.com, devinolsen.ca. Takeaways used: bold geometric headings, uppercase eyebrow labels, pill buttons, sticky blur nav with an active-section underline, rounded cards with soft shadows, light sections alternating with navy bands, single-colour line icons, scroll reveals.
- Marketing site moved to `src/app/(marketing)/` with its own stylesheet (`marketing.css`): hero with phone mockup + floating cards, odometer counter that rolls to $19,269 (real data), sticky scroll "How it works" whose phone screen changes per step, bento feature grid with mini app UIs (real receipt, fuel rows, duplicate warning…), founder story card, pricing, CTA, multi-column footer. Pricing, Coming soon, Privacy and Terms restyled to match.
- App: pill buttons and tabs, softer cards, blurred sticky header; on phones (≤700px) a bottom tab bar (Home, Fuel, yellow "+", Reminders, More). "+" opens Log something → fill-up / maintenance / cost / reminder; "More" has the other sections, account and sign out; secondary table columns hide on phones.
- `/preview` (local only): website and app pages side by side in 390×844 phone frames.
- TO REVIEW: the founder quote on the homepage is a DRAFT written in Jarin's voice; he should rewrite or approve it.
