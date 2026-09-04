/* ══════════════════════════════════════════════════════════════════════
 *  OMEGA PATCH 22 — SITE FACTS + SINGLE-SCROLL REPORT
 *  ---------------------------------------------------------------------
 *  Two things, in dependency order.
 *
 *  1. OmegaSiteFacts — one read-only view over state that is already
 *     held but scattered: the auto-layout result (window._alLayout),
 *     the substation lookup (S.substationLookup), the BESS list and the
 *     interconnection score. Nothing here computes; it reads and names.
 *     Every field can be absent, and absent is rendered as an em dash
 *     rather than a zero, because a zero reads as a measurement.
 *
 *  2. OmegaReportV2 — replaces the report's three tabs with one
 *     continuous document: LOCATION SCORE, DESIGN, COST. A report is a
 *     link somebody else opens, and someone opening a link should not
 *     have to find a tab to reach the cost.
 *
 *  WHY A PATCH AND NOT AN EDIT
 *  The three _report*HTML renderers still exist and still work. This
 *  overrides reportTab() and leaves them in place, so
 *  OmegaReportV2.disable() puts the old report back with no reload.
 * ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TAG = '[ReportV2]';

  /* ── unit rates, all editable at runtime ──────────────────────────────
     These are the only invented numbers in this module. They are unit
     rates, not results, and they are exposed rather than buried so that
     a number nobody agreed to cannot reach a customer unnoticed.
     OmegaReportV2.rates.pvPerWdc = 0.79  — takes effect on next open.  */
  var RATES = {
    pvPerWdc: 0.83,        /* modules + racking + inverters, $/W-DC     */
    bosPerWdc: 0.26,       /* balance of system + civil, $/W-DC         */
    storagePerKwh: 280,    /* installed storage, $/kWh                  */
    interconnectAllowance: 865000  /* flat screening allowance, $       */
  };

  /* ── small helpers ──────────────────────────────────────────────────── */
  function n0(v) { return Math.round(v).toLocaleString(); }
  function n1(v) { return (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function money(v) { return '$' + Math.round(v).toLocaleString(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  var DASH = '\u2014';

  /* ── 1. SITE FACTS ──────────────────────────────────────────────────── */

  /* Buildable area is the boundary less its exclusions. computeGroundLayout
     returns bboxAcres (the bounding box), which is bigger than the parcel
     whenever the parcel is not a rectangle, so it is the wrong number to
     print next to the word "buildable". */
  function buildableAcres() {
    var b = root._alBoundary;
    if (!b || typeof root._alPolyAcres !== 'function') return null;
    var gross = root._alPolyAcres(b);
    if (!isFinite(gross) || gross <= 0) return null;
    var ex = root._alExclusions || [];
    var cut = 0;
    for (var i = 0; i < ex.length; i++) {
      var a = root._alPolyAcres(ex[i]);
      if (isFinite(a) && a > 0) cut += a;
    }
    return Math.max(0, gross - cut);
  }

  function storage() {
    var list = (typeof S !== 'undefined' && S.bessList) ? S.bessList : [];
    var kw = 0, kwh = 0;
    for (var i = 0; i < list.length; i++) {
      var q = +(list[i].qty || 1);
      kw += (+(list[i].kw || 0)) * q;
      kwh += (+(list[i].kwh || 0)) * q;
    }
    return { kw: kw, kwh: kwh };
  }

  function facts() {
    var L = root._alLayout || null;
    var sub = null;
    try { sub = S.substationLookup || null; } catch (e) {}
    var score = null;
    try {
      if (typeof computeInterconnectScore === 'function') score = computeInterconnectScore();
    } catch (e) { if (root.console) console.warn(TAG + ' score', e && e.message); }

    var st = storage();
    var pvKwDc = L ? (L.kw || 0) : 0;

    var cost = null;
    if (pvKwDc > 0 || st.kwh > 0) {
      var pv = pvKwDc * 1000 * RATES.pvPerWdc;
      var bos = pvKwDc * 1000 * RATES.bosPerWdc;
      var stor = st.kwh * RATES.storagePerKwh;
      var ix = RATES.interconnectAllowance;
      var total = pv + bos + stor + ix;
      cost = {
        pv: pv, bos: bos, storage: stor, interconnect: ix, total: total,
        perWattDc: pvKwDc > 0 ? total / (pvKwDc * 1000) : null
      };
    }

    return {
      project: (document.getElementById('pname') || {}).value || '',
      address: (document.getElementById('addr-in') || {}).value || '',
      score: score,
      substation: sub,
      layout: L,
      buildableAc: buildableAcres(),
      storage: st,
      cost: cost
    };
  }

  /* ── 2. RENDER ──────────────────────────────────────────────────────── */

  /* The score engine's own factor labels are terse and internal
     ("IX Queue / Tariff"). These read them out in the language a
     partner opening the link would use, and splice in the ISO and the
     county when they are actually known rather than hardcoding them. */
  function factorLabel(f, F) {
    var iso = (F.score && F.score.iso) || '';
    var county = '';
    try { county = (root._SITE_DATA && root._SITE_DATA.county) || ''; } catch (e) {}
    var L = f.label || '';
    if (/queue|tariff/i.test(L)) return 'Interconnection queue' + (iso ? ' \u2014 ' + iso : '');
    if (/permit/i.test(L)) return 'Permitting' + (county ? ' \u2014 ' + county : '');
    if (/land|parcel/i.test(L)) return 'Land & buildability';
    if (/grid|capacity/i.test(L)) return 'Grid capacity';
    if (/utility|iso/i.test(L)) return 'Utility' + (F.score && F.score.utility ? ' \u2014 ' + F.score.utility : '');
    return L;
  }

  function sectionHead(t) {
    return '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.4px;'
      + 'color:var(--sub);margin:34px 0 14px">' + esc(t) + '</div>';
  }

  function row(label, value) {
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:18px;'
      + 'padding:13px 2px;border-bottom:1px solid var(--border)">'
      + '<span style="font-size:13.5px;color:var(--text)">' + label + '</span>'
      + '<span style="font-size:13.5px;color:var(--text);font-family:\'IBM Plex Mono\',monospace;'
      + 'white-space:nowrap">' + value + '</span></div>';
  }

  function stat(value, unit, caption) {
    return '<div>'
      + '<div style="font-size:40px;font-weight:800;line-height:1;color:var(--text);'
      + 'font-family:\'IBM Plex Mono\',monospace">' + value
      + (unit ? '<span style="font-size:15px;font-weight:600;color:var(--sub);margin-left:5px">'
        + esc(unit) + '</span>' : '') + '</div>'
      + '<div style="font-size:11px;color:var(--sub);margin-top:7px">' + esc(caption) + '</div>'
      + '</div>';
  }

  function locationBlock(F) {
    var s = F.score, sub = F.substation;
    if (!s) return sectionHead('Location score')
      + '<div style="font-size:12.5px;color:var(--sub);padding:8px 2px">'
      + 'Score unavailable \u2014 enter a site address so the utility and ISO can be resolved.</div>';

    var pct = s.pct;
    var col = (typeof _scoreColor === 'function') ? _scoreColor(pct) : 'var(--accent)';

    var stats = stat(pct, '', 'Interconnection ease');
    if (sub) {
      stats += stat(n1(sub.capMw), 'MW', 'Screening capacity');
      stats += stat(sub.miles, 'mi', 'To ' + (sub.name || 'nearest substation'));
    }

    /* Every weighted factor is listed. Showing four of five would make the
       headline number impossible to reconcile with the rows under it. */
    var rows = (s.factors || []).map(function (f) {
      var badge = f.real
        ? '<span style="font-size:8px;font-weight:700;color:#22C55E;background:rgba(34,197,94,.12);'
          + 'padding:2px 5px;border-radius:4px;margin-left:8px;vertical-align:middle">DATA</span>'
        : '<span style="font-size:8px;font-weight:700;color:var(--sub);background:rgba(255,255,255,.06);'
          + 'padding:2px 5px;border-radius:4px;margin-left:8px;vertical-align:middle" '
          + 'title="Estimated from a heuristic. Wire a data source to make this measured.">EST</span>';
      return row(esc(factorLabel(f, F)) + badge,
        '<span style="font-weight:700">' + f.score + '</span>'
        + '<span style="color:var(--sub)"> / 100</span>');
    }).join('');

    return sectionHead('Location score')
      + '<div style="display:flex;gap:56px;flex-wrap:wrap;margin-bottom:20px">' + stats + '</div>'
      + '<div style="height:7px;background:rgba(255,255,255,.07);border-radius:4px;overflow:hidden;margin-bottom:20px">'
      + '<div style="height:100%;width:' + pct + '%;background:' + col + '"></div></div>'
      + rows;
  }

  function designBlock(F) {
    var L = F.layout, st = F.storage;
    var body = '<div id="rv2-sitemap" style="background:var(--panel);border:1px solid var(--border);'
      + 'border-radius:10px;overflow:hidden;min-height:200px;display:flex;align-items:center;'
      + 'justify-content:center;margin-bottom:8px">'
      + '<div style="color:var(--sub);font-size:12px;padding:60px">Capturing site map\u2026</div></div>';

    if (F.buildableAc != null) body += row('Buildable area after exclusions', n1(F.buildableAc) + ' ac');
    if (L) {
      body += row('Tables \u2014 ' + esc(L.presetKey || 'racking') + ', ' + (L.gcr || 0).toFixed(2) + ' GCR',
        n0(L.tableCount || 0));
      body += row('Capacity', n0(L.kw || 0) + ' kW-DC / ' + n0(L.kwAc || 0) + ' kW-AC');
      if (L.blockCount) {
        body += row('Inverter blocks', L.blockCount + ' \u00d7 ' + n0(L.blockKwTarget || 0) + ' kW-DC');
      }
    }
    if (st.kw > 0 || st.kwh > 0) {
      body += row('Storage attachment', n0(st.kw) + ' kW / ' + n0(st.kwh) + ' kWh');
    }
    if (!L && st.kwh === 0 && F.buildableAc == null) {
      body += '<div style="font-size:12.5px;color:var(--sub);padding:8px 2px">'
        + 'Nothing laid out yet \u2014 trace a boundary and run Auto-Layout.</div>';
    }
    return sectionHead('Design') + body;
  }

  function costBlock(F) {
    var c = F.cost;
    if (!c) return '';
    var body = '';
    if (c.pv > 0) body += row('Modules, racking, inverters', money(c.pv));
    if (c.storage > 0) {
      body += row('Storage \u2014 ' + n1(F.storage.kw / 1000) + ' MW / ' + n1(F.storage.kwh / 1000) + ' MWh',
        money(c.storage));
    }
    if (c.bos > 0) body += row('Balance of system &amp; civil', money(c.bos));
    body += row('Interconnection allowance', money(c.interconnect));
    body += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:18px;'
      + 'padding:16px 2px;border-top:2px solid var(--border);margin-top:2px">'
      + '<span style="font-size:14px;font-weight:700;color:var(--text)">Total installed</span>'
      + '<span style="font-size:16px;font-weight:800;color:var(--text);'
      + 'font-family:\'IBM Plex Mono\',monospace">' + money(c.total) + '</span></div>';
    if (c.perWattDc != null) {
      body += row('$/W-DC', '$' + c.perWattDc.toFixed(2));
    }
    body += '<div style="font-size:10px;color:var(--sub);margin-top:12px;line-height:1.6">'
      + 'Screening estimate built from unit rates, not a quote: PV $' + RATES.pvPerWdc.toFixed(2)
      + '/W-DC, BOS $' + RATES.bosPerWdc.toFixed(2) + '/W-DC, storage $' + n0(RATES.storagePerKwh)
      + '/kWh, plus a flat interconnection allowance. Adjust in '
      + '<code>OmegaReportV2.rates</code>.</div>';
    return sectionHead('Cost') + body;
  }

  function render() {
    var body = document.getElementById('report-body');
    if (!body) return;
    var F = facts();
    body.innerHTML =
      '<div style="max-width:760px;margin:0 auto">'
      + (F.project ? '<h2 style="font-size:26px;font-weight:700;margin:0 0 6px;color:var(--text)">'
        + esc(F.project) + '</h2>' : '')
      + (F.address ? '<div style="font-size:13px;color:var(--sub);font-family:\'IBM Plex Mono\',monospace">'
        + esc(F.address) + '</div>' : '')
      + locationBlock(F)
      + designBlock(F)
      + costBlock(F)
      + '</div>';
    captureMap();
  }

  function captureMap() {
    var wrap = document.getElementById('rv2-sitemap');
    if (!wrap || typeof _captureFullCanvas !== 'function') return;
    _captureFullCanvas().then(function (img) {
      if (!wrap.parentNode) return;
      wrap.innerHTML = img
        ? '<img src="' + img + '" style="width:100%;height:auto;display:block">'
        : '<div style="color:var(--sub);font-size:12px;padding:60px">Draw a site map to see it here</div>';
    }).catch(function () {
      if (wrap.parentNode) wrap.innerHTML =
        '<div style="color:var(--sub);font-size:12px;padding:60px">Site map capture unavailable</div>';
    });
  }

  /* ── 3. INSTALL ─────────────────────────────────────────────────────── */
  var prevReportTab = null, on = false;

  function hideTabs(hide) {
    var t = document.querySelectorAll('.report-tab');
    for (var i = 0; i < t.length; i++) t[i].style.display = hide ? 'none' : '';
  }

  function enable() {
    if (on) return true;
    prevReportTab = root.reportTab;
    root.reportTab = function (tab) {
      try { if (typeof updateCostEst === 'function') updateCostEst(); } catch (e) {}
      hideTabs(true);
      render();
    };
    on = true;
    if (root.console) console.info(TAG + ' on \u2014 single-scroll report');
    return true;
  }

  function disable() {
    if (!on) return false;
    if (prevReportTab) root.reportTab = prevReportTab;
    hideTabs(false);
    on = false;
    if (root.console) console.info(TAG + ' off \u2014 original tabbed report restored');
    return true;
  }

  root.OmegaSiteFacts = { get: facts, buildableAcres: buildableAcres, storage: storage };
  root.OmegaReportV2 = {
    enable: enable, disable: disable, render: render,
    rates: RATES, facts: facts,
    get: function () { return on; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enable);
  } else { enable(); }
})(typeof window !== 'undefined' ? window : globalThis);
