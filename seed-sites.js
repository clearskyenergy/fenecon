/* ══════════════════════════════════════════════════════════════════════════
   SEED DEMO SITES  —  paste into the browser console

   Puts real projects in the FENECON workspace so the Portfolio Command Center,
   the pipeline track, the KPI strip, the analytics charts and the project
   table all show numbers instead of zeros — and so "Open Project Portal" and
   the Site Map tool have something to open.

   ── HOW TO RUN ──
   1. Open https://fenecon.clearskyomega.com and sign in.
   2. DevTools → Console (⌥⌘J), paste this whole file, Enter.
   3. Refresh once. Unlike referrals, the portfolio roll-up is a one-shot
      .get() at sign-in, not a live listener, so it does not repaint on its
      own.

   ── SIGN IN AS WHOEVER WILL DEMO ──
   The dashboard has a "mine / company" scope toggle, and "mine" filters on
   ownerEmail. These are stamped with the signed-in account, so run this as the
   account you will present from or the default view is empty and you have to
   explain a toggle in front of a customer.

   Any FENECON address works; the /projects create rule needs orgId ==
   userOrg(), and orgAlias() folds .de and .us onto fenecon.com. A ClearSky
   address also works — isOmegaStaff() permits creating into any tenant — but
   then ownerEmail is a clearsky-usa.com address and "mine" is empty for the
   FENECON user.

   ── FIELD CONTRACT ──
   Taken from computeLiveRollup() in index.html, which is what actually reads
   these. Every number below feeds something visible:
     stage          one of STAGE_KEYS — drives the pipeline track and counts
     bessKwh        storage; rolled to MWh for the quoted/submitted/online KPIs
     capex          portfolio capital + the Top CapEx chart
     incentive      modeled incentives KPI
     annualRevenue  projected revenue KPI + the Revenue by Owner chart
     type           bess | dcfc | solar — the Projects by Type doughnut
     quoted         boolean; counts toward "sites quoted" and quoted storage
     utility, program, nextAction   the portfolio table columns
     ownerEmail, ownerName          the mine/company scope split

   ── TO REMOVE THEM ──
   Every doc is tagged `demo: true`. Firestore console → projects → filter
   demo == true. The /projects rule does permit delete within your own org, so
   you can also clear them from the Projects page.
   ══════════════════════════════════════════════════════════════════════════ */
