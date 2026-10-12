/* Atelier PC: nota „AI local” (rulezi singur modele de limbaj și generare de imagini pe PC).
   Se calculează aici, în pagină, din datele botului (date.js), așa că trebuie încărcat imediat după date.js.
   Ce contează pentru AI local, în ordine:
   1. memoria plăcii video (VRAM): decide cât de mare e modelul pe care îl poți rula repede;
   2. NVIDIA (CUDA): aproape toate programele de AI merg direct; AMD merge cu mai puține, Intel cu și mai puține;
   3. memoria RAM: modelele care nu încap pe placa video pot rula parțial din RAM (mai lent);
   4. SSD-ul: modelele au 5–60 GB fiecare, deci contează spațiul.
   Procesorul, placa de bază, sursa, coolerul și carcasa folosesc nota de la „Editare video și 3D”. */
(function () {
  "use strict";
  const D = window.ATELIER = window.ATELIER || {};
  const NOTE = ["S", "A", "B", "C", "D", "E", "F"];
  const shift = (n, k) => NOTE[Math.max(0, Math.min(6, NOTE.indexOf(n) + k))];
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // memoria video pentru modelele cunoscute, când nu scrie în titlu
  const VRAM = [
    [/5090/, 32], [/4090|3090|7900 ?xtx/, 24], [/7900 ?xt\b/, 20], [/2080 ?ti|1080 ?ti/, 11],
    [/5080|5070 ?ti|4080|4070 ?ti super|9070|7800 ?xt|6800|6900|a770/, 16], [/5070|4070|3080 ?ti|3060\b(?! ?ti)|6700|7700|b580/, 12],
    [/3080/, 10], [/5060|4060|3070|3060 ?ti|2070|2080|7600|6600|1070|1080|580|9060|a750/, 8], [/2060|1660|1060/, 6], [/3050/, 8],
  ];
  function gpuInfo(name) {
    const t = fold(name);
    if (/integrat|fara placa|igpu/.test(t)) return {vram: 0, firma: "integrata"};
    const m = t.match(/(\d{1,2})\s?gb/);
    let vram = m ? +m[1] : null;
    if (!vram) for (const [re, gb] of VRAM) if (re.test(t)) { vram = gb; break; }
    const firma = /rtx|gtx|geforce|nvidia|quadro/.test(t) ? "nvidia" : /radeon|\brx ?\d/.test(t) ? "amd" : /\barc\b|intel/.test(t) ? "intel" : null;
    return {vram, firma};
  }
  // cât de mare model de limbaj încape pe placa video, comprimat pe 4 biți (Q4), cu loc pentru context
  function llmPeGpu(vram) {
    if (!vram) return null;
    if (vram >= 32) return "modele de ~32 de miliarde de parametri lejer, ~50 mld. la limită";
    if (vram >= 24) return "modele de ~32 de miliarde de parametri";
    if (vram >= 16) return "modele de ~14 miliarde de parametri (până la ~22 mld. la limită)";
    if (vram >= 12) return "modele de ~12 miliarde de parametri";
    if (vram >= 10) return "modele de ~8–10 miliarde de parametri";
    if (vram >= 8) return "modele de ~7–8 miliarde de parametri";
    return "doar modele mici, de 3–4 miliarde de parametri";
  }
  function imagini(vram) {
    if (!vram) return "generarea de imagini merge doar foarte lent, pe procesor";
    if (vram >= 16) return "imagini cu Flux și SDXL fără probleme, chiar și video AI scurt";
    if (vram >= 12) return "imagini cu SDXL și Flux (versiunea comprimată)";
    if (vram >= 8) return "imagini cu SD 1.5 și SDXL, mai încet";
    return "imagini doar cu modele mici și încet";
  }
  function notaGpu(name) {
    const {vram, firma} = gpuInfo(name);
    if (firma === "integrata") return {n: "F", why: ["fără placă video, AI-ul rulează doar pe procesor, foarte încet"]};
    if (vram == null) return null;
    let n = vram >= 32 ? "S" : vram >= 24 ? "A" : vram >= 16 ? "B" : vram >= 12 ? "C" : vram >= 10 ? "D" : vram >= 8 ? "E" : "F";
    const why = [`${vram} GB memorie video: chat AI cu ${llmPeGpu(vram)}`];
    if (firma === "nvidia") why.push("NVIDIA (CUDA): merge cu aproape toate programele de AI");
    else if (firma === "amd") { n = shift(n, 1); why.push("AMD: merge cu Ollama și LM Studio, dar multe unelte de AI cer NVIDIA"); }
    else if (firma === "intel") { n = shift(n, 2); why.push("Intel Arc: puține programe de AI îl folosesc bine"); }
    why.push(imagini(vram));
    return {n, why};
  }
  const spec = (p, nume) => { const s = (p.specs || []).find(x => fold(x.p) === fold(nume)); return s ? String(s.v) : ""; };
  function ramGb(p) {
    const t = fold(spec(p, "Capacitate") + " " + (p.titlu || p.nume));
    const k = t.match(/(\d)\s?x\s?(\d{1,3})\s?gb/); if (k) return k[1] * k[2];
    const m = t.match(/\b(8|16|24|32|48|64|96|128|192|256)\s?gb/); return m ? +m[1] : null;
  }
  function notaRam(p) {
    const gb = ramGb(p); if (!gb) return null;
    const d4 = /ddr4/.test(fold(p.titlu || p.nume));
    let n = gb >= 128 ? "S" : gb >= 64 ? "A" : gb >= 48 ? "B" : gb >= 32 ? "C" : gb >= 16 ? "E" : "F";
    if (d4) n = shift(n, 1);
    return {n, why: [gb >= 64 ? `${gb} GB: poți rula și modele care nu încap pe placa video (parțial din RAM, mai lent)`
      : gb >= 32 ? `${gb} GB: ajunge dacă modelul stă pe placa video; pentru modele mari, ia 64 GB` : `${gb} GB: prea puțin pentru AI local`]};
  }
  const tbTxt = tb => tb >= 1 ? String(tb).replace(".", ",") + " TB" : Math.round(tb * 1000) + " GB";
  function ssdTb(p) {
    const t = fold(spec(p, "Capacitate") + " " + (p.titlu || p.nume));
    const m = t.match(/(\d+(?:[.,]\d+)?)\s?tb/); if (m) return parseFloat(m[1].replace(",", "."));
    const g = t.match(/(\d{3,4})\s?gb/); return g ? +g[1] / 1000 : null;
  }
  function notaSsd(p) {
    const tb = ssdTb(p); if (!tb) return null;
    const hdd = /hdd|7200|5400|rpm/.test(fold(p.titlu || p.nume));
    let n = tb >= 4 ? "S" : tb >= 2 ? "A" : tb >= 1 ? "C" : "E";
    if (hdd) n = "F";
    return {n, why: [hdd ? "HDD: modelele se încarcă foarte greu" : `${tbTxt(tb)}: un model are 5–60 GB, ${tb >= 2 ? "ai loc pentru o colecție" : "se umple repede"}`]};
  }
  function notaAI(p, categorie, nume) {
    const c = categorie || p.piesa;
    const r = c === "Placă video" ? notaGpu(nume || p.titlu || p.nume) : c === "RAM" ? notaRam(p) : c === "SSD" ? notaSsd(p) : null;
    if (r) return r;
    const cr = p.note && p.note.creatie;
    if (!cr) return null;
    const pre = c === "Procesor" ? "contează puțin când modelul rulează pe placa video; " : "";
    return {n: cr.n, why: (cr.why || []).map((w, i) => i === 0 ? pre + w : w)};
  }

  D.profile = Object.assign({gaming: "Gaming", creatie: "Editare video și 3D"}, D.profile || {});
  if (!D.profile.ai) D.profile.ai = "AI local";
  for (const p of D.produse || []) {
    if (!p.piesa || (p.note && p.note.ai)) continue;
    const r = notaAI(p); if (!r) continue;
    p.note = p.note || {}; p.note.ai = r;
  }
  const cat = D.catalog || {};
  for (const g of cat.gpu || []) if (!(g.note && g.note.ai)) { const r = notaAI(g, "Placă video", g.nume); if (r) (g.note = g.note || {}).ai = r; }
  for (const c of cat.cpu || []) if (!(c.note && c.note.ai) && c.note && c.note.creatie) c.note.ai = notaAI(c, "Procesor");

  /* Analiza unui PC întreg pentru AI local. piese: {"Placă video": produs sau nume, "RAM": produs sau GB, "SSD": produs sau TB, "Sursă": produs} */
  function analiza(piese) {
    const g = piese["Placă video"], r = piese["RAM"], s = piese["SSD"];
    const gi = g ? gpuInfo(typeof g === "string" ? g : (g.titlu || g.nume)) : null;
    const ram = r == null ? null : typeof r === "number" ? r : ramGb(r);
    const tb = s == null ? null : typeof s === "number" ? s : ssdTb(s);
    const out = [];
    const vram = gi ? gi.vram : null;
    if (!gi) out.push({s: "?", t: "Alege o placă video", d: "Pentru AI local, placa video și memoria ei (VRAM) decid aproape tot."});
    else if (!vram) out.push({s: "bad", t: "Fără placă video dedicată", d: "Modelele de AI rulează doar pe procesor: merge pentru modele mici, dar e de 10–30 de ori mai lent."});
    else {
      out.push({s: vram >= 16 ? "ok" : vram >= 12 ? "warn" : "bad", t: `Chat AI (Llama, Qwen, Mistral, DeepSeek): ${llmPeGpu(vram)}`,
        d: `Pe placa video, cu ${vram} GB VRAM, comprimate pe 4 biți. Răspunde repede, ca un chat online.`});
      out.push({s: vram >= 12 ? "ok" : vram >= 8 ? "warn" : "bad", t: (x => x.charAt(0).toUpperCase() + x.slice(1))(imagini(vram)), d: "Cu ComfyUI, Fooocus sau Stable Diffusion WebUI."});
      out.push({s: vram >= 16 ? "ok" : vram >= 12 ? "warn" : "bad", t: vram >= 16 ? "Antrenare: poți face LoRA pe modelele tale" : vram >= 12 ? "Antrenare: LoRA mici, la limită" : "Antrenare: prea puțină memorie",
        d: "LoRA = înveți un model pe pozele sau textele tale (un stil, un personaj, documentele tale)."});
      if (gi.firma === "amd") out.push({s: "warn", t: "Placă AMD", d: "Ollama și LM Studio merg bine. Multe unelte de imagini și antrenare sunt făcute pentru NVIDIA (CUDA) și pe AMD cer configurare în plus, de obicei pe Linux."});
      if (gi.firma === "intel") out.push({s: "warn", t: "Placă Intel Arc", d: "Puține programe de AI o folosesc bine. Pentru AI, NVIDIA e varianta fără bătăi de cap."});
    }
    if (ram != null) {
      const total = vram ? Math.round((vram + ram * .75) / .6 / 5) * 5 : null;
      out.push({s: ram >= 64 ? "ok" : ram >= 32 ? "warn" : "bad", t: `Memorie RAM: ${ram} GB`,
        d: ram >= 64 ? `Poți rula și modele mai mari decât încap pe placă (până la ~${total || 70} mld. parametri), împărțite între placă și RAM. Merg, dar de 3–10 ori mai încet.`
          : ram >= 32 ? "Ajunge cât timp modelul stă pe placa video. Pentru modele mari, ia 64 GB." : "Prea puțin: sistemul și programul de AI se sufocă. Minim 32 GB, ideal 64 GB."});
    } else out.push({s: "?", t: "Alege memoria RAM", d: "Pentru AI: minim 32 GB, ideal 64 GB, ca să poți rula și modele mai mari decât încap pe placa video."});
    if (tb != null) out.push({s: tb >= 2 ? "ok" : tb >= 1 ? "warn" : "bad", t: `SSD: ${tbTxt(tb)}`, d: tb >= 2 ? "Loc pentru zeci de modele (fiecare are 5–60 GB)." : "Se umple repede cu modele. Ideal 2 TB, sau un al doilea SSD doar pentru AI."});
    else out.push({s: "?", t: "Alege un SSD", d: "Modelele au 5–60 GB fiecare; ia minim 2 TB NVMe."});
    const bad = out.filter(x => x.s === "bad").length, warn = out.filter(x => x.s === "warn").length, lipsa = out.filter(x => x.s === "?").length;
    const verdict = lipsa && !gi ? null : bad ? "Merge doar pentru AI de bază" : warn ? "Bun pentru AI local, cu câteva limite" : "Foarte bun pentru AI local";
    return {vram, firma: gi && gi.firma, ram, tb, linii: out, verdict, nivel: lipsa && !gi ? "?" : bad ? "bad" : warn ? "warn" : "ok"};
  }

  window.AtelierAI = {notaAI, gpuInfo, llmPeGpu, imagini, analiza, ramGb, ssdTb};
})();
