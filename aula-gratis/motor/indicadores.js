/* Indicadores técnicos — cálculos reais sobre séries (ilustrativas) e desenho em SVG.
   Uso: Ind.serie(n, seed, {tend}) · Ind.sma/ema/rsi/macd/estoc/bollinger/atr/pivos · Ind.grafico(svg, opts) */
(function () {
  function serie(n, seed, o = {}) {
    let s = seed || 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out = []; let p = o.preco || 1.1650; const vol = o.vol || 0.0012;
    for (let i = 0; i < n; i++) {
      const t = typeof o.tend === "function" ? o.tend(i) : o.tend || 0;
      const v = typeof o.volf === "function" ? o.volf(i) * vol : vol;
      const op = p, c = op + ((r() - 0.5) + t) * v;
      out.push({ o: op, c, h: Math.max(op, c) + r() * v * 0.5, l: Math.min(op, c) - r() * v * 0.5 });
      p = c;
    }
    return out;
  }
  const fech = (v) => v.map((q) => q.c);
  function sma(x, n) { return x.map((_, i) => (i < n - 1 ? null : x.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n)); }
  function ema(x, n) { const k = 2 / (n + 1); let e = null; return x.map((v, i) => { if (v == null) return null; e = e == null ? v : v * k + e * (1 - k); return i < n - 1 ? null : e; }); }
  function rsi(x, n = 14) {
    const out = []; let g = 0, l = 0;
    for (let i = 0; i < x.length; i++) {
      if (i === 0) { out.push(null); continue; }
      const d = x[i] - x[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up / n; l += dn / n; out.push(i < n ? null : 100 - 100 / (1 + g / (l || 1e-9))); }
      else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out.push(100 - 100 / (1 + g / (l || 1e-9))); }
    }
    return out;
  }
  function macd(x, a = 12, b = 26, c = 9) {
    const ea = ema(x, a), eb = ema(x, b), m = x.map((_, i) => (ea[i] == null || eb[i] == null ? null : ea[i] - eb[i]));
    const sinalBase = ema(m.map((v) => (v == null ? null : v)).filter((v) => v != null), c);
    const sinal = []; let k = 0; m.forEach((v) => sinal.push(v == null ? null : sinalBase[k++]));
    return { macd: m, sinal, hist: m.map((v, i) => (v == null || sinal[i] == null ? null : v - sinal[i])) };
  }
  function estoc(v, n = 14, d = 3) {
    const k = v.map((q, i) => { if (i < n - 1) return null; const j = v.slice(i - n + 1, i + 1), hh = Math.max(...j.map((z) => z.h)), ll = Math.min(...j.map((z) => z.l)); return ((q.c - ll) / (hh - ll || 1e-9)) * 100; });
    const dd = k.map((_, i) => (i < n + d - 2 ? null : k.slice(i - d + 1, i + 1).reduce((a, b) => a + b, 0) / d));
    return { k, d: dd };
  }
  function bollinger(x, n = 20, m = 2) {
    const mid = sma(x, n);
    const dp = x.map((_, i) => { if (mid[i] == null) return null; const j = x.slice(i - n + 1, i + 1), mu = mid[i]; return Math.sqrt(j.reduce((a, b) => a + (b - mu) ** 2, 0) / n); });
    return { mid, sup: mid.map((v, i) => (v == null ? null : v + m * dp[i])), inf: mid.map((v, i) => (v == null ? null : v - m * dp[i])), larg: mid.map((v, i) => (v == null ? null : (2 * m * dp[i]) / v)) };
  }
  function atr(v, n = 14) {
    const tr = v.map((q, i) => (i === 0 ? q.h - q.l : Math.max(q.h - q.l, Math.abs(q.h - v[i - 1].c), Math.abs(q.l - v[i - 1].c))));
    let a = null; return tr.map((t, i) => { if (i < n - 1) return null; a = a == null ? tr.slice(0, n).reduce((x, y) => x + y, 0) / n : (a * (n - 1) + t) / n; return a; });
  }
  function pivos(h, l, c) { const p = (h + l + c) / 3; return { P: p, R1: 2 * p - l, S1: 2 * p - h, R2: p + (h - l), S2: p - (h - l) }; }

  /* gráfico: velas + linhas sobre o preço + painéis inferiores
     opts: { velas, de, ate, linhas:[{v,cor,w,tracejado}], faixas:[{sup,inf,cor}], paineis:[{altura, min, max, linhas:[], barras:{v,corPos,corNeg}, niveis:[{y,cor,txt}]}], marcas:[{i, preco, txt, cor, lado}], hlinhas:[{preco,cor,txt}], W, H } */
  function grafico(svg, o) {
    const W = o.W || 1720, H = o.H || 600, v = o.velas, de = o.de || 0, ate = o.ate == null ? v.length : o.ate;
    const vis = v.slice(de, ate), n = (o.total || ate - de), w = W / n;
    const paineis = o.paineis || [], altP = paineis.reduce((a, p) => a + p.altura, 0), Hp = H - altP;
    let mx = -Infinity, mn = Infinity;
    vis.forEach((q) => { mx = Math.max(mx, q.h); mn = Math.min(mn, q.l); });
    (o.linhas || []).concat((o.faixas || []).flatMap((f) => [{ v: f.sup }, { v: f.inf }])).forEach((ln) => ln.v.slice(de, ate).forEach((x) => { if (x != null) { mx = Math.max(mx, x); mn = Math.min(mn, x); } }));
    (o.hlinhas || []).forEach((hl) => { mx = Math.max(mx, hl.preco); mn = Math.min(mn, hl.preco); });
    const pad = (mx - mn) * 0.06; mx += pad; mn -= pad;
    const y = (p) => 14 + (mx - p) / (mx - mn) * (Hp - 28), X = (i) => (i - de) * w + w / 2;
    let g = "";
    for (let k = 1; k < 5; k++) g += `<line x1="0" x2="${W}" y1="${(Hp / 5) * k}" y2="${(Hp / 5) * k}" stroke="rgba(255,255,255,.05)"/>`;
    (o.faixas || []).forEach((f) => { let up = "", dn = ""; for (let i = de; i < ate; i++) if (f.sup[i] != null) { up += `${X(i)},${y(f.sup[i])} `; dn = `${X(i)},${y(f.inf[i])} ` + dn; } if (up) g += `<polygon points="${up}${dn}" fill="${f.cor || "rgba(41,98,255,.10)"}"/>`; });
    (o.hlinhas || []).forEach((hl) => { g += `<line x1="0" x2="${W}" y1="${y(hl.preco)}" y2="${y(hl.preco)}" stroke="${hl.cor}" stroke-width="2.5" stroke-dasharray="10 7"/>`; if (hl.txt) g += `<text x="${W - 12}" y="${y(hl.preco) - 8}" text-anchor="end" fill="${hl.cor}" style="font:800 22px Inter">${hl.txt}</text>`; });
    if (!o.semVelas) vis.forEach((q, j) => { const i = j + de, x = X(i), c = q.c >= q.o ? "#10b981" : "#ef4444", op = o.apagar ? 0.35 : 1; g += `<line x1="${x}" x2="${x}" y1="${y(q.h)}" y2="${y(q.l)}" stroke="${c}" stroke-width="2" opacity="${op}"/><rect x="${x - w * .32}" y="${y(Math.max(q.o, q.c))}" width="${w * .64}" height="${Math.max(2, Math.abs(y(q.o) - y(q.c)))}" fill="${c}" opacity="${op}"/>`; });
    const linha = (arr, Y, cor, wid, tr) => { let d = ""; for (let i = de; i < ate; i++) if (arr[i] != null) d += (d ? "L" : "M") + X(i) + " " + Y(arr[i]); return d ? `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${wid || 3}" ${tr ? 'stroke-dasharray="8 6"' : ""}/>` : ""; };
    (o.linhas || []).forEach((ln) => (g += linha(ln.v, y, ln.cor, ln.w, ln.tracejado)));
    (o.marcas || []).forEach((m) => { const x = X(m.i), yy = y(m.preco); g += `<circle cx="${x}" cy="${yy}" r="${m.r || 16}" fill="none" stroke="${m.cor}" stroke-width="4"/>`; if (m.txt) g += `<text x="${x + (m.dx || 0)}" y="${yy + (m.lado === "baixo" ? 48 : -26)}" text-anchor="middle" fill="${m.cor}" style="font:800 22px Inter">${m.txt}</text>`; });
    let topo = Hp;
    paineis.forEach((p) => {
      const Y = (val) => topo + 10 + (p.max - val) / (p.max - p.min) * (p.altura - 20);
      g += `<rect x="0" y="${topo}" width="${W}" height="${p.altura}" fill="rgba(255,255,255,.025)"/><line x1="0" x2="${W}" y1="${topo}" y2="${topo}" stroke="rgba(255,255,255,.15)"/>`;
      (p.niveis || []).forEach((nv) => { g += `<line x1="0" x2="${W}" y1="${Y(nv.y)}" y2="${Y(nv.y)}" stroke="${nv.cor}" stroke-dasharray="6 6"/>`; if (nv.txt) g += `<text x="8" y="${Y(nv.y) - 6}" fill="${nv.cor}" style="font:700 18px Inter">${nv.txt}</text>`; });
      if (p.barras) for (let i = de; i < ate; i++) { const b = p.barras.v[i]; if (b == null) continue; const y0 = Y(0), y1 = Y(b); g += `<rect x="${X(i) - w * .3}" y="${Math.min(y0, y1)}" width="${w * .6}" height="${Math.abs(y1 - y0)}" fill="${b >= 0 ? p.barras.corPos || "#10b981" : p.barras.corNeg || "#ef4444"}" opacity=".7"/>`; }
      (p.linhas || []).forEach((ln) => (g += linha(ln.v, Y, ln.cor, ln.w, ln.tracejado)));
      (p.marcas || []).forEach((m) => { g += `<circle cx="${X(m.i)}" cy="${Y(m.y)}" r="14" fill="none" stroke="${m.cor}" stroke-width="4"/>`; });
      if (p.nome) g += `<text x="${W - 12}" y="${topo + 28}" text-anchor="end" fill="#9fb0c6" style="font:800 20px Inter">${p.nome}</text>`;
      topo += p.altura;
    });
    if (o.extra) g += o.extra({ X, y, W, H, Hp });
    svg.innerHTML = g;
    return { X, y };
  }
  /* série que passa por pivôs [índice, preço] */
  function porPivos(piv, seed, ruido) {
    let s = seed || 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out = [];
    for (let k = 0; k < piv.length - 1; k++) { const [i0, p0] = piv[k], [i1, p1] = piv[k + 1]; for (let i = i0; i < i1; i++) { const o = p0 + (p1 - p0) * (i - i0) / (i1 - i0) + (r() - 0.5) * ruido, c = p0 + (p1 - p0) * (i + 1 - i0) / (i1 - i0) + (r() - 0.5) * ruido; out.push({ o, c, h: Math.max(o, c) + r() * ruido * 0.6, l: Math.min(o, c) - r() * ruido * 0.6 }); } }
    return out;
  }
  window.Ind = { porPivos, serie, fech, sma, ema, rsi, macd, estoc, bollinger, atr, pivos, grafico };
})();
