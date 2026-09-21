/* 三个存档 · 交互逻辑 */
(function () {
  const C = window.CONTENT, G = C.games;
  const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, RM ? 0 : ms));

  /* ---------- 存档（本地进度） ---------- */
  const KEY = "three-saves-v1";
  const fresh = () => ({ de: {}, hades: {}, sv: {}, deaths: 0, season: "spring", door: null, boon: null, attr: { 视觉: 1, 共情: 1, 逻辑: 1 } });
  let S = fresh();
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && typeof v === "object") S = Object.assign(fresh(), v); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const TOTAL = {
    de: G.de.reasons.length,
    hades: G.hades.reasons.reduce((n, r) => n + r.parts.length, 0),
    sv: G.sv.spots.length
  };
  const done = (g) => Object.keys(S[g]).length;
  const allDone = () => ["de", "hades", "sv"].every((g) => done(g) >= TOTAL[g]);

  /* ---------- 小组件 ---------- */
  const shots = (list) => `<div class="shots">${list.map((s) => s.src
    ? `<figure class="shot has-img"><img src="${esc(s.src)}" alt="${esc(s.caption)}" loading="lazy"></figure>`
    : `<figure class="shot">${esc(s.caption)}</figure>`).join("")}</div>`;
  const paras = (arr) => (arr || []).map((t) => `<p>${esc(t)}</p>`).join("");
  const exs = (arr) => (arr || []).map((t) => `<p class="ex">${esc(t)}</p>`).join("");
  const contact = () => `<footer class="contact"><h3>联系我</h3><ul>${C.me.contact.map((c) =>
    `<li>${esc(c.label)}：<span class="${/【/.test(c.value) ? "todo" : ""}">${esc(c.value)}</span></li>`).join("")}</ul>${C.me.sign ? `<small>${esc(C.me.sign)}</small>` : ""}</footer>`;

  /* ---------- 顶栏 ---------- */
  function renderBar(route) {
    const chips = [["de", "极乐迪斯科"], ["hades", "黑帝斯"], ["sv", "星露谷"], ["ideas", "设计观"]];
    $("#chips").innerHTML = chips.map(([k, n]) =>
      `<button class="chip" data-go="${k}" aria-current="${route === k}">${n}${k !== "ideas" ? `<b>${done(k)}/${TOTAL[k]}</b>` : ""}</button>`).join("");
    $("#barName").textContent = route === "hub" ? C.me.title : "← " + C.me.title;
    $("#barQuick").textContent = route === "read" ? "回到游戏" : "快速阅读";
    $("#barQuick").dataset.go = route === "read" ? "hub" : "read";
  }

  /* ================= 大厅 ================= */
  function renderHub(el) {
    const slot = (k, i) => {
      const g = G[k], d = done(k), t = TOTAL[k];
      return `<button class="slot slot-${k}" data-go="${k}">
        <div class="slot-art"><span class="slot-no">存档 0${i + 1}</span></div>
        <div class="slot-body">
          <p class="slot-name">${esc(g.name)}<small>${esc(g.en.toUpperCase())}</small></p>
          <p class="slot-meta">${esc(g.genre)} · 本章玩法：${esc(g.play)}</p>
          <p class="slot-intro">${esc(g.intro.split("。")[0])}。</p>
          <div class="slot-foot"><span class="meter"><i style="width:${(d / t) * 100}%"></i></span><span>已读 ${d}/${t}</span><span class="slot-cta">${d === 0 ? "开始" : d >= t ? "重温" : "继续"} →</span></div>
        </div></button>`;
    };
    const lit = allDone();
    el.innerHTML = `<div class="page">
      <header class="hub-head">
        <p class="kicker">${esc(C.me.role)}</p>
        <h1>${esc(C.me.title)}</h1>
        <p class="lede">${esc(C.me.lede)}</p>
        <p class="by">${esc(C.me.name)}</p>
      </header>
      <div class="slots">${["de", "hades", "sv"].map(slot).join("")}</div>
      <div class="hub-more">
        <button class="ideas-entry ${lit ? "lit" : ""}" data-go="ideas"><strong>设计观 · 三款游戏的共同点</strong>
          <span>${lit ? "三个存档都读完了，最后一站已点亮。" : "读完三个存档后点亮。现在也可以直接进入。"}</span></button>
        <button class="quick-entry" data-go="read">没时间玩？<br>快速阅读全部文字 →</button>
        <button class="restart-entry" data-reset="1" title="清空阅读进度，回到初始状态">重新开始<br><span>清空进度，再来一局</span></button>
      </div>
      ${contact()}
    </div>`;
  }

  /* ================= 极乐迪斯科 ================= */
  const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const die = (n, rolling) => `<span class="die ${rolling ? "roll" : ""}">${[...Array(9)].map((_, i) =>
    `<i class="${DIE_PIPS[n].includes(i) ? "on" : ""}"></i>`).join("")}</span>`;
  const chance = (r) => { const need = r.dc - S.attr[r.skill]; let ok = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) ok++; return Math.round((ok / 36) * 100); };
  const diff = (dc) => (dc <= 6 ? "简单" : dc <= 9 ? "中等" : "困难");
  const line = (who, t, cls) => `<p class="line"><span class="who ${cls}">【${esc(who)}】</span>${esc(t)}</p>`;

  function deCard(r, rec) {
    return `
      <div class="check">${die(rec.roll[0])}${die(rec.roll[1])}
        <span>${esc(r.skill)} ${diff(r.dc)} ${r.dc} · ${rec.roll[0]}+${rec.roll[1]}+${rec.bonus} = ${rec.roll[0] + rec.roll[1] + rec.bonus}</span>
        <span class="${rec.ok ? "res-ok" : "res-bad"}">${rec.ok ? "判定成功" : "判定失败"}</span></div>
      ${rec.ok ? "" : `<div class="fail-note"><strong>失败也解锁了内容</strong>${esc(G.de.failNote)}</div>`}
      ${r.before ? line(r.before.who, r.before.t, "who-skill") : ""}
      <article class="de-card" id="de-card-${r.id}">
        <p class="card-k">喜爱原因 ${r.id}</p>
        <h3>${esc(r.title)}</h3>
        <blockquote class="summary">${esc(r.summary)}</blockquote>
        <div class="insight"><b>设计启示</b>${esc(r.insight)}</div>
        <details class="full"><summary>展开全部内容</summary>
          ${r.parts.map((p) => `<section class="part"><h4>${esc(p.h)}</h4>${paras(p.p)}${exs(p.ex)}
            ${p.voice ? `<p class="voice"><b>【${esc(p.voice.who)}】</b>${esc(p.voice.t)}</p>` : ""}</section>`).join("")}
        </details>
      </article>`;
  }

  function deSceneHTML() {
    const sc = G.de.scene || {};
    if (sc.src) { const src = S.de.A && sc.srcAfter ? sc.srcAfter : sc.src;
      return `<img id="deSceneImg" src="${esc(src)}" alt="${esc(sc.alt || "场景图")}">`; }
    return `<canvas id="deCanvas" aria-label="油画质感的码头场景" role="img"></canvas><div class="grain"></div>`;
  }

  function renderDE(el) {
    const g = G.de;
    el.innerHTML = `<div class="page"><div class="de">
      <aside class="de-left">
        <div class="de-scene">${deSceneHTML()}</div>
        <div class="de-attr" id="deAttr"></div>
        ${shots(g.shots)}
      </aside>
      <div class="de-right">
        <header class="de-head"><p class="kicker">存档 01 · ${esc(g.genre)}</p>
          <h2>${esc(g.name)}<span>${esc(g.en)}</span></h2><p class="intro">${esc(g.intro)}</p></header>
        <div class="de-log" id="deLog" aria-live="polite">
          ${g.opening.map((o) => line(o.who, o.t, o.who === "旁白" ? "who-narr" : "who-skill")).join("")}
          ${g.reasons.filter((r) => S.de[r.id]).map((r) => `${line("你", r.ask, "who-you")}${deCard(r, S.de[r.id])}`).join("")}
        </div>
        <div class="de-opts" id="deOpts"></div>
      </div></div></div>`;
    deAttr(); deOpts(); if (!(G.de.scene && G.de.scene.src)) paintDE();
  }
  function deAttr(bump) {
    $("#deAttr").innerHTML = Object.entries(S.attr).map(([k, v]) =>
      `<div class="attr ${bump === k ? "bump" : ""}"><span>${k}</span><b>${v}</b></div>`).join("");
  }
  function deOpts() {
    const g = G.de, box = $("#deOpts");
    const left = g.reasons.filter((r) => !S.de[r.id]).length;
    box.innerHTML = `<p class="prompt">${left ? "选择一个问题 · 需要过判定" : ""}</p>
      ${g.reasons.map((r, i) => {
        const rd = !!S.de[r.id];
        return `<button class="opt ${rd ? "done" : ""}" data-de="${r.id}"><span class="n">${i + 1}.</span>
          <span><span class="tag">【${esc(r.skill)} · ${diff(r.dc)} ${r.dc}】</span> ${esc(r.ask)}</span>
          <span class="pct">${rd ? "已读 · 回看" : "成功率 " + chance(r) + "%"}</span></button>`;
      }).join("")}
      ${left ? "" : `<p class="de-done">${esc(g.ending)}</p><button class="nextbtn" data-go="hades">去下一个存档：黑帝斯 →</button>`}`;
  }
  let deBusy = false;
  async function deChoose(id) {
    const r = G.de.reasons.find((x) => x.id === id);
    if (S.de[id]) { const c = $("#de-card-" + id); if (c) c.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }); return; }
    if (deBusy) return; deBusy = true;
    document.querySelectorAll(".opt").forEach((b) => (b.disabled = true));
    const log = $("#deLog");
    log.insertAdjacentHTML("beforeend", line("你", r.ask, "who-you"));
    const holder = document.createElement("div"); holder.className = "check"; log.appendChild(holder);
    const t0 = Date.now();
    while (Date.now() - t0 < (RM ? 0 : 900)) {
      holder.innerHTML = die(1 + Math.floor(Math.random() * 6), true) + die(1 + Math.floor(Math.random() * 6), true) + `<span>判定中……</span>`;
      await wait(90);
    }
    const roll = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const bonus = S.attr[r.skill];
    const rec = { roll, bonus, ok: roll[0] + roll[1] + bonus >= r.dc };
    S.de[id] = rec; S.attr[r.skill] += 1; save();
    holder.remove();
    const wrap = document.createElement("div"); wrap.style.display = "contents";
    wrap.innerHTML = deCard(r, rec); log.appendChild(wrap);
    deAttr(r.skill); deOpts(); renderBar("de");
    if (id === "A") { const sc = G.de.scene || {};
      if (sc.src) { const im = $("#deSceneImg"); if (im && sc.srcAfter) im.src = sc.srcAfter; } else paintDE(true); }
    await wait(80);
    const target = rec.ok ? $("#de-card-" + id) : wrap.querySelector(".fail-note");
    if (target) target.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "center" });
    deBusy = false;
  }

  /* 油画场景：程序化笔触 */
  function paintDE(animateWheel) {
    const cv = $("#deCanvas"); if (!cv) return;
    const box = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(200, box.width), H = Math.max(160, box.height);
    cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stroke = (cx, cy, len, w, col, ang) => {
      x.strokeStyle = col; x.lineWidth = w; x.lineCap = "round"; x.beginPath();
      const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
      x.moveTo(cx - dx, cy - dy); x.quadraticCurveTo(cx + (rnd() - .5) * len * .3, cy + (rnd() - .5) * len * .3, cx + dx, cy + dy); x.stroke();
    };
    const hz = H * 0.52;
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#27414B"); g.addColorStop(.42, "#6E7F7A"); g.addColorStop(.52, "#C98A4B"); g.addColorStop(.56, "#2E5358"); g.addColorStop(1, "#162428");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sky = ["rgba(62,108,111,.5)", "rgba(120,140,135,.45)", "rgba(224,112,58,.35)", "rgba(200,180,150,.3)", "rgba(40,66,76,.5)"];
    for (let i = 0; i < 260; i++) { const y = rnd() * hz; const warm = y > hz * .7;
      stroke(rnd() * W, y, 20 + rnd() * 60, 4 + rnd() * 12, warm && rnd() > .4 ? "rgba(224,130,70,.35)" : sky[Math.floor(rnd() * sky.length)], (rnd() - .5) * .5); }
    const sea = ["rgba(30,70,78,.6)", "rgba(62,108,111,.5)", "rgba(20,40,46,.6)", "rgba(180,120,80,.25)", "rgba(140,170,160,.25)"];
    for (let i = 0; i < 260; i++) stroke(rnd() * W, hz + rnd() * (H * .3), 20 + rnd() * 70, 3 + rnd() * 8, sea[Math.floor(rnd() * sea.length)], (rnd() - .5) * .15);
    x.fillStyle = "#1E1812"; x.beginPath(); x.moveTo(0, H * .8); x.lineTo(W * .62, H * .74); x.lineTo(W, H * .78); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    for (let i = 0; i < 160; i++) stroke(rnd() * W, H * .78 + rnd() * H * .22, 16 + rnd() * 40, 4 + rnd() * 9, ["rgba(90,62,40,.55)", "rgba(40,30,22,.6)", "rgba(140,96,60,.35)"][Math.floor(rnd() * 3)], (rnd() - .5) * .3);
    // 码头栏杆
    x.strokeStyle = "rgba(20,14,10,.85)"; x.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const px = W * .05 + i * W * .07; x.beginPath(); x.moveTo(px, H * .79 - i * 1.2); x.lineTo(px, H * .72 - i * 1.2); x.stroke(); }
    x.beginPath(); x.moveTo(W * .05, H * .72); x.lineTo(W * .61, H * .71); x.stroke();
    // 两个抽象人影（绿与橙）
    const fig = (fx, col) => { for (let i = 0; i < 14; i++) stroke(fx + (rnd() - .5) * 8, H * .74 - rnd() * H * .12, 10 + rnd() * 14, 4 + rnd() * 4, col, Math.PI / 2 + (rnd() - .5) * .4);
      x.fillStyle = "rgba(40,30,24,.9)"; x.beginPath(); x.arc(fx, H * .6, 6, 0, 7); x.fill(); };
    fig(W * .7, "rgba(141,182,85,.85)"); fig(W * .8, "rgba(224,112,58,.85)");
    // 摩天轮：读过“美术”后出现
    const drawWheel = (a) => {
      const cx = W * .3, cy = hz - H * .12, R = Math.min(W, H) * .2;
      x.save(); x.globalAlpha = a; x.strokeStyle = "rgba(245,228,196,.8)"; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
      x.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); x.stroke();
        x.fillStyle = "rgba(224,112,58,.9)"; x.fillRect(cx + Math.cos(t) * R - 3, cy + Math.sin(t) * R - 3, 6, 6); }
      x.lineWidth = 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx - R * .5, H * .74); x.moveTo(cx, cy); x.lineTo(cx + R * .5, H * .74); x.stroke();
      x.restore();
    };
    if (S.de.A) {
      if (animateWheel && !RM) {
        const snap = x.getImageData(0, 0, cv.width, cv.height); let a = 0;
        const step = () => { a = Math.min(1, a + .03); x.setTransform(1, 0, 0, 1, 0, 0); x.putImageData(snap, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0); drawWheel(a); if (a < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      } else drawWheel(1);
    }
  }

  /* ================= 黑帝斯 ================= */
  const ICON = {
    sword: '<path d="M6 18 18 6M15 6h3v3M8 13l3 3M5 19l2-2"/>',
    laurel: '<path d="M12 20V8M12 8c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c-3 0-6-1-7-4 3 0 6 1 7 4zM12 12c3 0 6-1 7-4-3 0-6 1-7 4zM12 8c3 0 5-2 5-5-3 0-5 2-5 5z"/>',
    mask: '<path d="M4 6c5-2 11-2 16 0 0 7-3 12-8 12S4 13 4 6z"/><path d="M8 10h2M14 10h2M10 15h4"/>',
    wave: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    chain: '<rect x="3" y="9" width="9" height="6" rx="3"/><rect x="12" y="9" width="9" height="6" rx="3"/>',
    heart: '<path d="M12 20S4 14 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 11-8 11z"/><path d="M12 8l-1 4 2 2-1 3"/>',
    stairs: '<path d="M4 20h4v-4h4v-4h4V8h4V4"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const RAR = [["普通", "r1"], ["稀有", "r2"], ["史诗", "r3"], ["传说", "r4"]];

  function renderHades(el) {
    const g = G.hades;
    const doors = g.reasons.map((r, i) => `<button class="door ${S.door === r.id ? "sel" : ""}" data-door="${r.id}" aria-pressed="${S.door === r.id}">
      <span class="door-arch"><span class="door-glyph">${svg(r.door)}</span></span>
      <span class="door-label"><small>DOOR ${i + 1}</small>${esc(r.title)}</span></button>`).join("");
    el.innerHTML = `<div class="page"><div class="hades">
      <header class="h-head"><p class="kicker">存档 02 · ${esc(g.genre)}</p>
        <h2>${esc(g.name)}<span>${esc(g.en.toUpperCase())}</span></h2>
        <p class="intro">${esc(g.intro)}</p>
        <p class="h-stat">逃脱尝试 <b id="hDeaths">${S.deaths}</b> · 已获得祝福 <b>${done("hades")}/${TOTAL.hades}</b></p></header>
      <div class="meander" aria-hidden="true"></div>
      <div class="doors">${doors}</div>
      <div id="chamber"></div>
      ${shots(g.shots)}
    </div></div>`;
    renderChamber();
  }
  function renderChamber(scroll) {
    const g = G.hades, box = $("#chamber");
    const r = g.reasons.find((x) => x.id === S.door);
    if (!r) { box.innerHTML = `<p class="chamber-empty">两扇门后各有一种祝福。选一扇门进去。</p>`; return; }
    const ri = g.reasons.indexOf(r);
    const boons = r.parts.map((p, i) => {
      const key = r.id + i, rar = RAR[Math.min(3, i + ri)];
      const first = p.p[0].split(/[，。——]/)[0];
      return `<button class="boon ${rar[1]} ${S.boon === key ? "sel" : ""}" data-boon="${key}">
        <span class="ico">${svg(p.icon)}</span><span class="rar">${rar[0]}</span>
        <span class="bt">${esc(p.h)}</span><span class="bp">${esc(first)}……</span>
        ${S.hades[key] ? `<span class="seen">✓ 已获得</span>` : ""}</button>`;
    }).join("");
    const bi = S.boon && S.boon[0] === r.id ? +S.boon.slice(1) : -1;
    const bp = bi >= 0 ? r.parts[bi] : null;
    const npcIdx = S.deaths ? (S.deaths - 1) % g.npc.length : -1;
    box.innerHTML = `<section class="chamber" id="chamberSec">
      <div class="ch-title"><p class="kicker" style="color:var(--h-gold)">喜爱原因 ${r.id}</p><h3>${esc(r.title)}</h3>
        <p class="summary">${esc(r.summary)}</p>
        ${r.quotes ? `<div class="god">${r.quotes.map((q) => `<p>${esc(q)}</p>`).join("")}<small>—— 开发者的设计理念</small></div>` : ""}</div>
      <p class="kicker" style="text-align:center">选择一份祝福</p>
      <div class="boons">${boons}</div>
      ${bp ? `<div class="boon-detail" id="boonDetail"><h4>${esc(bp.h)}</h4>${paras(bp.p)}${exs(bp.ex)}
        ${bp.death ? `<button class="die-btn" data-die="1">亲自体验：现在死一次 →</button>` : ""}
        ${bp.death && npcIdx >= 0 ? `<div class="npc">「${esc(g.npc[npcIdx].replace("{n}", S.deaths))}」<small>失败没有扣掉任何东西，反而多了一句新对话。逃脱尝试：${S.deaths}</small></div>` : ""}
      </div>` : ""}
      <p class="h-insight"><b>设计启示　</b>${esc(r.insight)}</p>
      ${allHadesDone() ? `<button class="nextbtn" data-go="sv" style="color:var(--h-gold)">去下一个存档：星露谷物语 →</button>` : ""}
    </section>`;
    if (scroll) { const t = $(scroll === "detail" ? "#boonDetail" : "#chamberSec"); if (t) t.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }); }
  }
  const allHadesDone = () => done("hades") >= TOTAL.hades;
  function hadesDie() {
    const ov = document.createElement("div"); ov.className = "death"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    const d = G.hades.death || { title: "无处可逃", sub: "" };
    ov.innerHTML = `<div><h3>${esc(d.title)}</h3><p>${esc(d.sub)}</p><button id="again">再来一次</button></div>`;
    document.body.appendChild(ov); $("#again").focus();
    $("#again").onclick = () => { S.deaths++; save(); ov.remove(); $("#hDeaths").textContent = S.deaths; renderChamber("detail"); };
  }

  /* ================= 星露谷 ================= */
  const SEASONS = {
    spring: { n: "春", grass: "#6DBF4B", grass2: "#5AA83E", leaf: "#3E8E3A", leaf2: "#58B04A", dot: "#F4A6C8", path: "#D2AE72", water: "#3B8FD0", water2: "#62AEE6", crop: "#8BD94E" },
    summer: { n: "夏", grass: "#4FAE3E", grass2: "#43983A", leaf: "#2F7A2E", leaf2: "#3F9A37", dot: "#F7E26B", path: "#D2AE72", water: "#2F86C8", water2: "#5BA8E0", crop: "#E0503C" },
    fall:   { n: "秋", grass: "#A9A447", grass2: "#958F3C", leaf: "#D2702C", leaf2: "#E59A3A", dot: "#C8532E", path: "#C9A064", water: "#3A7FB4", water2: "#5A9BCB", crop: "#E8A23A" },
    winter: { n: "冬", grass: "#E8EEF2", grass2: "#D2DCE4", leaf: "#6E8A7A", leaf2: "#E8EEF2", dot: "#FFFFFF", path: "#BFC6CC", water: "#9CC7E6", water2: "#C4E0F2", crop: null }
  };
  function renderSV(el) {
    const g = G.sv;
    el.innerHTML = `<div class="page"><div class="sv">
      <header class="sv-head"><p class="kicker">存档 03 · ${esc(g.genre)}</p>
        <h2>${esc(g.name)}<span>${esc(g.en.toUpperCase())}</span></h2><p class="intro">${esc(g.intro)}</p></header>
      <div class="sv-tools">
        <div class="seasons" role="group" aria-label="切换季节">${Object.entries(SEASONS).map(([k, s]) =>
          `<button class="season" data-season="${k}" aria-pressed="${S.season === k}">${s.n}</button>`).join("")}</div>
        <span class="sv-count" id="svCount"></span></div>
      <div class="sv-mapwrap" id="svMap"><canvas id="svCanvas" width="160" height="96" role="img" aria-label="像素风小镇地图，有五处待修复的地方"></canvas></div>
      <div class="sv-list" id="svList"></div>
      <div id="svDone"></div>
      ${shots(g.shots)}
    </div></div>`;
    svUI(); paintSV();
  }
  function svUI() {
    const g = G.sv, map = $("#svMap");
    map.querySelectorAll(".spot").forEach((b) => b.remove());
    g.spots.forEach((s) => {
      const b = document.createElement("button"); const f = !!S.sv[s.key];
      b.className = "spot" + (f ? " fixed" : ""); b.dataset.spot = s.key;
      b.style.left = s.x + "%"; b.style.top = s.y + "%";
      b.setAttribute("aria-label", (f ? "已修复：" : "修复：") + s.place);
      b.innerHTML = (f ? "✓" : "!") + `<span class="tip">${esc(f ? s.h : s.place)}</span>`;
      map.appendChild(b);
    });
    $("#svList").innerHTML = g.spots.map((s) => { const f = !!S.sv[s.key];
      return `<button class="sv-item ${f ? "fixed" : ""}" data-spot="${s.key}"><span class="st">${f ? "已修" : "待修"}</span>
        <span>${esc(s.place)}<small>${s.reason} · ${esc(s.h)}</small></span></button>`; }).join("");
    $("#svCount").textContent = `已修复 ${done("sv")} / ${TOTAL.sv}`;
    $("#svDone").innerHTML = done("sv") >= TOTAL.sv ? `<p class="sv-done">${esc(g.doneText)}</p>
      <p style="margin-top:12px"><button class="nextbtn" data-go="ideas" style="color:#FFF3C9">最后一站：设计观 →</button></p>` : "";
  }
  function paintSV() {
    const cv = $("#svCanvas"); if (!cv) return;
    const x = cv.getContext("2d"), P = SEASONS[S.season], F = S.sv;
    const r = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    r(0, 0, 160, 96, P.grass);
    for (let i = 0; i < 220; i++) r(Math.floor(rnd() * 160), Math.floor(rnd() * 96), 1, 1, P.grass2);
    for (let i = 0; i < 40; i++) r(Math.floor(rnd() * 160), Math.floor(rnd() * 96), 1, 1, P.dot);
    // 山崖 + 矿洞
    r(124, 0, 36, 32, "#7D6E62"); r(128, 30, 32, 3, "#65584D");
    for (let i = 0; i < 30; i++) r(124 + Math.floor(rnd() * 36), Math.floor(rnd() * 30), 2, 1, "#948475");
    if (S.season === "winter") r(124, 0, 36, 3, "#FFFFFF");
    r(139, 15, 12, 14, "#1A1512"); r(138, 14, 14, 2, "#5B3719"); r(138, 14, 2, 15, "#5B3719"); r(150, 14, 2, 15, "#5B3719");
    if (!F.mine) { for (let i = 0; i < 12; i++) { r(140 + i, 16 + i, 2, 2, "#A0703A"); r(150 - i, 16 + i, 2, 2, "#A0703A"); } }
    else { r(144, 22, 2, 3, "#F4D35E"); r(143, 21, 4, 1, "#FFE9A0"); r(142, 27, 6, 2, "#5A5A5A"); }
    // 河 + 桥
    r(56, 0, 12, 96, P.water); for (let y = 0; y < 96; y += 6) r(58 + (y % 12 ? 4 : 0), y, 3, 1, P.water2);
    // 小路
    r(0, 53, 160, 4, P.path); r(88, 22, 4, 31, P.path); r(134, 57, 4, 12, P.path);
    r(56, 53, 12, 4, P.water);
    const plank = "#9A6A36", plank2 = "#7A4E24";
    r(54, 51, 16, 1, plank2); r(54, 58, 16, 1, plank2);
    for (let i = 0; i < 16; i += 2) { const gap = !F.bridge && i >= 4 && i < 12; if (!gap) r(54 + i, 52, 2, 6, i % 4 ? plank : plank2); }
    // 社区中心
    const wall = F.center ? "#D9B98A" : "#8C8680", roof = F.center ? "#B5473A" : "#5E5752";
    r(76, 6, 28, 14, wall); r(74, 3, 32, 4, roof); r(78, 1, 24, 2, roof);
    if (!F.center) { r(86, 1, 5, 3, P.grass2); r(96, 9, 3, 3, "#3A3A3A"); }
    for (let i = 0; i < 3; i++) { const wx = 79 + i * 8; r(wx, 10, 5, 4, F.center ? "#F4D35E" : "#4A4540");
      if (!F.center) { r(wx - 1, 11, 7, 1, "#A0703A"); } }
    r(88, 15, 4, 5, F.center ? "#7A4E24" : "#4A4540");
    // 布告栏
    r(100, 41, 1, 9, "#5B3719"); r(111, 41, 1, 9, "#5B3719"); r(99, 40, 14, 7, "#8A5A2B"); r(100, 41, 12, 5, "#C9A064");
    if (F.board) { r(101, 42, 3, 2, "#FFFFFF"); r(105, 42, 2, 3, "#F4D35E"); r(108, 43, 3, 2, "#E2583E"); r(102, 44, 2, 1, "#6D8FB8"); }
    // 巴士
    const bus = F.bus ? "#3E7BC8" : "#8B8B8B";
    r(124, 70, 24, 10, bus); r(124, 74, 24, 1, F.bus ? "#F4D35E" : "#707070");
    for (let i = 0; i < 4; i++) r(126 + i * 5, 71, 4, 3, F.bus ? "#BFE3FF" : "#5F5F5F");
    r(127, 80, 4, 3, "#1A1A1A"); r(141, 80, 4, 3, "#1A1A1A");
    if (!F.bus) { r(130, 78, 2, 2, "#5B4030"); r(146, 71, 2, 2, "#5B4030"); } else { r(148, 76, 2, 2, "#F4D35E"); }
    r(120, 66, 2, 14, "#5B3719"); r(118, 64, 6, 3, "#E2583E");
    // 农田
    for (let row = 0; row < 5; row++) { r(6, 64 + row * 6, 40, 4, S.season === "winter" ? "#D6D0CA" : "#7A5230");
      if (P.crop) for (let c = 0; c < 10; c++) { r(8 + c * 4, 64 + row * 6, 2, 2, P.crop); r(8 + c * 4, 66 + row * 6, 2, 1, "#3E8E3A"); } }
    // 树
    const trees = [[10, 8], [22, 14], [36, 6], [44, 22], [8, 34], [30, 38], [112, 18], [116, 30], [74, 30], [100, 62], [110, 84], [84, 70], [150, 50], [72, 82], [30, 88]];
    trees.forEach(([tx, ty]) => { r(tx + 2, ty + 6, 2, 3, "#5B3719"); r(tx, ty, 6, 6, P.leaf); r(tx + 1, ty - 1, 4, 1, P.leaf); r(tx + 1, ty + 1, 2, 2, P.leaf2); });
    // 小屋（玩家的家）
    r(12, 44, 14, 7, "#C98A5B"); r(10, 41, 18, 3, "#6D3B2A"); r(17, 47, 3, 4, "#5B3719"); r(14, 46, 2, 2, "#F4D35E");
  }
  async function svOpen(key) {
    const g = G.sv, s = g.spots.find((x) => x.key === key), rsn = g.reasons.find((x) => x.id === s.reason);
    if (!S.sv[key]) {
      const map = $("#svMap"); const h = document.createElement("div"); h.className = "hammer";
      h.style.left = s.x + "%"; h.style.top = s.y + "%";
      h.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="17" y="12" width="5" height="26" fill="#8A5A2B"/><rect x="8" y="4" width="24" height="10" fill="#9AA3AB"/><rect x="8" y="4" width="24" height="3" fill="#C8D0D6"/></svg>`;
      map.appendChild(h); h.offsetWidth; h.classList.add("go");
      await wait(860); h.remove();
      S.sv[key] = { t: 1 }; save(); paintSV(); svUI(); renderBar("sv");
    }
    const ov = document.createElement("div"); ov.className = "sv-modal"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    const body = () => `<section class="part">${paras(s.p)}${exs(s.ex)}</section>
      ${s.showInsight ? `<div class="insight"><b>设计启示　</b>${esc(rsn.insight)}</div>` : ""}`;
    ov.innerHTML = `<div class="sv-box">
      <p class="k">${esc(s.place)} → 已修复</p>
      <h3>${esc(s.h)}</h3>
      <p class="k" style="font-family:var(--sans);font-size:13px">喜爱原因 ${rsn.id} · ${esc(rsn.title)}</p>
      <blockquote class="summary">${esc(rsn.summary)}</blockquote>
      <div id="svBody">${s.choice && !S.sv[key].path ? `<p>这里有两种修法，选哪一种都能看到全部内容：</p>
        <div class="sv-choice"><button class="woodbtn" data-path="junimo">完成献祭（祝尼魔）</button><button class="woodbtn alt" data-path="joja">直接付钱（Joja）</button></div>`
        : (s.choice ? `<p class="flavor">${esc(g.choiceText[S.sv[key].path])}</p>` : "") + body()}</div>
      <button class="woodbtn sv-close">好的</button></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest(".sv-close")) return close();
      const p = e.target.closest("[data-path]");
      if (p) { S.sv[key].path = p.dataset.path; save(); $("#svBody", ov).innerHTML = `<p class="flavor">${esc(g.choiceText[p.dataset.path])}</p>` + body(); }
    });
    (ov.querySelector("[data-path]") || ov.querySelector(".sv-close")).focus();
  }

  /* ================= 设计观 ================= */
  const GC = { de: "#E0703A", hades: "#D8A64A", sv: "#79C04E" };
  let pSel = 0;
  function renderIdeas(el) {
    const I = C.ideas;
    el.innerHTML = `<div class="page"><div class="ideas">
      <header class="ideas-head"><p class="kicker">最后一站 · 设计观</p><h2>${esc(I.title)}</h2><p>${esc(I.lede)}</p></header>
      <div class="ptabs" role="group" aria-label="选择原则">${I.principles.map((p, i) =>
        `<button class="ptab" data-p="${i}" aria-pressed="${i === pSel}">${esc(p.name)}</button>`).join("")}</div>
      <div class="graph-wrap">${graph()}</div>
      <div class="evidence" id="evidence"></div>
      ${contact()}
    </div></div>`;
    showP(pSel);
  }
  function graph() {
    const I = C.ideas, games = ["de", "hades", "sv"], ys = [70, 180, 290];
    const gx = 40, gw = 170, px = 390, pw = 190;
    let edges = "", nodes = "";
    games.forEach((k, gi) => I.principles.forEach((p, pi) => {
      const y1 = ys[gi], y2 = ys[pi];
      edges += `<path class="edge" data-pi="${pi}" style="--c:${GC[k]}" d="M${gx + gw} ${y1} C ${(gx + gw + px) / 2} ${y1}, ${(gx + gw + px) / 2} ${y2}, ${px} ${y2}"/>`;
    }));
    games.forEach((k, i) => { nodes += `<g class="gnode" style="--c:${GC[k]}"><rect x="${gx}" y="${ys[i] - 24}" width="${gw}" height="48" rx="4"/><text x="${gx + gw / 2}" y="${ys[i] + 6}" text-anchor="middle">${esc(G[k].name)}</text></g>`; });
    I.principles.forEach((p, i) => { nodes += `<g class="pnode" data-p="${i}" tabindex="0" role="button" aria-label="${esc(p.name)}"><rect x="${px}" y="${ys[i] - 24}" width="${pw}" height="48" rx="24"/><text x="${px + pw / 2}" y="${ys[i] + 6}" text-anchor="middle">${esc(p.name)}</text></g>`; });
    return `<svg class="graph" viewBox="0 0 620 360" role="img" aria-label="三款游戏与三条设计原则的连线图">${edges}${nodes}
      <text class="hint" x="${px + pw / 2}" y="350" text-anchor="middle">点击右侧原则</text></svg>`;
  }
  function showP(i) {
    pSel = i; const p = C.ideas.principles[i];
    document.querySelectorAll(".edge").forEach((e) => e.classList.toggle("on", +e.dataset.pi === i));
    document.querySelectorAll(".pnode").forEach((n) => n.classList.toggle("on", +n.dataset.p === i));
    document.querySelectorAll(".ptab").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.p === i));
    $("#evidence").innerHTML = ["de", "hades", "sv"].map((k) => `<div class="ev" style="--c:${GC[k]}"><b>${esc(G[k].name)}</b><p>${esc(p.ev[k])}</p></div>`).join("");
  }

  /* ================= 快速阅读 ================= */
  function renderRead(el) {
    const block = (k) => {
      const g = G[k];
      let rs;
      if (k === "sv") rs = g.reasons.map((r) => ({ ...r, parts: g.spots.filter((s) => s.reason === r.id) }));
      else rs = g.reasons;
      return `<section class="rg" style="--c:${GC[k]}"><h3>${esc(g.name)}<small>${esc(g.en.toUpperCase())}</small></h3>
        <p class="intro">${esc(g.intro)}</p>
        ${rs.map((r) => `<div class="rr"><h4>${r.id}. ${esc(r.title)}</h4>
          ${r.quotes ? r.quotes.map((q) => `<p class="ex">${esc(q)}</p>`).join("") : ""}
          <blockquote class="summary">${esc(r.summary)}</blockquote>
          <p class="insight">设计启示：${esc(r.insight)}</p>
          ${r.parts.map((p) => `<section class="part"><h4>${esc(p.h)}</h4>${paras(p.p)}${exs(p.ex)}</section>`).join("")}</div>`).join("")}
      </section>`;
    };
    el.innerHTML = `<div class="page"><div class="read">
      <header class="read-head"><p class="kicker" style="color:var(--hub-gold)">快速阅读</p><h2>全部文字，一页读完</h2>
        <p>不需要任何操作，内容和游戏版完全一样。想体验交互，随时回到大厅。</p></header>
      ${["de", "hades", "sv"].map(block).join("")}
      <section class="rg" style="--c:var(--hub-gold)"><h3>设计观</h3>
        ${C.ideas.principles.map((p) => `<div class="rr"><h4>${esc(p.name)}</h4>${["de", "hades", "sv"].map((k) => `<p class="ex">${esc(G[k].name)}：${esc(p.ev[k])}</p>`).join("")}</div>`).join("")}</section>
      ${contact()}
    </div></div>`;
  }

  /* ---------- 重新开始 ---------- */
  function askReset() {
    const ov = document.createElement("div"); ov.className = "ask";
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = `<div class="ask-box"><h3>重新开始？</h3>
      <p>会清空所有阅读进度：已读的卡片、判定结果、修复过的地方、逃脱次数。</p>
      <div class="ask-btns"><button class="ask-no">取消</button><button class="ask-yes">清空，重新开始</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest(".ask-no")) return close();
      if (e.target.closest(".ask-yes")) {
        try { localStorage.removeItem(KEY); } catch (err) {}
        S = fresh(); close(); go("hub"); route();
      }
    });
    ov.querySelector(".ask-yes").focus();
  }

  /* ================= 路由 ================= */
  const R = { hub: renderHub, de: renderDE, hades: renderHades, sv: renderSV, ideas: renderIdeas, read: renderRead };
  function route() {
    let k = (location.hash || "").slice(1); if (!R[k]) k = "hub";
    document.body.dataset.scr = k;
    const el = $("#screen"); el.className = "screen"; void el.offsetWidth;
    R[k](el); renderBar(k); window.scrollTo(0, 0);
    document.title = k === "hub" ? C.me.title : `${C.me.title} · ${k === "ideas" ? "设计观" : k === "read" ? "快速阅读" : G[k].name}`;
  }
  const go = (k) => { if (location.hash.slice(1) === k || (k === "hub" && !location.hash)) route(); else location.hash = k === "hub" ? "" : k; };
  window.addEventListener("hashchange", route);

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-reset],[data-de],[data-door],[data-boon],[data-die],[data-season],[data-spot],[data-p]");
    if (!t || t.closest(".sv-modal")) return;
    if (t.dataset.reset) return askReset();
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.de) return deChoose(t.dataset.de);
    if (t.dataset.door) { S.door = t.dataset.door; S.boon = null; save();
      document.querySelectorAll(".door").forEach((d) => { const on = d.dataset.door === S.door; d.classList.toggle("sel", on); d.setAttribute("aria-pressed", on); });
      return renderChamber("chamber"); }
    if (t.dataset.boon) { S.boon = t.dataset.boon; S.hades[S.boon] = 1; save(); renderBar("hades");
      const st = document.querySelector(".h-stat b:last-child"); if (st) st.textContent = `${done("hades")}/${TOTAL.hades}`;
      return renderChamber("detail"); }
    if (t.dataset.die) return hadesDie();
    if (t.dataset.season) { S.season = t.dataset.season; save();
      document.querySelectorAll(".season").forEach((b) => b.setAttribute("aria-pressed", b.dataset.season === S.season)); return paintSV(); }
    if (t.dataset.spot) return svOpen(t.dataset.spot);
    if (t.dataset.p !== undefined) return showP(+t.dataset.p);
  });
  document.addEventListener("keydown", (e) => {
    const n = e.target.closest && e.target.closest(".pnode");
    if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showP(+n.dataset.p); }
  });
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (document.body.dataset.scr === "de") paintDE(); }, 150); });
  $("#barName").addEventListener("click", () => go("hub"));

  route();
})();
