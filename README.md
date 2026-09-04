# FENECON — ClearSky-OMEGA Portal

Client deployment of the ClearSky-OMEGA EnergyOS portal for **FENECON**
([fenecon.com](https://www.fenecon.com/)).

FENECON is a German energy-storage manufacturer (FENECON GmbH, Deggendorf) with
a US arm, FENECON Inc, building out production in South Carolina. Their line runs
Home 6/10/15 and 20/30, Commercial 50/92/100, and Industrial S/M/L/XL — so the
tools opened for this trial are the ones that sit closest to selling and sizing
storage: site map, battery sizing, proposals, and financing partners.

---

## Trial account

| | |
|---|---|
| Account tier | **Trial** (`tierLevel: -1`) |
| Starts | **Mon Aug 3, 2026** |
| Length | **30 days** |
| Last full day | **Tue Sep 1, 2026** |
| Expires | **Wed Sep 2, 2026, 00:00** local |
| On expiry | Banner only — access continues (`lockOnExpiry: false`) |

A countdown banner renders at the top of every page and moves through four states:

- **Before Aug 3** — blue, "30 days left in your 30-day trial · starts Aug 3, 2026"
  (the full allotment: no days are consumed before the start date)
- **Aug 3 – Aug 25** — amber, "N days left in your 30-day trial · ends Sep 1, 2026"
- **Aug 26 – Sep 1** — red, same copy with more urgency
- **From Sep 2** — grey, "Trial ended Sep 1, 2026"

### Cutting access off at expiry

`lockOnExpiry: false` is deliberate: the trial lapsing shows a banner but does
**not** lock anyone out. To make expiry hard, set it to `true` in `config.js`:

```js
trial: { startsAt: '2026-08-03', days: 30, lockOnExpiry: true }
```

From Sep 2 every FENECON sign-in is then refused with a message pointing at
`info@fenecon.com`. Domains in `adminDomains` keep access regardless, so
ClearSky staff can still get in.

### Extending the trial

Change `days`, or move `startsAt`. Both take effect on next page load — no
rebuild. To convert to a paid account, drop the `trial` block entirely and set
`accountTier: 'Enterprise'` with `tierLevel: 3`.

---

## What's in here

| File | Shared? | Notes |
|---|---|---|
| `index.html` | **shared** | Portal dashboard |
| `marketplace.html` | **shared** | App marketplace |
| `projects.html` | **shared** | Project list |
| `editor.html` | **shared** | BESS Site Map application |
| `omega-brand.js` | **shared** | Tenant resolution + branding |
| `config.js` | **tenant-specific** | The only file to edit |
| `fenecon-logo.png` | tenant asset | repo is flat, matching `salesdemo` |
| `omega-logo.png` | platform asset | ClearSky-OMEGA mark |

The five shared files are byte-identical to the iQGen deployment and to every
other ClearSky-OMEGA tenant — verified by checksum before this repo was cut.
Fixes belong upstream and get copied down; never patch them here, or this repo
silently forks.

---

## Before this goes live

1. **Authorize the domain** in Firebase Console → Authentication → Settings →
   Authorized domains. Google sign-in fails without this. The Firebase block in
   `config.js` is the live `clearsky-portal` project — no placeholders — so this
   is the one step standing between upload and a working sign-in.
2. **Confirm Firestore rules scope by `orgId`.** Everything here is scoped to
   `orgId: 'fenecon.com'`, but the client-side scope is a convenience — the
   rules are the actual boundary. Check that `userOrg()` maps `fenecon.de` and
   `fenecon.us` addresses to `fenecon.com` too, or those users will authenticate
   into an empty workspace of their own (see the note under Access rules).
3. **Seed or import their projects** with `orgId: 'fenecon.com'`, otherwise the
   portal authenticates fine and shows an empty portfolio.
4. **Run "Import / Update Applications"** in the admin console if the live
   marketplace is showing fewer than 33 tools — the portal hydrates its catalog
   from the Firestore `tools` collection whenever that's non-empty, and Firestore
   has historically lagged the seed in `omega-tools.js`.

---

## Access rules

Primary domain is `fenecon.com`. Two more are admitted because FENECON's
staff addresses are split across entities:

| Domain | Entity | Public address seen |
|---|---|---|
| `fenecon.com` | group / US contact | info@fenecon.com |
| `fenecon.de` | FENECON GmbH, Deggendorf | sales@fenecon.de |
| `fenecon.us` | FENECON Inc, South Carolina | — |

**Worth a look before Aug 3:** their German team publishes `@fenecon.de`
addresses while the US site publishes `@fenecon.com`. If the trial users are all
on one of those, trim `allowedDomains` to match — an unused domain in the list is
a wider door than the trial needs. If they're mixed, leave it as is.

All three land in the **same** workspace: `orgId` is pinned to `fenecon.com` in
config regardless of the address signing in, so a `@fenecon.de` user sees the
same projects as a `@fenecon.com` one. That holds client-side. Confirm the
Firestore `userOrg()` helper agrees, because if it derives orgId from the raw
email domain, a `@fenecon.de` user will be scoped to a `fenecon.de` org at the
rules layer and see nothing.

`csebuilders.com` and `clearsky-usa.com` may preview and survive expiry.

To admit an individual outside address — a consultant's Gmail, say — add it to
the tenant rather than opening a whole domain:

```js
allowedEmails: ['someone@gmail.com']
```

---

## Tools during the trial

The **entire catalog is visible**. Anything this account can't use renders with
an "Upgrade" badge and a mailto to `dev@clearsky-usa.com`.

Unlocked for FENECON:

| Key | Tool | Category | Notes |
|---|---|---|---|
| `editor` | BESS Site Map | design | also pinned via `requiredTools` |
| `batterysizer` | Battery Sizer | finance | sizes from utility bills, bill PDFs or an 8760 |
| `sales` | Sales Proposal Builder | sales | 3-page customer proposals |
| `financing` | Financing Partners | marketplace | debt, tax equity & capital partners |

Verified against the live registry at
`tools.csebuilders.com/omega-tools.js`: **4 unlocked, 29 upgrade-badged**, and
`spatco_ev` correctly hidden (it's `orgs`-restricted to another tenant).

### Two keys worth confirming

The request named "BESS sizer" and "financial marketplace"; the registry has no
tools under exactly those names, so these are the nearest matches:

- **"BESS sizer" → `batterysizer`** ("Battery Sizer"). The only sizing tool in
  the catalog. Not to be confused with `isocalc` (BESS ISO Calculator) or
  `proforma` (BESS Pro Forma), both of which carry "BESS" in the name and are
  currently locked.
- **"financial marketplace" → `financing`** ("Financing Partners", category
  *Marketplace & Partners*). The other marketplace entries are `procurement`,
  `aggregators`, `offtakers` and `ahj` — all of which render "Soon" and are
  non-clickable for every tenant, so opening one would be an empty gesture.
  `financing` is the only live marketplace tool.

If either mapping is wrong, it's a one-line edit to `unlockedTools`.

### How the gate actually works

From `omega-tools.js`:

```
unlocked = requiredTools.has(key)
        || unlockedTools.has(key)
        || tierLevel >= (tool.tier ?? 1)
```

Tool tiers are `ALL=0`, `STANDARD=1`, `DELUXE=2`, `ENTERPRISE=3`. That third
clause is why `tierLevel` is **-1** and not 1: at `tierLevel: 1` every tier-0 and
tier-1 tool unlocks on tier alone — around a dozen of them, not the four asked
for. `-1` sits below `TIER.ALL`, so nothing passes on tier and access comes only
from the two explicit lists.

Set `tierLevel: 3` on conversion to open everything.

---

## Note on the logo

`fenecon-logo.png` is the file you supplied (`fenecon-inc-logo.png`, 300×127,
transparent background, black wordmark with the `#35AED1` cyan mark). It renders
in two places: the topbar chip at 22px tall, and the sign-in card at 88px. Both
sit on white, so the black wordmark reads correctly on each.

One thing to watch: at 88px display height the source has only 127px to give, so
on a retina sign-in screen it's being upscaled about 1.4×. If it looks soft when
you preview it, ask FENECON for a 600×254 export and drop it in under the same
filename — nothing else needs to change.

`clientName` is set to **FENECON** (their own wordmark and site style it in
caps, without a legal suffix). If this trial is specifically for the US entity,
change `clientName` and `exportBrand.name` to "FENECON Inc" — the logo filename
you sent suggests that may be the intent, and it's a two-line edit.

---

## Terms of Service gate

New accounts must accept Terms of Service before the portal renders. Two shared
files carry this — both byte-identical across every tenant:

| File | Role |
|---|---|
| `omega-terms.js` | The gate: consent checkbox, terms modal, Firestore record |
| `firestore-terms.rules` | The rule that must be deployed for it to work |

`index.html` gained exactly one `<script>` tag; nothing else in it changed.

**Two layers, deliberately.** The sign-up form gets a consent checkbox that
blocks account creation while unticked. But the real enforcement is a gate that
runs after authentication and before the app renders — because a checkbox on the
sign-up form would miss Google sign-in entirely (a first-time Google user never
sees that form) and would miss version bumps.

**Acceptance is recorded**, which is the part that gives it weight: uid, email,
orgId, version and a server timestamp land at `termsAcceptances/{uid}`. A
checkbox nobody stored is close to worthless in a dispute.

**Amending the terms:** bump `TERMS_VERSION` at the top of `omega-terms.js`.
Every user is re-prompted on their next load. The rule permits an update only
when the version string actually changes, so an existing acceptance can't be
silently rewritten with a fresh timestamp.

### ⚠ Deploy the rule

```
firebase deploy --only firestore:rules
```

Until `termsAcceptances` is live in Firebase the acceptance write returns
permission-denied and the gate **fails closed — nobody can sign in, on any
tenant**. That direction is deliberate (failing open would let people through
ungated), but it means a forgotten rules deploy looks like a total outage. The
modal names the missing rule when it happens. Confirm the rule appears in
Firebase Console → Firestore → Rules before calling it done.

---

## Referral inbox

A quote-request intake, rendered as a dashboard block on `index.html`.

Someone on the platform — ClearSky staff, a developer, a partner — has a site
and wants a price on storage for it. They send a referral. It lands in FENECON's
dashboard with the site, the ask, and whatever they attached: site map, scope of
work, bill of materials. FENECON reads it, works it, replies. That is the loop.

| File | Shared? | Role |
|---|---|---|
| `omega-referrals.js` | **shared** | The block: inbox, matrix, drawer, uploads |
| `firestore-referrals.rules` | rules | Firestore + Storage rules that must be deployed |

`index.html` gained exactly one `<script>` tag; nothing else in it changed. Same
arrangement as the terms gate — patch upstream and copy down, never here.

### Cross-tenant by design

Every other object on the platform is scoped to one `orgId`. A referral spans
two: it is addressed by `toOrgId`, so a `@fenecon.com` user sees every referral
sent **to** fenecon.com regardless of who sent it, plus the ones they sent
themselves, and nothing else. That makes the Firestore rule the entire security
story rather than a formality. Read it before deploying it.

### The matrix

Referrals carry the same two scores the portfolio matrix uses — how good the
grid connection is, and how likely the project is to get funded. Both 0–99.
Grid runs left to right, bankability bottom to top, which puts the corner worth
chasing at top right. Clicking a populated square filters the request list to it.

A referral missing either score is **not** placed at the origin. It goes into
"Waiting for a score" with a Missing column naming which product owes the
number, because a site nobody has scored is not the same as a site that scored
badly and pretending otherwise loses real projects.

The scores are typed by the sender. They are **not** wired to Grid Atlas or OGI
— that integration lives on the OSA side and hasn't been built. Until it is,
expect most inbound referrals to arrive unscored.

The `market` setting sizes the good corner: `tightest` is 4×4 squares, `tight`
5×5, `open` 6×6. Users can change it from the toolbar; config only sets the
default they land on.

### Documents

Two routes, because the site map often arrives a day after the referral does:

- **Upload** to Firebase Storage — PDF, image, XLSX, CSV, DOCX, DWG, DXF, 25MB.
  The Storage SDK is not loaded by `index.html` and is pulled in on first use,
  so sessions that never attach a file don't pay for it.
- **Paste a link** — Drive, SharePoint, Dropbox, anything with a URL.

Files are typed by kind (site map, scope of work, bill of materials, one-line,
utility bill) so the count in the request list means something.

### Duplicate detection

Two referrals for one site is the failure that hides: the work splits across two
records, each looks half as interesting as the site really is, and nobody
notices. The banner catches it. Matching folds street and corporate suffixes
first — "330 Roberts St, Clinton IA" and "330 Roberts Street, Clinton, IA" are
one site, and a plain strip-the-punctuation comparison misses exactly the case
the check exists for.

### Configuration

All optional; the block runs with no config at all. In `config.js`:

```js
referrals: {
  scoreNames:  { grid: 'Grid Atlas', bankable: 'OGI' },
  market:      'tight',
  maxUploadMb: 25,
  canRefer:    'any'      // or 'admin' to restrict sending to adminDomains
}
```

`scoreNames` are the products that supply the two axes. They appear in the
Missing column so FENECON knows who to chase rather than just that a number is
absent. Set either to `null` for a generic label.

### ⚠ Deploy the rules

```
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Both are in `firestore-referrals.rules`. Neither fails silently:

- **Firestore rule missing** — the block renders an error line naming the rule,
  and sending a referral is refused with the same message.
- **Storage rule missing** — uploads return `storage/unauthorized` and say so.
  Link attachments still work, so the block degrades to links-only rather than
  breaking.

One caveat carried over from **Access rules** above: the rule leans on
`userOrg()`. If that helper derives orgId from the raw email domain rather than
aliasing `fenecon.de` and `fenecon.us` to `fenecon.com`, those users get an
empty inbox — and it will look like "there are no referrals" rather than "the
rule disagrees with config.js."

### Not legal advice

The terms are a standard SaaS starting point covering platform IP ownership,
licence scope, use restrictions (no reverse engineering, resale, white-labelling
or competing use), customer data ownership, confidentiality, trial terms, and an
engineering-output disclaimer stating that generated site plans, one-lines and
pro formas are estimates rather than sealed engineering documents. **Have a
lawyer review before relying on any of it.** Two placeholders are marked REVIEW
in the file: governing law and venue (currently Iowa) and the formal notice
address (currently `dev@clearsky-usa.com`).
