/* ══════════════════════════════════════════════════════════════════════════
   SEED SAMPLE REFERRALS  —  paste into the browser console

   ── HOW TO RUN ──
   1. Open https://fenecon.clearskyomega.com and sign in.
   2. DevTools → Console (⌥⌘J on Chrome/Mac).
   3. Paste this whole file, press Enter.
   4. The Referrals block updates live — no refresh needed, it is on a
      Firestore snapshot listener.

   ── ⚠ SIGN IN WITH YOUR CLEARSKY ADDRESS ──
   The Firestore rule requires fromOrgId == userOrg(), so a referral is always
   stamped with the SENDER'S OWN org. Signed in as @clearsky-usa.com you are
   isOmegaStaff(), the rule lets you file on anyone's behalf, and these seed
   rows carry realistic sender orgs — which is what you want for a demo.

   Signed in as @fenecon.com the rule pins every fromOrgId to fenecon.com, so
   the From column reads "fenecon.com" on every row and it looks like FENECON
   referring sites to itself. The script detects this and warns before writing.

   ── TO REMOVE THEM AFTERWARDS ──
   The rules refuse delete for everyone — deliberately, a referral is a record
   of who asked for what and when. Remove seed rows from the Firebase console
   with admin credentials. Each one is tagged `seed: true` so they are easy to
   find: Firestore → referrals → filter seed == true.
   ══════════════════════════════════════════════════════════════════════════ */
