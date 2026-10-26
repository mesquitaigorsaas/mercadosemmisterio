/* Motor de telas do curso Forex do Zero
   Teclas: → / Espaço / clique = avançar · ← = voltar · F = tela cheia
           N = liga/desliga o texto da aula embaixo do slide (modo leitura, ligado por padrão) · P = janela do apresentador
           Home = voltar ao início */
const Motor = (() => {
  let telas = [], seq = [], pos = 0, cfg = {}, janelaNotas = null, inicio = Date.now(), iniciou = false;

  /* ---------- palco escalado ---------- */
  /* modo leitura (padrão): o texto da aula fica numa faixa fixa embaixo, e o slide encolhe para caber acima dela */
  let leitura = true;
  try { leitura = localStorage.getItem("tomsm.leitura") !== "0"; } catch (e) {}
  function alturaFaixa() { return leitura ? Math.round(Math.max(130, Math.min(280, innerHeight * 0.24))) : 0; }
  function ajustar() {
    const p = document.getElementById("palco");
    /* celular em pé: o slide fica colado no topo e o texto ocupa todo o resto da tela, sem faixa preta no meio */
    const retrato = leitura && innerHeight > innerWidth * 1.15;
    let cap = alturaFaixa();
    if (retrato) cap = Math.round(innerHeight - innerWidth * 1080 / 1920);
    document.body.classList.toggle("leitura", leitura);
    document.body.classList.toggle("retrato", retrato);
    document.documentElement.style.setProperty("--faixa", cap + "px");
    const s = Math.min(innerWidth / 1920, (innerHeight - cap) / 1080);
    p.style.top = ((innerHeight - cap) / 2) + "px";
    p.style.transform = `translate(-50%, -50%) scale(${s})`;
    p.style.transformOrigin = "center center";
  }
  function alternarLeitura() {
    leitura = !leitura;
    try { localStorage.setItem("tomsm.leitura", leitura ? "1" : "0"); } catch (e) {}
    ajustar();
  }

  /* ---------- navegação ---------- */
  function mostrar(novo, voltando) {
    const telaAntes = seq[pos] ? seq[pos][0] : -1;
    pos = Math.max(0, Math.min(seq.length - 1, novo));
    const entrou = !iniciou || seq[pos][0] !== telaAntes;
    iniciou = true;
    const [ti, pi] = seq[pos];
    telas.forEach((t, i) => {
      const el = document.getElementById(t.id);
      el.classList.toggle("on", i === ti);
      if (i !== ti) return;
      el.querySelectorAll("[data-p]").forEach((d) => d.classList.toggle("vis", +d.dataset.p <= pi));
      // entrou = a tela acabou de aparecer (para disparar contadores mesmo pulando passos)
      if (t.ao) t.ao(pi, el, voltando, entrou);
    });
    document.querySelector("#rodape .barra i").style.width = `${(pos / (seq.length - 1)) * 100}%`;
    const nav = document.getElementById("navaula"); if (nav) nav.classList.toggle("on", pos === seq.length - 1);
    atualizarNotas();
    try { history.replaceState(null, "", `#${pos + 1}`); } catch (e) {}
  }
  let proxima = null;
  const avancar = () => { if (pos === seq.length - 1 && proxima) { location.href = proxima; return; } mostrar(pos + 1, false); };
  const voltar = () => mostrar(pos - 1, true);

  /* ---------- roteiro falado ---------- */
  function textoDe(i) { if (i < 0 || i >= seq.length) return ""; const [ti, pi] = seq[i]; return telas[ti].passos[pi]; }
  function atualizarNotas() {
    const n = document.getElementById("notas");
    n.innerHTML = `<div class="txt">${textoDe(pos)}</div><small>${pos + 1} / ${seq.length} · <span class="so-pc"><kbd>→</kbd> ou clique</span><span class="so-cel">toque</span> no slide para continuar<span class="so-cel"> · gire o celular para ver maior</span></small>`;
    n.scrollTop = 0;
    if (janelaNotas && !janelaNotas.closed) desenharJanela();
  }
  function abrirJanela() {
    janelaNotas = window.open("", "notas-aula", "width=760,height=900");
    if (!janelaNotas) return alert("O navegador bloqueou a janela. Permita pop-ups para este arquivo.");
    const d = janelaNotas.document;
    d.title = "Roteiro falado — " + cfg.aula;
    d.body.innerHTML = "";
    const st = d.createElement("style");
    st.textContent = `body{margin:0;background:#0b1220;color:#e2e8f0;font:500 22px/1.55 Inter,Segoe UI,sans-serif}
      header{position:sticky;top:0;background:#0b1f3a;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #f5b301;font-size:16px}
      header b{color:#f5b301;font-size:28px;font-variant-numeric:tabular-nums}
      .p{padding:14px 22px;border-left:5px solid transparent;opacity:.45;cursor:pointer}
      .p.at{opacity:1;border-color:#f5b301;background:#13233d}
      .p small{display:block;color:#94a3b8;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
      .t{padding:8px 22px 4px;color:#f5b301;font:700 15px Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase}`;
    d.head.appendChild(st);
    d.addEventListener("keydown", tecla);
    desenharJanela();
  }
  function desenharJanela() {
    const d = janelaNotas.document;
    let html = `<header><span>${cfg.aula}<br><span style="color:#94a3b8">← → para navegar nesta janela também</span></span><b id="rel">00:00</b></header>`;
    let ultimaTela = -1;
    seq.forEach(([ti, pi], i) => {
      if (ti !== ultimaTela) { html += `<div class="t">Tela ${ti + 1} · ${telas[ti].nome || ""}</div>`; ultimaTela = ti; }
      html += `<div class="p ${i === pos ? "at" : ""}" data-i="${i}"><small>Passo ${i + 1}</small>${telas[ti].passos[pi]}</div>`;
    });
    d.body.innerHTML = html;
    d.querySelectorAll(".p").forEach((el) => el.onclick = () => mostrar(+el.dataset.i));
    const at = d.querySelector(".p.at");
    if (at) at.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  setInterval(() => {
    if (!janelaNotas || janelaNotas.closed) return;
    const s = Math.floor((Date.now() - inicio) / 1000);
    const r = janelaNotas.document.getElementById("rel");
    if (r) r.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }, 500);

  /* ---------- teclado e mouse ---------- */
  function tecla(e) {
    const k = e.key;
    if (["ArrowRight", " ", "PageDown", "Enter"].includes(k)) { e.preventDefault(); avancar(); }
    else if (["ArrowLeft", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); voltar(); }
    else if (k === "Home") { inicio = Date.now(); mostrar(0, true); }
    else if (k === "End") mostrar(seq.length - 1);
    else if (k === "n" || k === "N") alternarLeitura();
    else if (k === "p" || k === "P") abrirJanela();
    else if (k === "f" || k === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }
  }
  let ocioso;
  function mexeu() {
    document.body.classList.remove("ocioso");
    clearTimeout(ocioso);
    ocioso = setTimeout(() => document.body.classList.add("ocioso"), 2000);
  }

  function iniciar(c) {
    cfg = c; telas = c.telas;
    telas.forEach((t, ti) => t.passos.forEach((_, pi) => seq.push([ti, pi])));
    document.body.insertAdjacentHTML("beforeend", `<div id="notas"></div><div id="dica"><kbd>→</kbd> avançar · <kbd>←</kbd> voltar · <kbd>F</kbd> tela cheia · <kbd>N</kbd> mostra ou esconde o texto · <kbd>P</kbd> janela do apresentador</div>`);
    setTimeout(() => document.getElementById("dica").classList.add("some"), 6000);
    addEventListener("resize", ajustar); ajustar();
    addEventListener("keydown", tecla);
    addEventListener("mousemove", mexeu);
    document.getElementById("palco").addEventListener("click", avancar);
    addEventListener("contextmenu", (e) => { e.preventDefault(); voltar(); });
    prepararNavegacao();
    const h = parseInt(location.hash.slice(1), 10);
    mostrar(h > 0 ? h - 1 : 0, false);
  }

  /* ---------- navegação entre aulas (lista gerada por _motor/gerar-indice.js) ---------- */
  function prepararNavegacao() {
    document.body.insertAdjacentHTML("beforeend", '<nav id="navaula"><a href="../">☰ Voltar ao site</a><a class="prox" href="../curso.html">Conhecer o curso completo ▶</a></nav>');
    const nav = document.getElementById("navaula");
    nav.addEventListener("click", (e) => e.stopPropagation());
    /* saída sempre à mão: a barra acima só aparece no último slide */
    document.body.insertAdjacentHTML("beforeend", '<a id="sair" href="../" title="Sair da aula e voltar ao site">✕ Sair</a>');
    document.getElementById("sair").addEventListener("click", (e) => e.stopPropagation());
    const sc = document.createElement("script");
    sc.src = "motor/lista-aulas.js";
    sc.onload = () => {
      const lista = window.LISTA_AULAS || [], aqui = decodeURIComponent(location.pathname).replace(/\\/g, "/");
      const i = lista.findIndex((a) => aqui.endsWith(a));
      if (i >= 0 && i < lista.length - 1) {
        proxima = "../" + lista[i + 1];
        nav.insertAdjacentHTML("beforeend", '<a class="prox" href="' + proxima + '">' + (proxima.includes("/prova/") ? "Prova final ▶" : "Próxima aula ▶") + '</a>');
        document.querySelectorAll(".tela.final .proxima").forEach((c) => c.addEventListener("click", (e) => { e.stopPropagation(); location.href = proxima; }));
      }
    };
    document.head.appendChild(sc);
  }

  /* ================= peças animadas reaproveitáveis ================= */

  /* número que corre até o valor final */
  function contar(el, ate, ms = 1600, fmt = (v) => Math.round(v).toLocaleString("pt-BR"), de = 0) {
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(de + (ate - de) * e);
      if (k < 1) el._raf = requestAnimationFrame(passo);
    };
    el._raf = requestAnimationFrame(passo);
  }

  /* gráfico de velas ao vivo num <canvas> (preços ilustrativos, passeio aleatório) */
  function velas(canvas, o = {}) {
    const op = Object.assign({ largura: 22, intervalo: 700, preco: 1.0850, vol: 0.0009, alpha: 1, grade: true, casas: 4, media: false }, o);
    const ctx = canvas.getContext("2d");
    let W, H, lista = [], atual, ultimo = performance.now(), rodando = true;
    const dpr = Math.min(2, devicePixelRatio || 1);
    function medir() { W = canvas.clientWidth || canvas.width; H = canvas.clientHeight || canvas.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    medir();
    const n = Math.ceil(W / op.largura) + 2;
    let p = op.preco, tend = 0;
    function nova(abre) { return { o: abre, c: abre, h: abre, l: abre }; }
    for (let i = 0; i < n; i++) {
      const v = nova(p);
      for (let k = 0; k < 12; k++) mexer(v);
      lista.push(v); p = v.c;
    }
    atual = nova(p);
    function mexer(v) {
      tend += (Math.random() - 0.5) * 0.15; tend *= 0.97;
      v.c += (Math.random() - 0.5 + tend * 0.4) * op.vol;
      v.h = Math.max(v.h, v.c); v.l = Math.min(v.l, v.c);
    }
    function desenhar() {
      ctx.clearRect(0, 0, W, H);
      const todas = lista.concat([atual]).slice(-Math.floor(W / op.largura));
      let mx = -Infinity, mn = Infinity;
      todas.forEach((v) => { mx = Math.max(mx, v.h); mn = Math.min(mn, v.l); });
      const pad = (mx - mn) * 0.15 || 0.001; mx += pad; mn -= pad;
      const y = (v) => H - ((v - mn) / (mx - mn)) * H;
      ctx.globalAlpha = op.alpha;
      if (op.grade) {
        ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 5) * i); ctx.lineTo(W, (H / 5) * i); ctx.stroke(); }
      }
      const cw = op.largura * 0.62;
      todas.forEach((v, i) => {
        const x = i * op.largura + op.largura / 2, up = v.c >= v.o;
        ctx.strokeStyle = ctx.fillStyle = up ? "#10b981" : "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y(v.h)); ctx.lineTo(x, y(v.l)); ctx.stroke();
        const a = y(Math.max(v.o, v.c)), b = y(Math.min(v.o, v.c));
        ctx.fillRect(x - cw / 2, a, cw, Math.max(2, b - a));
      });
      if (op.media) {
        ctx.strokeStyle = "#f5b301"; ctx.lineWidth = 3; ctx.beginPath();
        todas.forEach((v, i) => {
          const fat = todas.slice(Math.max(0, i - 9), i + 1), m = fat.reduce((s, q) => s + q.c, 0) / fat.length;
          const x = i * op.largura + op.largura / 2;
          i ? ctx.lineTo(x, y(m)) : ctx.moveTo(x, y(m));
        });
        ctx.stroke();
      }
      const yc = y(atual.c), up = atual.c >= atual.o;
      ctx.setLineDash([6, 6]); ctx.strokeStyle = up ? "#10b981" : "#ef4444"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, yc); ctx.lineTo(W, yc); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (op.aoPreco) op.aoPreco(atual.c, atual.c - lista[lista.length - 1].c);
    }
    function loop(t) {
      if (!rodando) return;
      for (let k = 0; k < 2; k++) mexer(atual);
      if (t - ultimo > op.intervalo) { lista.push(atual); if (lista.length > 400) lista.shift(); atual = nova(atual.c); ultimo = t; }
      desenhar();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    addEventListener("resize", medir);
    return { parar: () => (rodando = false), preco: () => atual.c };
  }

  /* fita de cotações (valores ilustrativos) */
  function fita(el, pares) {
    const item = (p, i) => `<span class="q" data-i="${i}"><b>${p[0]}</b><span class="v">${p[1].toFixed(p[2])}</span><span class="s">▲ 0,00%</span></span>`;
    const html = pares.map(item).join("");
    el.innerHTML = `<div class="trilho">${html}${html}</div>`;
    const base = pares.map((p) => p[1]), atual = base.slice();
    setInterval(() => {
      const i = Math.floor(Math.random() * pares.length);
      const antes = atual[i];
      atual[i] *= 1 + (Math.random() - 0.5) * 0.0012;
      const pct = ((atual[i] - base[i]) / base[i]) * 100, sobe = atual[i] >= antes;
      el.querySelectorAll(`.q[data-i="${i}"]`).forEach((q) => {
        const v = q.querySelector(".v");
        v.textContent = atual[i].toFixed(pares[i][2]);
        v.classList.remove("flash-up", "flash-down"); void v.offsetWidth;
        v.classList.add(sobe ? "flash-up" : "flash-down");
        q.className = "q " + (pct >= 0 ? "alta" : "baixa");
        q.querySelector(".s").textContent = `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(2).replace(".", ",")}%`;
      });
    }, 260);
  }

  // caminhos relativos às aulas, que ficam em aulas/modulo-XX/
  const LOGO = `<img src="motor/marca/emblema-512.png" alt="Trader">`;
  const LOGO_COMPLETO = `<img src="motor/marca/logo-800.png" alt="Trader — O mercado sem mistério">`;

  /* selo de moeda: círculo com cor e símbolo, usado no lugar das bandeiras */
  const MOEDAS = {
    USD: ["$", "#2563eb"], EUR: ["€", "#1d4ed8"], GBP: ["£", "#7c3aed"], JPY: ["¥", "#dc2626"], CHF: ["₣", "#e11d48"],
    AUD: ["A$", "#0891b2"], NZD: ["N$", "#0f766e"], CAD: ["C$", "#ea580c"], BRL: ["R$", "#16a34a"], MXN: ["M$", "#65a30d"],
    CNY: ["元", "#b91c1c"], XAU: ["Au", "#ca8a04"], TRY: ["₺", "#be123c"], ZAR: ["R", "#15803d"],
  };
  const selo = (c) => { const [s, cor] = MOEDAS[c] || [c, "#475569"]; return `<span class="selo" style="background:${cor}" title="${c}">${s}</span>`; };
  const seloPar = (par) => { const [a, b] = par.split("/"); return `<span class="selo-par">${selo(a)}${selo(b)}</span>`; };
  /* preenche elementos com data-selo="EUR" ou data-par="EUR/USD" */
  function selos() {
    document.querySelectorAll("[data-selo]").forEach((el) => (el.innerHTML = selo(el.dataset.selo)));
    document.querySelectorAll("[data-par]").forEach((el) => (el.innerHTML = seloPar(el.dataset.par)));
  }

  /* coloca os logos nos elementos marcados com data-logo="emblema" ou data-logo="completo" */
  function logos() {
    document.querySelectorAll("[data-logo]").forEach((el) => (el.innerHTML = el.dataset.logo === "completo" ? LOGO_COMPLETO : LOGO));
  }

  return { iniciar, contar, velas, fita, logos, selo, seloPar, selos, LOGO, LOGO_COMPLETO, ir: mostrar };
})();
