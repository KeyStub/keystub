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
- [x] 12 DONE 2026-10-05: GitHub account **KeyStub**; code pushed to the private repo github.com/KeyStub/keystub (branch main)
- [x] 13 DONE 2026-10-05: Neon project "KeyStub" (project id royal-surf-02570009) in **AWS US East 2 (Ohio)**; app functions pinned to Vercel **cle1 (Cleveland)** in vercel.json to sit next to it. Pooled connection string saved in Google Password Manager (never pasted in chat)
- [x] 14 DONE 2026-10-05: Vercel Hobby (team "key-stub", via GitHub KeyStub) → project **keystub**, live at https://keystub.vercel.app ; env vars set; database tables created by the vercel-build step; checked: pages load, auth + database respond, security headers on, /preview hidden
- [x] 15 DONE 2026-10-06: Jarin's real account on https://keystub.com (email verified via Resend, founder Pro); original tracker imported and verified: maintenance $5,377.97 and insurance/registration/other $10,655.53 exact; fuel $3,235.74 imported + one real $75.00 fill-up added afterwards = $3,310.74. Remaining: review the 3 flagged records if not done yet.
- [x] 16 DONE 2026-10-05/06: Resend (accounts@) with keystub.com verified (DKIM, SPF via send/rsend, DMARC p=none added); API key in Vercel; emails from noreply@keystub.com
- [ ] 17 (MOSTLY DONE 2026-10-06: KeyStub brand live; keystub.com connected to Vercel (A 216.198.79.1, www CNAME, www + keystub.vercel.app 308 → keystub.com, HTTPS on); Porkbun parking ALIAS + wildcard deleted on keystub.com) Remaining: keystub.ca → add in Vercel as 308 redirect to keystub.com and swap its Porkbun parking records for the ones Vercel shows