(async function seedReferrals() {
  'use strict';

  var db   = firebase.firestore();
  var me   = firebase.auth().currentUser;
  var TO   = (window.OMEGA_WORKSPACE || {}).orgId;   // fenecon.com

  if (!me)  { console.error('Not signed in. Sign in first, then re-run.'); return; }
  if (!TO)  { console.error('No workspace resolved. Are you on the portal page?'); return; }

  /* Mirrors orgAlias() in firestore.rules AND ORG_ALIAS in omega-referrals.js.
     All three have to agree or the create is refused. */
  var ALIAS = { 'fenecon.de': 'fenecon.com', 'fenecon.us': 'fenecon.com' };
  var domain = (me.email || '').toLowerCase().split('@')[1] || '';
  var FROM   = ALIAS[domain] || domain;

  var staff = /@(clearsky-usa|csebuilders)\.com$/i.test(me.email || '');

  if (!staff) {
    console.warn(
      '⚠ Signed in as ' + me.email + '.\n' +
      'The rule pins fromOrgId to your own org, so every seed row will show ' +
      FROM + ' as the sender — FENECON referring to itself.\n' +
      'For a demo that reads correctly, sign in with your @clearsky-usa.com ' +
      'address instead and re-run.\n' +
      'Continuing anyway in 3 seconds…'
    );
    await new Promise(function (r) { setTimeout(r, 3000); });
  }

  var name = me.displayName
    || (me.email || '').split('@')[0].replace(/[._-]+/g, ' ')
         .replace(/\b\w/g, function (m) { return m.toUpperCase(); });

  /* Six rows chosen to exercise every state the block renders:
       · one brand new, scored, in the buyer's market, with documents
       · one mid-flight (Preparing quote)
       · one already priced, so the quote panel and "Out for quote" have data
       · one unscored, so "Waiting for a score" is not empty
       · a near-duplicate of it, so the duplicate banner fires
       · one strong on bankability but weak on grid, to show a square that
         sits OUTSIDE the good corner
     Sizes and product names are from FENECON's actual line. */
  var SEED = [
    {
      siteName: '800 Progress Dr',
      address:  '800 Progress Dr, Frederick MD 21701',
      ask:      'Budgetary price on a commercial BESS for peak shaving. Roughly 500kW / 2MWh, '
              + 'outdoor pad, utility is Potomac Edison. Need it for a customer proposal in three weeks.',
      powerKw: 500, energyKwh: 2000, product: 'Commercial 100', stage: 'Pre-development',
      gridScore: 74, bankableScore: 81, neededBy: '2026-09-25', status: 'new', ageDays: 0.04,
      senderOrg: 'clearsky-usa.com',
      docs: [
        { kind: 'sitemap', name: '800-progress-sitemap.pdf', source: 'link',
          url: 'https://example.com/sample/800-progress-sitemap.pdf' },
        { kind: 'bom', name: 'BOM-rev-C.xlsx', source: 'link',
          url: 'https://example.com/sample/bom-rev-c.xlsx' }
      ]
    },
    {
      siteName: 'Cedar Rapids DC Phase 1',
      address:  '2200 Edgewood Rd SW, Cedar Rapids IA 52404',
      ask:      'Industrial XL, four-hour duration, bridging load for a data centre build. '
              + 'Need indicative pricing plus a realistic lead time before we commit to the interconnect.',
      powerKw: 5000, energyKwh: 20000, product: 'Industrial XL', stage: 'Pre-development',
      gridScore: 88, bankableScore: 76, status: 'reviewing', ageDays: 4,
      senderOrg: 'clearsky-usa.com',
      docs: [
        { kind: 'oneline', name: 'oneline-r3.pdf', source: 'link',
          url: 'https://example.com/sample/oneline-r3.pdf' }
      ]
    },
    {
      siteName: '1395 Park Center Dr',
      address:  '1395 Park Center Dr, Vista CA 92081',
      ask:      'Cold-storage facility, demand charges are brutal. Industrial L sizing. '
              + 'Pricing plus lead time, and whether you can hit a Q1 delivery.',
      powerKw: 1200, energyKwh: 4800, product: 'Industrial L', stage: 'Qualified',
      gridScore: 63, bankableScore: 66, status: 'quoting', ageDays: 8,
      senderOrg: 'csebuilders.com',
      docs: [
        { kind: 'bill', name: 'SDGE-12mo.pdf', source: 'link',
          url: 'https://example.com/sample/sdge-12mo.pdf' }
      ]
    },
    {
      siteName: 'LivAway Suites, Thornton',
      address:  '12176 Grant Circle, Thornton CO 80241',
      ask:      'Hotel back-up plus demand management. Commercial 92, roof-adjacent pad. '
              + 'Owner wants a firm number before the board meets.',
      powerKw: 92, energyKwh: 368, product: 'Commercial 92', stage: 'Referred',
      /* Strong on bankability, weak on grid — deliberately OUTSIDE the good
         corner, so the matrix shows a square that is not in the buyer's
         market and the difference is visible. */
      gridScore: 38, bankableScore: 91, status: 'quoted', ageDays: 20,
      senderOrg: 'clearsky-usa.com',
      quote: {
        total: 214500, currency: 'USD', product: 'Commercial 92, one unit',
        leadTimeWeeks: 16, validUntil: '2026-10-15',
        notes: 'Ex-works Deggendorf. Excludes freight, install and commissioning. '
             + 'Assumes outdoor pad and existing 480V service.'
      },
      docs: [
        { kind: 'scope', name: 'scope-of-work-v2.pdf', source: 'link',
          url: 'https://example.com/sample/scope-of-work-v2.pdf' }
      ]
    },
    {
      siteName: 'S.J Burns LLC (330 Roberts)',
      address:  '330 Roberts St, Clinton IA 52732',
      ask:      'Home 20/30 stack for a multi-tenant retrofit. Ballpark only at this stage.',
      powerKw: 60, energyKwh: 180, product: 'Home 30', stage: 'Referred',
      gridScore: null, bankableScore: null, status: 'new', ageDays: 2,
      senderOrg: 'csebuilders.com', docs: []
    },
    {
      /* Same site as the row above, entered differently by a second estimator.
         This is what the duplicate banner is for — "St" vs "Street" and the
         dropped LLC are exactly the variations that defeat naive matching. */
      siteName: 'SJ Burns – 330 Roberts',
      address:  '330 Roberts Street, Clinton, IA 52732',
      ask:      'Retrofit at the Roberts St building. Need a number on a Home 30 stack.',
      powerKw: 60, energyKwh: 180, stage: 'Referred',
      gridScore: null, bankableScore: 52, status: 'new', ageDays: 1.5,
      senderOrg: 'csebuilders.com', docs: []
    }
  ];

  var DAY = 86400000, ok = 0, failed = 0;

  for (var i = 0; i < SEED.length; i++) {
    var r  = SEED[i];
    var at = Date.now() - Math.round(r.ageDays * DAY);

    var rec = {
      toOrgId:   TO,
      /* MUST be the caller's own org — the rule compares it to userOrg(). The
         senderOrg above is only what the row would ideally say; it is used
         when you are staff and the rule allows filing on behalf. */
      fromOrgId: staff ? r.senderOrg : FROM,
      fromEmail: (me.email || '').toLowerCase(),
      fromName:  staff ? name : name,
      fromUid:   me.uid,

      siteName: r.siteName,
      address:  r.address,
      ask:      r.ask,
      powerKw:  r.powerKw   || null,
      energyKwh: r.energyKwh || null,
      product:  r.product   || '',
      stage:    r.stage     || '',
      neededBy: r.neededBy  || '',

      gridScore:     r.gridScore,
      bankableScore: r.bankableScore,

      /* Every create must start at 'new' — the rule pins it. The real status
         is applied as a second write below, which is the recipient-side
         update clause and is exactly the path the UI uses. */
      status: 'new',
      docs:   [],

      activity: [{ at: at, by: name, byEmail: (me.email || '').toLowerCase(),
                   text: 'Referral sent' }],
      seed:      true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      var ref = await db.collection('referrals').add(rec);

      /* Second write: documents, the real status, and the quote where there is
         one. Split from the create deliberately — the create clause refuses a
         pre-populated docs array and any status other than 'new', and working
         around that in the seeder would mean seeding data the product itself
         could never produce. */
      var after = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      var touched = false;

      if (r.docs && r.docs.length) {
        after.docs = r.docs.map(function (d) {
          return { kind: d.kind, name: d.name, url: d.url, source: d.source,
                   addedBy: (me.email || '').toLowerCase(), addedByName: name,
                   addedAt: at };
        });
        touched = true;
      }
      if (r.status !== 'new') { after.status = r.status; touched = true; }
      if (r.quote) {
        after.quote = {
          total: r.quote.total, currency: r.quote.currency,
          product: r.quote.product, leadTimeWeeks: r.quote.leadTimeWeeks,
          validUntil: r.quote.validUntil, notes: r.quote.notes,
          byName: name, byEmail: (me.email || '').toLowerCase(),
          sentAt: at + 9 * DAY
        };
        touched = true;
      }

      if (touched) await db.collection('referrals').doc(ref.id).update(after);

      ok++;
      console.log('  ✓ ' + r.siteName);
    } catch (e) {
      failed++;
      console.error('  ✗ ' + r.siteName + ' — ' + (e.code || '') + ' ' + e.message);
      if (e.code === 'permission-denied') {
        console.error(
          '    The referrals rule is either not deployed, or fromOrgId does not ' +
          'match userOrg(). Check the live rules text for `referrals`.'
        );
      }
    }
  }

  console.log('\nSeeded ' + ok + ' of ' + SEED.length + (failed ? ' — ' + failed + ' failed.' : '.'));
  console.log('The Referrals block is on a live listener, so they are already on screen.');
  console.log('Try: Matrix tab · click the orange square at 70–79 × 80–89 · open ' +
              'LivAway Suites to see a sent quote.');
})();
