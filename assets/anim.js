/* Mercado Sem Mistério — animações do site.
   Tudo pausa fora da tela e respeita "reduzir movimento" do sistema. */
(() => {
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visivel = (el, cb) => { if (!("IntersectionObserver" in window)) return cb(true); new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting)), { threshold: 0.01 }).observe(el); };

  /* 1. candles decorativos no fundo (sem números: é ilustração) */
  function velasFundo(cv) {
    const ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
    let W, H, L = 18, velas = [], atual, tend = 0, rodando = true, ultimo = 0;
    const medir = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); L = W < 640 ? 12 : 18; };
    const nova = (p) => ({ o: p, c: p, h: p, l: p });
    const mexe = (v) => { tend += (Math.random() - 0.5) * 0.14; tend *= 0.96; v.c += (Math.random() - 0.5 + tend * 0.45) * 1.1; v.h = Math.max(v.h, v.c); v.l = Math.min(v.l, v.c); };
    medir(); let p = 100;
    for (let i = 0; i < Math.ceil(W / L) + 2; i++) { const v = nova(p); for (let k = 0; k < 14; k++) mexe(v); velas.push(v); p = v.c; }
    atual = nova(p);
    function desenha() {
      ctx.clearRect(0, 0, W, H);
      const todas = velas.concat([atual]).slice(-Math.floor(W / L) - 1);
      let mx = -Infinity, mn = Infinity; todas.forEach((v) => { mx = Math.max(mx, v.h); mn = Math.min(mn, v.l); });
      const pad = (mx - mn) * 0.25 || 1, y = (v) => H * 0.92 - ((v - mn + pad) / (mx - mn + 2 * pad)) * H * 0.8;
      todas.forEach((v, i) => {
        const x = W - (todas.length - i) * L + L / 2, alta = v.c >= v.o;
        ctx.strokeStyle = ctx.fillStyle = alta ? "rgba(16,185,129,.55)" : "rgba(239,68,68,.5)";
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y(v.h)); ctx.lineTo(x, y(v.l)); ctx.stroke();
        const a = y(Math.max(v.o, v.c)), b = y(Math.min(v.o, v.c)); ctx.fillRect(x - L * 0.3, a, L * 0.6, Math.max(1.5, b - a));
      });
      /* média móvel suave */
      ctx.beginPath(); ctx.strokeStyle = "rgba(245,179,1,.55)"; ctx.lineWidth = 2;
      todas.forEach((v, i) => { const j = todas.slice(Math.max(0, i - 9), i + 1), m = j.reduce((s, q) => s + q.c, 0) / j.length, x = W - (todas.length - i) * L + L / 2; i ? ctx.lineTo(x, y(m)) : ctx.moveTo(x, y(m)); });
      ctx.stroke();
    }
    function passo(t) {
      if (!rodando) return;
      if (t - ultimo > 90) { mexe(atual); ultimo = t; if (Math.random() < 0.08) { velas.push(atual); velas = velas.slice(-200); atual = nova(atual.c); } desenha(); }
      requestAnimationFrame(passo);
    }
    addEventListener("resize", () => { medir(); desenha(); });
    desenha();
    if (!calmo) visivel(cv, (v) => { if (v && !rodando) { rodando = true; requestAnimationFrame(passo); } else if (!v) rodando = false; });
    if (!calmo) requestAnimationFrame(passo);
  }
  document.querySelectorAll("canvas[data-velas]").forEach(velasFundo);

  /* 2. linha do dia com as sessões em horário de Brasília e o ponteiro do "agora" */
  function linhaSessoes(el) {
    const S = [["Sydney", "Australia/Sydney", 7, 16, "#64748b"], ["Tóquio", "Asia/Tokyo", 9, 18, "#ef4444"], ["Londres", "Europe/London", 8, 17, "#3b82f6"], ["Nova York", "America/New_York", 8, 17, "#10b981"]];
    const off = (tz) => { const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName").value; const m = s.match(/GMT([+-]\d+)(?::(\d+))?/); return m ? +m[1] + (m[2] ? Math.sign(+m[1]) * m[2] / 60 : 0) : 0; };
    const desenha = () => {
      const agora = new Date(), hBR = ((agora.getUTCHours() + agora.getUTCMinutes() / 60 - 3) + 24) % 24;
      const faixas = S.map(([n, tz, a, f, c]) => { const d = -3 - off(tz); let ini = (a + d + 24) % 24, fim = (f + d + 24) % 24; const partes = fim > ini ? [[ini, fim]] : [[ini, 24], [0, fim]]; return { n, c, partes, ini }; });
      el.innerHTML = `<div class="ls-titulo"><b>As sessões hoje</b><span>horário de Brasília · agora ${String(Math.floor(hBR)).padStart(2, "0")}:${String(agora.getUTCMinutes()).padStart(2, "0")}</span></div>` +
        faixas.map((s) => `<div class="ls-lin"><span>${s.n}</span><div class="ls-trilho">${s.partes.map(([a, b]) => `<i style="left:${a / 24 * 100}%;width:${(b - a) / 24 * 100}%;background:${s.c}"></i>`).join("")}</div></div>`).join("") +
        `<div class="ls-horas">${[0, 6, 12, 18, 24].map((h) => `<em style="left:${h / 24 * 100}%">${h}h</em>`).join("")}</div><div class="ls-agora" style="left:calc(var(--ls-esq) + (100% - var(--ls-esq)) * ${hBR / 24})"></div>`;
    };
    desenha(); setInterval(desenha, 60000);
    el.insertAdjacentHTML("afterend", `<p class="ls-legenda">Cada barra mostra quando a bolsa daquela região está aberta. A linha amarela é a hora de agora. Onde duas barras se cruzam, há mais negociação e mais movimento.</p>`);
  }
  document.querySelectorAll("[data-linha-sessoes]").forEach(linhaSessoes);

  /* 3. números que contam ao aparecer: data-contar="97" data-sufixo="%" */
  document.querySelectorAll("[data-contar]").forEach((el) => {
    const alvo = parseFloat(el.dataset.contar), suf = el.dataset.sufixo || "", pre = el.dataset.prefixo || "", casas = +(el.dataset.casas || 0);
    const fmt = (v) => pre + v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + suf;
    if (calmo) { el.textContent = fmt(alvo); return; }
    el.textContent = fmt(0); let feito = false;
    visivel(el, (v) => { if (!v || feito) return; feito = true; const t0 = performance.now(), dur = 1400; const f = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(alvo * e); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  });

  /* 4. o risco decide: mesma sequência de operações, 1% × 10% de risco (simulação) */
  function curvasRisco(box) {
    const svg = box.querySelector("svg"), out = (k) => box.querySelector(`[data-final="${k}"]`);
    let tm, primeira = true;
    const N = 200;
    const sorteia = (seed) => { let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); return Array.from({ length: N }, () => (r() < 0.42 ? 1.5 : -1)); };
    const curva = (ops, risco) => { let e = 10000; const c = [e]; ops.forEach((x) => { e = Math.max(0, e * (1 + risco / 100 * x)); c.push(e); }); return c; };
    const roda = () => {
      clearInterval(tm);
      /* na primeira vez, uma sequência típica (a de 1% termina acima da de 10%); depois, sorteio livre */
      let seed = 1 + Math.floor(Math.random() * 1e6), ops = sorteia(seed);
      if (primeira) { for (let k = 0; k < 80; k++) { const o = sorteia(seed + k); if (curva(o, 1)[N] > 10000 && curva(o, 10)[N] < 6000) { ops = o; break; } } primeira = false; }
      const A = curva(ops, 1), B = curva(ops, 10), mx = Math.max(...A, ...B, 12000);
      const x = (i) => 30 + i * (940 / N), y = (v) => 330 - (v / mx) * 300;
      const path = (c, k) => c.slice(0, k + 1).map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
      let k = 0;
      const des = () => { svg.innerHTML = `<line x1="30" x2="970" y1="${y(10000)}" y2="${y(10000)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="6 6"/><text x="966" y="${y(10000) + 20}" text-anchor="end" fill="#7d93b3" font-size="14" font-family="Inter">capital inicial: US$ 10.000</text><path d="${path(B, k)}" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-linejoin="round"/><path d="${path(A, k)}" fill="none" stroke="#10b981" stroke-width="3.5" stroke-linejoin="round"/>`; out("a").textContent = "US$ " + Math.round(A[k]).toLocaleString("pt-BR"); out("b").textContent = "US$ " + Math.round(B[k]).toLocaleString("pt-BR"); };
      if (calmo) { k = N; des(); return; }
      tm = setInterval(() => { k = Math.min(N, k + 2); des(); if (k >= N) clearInterval(tm); }, 35);
    };
    let feito = false; visivel(box, (v) => { if (v && !feito) { feito = true; roda(); } });
    const b = box.querySelector("[data-replay]"); if (b) b.onclick = roda;
  }
  document.querySelectorAll("[data-curvas-risco]").forEach(curvasRisco);

  /* 5. leve parallax nos elementos com data-flutua */
  if (!calmo) {
    const fl = [...document.querySelectorAll("[data-flutua]")];
    if (fl.length) addEventListener("scroll", () => fl.forEach((el) => { el.style.transform = `translateY(${(scrollY * (+el.dataset.flutua || 0.08)).toFixed(1)}px)`; }), { passive: true });
  }
})();
