/* Deportes Hoy - Horario Argentina
 * Datos: API pública de ESPN (se consulta directo desde el navegador).
 * Fechas siempre en hora de Argentina (America/Argentina/Buenos_Aires).
 * Estilos: CSS vanilla (sin Tailwind). Íconos: Lucide. Banderas: flagcdn.
 */
(function () {
  "use strict";

  var TZ = "America/Argentina/Buenos_Aires";
  var ESPN = "https://site.api.espn.com/apis/site/v2/sports/";
  var ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/";

  // ---------------------------------------------------------------------------
  // Filtros de selecciones
  // ---------------------------------------------------------------------------
  var SUDAMERICA_RE = /\b(argentina|brazil|brasil|uruguay|chile|colombia|ecuador|peru|per[uú]|paraguay|bolivia|venezuela)\b/i;
  var EUROPA_RE = new RegExp("\\b(" + [
    "england", "scotland", "wales", "northern ireland", "ireland", "france", "germany", "spain", "portugal",
    "italy", "netherlands", "belgium", "croatia", "switzerland", "austria", "denmark", "sweden", "norway",
    "finland", "iceland", "poland", "czechia", "czech republic", "slovakia", "slovenia", "serbia", "bosnia",
    "montenegro", "north macedonia", "albania", "kosovo", "greece", "turkey", "t[uü]rkiye", "bulgaria",
    "romania", "hungary", "ukraine", "georgia", "armenia", "azerbaijan", "israel", "kazakhstan", "cyprus",
    "malta", "luxembourg", "estonia", "latvia", "lithuania", "moldova", "belarus", "russia", "faroe",
    "andorra", "san marino", "gibraltar", "liechtenstein"
  ].join("|") + ")\\b", "i");

  // ---------------------------------------------------------------------------
  // Competencias
  // ---------------------------------------------------------------------------
  var COMPETITIONS = [
    { id: "argentina", flag: "ar", tab: "Liga Argentina", label: "Liga Profesional", color: "#75aadb",
      sources: ["soccer/arg.1", "soccer/arg.copa_lpf"], standings: "soccer/arg.1" },
    { id: "copa-argentina", flag: "ar", tab: "Copa Argentina", label: "Copa Argentina", color: "#f6b40e",
      sources: ["soccer/arg.copa"], standings: null, noTable: "Torneo por eliminación directa: no tiene tabla de posiciones." },
    { id: "libertadores", flag: "globe", tab: "Libertadores", label: "Copa Libertadores", color: "#fbbf24",
      sources: ["soccer/conmebol.libertadores"], standings: "soccer/conmebol.libertadores" },
    { id: "sudamericana", flag: "globe", tab: "Sudamericana", label: "Copa Sudamericana", color: "#34d399",
      sources: ["soccer/conmebol.sudamericana"], standings: "soccer/conmebol.sudamericana" },
    { id: "champions", flag: "eu", tab: "Champions", label: "UEFA Champions League", color: "#818cf8",
      sources: ["soccer/uefa.champions"], standings: "soccer/uefa.champions" },
    { id: "premier", flag: "gb-eng", tab: "Premier", label: "Premier League", color: "#c084fc",
      sources: ["soccer/eng.1"], standings: "soccer/eng.1" },
    { id: "laliga", flag: "es", tab: "La Liga", label: "La Liga", color: "#fb923c",
      sources: ["soccer/esp.1"], standings: "soccer/esp.1" },
    { id: "seriea", flag: "it", tab: "Serie A", label: "Serie A", color: "#4ade80",
      sources: ["soccer/ita.1"], standings: "soccer/ita.1" },

    { id: "selec-sudamerica", flag: "globe", tab: "Selec. Sudamérica", label: "Selecciones sudamericanas", color: "#38bdf8", lookahead: 60,
      teamFilter: SUDAMERICA_RE,
      sources: ["soccer/fifa.worldq.conmebol", "soccer/conmebol.america", "soccer/fifa.friendly"],
      standings: null, noTable: "Sin tabla de posiciones vigente por ahora: se muestra cuando haya eliminatorias en curso." },

    { id: "selec-europa", flag: "eu", tab: "Selec. Europa", label: "Selecciones europeas", color: "#a78bfa", lookahead: 60,
      teamFilter: EUROPA_RE,
      sources: ["soccer/uefa.nations", "soccer/uefa.euro", "soccer/fifa.worldq.uefa", "soccer/fifa.friendly"],
      standings: "soccer/uefa.nations" },

    { id: "pumas", flag: "ar", rugby: true, noResults: true, lookahead: 60, tab: "Pumas", label: "Los Pumas", color: "#22d3ee",
      teamFilter: /argentina|pumas/i,
      sources: ["rugby/17567", "rugby/289234", "rugby/244293"], standings: "rugby/17567" }
  ];
  var TABS = ["Todos"].concat(COMPETITIONS.map(function (c) { return c.tab; }));

  // ---------------------------------------------------------------------------
  // Banderas e íconos
  // ---------------------------------------------------------------------------
  var FLAG_BASE = "https://flagcdn.com/w40/";
  var COUNTRY_FLAGS = {
    "argentina": "ar", "ireland": "ie", "scotland": "gb-sct", "new zealand": "nz", "wales": "gb-wls",
    "japan": "jp", "france": "fr", "fiji": "fj", "england": "gb-eng", "australia": "au",
    "south africa": "za", "italy": "it", "uruguay": "uy", "chile": "cl", "brazil": "br",
    "spain": "es", "germany": "de", "portugal": "pt", "usa": "us", "united states": "us"
  };
  function flagUrl(code, color) {
    if (!code) return "";
    if (code === "globe") {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="' + (color || "#94a3b8") + '"/>' +
        '<g fill="none" stroke="#0a1128" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3.2 3.6 3.2 13.4 0 17M12 3.5c-3.2 3.6-3.2 13.4 0 17"/></g></svg>';
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    }
    return FLAG_BASE + code + ".png";
  }
  function flagForName(name) { return flagUrl(COUNTRY_FLAGS[String(name || "").toLowerCase().trim()]); }

  // ---------------------------------------------------------------------------
  // Fechas
  // ---------------------------------------------------------------------------
  var fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  var fmtTime = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  var fmtDay = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" });

  function dayKeyOf(date) { return fmtKey.format(date); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function addDays(key, n) {
    var p = key.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function compact(key) { return key.replace(/-/g, ""); }
  function todayKey() { return dayKeyOf(new Date()); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function dayLabel(key) {
    var t = todayKey();
    if (key === t) return "Hoy";
    if (key === addDays(t, 1)) return "Mañana";
    if (key === addDays(t, -1)) return "Ayer";
    var p = key.split("-").map(Number);
    return cap(fmtDay.format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12))).replace(".", "").replace(/-/g, "/"));
  }

  // ---------------------------------------------------------------------------
  // ESPN: partidos
  // ---------------------------------------------------------------------------
  var cache = new Map();

  function fetchJson(url, ttl) {
    var hit = cache.get(url);
    if (hit && Date.now() - hit.t < ttl) return Promise.resolve(hit.data);

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 12000);
    return fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) { cache.set(url, { t: Date.now(), data: data }); return data; })
      .finally(function () { clearTimeout(timer); });
  }

  var STATE_ES = {
    "HT": "Entretiempo", "Halftime": "Entretiempo", "FT": "Final", "Final": "Final",
    "FT-Pens": "Final (penales)", "AET": "Final (alargue)", "Final/OT": "Final (alargue)",
    "Full Time": "Final", "Half Time": "Entretiempo"
  };
  function es(txt) { return STATE_ES[txt] || txt; }

  function parseStatus(st) {
    var type = (st && st.type) || {};
    var name = String(type.name || "").toUpperCase();
    var state = String(type.state || "").toLowerCase();
    var short = type.shortDetail || "";

    if (name.indexOf("POSTPONED") > -1) return { status: "upcoming", detail: "Postergado" };
    if (name.indexOf("CANCEL") > -1) return { status: "upcoming", detail: "Cancelado" };
    if (name.indexOf("SUSPENDED") > -1) return { status: "finished", detail: "Suspendido" };
    if (name.indexOf("ABANDONED") > -1) return { status: "finished", detail: "Abandonado" };
    if (name.indexOf("DELAYED") > -1 && state !== "in") return { status: "upcoming", detail: "Demorado" };

    if (state === "in" || name.indexOf("HALFTIME") > -1 || name.indexOf("OVERTIME") > -1 || name.indexOf("SHOOTOUT") > -1) {
      return { status: "live", detail: es(short) || (st && st.displayClock) || "En juego" };
    }
    if (type.completed || state === "post") {
      var d = es(short);
      return { status: "finished", detail: d && d !== "Final" ? d : "Final" };
    }
    return { status: "upcoming", detail: "" };
  }

  function parseEvent(ev, comp) {
    var c = ev.competitions && ev.competitions[0];
    if (!c || !c.competitors || c.competitors.length < 2) return null;

    var home = c.competitors.find(function (x) { return x.homeAway === "home"; }) || c.competitors[0];
    var away = c.competitors.find(function (x) { return x.homeAway === "away"; }) || c.competitors[1];

    function names(x) {
      var t = x.team || {};
      return [t.displayName, t.shortDisplayName, t.name, t.abbreviation].filter(Boolean).join(" ");
    }
    if (comp.teamFilter && !comp.teamFilter.test(names(home) + " " + names(away))) return null;

    var when = new Date(ev.date);
    if (isNaN(when)) return null;

    var s = parseStatus(ev.status);
    var detail = s.detail;
    var hasPens = home.shootoutScore !== undefined && away.shootoutScore !== undefined;
    if (hasPens) detail = (detail ? detail + " " : "") + "(pen. " + home.shootoutScore + "-" + away.shootoutScore + ")";

    function team(x) {
      var t = x.team || {};
      var nm = t.shortDisplayName || t.displayName || t.name || "A definir";
      var flag = comp.rugby ? flagForName(t.displayName || nm) : "";
      return { name: nm, logo: t.logo || flag, flag: flag, winner: !!x.winner, score: x.score };
    }

    return {
      id: comp.id + "-" + ev.id,
      comp: comp,
      ts: when.getTime(),
      dayKey: dayKeyOf(when),
      time: fmtTime.format(when),
      status: s.status,
      detail: detail,
      venue: c.venue && c.venue.fullName,
      home: team(home),
      away: team(away)
    };
  }

  var rangeSupported = true;

  function scoreboard(src, fromKey, toKey, ttl) {
    function one(dates) { return fetchJson(ESPN + src + "/scoreboard?dates=" + dates + "&limit=300", ttl); }
    function merge(list) {
      var ok = list.filter(Boolean);
      if (!ok.length) throw new Error("sin respuesta");
      return { events: [].concat.apply([], ok.map(function (r) { return r.events || []; })) };
    }
    function split() {
      var keys = [], k = fromKey, months = {};
      while (k <= toKey) { keys.push(k); months[k.slice(0, 4) + k.slice(5, 7)] = 1; k = addDays(k, 1); }
      var calls = keys.length <= 4 ? keys.map(compact) : Object.keys(months);
      return Promise.all(calls.map(function (d) { return one(d).catch(function () { return null; }); })).then(merge);
    }
    if (fromKey === toKey) return one(compact(fromKey));
    if (!rangeSupported) return split();
    return one(compact(fromKey) + "-" + compact(toKey)).catch(function (err) {
      if (/HTTP 400/.test(String(err && err.message))) { rangeSupported = false; return split(); }
      throw err;
    });
  }

  function loadCompetition(comp, fromKey, toKey, ttl, label) {
    var wf = addDays(fromKey, -1), wt = addDays(toKey, 1);
    var ok = 0, seen = {}, out = [], diag = [];

    return Promise.all(comp.sources.map(function (src) {
      return scoreboard(src, wf, wt, ttl)
        .then(function (data) {
          ok++;
          var n = 0;
          (data.events || []).forEach(function (ev) {
            if (seen[ev.id]) return;
            var parsed = parseEvent(ev, comp);
            if (parsed && parsed.dayKey >= fromKey && parsed.dayKey <= toKey) {
              seen[ev.id] = true; out.push(parsed); n++;
            }
          });
          diag.push({ name: comp.label + (label || ""), src: src, ok: true, text: n + " partidos" });
        })
        .catch(function (err) {
          diag.push({ name: comp.label + (label || ""), src: src, ok: false, text: String((err && err.message) || err) });
        });
    })).then(function () {
      return { comp: comp, events: out, failed: ok === 0, diag: diag };
    });
  }

  // ---------------------------------------------------------------------------
  // ESPN: posiciones
  // ---------------------------------------------------------------------------
  var COLS = [
    { k: "PJ", names: ["gamesPlayed"], abbr: ["GP"] },
    { k: "G", names: ["wins"], abbr: ["W"] },
    { k: "E", names: ["ties", "draws"], abbr: ["D", "T"] },
    { k: "P", names: ["losses"], abbr: ["L"] },
    { k: "GF", names: ["pointsFor"], abbr: ["F", "PF"], wide: true },
    { k: "GC", names: ["pointsAgainst"], abbr: ["A", "PA"], wide: true },
    { k: "DG", names: ["pointDifferential"], abbr: ["GD", "PD"] },
    { k: "Pts", names: ["points"], abbr: ["P", "PTS"], strong: true }
  ];

  function statOf(entry, names, abbr) {
    var stats = entry.stats || [];
    for (var i = 0; i < stats.length; i++) {
      var s = stats[i];
      if (names.indexOf(s.name) > -1) return s;
    }
    for (var j = 0; j < stats.length; j++) {
      if (abbr && abbr.indexOf(stats[j].abbreviation) > -1 && stats[j].name !== "rank") return stats[j];
    }
    return null;
  }
  function statText(s) {
    if (!s) return "-";
    if (s.displayValue != null && s.displayValue !== "") return String(s.displayValue);
    return s.value != null ? String(s.value) : "-";
  }

  function parseStandings(data) {
    var groups = [];
    function walk(node, name) {
      var entries = node && node.standings && node.standings.entries;
      if (entries && entries.length) {
        var rows = entries.map(function (en, i) {
          var t = en.team || {};
          var rank = statOf(en, ["rank"], null);
          var pts = statOf(en, ["points"], ["P", "PTS"]);
          return {
            pos: rank && rank.value != null ? Number(rank.value) : i + 1,
            hasRank: !!(rank && rank.value != null),
            pts: pts && pts.value != null ? Number(pts.value) : 0,
            name: t.shortDisplayName || t.displayName || t.name || "Equipo",
            logo: (t.logos && t.logos[0] && t.logos[0].href) || t.logo || "",
            note: en.note && en.note.description ? { color: en.note.color || "", text: en.note.description } : null,
            cells: COLS.map(function (c) { return statText(statOf(en, c.names, c.abbr)); })
          };
        });
        if (rows.every(function (r) { return r.hasRank; })) rows.sort(function (a, b) { return a.pos - b.pos; });
        else rows.sort(function (a, b) { return b.pts - a.pts; });
        groups.push({ name: name || "", rows: rows });
      }
      (node && node.children || []).forEach(function (ch) { walk(ch, ch.name || ch.abbreviation || ""); });
    }
    walk(data, "");
    return groups;
  }

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  var LIVE_TTL = 20000;
  var SLOW_TTL = 300000;
  var TABLE_TTL = 600000;

  var state = {
    tab: "Todos",
    dayKey: todayKey(),
    statusFilter: "all",
    events: [],
    upcoming: {},
    results: [],
    tables: {},
    tableDiag: {},
    closed: {},
    failedIds: {},
    failed: [],
    diag: [],
    loaded: false,
    token: 0,
    timer: null,
    updated: null
  };

  function isRange() { return state.tab === "Pumas"; }
  function compsForTab() {
    return COMPETITIONS.filter(function (c) { return state.tab === "Todos" || c.tab === state.tab; });
  }
  function byTs(a, b) { return a.ts - b.ts; }

  function load(showSkeleton) {
    var token = ++state.token;
    if (showSkeleton) { state.loaded = false; render(); }

    var today = todayKey(), dayKey = state.dayKey, range = isRange(), comps = compsForTab();
    var from, to;
    if (range) { from = addDays(today, -10); to = addDays(today, 45); } else { from = to = dayKey; }

    var dayP = Promise.all(comps.map(function (c) { return loadCompetition(c, from, to, range ? SLOW_TTL : LIVE_TTL); }));
    var resP = range ? Promise.resolve([]) : Promise.all(comps.filter(function (c) { return !c.noResults; }).map(function (c) {
      return loadCompetition(c, addDays(today, -29), today, SLOW_TTL, " (resultados)");
    }));

    Promise.all([dayP, resP]).then(function (both) {
      if (token !== state.token) return;
      var events = [], failed = [], failedIds = {}, diag = [], empties = [];
      both[0].forEach(function (r) {
        events = events.concat(r.events);
        diag = diag.concat(r.diag);
        if (r.failed) { failed.push(r.comp.label); failedIds[r.comp.id] = true; }
        else if (!r.events.length && !range) empties.push(r.comp);
      });
      var results = [];
      both[1].forEach(function (r) {
        diag = diag.concat(r.diag);
        results = results.concat(r.events.filter(function (e) { return e.status === "finished"; }));
      });

      return Promise.all(empties.map(function (c) {
        return loadCompetition(c, addDays(dayKey, 1), addDays(dayKey, c.lookahead || 21), SLOW_TTL, " (próximos)");
      })).then(function (ups) {
        if (token !== state.token) return;
        var upcoming = {};
        ups.forEach(function (r) {
          upcoming[r.comp.id] = r.events.filter(function (e) { return e.status === "upcoming"; }).sort(byTs).slice(0, 4);
        });
        state.events = events; state.failed = failed; state.failedIds = failedIds; state.diag = diag;
        state.results = results; state.upcoming = upcoming;
        state.loaded = true; state.updated = new Date();
        render();
        if (showSkeleton) replay(document.getElementById("content"));
        schedule();
      });
    }).catch(function (err) {
      if (token !== state.token) return;
      if (window.console) console.error(err);
      state.loaded = true; state.failed = comps.map(function (c) { return c.label; });
      render();
    });
  }

  function loadTables() {
    compsForTab().forEach(function (c) {
      if (!c.standings) { state.tables[c.id] = { none: true }; return; }
      var cur = state.tables[c.id];
      if (cur && (cur.loading || (cur.ok && Date.now() - cur.t < TABLE_TTL))) return;
      if (!cur || !cur.ok) state.tables[c.id] = { loading: true };
      fetchJson(ESPN_V2 + c.standings + "/standings", TABLE_TTL).then(function (data) {
        var groups = parseStandings(data);
        state.tables[c.id] = { ok: true, t: Date.now(), groups: groups };
        state.tableDiag[c.id] = { ok: true, text: groups.length + " tablas" };
        renderStandings();
      }).catch(function (err) {
        state.tables[c.id] = { error: String((err && err.message) || err) };
        state.tableDiag[c.id] = { ok: false, text: String((err && err.message) || err) };
        renderStandings();
      });
    });
    renderStandings();
  }

  function schedule() {
    clearTimeout(state.timer);
    var live = state.events.some(function (e) { return e.status === "live"; });
    state.timer = setTimeout(function () {
      if (document.hidden) return schedule();
      load(false);
    }, live ? 30000 : 60000);
  }

  // ---------------------------------------------------------------------------
  // Helpers DOM
  // ---------------------------------------------------------------------------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var ch = arguments[i];
      if (ch) el.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
    }
    return el;
  }
  var $ = function (id) { return document.getElementById(id); };

  function icon(name, cls) { return h("i", { "data-lucide": name, class: cls || "" }); }
  function refreshIcons() { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) {} }
  function replay(el) {
    if (!el) return;
    el.classList.remove("animate__animated", "animate__fadeInUp", "animate__faster");
    void el.offsetWidth;
    el.classList.add("animate__animated", "animate__fadeInUp", "animate__faster");
  }

  function flagImg(comp, cls) {
    var src = flagUrl(comp.flag, comp.color);
    if (!src) return null;
    var img = h("img", { class: cls || "", src: src, alt: "", loading: "lazy" });
    img.addEventListener("error", function () { img.style.visibility = "hidden"; });
    return img;
  }

  // ---------------------------------------------------------------------------
  // Render: filtros y días
  // ---------------------------------------------------------------------------
  function renderFilters() {
    var nav = $("filters");
    nav.textContent = "";
    TABS.forEach(function (t) {
      var comp = COMPETITIONS.filter(function (c) { return c.tab === t; })[0];
      var lead = comp ? flagImg(comp) : icon("layout-grid");
      var b = h("button", { type: "button", class: "filter-btn" + (t === state.tab ? " is-active" : "") }, lead, h("span", { text: t }));
      b.addEventListener("click", function () { setTab(t); });
      nav.appendChild(b);
    });
    var act = nav.querySelector(".is-active");
    if (act && act.scrollIntoView) { try { act.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
  }

  function renderDays() {
    var box = $("days");
    box.classList.toggle("hidden", isRange());
    box.textContent = "";
    if (isRange()) return;
    var today = todayKey();
    for (var i = -3; i <= 3; i++) {
      (function (key) {
        var p = key.split("-");
        var lab = dayLabel(key);
        var sub = Number(p[2]) + "/" + Number(p[1]);
        var named = lab === "Hoy" || lab === "Mañana" || lab === "Ayer";
        var active = key === state.dayKey;
        var btn = h("button", { type: "button", class: "day-btn" + (active ? " is-active" : "") },
          h("small", { text: named ? sub : lab.split(" ")[0] }),
          h("strong", { text: named ? lab : sub })
        );
        btn.addEventListener("click", function () { state.dayKey = key; renderDays(); load(true); });
        box.appendChild(btn);
      })(addDays(today, i));
    }
  }

  function liveBadge() { return h("span", { class: "badge-live" }, "EN VIVO"); }
  function note(text) { return h("p", { class: "note", text: text }); }

  // ---------------------------------------------------------------------------
  // Render: partidos
  // ---------------------------------------------------------------------------
  function matchRow(e, showDate) {
    var live = e.status === "live", upcoming = e.status === "upcoming", finished = e.status === "finished";
    var hs = parseFloat(e.home.score), as = parseFloat(e.away.score);
    var hWin = finished && (e.home.winner || hs > as);
    var aWin = finished && (e.away.winner || as > hs);

    function teamEl(t, away, win) {
      var name = h("span", { class: "name", text: t.name });
      var kids = [];
      if (t.logo) {
        var img = h("img", { src: t.logo, alt: "", loading: "lazy" });
        img.addEventListener("error", function () {
          if (t.flag && img.src.indexOf(t.flag) === -1) img.src = t.flag;
          else img.style.visibility = "hidden";
        });
        kids = away ? [name, img] : [img, name];
      } else { kids = [name]; }
      return h.apply(null, ["div", { class: "team" + (away ? " away" : "") + (win ? " is-winner" : "") }].concat(kids));
    }

    var score = h("div", { class: "score-box" });
    if (upcoming) {
      score.appendChild(h("span", { class: "score-vs", text: e.detail || "vs" }));
    } else {
      var hv = e.home.score != null && e.home.score !== "" ? e.home.score : "-";
      var av = e.away.score != null && e.away.score !== "" ? e.away.score : "-";
      score.appendChild(h("span", { class: "score-line", text: hv + " - " + av }));
      if (e.detail) score.appendChild(h("span", { class: "score-detail", text: e.detail }));
    }

    var meta = h("div", { class: "match-meta" },
      h("span", { class: "match-time", text: e.time }),
      showDate ? h("span", { class: "match-date-tag", text: dayLabel(e.dayKey) }) : null,
      e.venue ? h("span", { class: "match-venue", text: e.venue }) : null
    );

    return h("article", { class: "match" + (live ? " is-live" : "") },
      meta,
      h("div", { class: "match-body" }, teamEl(e.home, false, hWin), score, teamEl(e.away, true, aWin)));
  }

  function sectionTitle(comp, o) {
    o = o || {};
    var t = h("h2", { class: "section-title", style: "color:" + comp.color },
      flagImg(comp), h("span", { text: o.title || comp.label }));
    if (o.live) t.appendChild(liveBadge());
    if (o.count != null) t.appendChild(h("span", { class: "count", text: String(o.count) }));
    return t;
  }

  function daySection(comp, events, o) {
    o = o || {};
    var sec = h("section", {},
      sectionTitle(comp, { title: o.title, count: o.count, live: events.some(function (e) { return e.status === "live"; }) }));
    if (o.note) sec.appendChild(note(o.note));
    if (events.length) {
      var list = h("div", { class: "matches-list" });
      events.forEach(function (e) { list.appendChild(matchRow(e, o.showDate)); });
      sec.appendChild(list);
    }
    return sec;
  }

  function resultsBlock(comp) {
    var list = state.results
      .filter(function (e) { return e.comp.id === comp.id && e.dayKey !== state.dayKey; })
      .sort(function (a, b) { return b.ts - a.ts; })
      .slice(0, 5);

    var box = h("section", { class: "results-block" },
      h("h3", {}, icon("history"), comp.label + " · últimos resultados"));
    if (!list.length) {
      box.appendChild(h("p", { class: "results-empty", text: "Sin resultados en los últimos 30 días." }));
    } else {
      var wrap = h("div", { class: "matches-list" });
      list.forEach(function (e) { wrap.appendChild(matchRow(e, true)); });
      box.appendChild(wrap);
    }
    return box;
  }

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------
  function render() {
    renderFilters();

    var content = $("content");
    content.textContent = "";

    if (!state.loaded) {
      for (var i = 0; i < 5; i++) content.appendChild(h("div", { class: "skeleton" }));
      refreshIcons();
      return;
    }

    var count = { live: 0, upcoming: 0, finished: 0 };
    state.events.forEach(function (e) { count[e.status]++; });
    $("statTotal").textContent = state.events.length;
    $("statLive").textContent = count.live;
    $("statUpcoming").textContent = count.upcoming;
    $("statFinished").textContent = count.finished;

    var w = $("warning");
    if (state.failed.length) {
      w.classList.remove("hidden");
      w.textContent = "No se pudieron cargar: " + state.failed.join(", ") + ". Se reintenta automáticamente.";
    } else { w.classList.add("hidden"); }

    renderDiag();
    $("updatedAt").textContent = state.updated ? "Última actualización: " + fmtTime.format(state.updated) : "";

    var list = state.events.filter(function (e) { return state.statusFilter === "all" || e.status === state.statusFilter; });

    if (isRange()) {
      if (!list.length) {
        content.appendChild(h("div", { class: "empty-state" },
          h("strong", { text: "No hay partidos de Los Pumas en este período" }),
          state.failed.length ? "No se pudo conectar con ESPN. Revisá tu conexión." : "Probá con otro filtro de estado."));
        refreshIcons();
        return;
      }
      var byDay = {};
      list.forEach(function (e) { (byDay[e.dayKey] = byDay[e.dayKey] || []).push(e); });
      Object.keys(byDay).sort().forEach(function (k) {
        var evs = byDay[k].sort(byTs);
        var wrap = h("div", { class: "comp-block" });
        wrap.appendChild(daySection(evs[0].comp, evs, { title: dayLabel(k) + " · " + evs[0].comp.label }));
        content.appendChild(wrap);
      });
      refreshIcons();
      return;
    }

    var any = false;
    compsForTab().forEach(function (comp) {
      var evs = list.filter(function (e) { return e.comp.id === comp.id; }).sort(byTs);
      var wrap = h("div", { class: "comp-block" });

      if (state.statusFilter !== "all") {
        if (!evs.length) return;
        wrap.appendChild(daySection(comp, evs, { count: evs.length }));
        content.appendChild(wrap); any = true;
        return;
      }

      if (evs.length) {
        wrap.appendChild(daySection(comp, evs, { count: evs.length }));
      } else if (state.failedIds[comp.id]) {
        wrap.appendChild(daySection(comp, [], { note: "No se pudo cargar. Se reintenta solo." }));
      } else {
        var next = state.upcoming[comp.id] || [];
        wrap.appendChild(daySection(comp, next, {
          showDate: true,
          note: next.length ? "Sin partidos este día. Próximos partidos:" : "Sin partidos este día ni en los próximos " + (comp.lookahead || 21) + " días."
        }));
      }
      if (!comp.noResults) wrap.appendChild(resultsBlock(comp));
      content.appendChild(wrap); any = true;
    });

    if (!any) {
      content.appendChild(h("div", { class: "empty-state" },
        h("strong", { text: "No hay partidos con ese estado" }), "Probá con otro filtro."));
    }
    refreshIcons();
  }

  function renderDiag() {
    var dl = $("diagList");
    dl.textContent = "";
    state.diag.forEach(function (d) {
      dl.appendChild(h("li", { class: d.ok ? "" : "error", text: (d.ok ? "OK · " : "Error · ") + d.name + " (" + d.src + "): " + d.text }));
    });
    compsForTab().forEach(function (c) {
      var d = state.tableDiag[c.id];
      if (d) dl.appendChild(h("li", { class: d.ok ? "" : "error", text: (d.ok ? "OK · " : "Error · ") + c.label + " (posiciones " + c.standings + "): " + d.text }));
    });
  }

  // ---------------------------------------------------------------------------
  // Posiciones
  // ---------------------------------------------------------------------------
  function standingsTable(group) {
    var head = h("tr", {},
      h("th", { class: "col-rank", text: "#" }),
      h("th", { class: "col-team", text: "Equipo" }));
    COLS.forEach(function (c) {
      head.appendChild(h("th", { class: c.wide ? "wide" : "", text: c.k }));
    });
    var tbody = h("tbody");
    var notes = {};
    group.rows.forEach(function (r, i) {
      if (r.note) notes[r.note.text] = r.note.color;
      var color = r.note && r.note.color ? (/^#/.test(r.note.color) ? r.note.color : "#" + r.note.color) : "transparent";
      var logo = r.logo ? h("img", { src: r.logo, alt: "", loading: "lazy" }) : null;
      if (logo) logo.addEventListener("error", function () { logo.style.visibility = "hidden"; });
      var tr = h("tr", {},
        h("td", { class: "col-rank", style: "box-shadow: inset 3px 0 0 " + color, text: String(i + 1) }),
        h("td", { class: "col-team" }, h("div", { class: "team-cell" }, logo, h("span", { text: r.name }))));
      COLS.forEach(function (c, j) {
        tr.appendChild(h("td", { class: (c.wide ? "wide " : "") + (c.strong ? "strong" : ""), text: r.cells[j] }));
      });
      tbody.appendChild(tr);
    });

    var table = h("table", { class: "standings-table" }, h("thead", {}, head), tbody);
    var wrap = h("div", { class: "standings-table-wrap" }, table);

    var legend = Object.keys(notes);
    var out = h("div", {}, wrap);
    if (legend.length) {
      var lg = h("ul", { class: "standings-legend" });
      legend.forEach(function (txt) {
        var col = notes[txt] ? (/^#/.test(notes[txt]) ? notes[txt] : "#" + notes[txt]) : "#64748b";
        lg.appendChild(h("li", {}, h("span", { class: "dot", style: "background:" + col }), txt));
      });
      out.appendChild(lg);
    }
    return out;
  }

  function renderStandings() {
    var box = $("standings");
    box.textContent = "";
    compsForTab().forEach(function (c) {
      var t = state.tables[c.id] || { loading: true };
      var det = h("details", { class: "standings-card", "data-comp": c.id });
      if (!state.closed[c.id]) det.setAttribute("open", "");
      det.addEventListener("toggle", function () { state.closed[c.id] = !det.open; });

      det.appendChild(h("summary", {},
        flagImg(c),
        h("span", { class: "comp-name", style: "color:" + c.color, text: c.label }),
        h("span", { class: "chev" }, icon("chevron-down"))));

      var body = h("div", { class: "standings-body" });
      if (t.none) {
        body.appendChild(h("p", { class: "standings-msg", text: c.noTable || "Sin tabla de posiciones." }));
      } else if (t.loading) {
        for (var i = 0; i < 4; i++) body.appendChild(h("div", { class: "skeleton", style: "margin: .75rem; height: 1.25rem;" }));
      } else if (t.error) {
        body.appendChild(h("p", { class: "standings-msg", text: "No se pudo cargar la tabla (" + t.error + "). Se reintenta al recargar." }));
      } else if (!t.groups.length) {
        body.appendChild(h("p", { class: "standings-msg", text: "Sin tabla disponible por ahora (puede ser una fase de eliminación directa)." }));
      } else {
        t.groups.forEach(function (g) {
          if (g.name && (t.groups.length > 1 || !/^(standings|table)$/i.test(g.name))) {
            body.appendChild(h("h4", { class: "group-title", text: g.name.replace(/^Group /i, "Grupo ") }));
          }
          body.appendChild(standingsTable(g));
        });
      }
      det.appendChild(body);
      box.appendChild(det);
    });
    refreshIcons();
  }

  // ---------------------------------------------------------------------------
  // Interacción
  // ---------------------------------------------------------------------------
  function paintChips() {
    document.querySelectorAll("[data-status]").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.status === state.statusFilter);
    });
  }

  function setTab(t) {
    state.tab = t;
    state.statusFilter = "all";
    paintChips();
    try { history.replaceState(null, "", "#" + encodeURIComponent(t.toLowerCase())); } catch (e) {}
    renderDays();
    load(true);
    loadTables();
  }

  function tickClock() {
    var el = $("clock");
    if (el) el.textContent = dayLabel(todayKey()) + " · " + fmtTime.format(new Date()) + " ARG";
  }

  function init() {
    var hash = decodeURIComponent(location.hash.slice(1)).toLowerCase();
    var found = TABS.filter(function (t) { return t.toLowerCase() === hash; })[0];
    if (found) state.tab = found;

    document.querySelectorAll("[data-status]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.statusFilter = chip.dataset.status;
        paintChips();
        render();
        replay($("content"));
      });
    });
    paintChips();

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { tickClock(); load(false); loadTables(); }
    });

    tickClock();
    setInterval(tickClock, 30000);
    renderFilters();
    renderDays();
    load(true);
    loadTables();
    refreshIcons();
  }

  init();
})();