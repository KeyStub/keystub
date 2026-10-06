# Market research: vehicle expense trackers (Sept 2026)

## Who's out there

| App | Price | Platforms | Strength | Weakness |
|---|---|---|---|---|
| **Drivvo** | Personal plan free (unlimited vehicles); Fleet $42/vehicle/yr | iOS, Android, web | Expense categories, cost-per-km, multi-vehicle | Cloud sync was premium-only and prices went up; light on maintenance detail |
| **Simply Auto** | Free; Platinum about $9.99/yr or $29.99 one-time | iOS, Android (web on Pro only) | Fuel detail (octane, station), GPS trip/mileage logs for taxes, OBD-II | Dated UI, learning curve, paywalled features |
| **Fuelly / aCar** | Free; Premium about $7.99/yr | iOS (Fuelly), Android (aCar) | Real-world fuel economy plus community comparisons | Maintenance is an afterthought; photo attachments are paywalled |
| **Fuelio** | Free on Android; Pro about $17.99/yr on iOS | iOS, Android | Fuel log, costs, cloud backup | Mostly fuel-focused |
| **CARFAX Car Care** | Free (makes money from shops) | iOS, Android | Service history auto-filled by participating shops, recall alerts | Depends on shops reporting; weak DIY and fuel tracking; US/Canada only |
| **MyAutoLog** | Free (1 vehicle); Pro for more | iOS, Android | Documents with expiry alerts, PDF export, AI assistant | No web dashboard |
| **GarageHub** | Free (1 vehicle, 50 logs); Premium | iOS, Android, web | Parts inventory, builds, AI mechanic | Enthusiast/DIY focus |
| **FIXD, OBDeleven** | App plus $20 to $200 hardware | iOS, Android | Engine codes and diagnostics | Need hardware; not a logbook |
| **LubeLogger** | Free, open-source, self-hosted | Web | Full records, receipts, reminders, CSV, API | You have to run your own server |

## Common complaints across the category

1. **Logging friction.** People quit when logging a fill-up takes too many taps.
2. **Subscription fatigue and lock-in.** Prices go up, apps shut down, and people can't get their data out. Backup and restore often breaks.
3. **Most apps have no web or desktop dashboard.** Reviews call this out as a gap.
4. **Narrow focus.** Fuel apps are weak on maintenance, service-history apps are weak on fuel, and almost none show the *true total cost of ownership*.
5. **Everything is typed in by hand.** No car app reconciles against what you actually spent, and that's the gap your own bank reconciliation exposed.

## What Santa Fe Tracker already does differently

- **True cost of ownership:** purchase price, fuel, maintenance, insurance and registration in one number, plus average monthly cost and cost per km.
- **A "keep vs replace" calculator.** No competitor reviewed has one.
- **Built for Canada:** CAD, km, L/100 km, and insurance billed monthly.
- **Data-safety habits:** checks for duplicates and backwards odometer readings, previews before restoring, and lets you export everything anytime.
- **Web-first.** Works on any device with a full desktop dashboard (most competitors are phone-only).

## Features worth adding to stand out (ranked by impact vs effort)

| # | Feature | Why it attracts users | Effort | Tier |
|---|---|---|---|---|
| 1 | **Bank/credit-card CSV import with smart matching** | Turns the manual reconciliation into a product: upload a statement and the app proposes fuel, wash, insurance and repair entries, flags anything missing, and skips loan payments, merch and other non-car charges. No car app does this. | Medium | Pro |
| 2 | **Receipt photo → auto-filled entry (AI)** | Snap a pump or shop receipt and get date, litres, $/L, total, shop and line items. Removes logging friction, the #1 reason people quit. | Medium (costs about 1¢ per scan) | Pro |
| 3 | **Resale service-history report (PDF / share link)** | A clean, verifiable maintenance history for selling the car; buyers pay more for documented cars. A strong word-of-mouth driver. | Low | Pro |
| 4 | **VIN decode + recall alerts** | Enter a VIN and get year/make/model/trim automatically, plus open recalls (NHTSA's API is free; Transport Canada also publishes recall data). | Low | Free |
| 5 | **Installable app (PWA) + 2-tap "quick fill-up"** | Feels like a phone app with no app store needed, so logging a fill-up at the pump takes seconds. | Low | Free |
| 6 | **Email reminders** (oil change, insurance or registration renewal, seasonal tire swap) | Brings users back and makes the app useful even when they aren't logging. | Low | Free (basic) / Pro |
| 7 | **Household sharing** (invite a partner or driver to a vehicle) | Families with 2+ cars; natural upsell. | Medium | Pro |
| 8 | **Tax / business-use report** | Gig drivers and the self-employed need business-km and expense summaries (CRA logbook). | Medium | Pro |
| 9 | **"Cost per km vs similar cars" benchmarks** (anonymous, opt-in) | Fuelly's community comparison is its moat; we can do it for total cost, not just fuel. | High (needs users first) | Later |

## Suggested pricing

The market expects **cheap or free core logging**. Paid tiers run about $8 to $18/yr, and Drivvo's personal plan is free. Don't compete on basic logging; charge for automation, since the AI and bank-import features also cost us money to run.

- **Free:** 2 vehicles, unlimited logs, reminders, dashboards, reports, full export anytime.
- **Pro, about $3/month or $24/year:** unlimited vehicles, bank-statement import, receipt scanning, resale PDF report, household sharing, email reminders.
- **Founding-member lifetime price** at launch (for example $49 once) to get early users, the way Simply Auto sells a one-time unlock.

## Sources
- [GarageHub: Best Car Maintenance Apps 2026](https://getgaragehub.com/learn/guides/best-car-maintenance-apps/)
- [carmaintenance.app: Best Car Maintenance Tracking Apps 2026](https://carmaintenance.app/best-car-maintenance-tracking-apps/)
- [Ridester: Best Car Maintenance Apps 2026](https://www.ridester.com/car-maintenance-apps/)
- [Drivvo pricing](https://www.drivvo.com/en/pricing/)
- [Simply Auto app comparison](https://simplyauto.app/comparison.php)
- [Fuelio](https://fuel.io/)
- [CARFAX Car Care](https://www.carfax.com/Service/)
- [Hackaday: LubeLogger](https://hackaday.com/2025/03/28/keep-tabs-on-your-vehicles-needs-with-lubelogger/)
- [Vento: what Reddit says about expense trackers](https://vento.money/blog/best-budget-expense-tracker-what-reddit-actually-says/)
- [Car Expenses Manager on Google Play (user complaints)](https://play.google.com/store/apps/details?id=kb2.soft.carexpenses&hl=en_US)
