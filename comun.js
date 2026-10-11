/* Atelier PC: funcții folosite de mai multe pagini.
   AtelierBuild.autoBuild(): alege cel mai bun PC din piese care încape într-un buget,
   fără să combine piese incompatibile (ex. procesor Intel cu placă AMD). */
(function () {
  "use strict";
  const NOTE = ["S", "A", "B", "C", "D", "E", "F"];
  const ORDINE = ["Procesor", "Placă de bază", "RAM", "SSD", "Placă video", "Sursă", "Cooler", "Carcasă"];
  const PONDERI = {
    gaming: {"Placă video": 3, "Procesor": 2, "RAM": 1, "SSD": 1, "Placă de bază": 1, "Sursă": 1, "Cooler": .5, "Carcasă": .5},
    creatie: {"Procesor": 3, "Placă video": 2, "RAM": 2, "SSD": 1, "Placă de bază": 1, "Sursă": 1, "Cooler": .5, "Carcasă": .5},
  };
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function platforma(p) {
    const t = fold((p.titlu || "") + " " + (p.nume || ""));
    if (p.piesa === "Procesor") {
      if (/ryzen/.test(t) && /\b[789]\d{3}/.test(t)) return "AM5";
      if (/ryzen/.test(t) && /\b5\d{3}/.test(t)) return "AM4";
      if (/ultra ?[3579]/.test(t)) return "LGA1851";
      if (/i[3579][- ]?1[234]\d{3}/.test(t)) return "LGA1700";
    }
    if (p.piesa === "Placă de bază") {
      if (/\b(x870e?|b850|b650e?|x670e?|a620)\b/.test(t)) return "AM5";
      if (/\b(z890|b860|h810)\b/.test(t)) return "LGA1851";
      if (/\b(z790|b760|h610|z690|b660|h670)\b/.test(t)) return "LGA1700";
      if (/\b(x570|b550|a520|b450|x470)\b/.test(t)) return "AM4";
    }
    if (p.piesa === "RAM") return /ddr4/.test(t) ? "DDR4" : /ddr5/.test(t) ? "DDR5" : null;
    return null;
  }
  const merge = (plat, p) => {
    const x = platforma(p);
    if (!x || !plat) return true;
    if (p.piesa === "RAM") return plat === "AM4" ? x === "DDR4" : plat === "LGA1700" ? true : x === "DDR5";
    return x === plat;
  };

  /* P: produsele, buget în lei, profil „gaming”/„creatie”, N(p) -> nota pentru profil.
     Întoarce {pick:{piesa: produs}, total, nota, lipsa:[piese fără oferte]} sau {eroare, minim}. */
  function autoBuild(P, buget, profil, N) {
    const W = PONDERI[profil] || PONDERI.gaming;
    const score = p => 7 - (N(p) ? NOTE.indexOf(N(p)) : 6);
    const toate = {};
    for (const c of ORDINE) {
      const xs = P.filter(p => p.piesa === c && p.stoc !== false && p.pret_lei).sort((a, b) => a.pret_lei - b.pret_lei);
      if (xs.length) toate[c] = xs;
    }
    const cats = Object.keys(toate);
    if (!cats.length) return {eroare: "fara-oferte"};
    const plats = [...new Set((toate["Procesor"] || []).map(platforma))];
    let best = null, minim = Infinity;
    for (const plat of plats.length ? plats : [null]) {
      const opts = {};
      for (const c of cats) {
        opts[c] = toate[c].filter(p => c === "Procesor" ? platforma(p) === plat : merge(plat, p));
      }
      if (cats.some(c => !opts[c].length)) continue;
      const pick = Object.fromEntries(cats.map(c => [c, opts[c][0]]));
      let total = cats.reduce((s, c) => s + pick[c].pret_lei, 0);
      minim = Math.min(minim, total);
      if (total > buget) continue;
      // urcăm pe rând piesa care aduce cea mai mare îmbunătățire de notă pe leu, cât încape în buget
      for (let guard = 0; guard < 300; guard++) {
        let up = null;
        for (const c of cats) for (const q of opts[c]) {
          const gain = (score(q) - score(pick[c])) * (W[c] || 1), d = q.pret_lei - pick[c].pret_lei;
          if (gain <= 0 || total + d > buget) continue;
          const v = gain / Math.max(d, 1);
          if (!up || v > up.v) up = {c, q, d, v};
        }
        if (!up) break;
        pick[up.c] = up.q; total += up.d;
      }
      const s = cats.reduce((a, c) => a + score(pick[c]) * (W[c] || 1), 0);
      if (!best || s > best.s) best = {pick, total, s, platforma: plat};
    }
    if (!best) return {eroare: "buget", minim: isFinite(minim) ? minim : null};
    best.nota = notaTotala(best.pick, profil, N);
    best.lipsa = ORDINE.filter(c => !toate[c]);
    return best;
  }

  /* Nota întregului PC: media ponderată, dar o piesă importantă slabă trage nota în jos. */
  function notaTotala(pick, profil, N) {
    const W = PONDERI[profil] || PONDERI.gaming;
    let sum = 0, w = 0, worst = 0;
    for (const [c, p] of Object.entries(pick)) {
      const n = N(p); if (!n) continue;
      const i = NOTE.indexOf(n), k = W[c] || 1;
      sum += i * k; w += k;
      if (k >= 2) worst = Math.max(worst, i);
    }
    if (!w) return null;
    return NOTE[Math.min(6, Math.max(Math.round(sum / w), worst - 1))];
  }

  window.AtelierBuild = {autoBuild, notaTotala, platforma, ORDINE, NOTE, fold};
})();

/* Subsolul comun al tuturor paginilor: linkuri legale și mențiunea despre afiliere. */
(function () {
  "use strict";
  if (document.body.hasAttribute("data-fara-subsol")) return;
  const D = window.ATELIER || {};
  const st = document.createElement("style");
  st.textContent = `.subsol{border-top:1px solid var(--line);margin-top:8px;padding:22px 0 calc(28px + env(safe-area-inset-bottom,0px));color:var(--muted);font-size:13.5px}
  .subsol .in{max-width:1280px;margin:0 auto;padding-inline:16px;display:grid;gap:10px}
  .subsol .row{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center}
  .subsol b{font-family:"Saira Semi Condensed","Arial Narrow",sans-serif;font-size:17px;letter-spacing:.05em;text-transform:uppercase;color:var(--fg)}
  .subsol a{color:var(--muted);text-decoration:none;border-bottom:1px dotted currentColor}
  .subsol a:hover{color:var(--fg)}
  .subsol p{margin:0;max-width:90ch}`;
  document.head.appendChild(st);
  const f = document.createElement("footer");
  f.className = "subsol";
  f.innerHTML = `<div class="in"><div class="row"><b>Atelier PC</b>
      <a href="despre.html#despre">Despre</a><a href="despre.html#note">Cum notăm</a><a href="despre.html#contact">Contact</a>
      <a href="despre.html#confidentialitate">Confidențialitate</a><a href="despre.html#termeni">Termeni</a></div>
    <p>Unele linkuri sunt linkuri de afiliere: dacă cumperi prin ele, putem primi un mic comision, fără niciun cost în plus pentru tine. Prețurile se actualizează automat și pot fi diferite pe site-ul magazinului.</p>
    <p>© ${new Date().getFullYear()} Atelier PC · proiect independent din România${D.generat ? " · prețuri actualizate " + D.generat.slice(8, 10) + "." + D.generat.slice(5, 7) + "." + D.generat.slice(0, 4) + ", ora " + D.generat.slice(11) : ""}</p></div>`;
  document.body.appendChild(f);
})();