(async function seedSites() {
  'use strict';

  var db = firebase.firestore();
  var me = firebase.auth().currentUser;
  var WS = window.OMEGA_WORKSPACE || {};

  if (!me)       { console.error('Not signed in. Sign in first, then re-run.'); return; }
  if (!WS.orgId) { console.error('No workspace resolved. Are you on the portal page?'); return; }

  var email = (me.email || '').toLowerCase();
  var name  = me.displayName
    || email.split('@')[0].replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, function (m) { return m.toUpperCase(); });

  /* Mirrors orgAlias() in firestore.rules. The create rule compares orgId to
     userOrg(), and a .de address resolves to fenecon.com — so the record must
     say fenecon.com, not fenecon.de. */
  var ALIAS = { 'fenecon.de': 'fenecon.com', 'fenecon.us': 'fenecon.com' };
  var domain = email.split('@')[1] || '';
  var myOrg  = ALIAS[domain] || domain;

  if (myOrg !== WS.orgId && !/@(clearsky-usa|csebuilders)\.com$/.test(email)) {
    console.error('Your org (' + myOrg + ') is not this workspace (' + WS.orgId + '). '
                + 'The create rule will refuse. Sign in with a ' + WS.orgId + ' address.');
    return;
  }

  /* Five sites across the pipeline, sized on FENECON's real product line, so
     the pipeline track has something in most stages rather than one bar at the
     left. Capex is at commercial BESS rates (roughly $400–600/kWh installed);
     revenue is demand-charge savings plus capacity, not a headline figure that
     will not survive a question. */
  var SITES = [
    {
      name: 'Frederick Distribution Center',
      address: '800 Progress Dr, Frederick, MD 21701',
      client: 'Progress Logistics LLC',
      type: 'bess', stage: 'interconnect',
      bessKwh: 2000, capex: 1_180_000, incentive: 354_000, annualRevenue: 268_000,
      utility: 'Potomac Edison', program: 'MD Energy Storage Pilot',
      nextAction: 'Utility study fee due Sep 19', quoted: true
    },
    {
      name: 'Cedar Rapids Data Center — Phase 1',
      address: '2200 Edgewood Rd SW, Cedar Rapids, IA 52404',
      client: 'Meridian Compute',
      type: 'bess', stage: 'package',
      bessKwh: 20000, capex: 9_400_000, incentive: 2_820_000, annualRevenue: 1_940_000,
      utility: 'Alliant Energy', program: 'MISO capacity',
      nextAction: 'One-line to AHJ for pre-review', quoted: false
    },
    {
      name: 'Vista Cold Storage',
      address: '1395 Park Center Dr, Vista, CA 92081',
      client: 'Harborline Foods',
      type: 'bess', stage: 'permitting',
      bessKwh: 4800, capex: 2_640_000, incentive: 792_000, annualRevenue: 611_000,
      utility: 'SDG&E', program: 'SGIP — General Market',
      nextAction: 'Fire clearance letter outstanding', quoted: true
    },
    {
      name: 'LivAway Suites Thornton',
      address: '12176 Grant Circle, Thornton, CO 80241',
      client: 'LivAway Hospitality',
      type: 'bess', stage: 'finance',
      bessKwh: 368, capex: 214_500, incentive: 64_350, annualRevenue: 47_800,
      utility: 'Xcel Energy', program: 'Demand management',
      nextAction: 'Term sheet out for signature', quoted: true
    },
    {
      name: 'Clinton Riverfront Retrofit',
      address: '330 Roberts St, Clinton, IA 52732',
      client: 'S.J Burns LLC',
      type: 'bess', stage: 'candidate',
      bessKwh: 180, capex: 118_000, incentive: 35_400, annualRevenue: 21_400,
      utility: 'Alliant Energy', program: '—',
      nextAction: 'Waiting on 12 months of bills', quoted: false
    }
  ];

  var ok = 0, failed = 0, ids = [];

  for (var i = 0; i < SITES.length; i++) {
    var s = SITES[i];
    try {
      var ref = await db.collection('projects').add({
        uid:        me.uid,
        orgId:      WS.orgId,
        ownerEmail: email,
        ownerName:  name,

        name: s.name, address: s.address, client: s.client,
        type: s.type, stage: s.stage,

        bessKwh: s.bessKwh, capex: s.capex,
        incentive: s.incentive, annualRevenue: s.annualRevenue,
        quoted: s.quoted,
        utility: s.utility, program: s.program, nextAction: s.nextAction,

        /* The four arrays the editor expects to exist. Left EMPTY on purpose —
           see the note printed at the end. An invented canvas that renders
           wrong is worse in front of a customer than a clean one. */
        elements: [], conduits: [], bessList: [], annotations: [],

        demo: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      ids.push(ref.id); ok++;
      console.log('  ✓ ' + s.name);
    } catch (e) {
      failed++;
      console.error('  ✗ ' + s.name + ' — ' + (e.code || '') + ' ' + e.message);
      if (e.code === 'permission-denied') {
        console.error('    orgId must equal userOrg(). This record says "' + WS.orgId
                    + '", your address resolves to "' + myOrg + '".');
      }
    }
  }

  var cap = SITES.reduce(function (t, s) { return t + s.capex; }, 0);
  var mwh = SITES.reduce(function (t, s) { return t + s.bessKwh; }, 0) / 1000;

  console.log('\nSeeded ' + ok + ' of ' + SITES.length + (failed ? ' — ' + failed + ' failed.' : '.'));
  console.log('Portfolio now reads ' + mwh.toFixed(1) + ' MWh across five stages, $'
            + (cap / 1e6).toFixed(2) + 'M capital.');
  console.log('REFRESH THE PAGE — the roll-up is a one-shot read at sign-in, not a listener.');
  console.log('\nThe site maps are empty. The editor stores its canvas as element');
  console.log('objects whose schema I did not want to guess at — a canvas that renders');
  console.log('wrong in a demo is worse than a clean one. Open Frederick in the Site Map');
  console.log('tool and drop a few units in if you want a drawn plan; it saves back to');
  console.log('the same record.');
})();