## Phase 5: before charging anyone
- [ ] 18 Accountant: incorporate? GST across both businesses? bookkeeping
- [ ] 19 Trademark filing decision; legal review of privacy policy and terms
- [ ] 20 Stripe: login accounts@, public receipt email billing@ (test mode → verification → payouts to Venn → live)
- [ ] 20b Upgrade Vercel Hobby → Pro (US$20/month) before taking payments: Hobby is non-commercial use only
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
| GitHub | accounts@ (username KeyStub) | — | Done 2026-10-05 (private repo KeyStub/keystub) |
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
### Before mobile app development (agreed 2026-10-06)
- [ ] **Blocker 1:** step 15 done (Jarin's real account on keystub.com + verified import). Proves the live system end to end.
- [ ] **Blocker 2: who publishes the app.** Apple does NOT accept sole proprietorships / trade names as organizations, so as a sole proprietor the App Store would list the seller as "Jarin Fehr". To show "KeyStub" (or a company name) the business must be incorporated and have a D-U-N-S number (free, can take up to ~30 days). Decide at the accountant meeting (step 18).
- [ ] **Blocker 3: developer accounts** (verification takes days to weeks, start early): Apple Developer Program US$99/yr; Google Play Console US$25 once. New *personal* Google Play accounts must run a closed test with at least 12 testers for 14 days before publishing: the EV testers can be those 12.
- [ ] Decide how app subscriptions are sold: (a) app is free, upgrades happen on keystub.com (simplest; no Apple/Google cut), or (b) in-app purchase (Apple/Google take 15% under their small-business programs). Not urgent: Stripe isn't live yet.
- Recommended build approach: **Capacitor** (wraps the existing app in a real iOS/Android app; one codebase; adds native push notifications, camera for receipt scanning, Face ID). Apple rejects apps that are "just a website", so the first version must include native features (push reminders, camera). Alternative: Expo / React Native: more native, but a second app to build and maintain.
- Already in place for the stores: in-app account deletion, privacy policy, terms, support email, app icon/brand, phone layout with bottom tab bar.
- Meanwhile testers can use it as an app today: keystub.com → Share → **Add to Home Screen** (iPhone, Safari) or ⋮ → **Install app** (Android, Chrome). It opens full-screen with the bottom tab bar.
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

## Polish batch (2026-10-05)
- Privacy scrub: homepage and app mockups no longer show gas stations, exact vehicle, plate or town ("Daily driver · 2014 SUV"; example car is generic).
- Dark mode: Light / Dark / Match device toggle (header button on the website and app, plus Account → Appearance and the phone "More" sheet). No flash on load; contrast checked in both themes.
- Reminder lead time is user-editable (Account → Reminders): days ahead (default 30) and km ahead (default 500).
- Sign-in, sign-up, forgot and reset password pages restyled in the new design (split layout).
- "Miles, gallons and MPG" listed on Coming soon (units are km and litres for now).

## EV & plug-in hybrid support (built 2026-10-05)
- Every vehicle has a **powertrain**: gas, diesel, hybrid, plug-in hybrid or electric (VIN lookup fills it in). EV/PHEV also get usable battery kWh and rated range.
- **Charging log**: kWh, cost (blank at home = kWh × home electricity rate, marked as estimated; 0 = free), home / work / public L2 / DC fast / other, network, start/end %, minutes, odometer. Quick charge card on the dashboard and a "Charging session" item in the phone "+" sheet.
- **Charging stats**: total spent, kWh, average $/kWh, % at home, kWh/100 km measured at the plug (includes charging losses), energy cost per km, and savings against a comparable gas car.
- **Battery health**: periodic checks of state-of-health % and/or range at 100%, compared with rated range.
- **Account → Energy**: home electricity price (default $0.18/kWh), comparison gas car L/100 km (default 9) and gas price (default $1.60/L).
- EV cost types: Home charger, Charging subscription, Rebate / incentive (counts as money back). New maintenance categories: 12V battery, Cabin / air filter, Software / recall.
- EVs see Charging + Battery tabs instead of Fuel; plug-in hybrids see both. Charging is included in totals, monthly trends, reminders (odometer), and the CSV export.
- Website: homepage "Drive electric? KeyStub speaks kWh." section; pricing table rows for all powertrains, EV charging and battery health (Free and Pro).
- Fixed: two fill-ups or charges on the same day no longer trigger a false odometer warning.
- Migration 0003 (needs to run on Neon at deploy, done automatically by the migrate step).

## Ideas for "works with any vehicle" (not built yet, for Jarin to prioritise)
- [x] Units (miles, gallons, MPG) and currency: built 2026-10-05.
- Lease tracking: km allowance vs actual, projected overage cost.
- Loan / financing: payment schedule, interest paid vs principal.
- Depreciation & resale estimate in the true cost (purchase − estimated value today).
- Business-use mileage log (CRA / IRS): trips, purpose, business % for tax deductions. A strong reason for self-employed people to pay.
- Engine hours instead of km for boats, ATVs, tractors, generators; motorcycles work already.
- Seasonal tire swaps & storage as a recurring reminder pair; diesel DEF as a fuel-log extra.
- Multiple drivers per vehicle / shared household garage.

## Markets (decided 2026-10-05)
- **Launch: Canada + US.** Hosting (Vercel cle1 + Neon US East 2, Ohio) already serves both well.
- Needed for the US before launch: miles / US gallons / MPG and per-user currency (CAD or USD); pricing in USD for US customers (Stripe supports a CAD and a USD price per plan); US-friendly wording (e.g. "registration renewal" is fine, "licence" vs "license").
- US sales tax on software: only required once sales into a state pass its threshold (usually US$100k or 200 transactions per year), so not at the start. Stripe Tax can monitor thresholds.
- **Later, worldwide:** EU/UK charge VAT on digital services from the FIRST sale to consumers (no threshold for foreign sellers), and Australia/NZ/others have similar rules. Before opening those markets, either register via EU OSS / UK HMRC, or switch to a merchant of record (Paddle or Lemon Squeezy) that collects and files tax everywhere for ~5% + 50¢ per sale. Also needs translations, more currencies and date/number formats, and GDPR wording in the privacy policy.

## Units & currency (built 2026-10-05)
- Account → **Units & currency**: quick presets (Canada / United States / United Kingdom) or mix: km or miles; litres, US gallons or imperial gallons; L/100 km, km/L, MPG (US) or MPG (UK); currency CAD, USD, GBP, EUR, AUD or NZD.
- New accounts get defaults from the visitor's country (Vercel's geo header, else browser language): US → miles/gallons/MPG/USD, UK → miles/litres/MPG(UK)/GBP, Canada and everyone else → metric/CAD (EUR/AUD/NZD where they apply).
- Everything is still **stored in metric**; only display and entry change, so switching units never alters records. Currency is a label only (no exchange-rate conversion). EV efficiency shows mi/kWh for miles users. CSV export is in the user's units; the JSON backup stays metric.
- Billing: set `STRIPE_CURRENCIES=cad,usd` and give both Stripe prices a USD amount ("currency options"); US accounts are then charged in USD. Pricing page and FAQ say CAD or USD.
- Migration 0004 (user unit columns; existing accounts stay km / litres / CAD).
- Later: per-vehicle odometer unit (e.g. a US-import car with a miles odometer owned in Canada).

## App navigation (built 2026-10-06)
- Website header shows "Hi, <name>" + **Open app** when signed in (menu shows who is signed in) instead of Sign in / Start free.
- **Home** button (top bar + logo) opens the last-viewed vehicle's dashboard (/app/home; remembered in a cookie); the phone tab bar now also appears on Garage, Account and Add vehicle.
