/* Mercado Sem Mistério — scripts comuns do site */
const CONFIG = {
  supabaseUrl: "https://kgyhgfxkhrdeucvsvehk.supabase.co",
  supabaseKey: "sb_publishable_tqDOSHFcYthq7tHKzpHp-A_9Lstfpqz", // chave pública (só lê notícias e cadastra contatos)
  checkoutUrl: "https://pay.hotmart.com/B108196908U", // checkout da Hotmart (a Kiwify bloqueou o produto em 26/10) — vazio = botões levam à lista de espera
  precoDe: "R$ 497", precoPor: "R$ 297", parcelas: "ou em até 12x no cartão", // o valor da parcela depende da plataforma
};

/* menu do celular */
document.addEventListener("click", (e) => {
  if (e.target.closest(".burger")) document.querySelector(".menu").classList.toggle("aberto");
  else if (e.target.closest(".menu a")) document.querySelector(".menu").classList.remove("aberto");
});

/* entrada suave das seções */
const obs = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("vis"); obs.unobserve(e.target); } }), { threshold: .12 }) : null;
document.querySelectorAll(".surge").forEach((el) => (obs ? obs.observe(el) : el.classList.add("vis")));

/* botões de compra: checkout ou lista de espera */
document.querySelectorAll("[data-comprar]").forEach((a) => {
  if (CONFIG.checkoutUrl) { a.href = CONFIG.checkoutUrl; a.target = "_blank"; a.rel = "noopener"; }
  else { a.href = a.dataset.semCheckout || "#lista"; }
});
document.querySelectorAll("[data-preco-de]").forEach((e) => (e.textContent = CONFIG.precoDe));
document.querySelectorAll("[data-preco-por]").forEach((e) => (e.textContent = CONFIG.precoPor));
document.querySelectorAll("[data-parcelas]").forEach((e) => (e.textContent = CONFIG.parcelas));

/* sessões do mercado ao vivo */
function sessoes(el) {
  const S = [["Sydney", "Australia/Sydney", 7, 16], ["Tóquio", "Asia/Tokyo", 9, 18], ["Londres", "Europe/London", 8, 17], ["Nova York", "America/New_York", 8, 17]];
  const desenha = () => {
    const agora = new Date();
    el.innerHTML = S.map(([nome, tz, a, f]) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(agora).map((x) => [x.type, x.value]));
      const h = +p.hour % 24 + +p.minute / 60, util = !["Sat", "Sun"].includes(p.weekday), aberta = util && h >= a && h < f;
      const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(agora);
      return `<div class="sessao ${aberta ? "aberta" : ""}"><b><i></i>${nome}</b><span>${aberta ? "aberta" : "fechada"} · ${hora} local</span></div>`;
    }).join("");
  };
  desenha(); setInterval(desenha, 30000);
}
document.querySelectorAll("[data-sessoes]").forEach(sessoes);

/* notícias (Supabase, atualizadas a cada 15 min) */
const REGIOES = [["brasil", "Brasil"], ["eua", "EUA"], ["europa", "Europa"], ["asia", "Ásia"], ["bancos_centrais", "Bancos centrais"]];
function haQuanto(iso) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return "agora"; if (m < 60) return `há ${m} min`; const h = Math.round(m / 60); if (h < 24) return `há ${h} h`; return `há ${Math.round(h / 24)} d`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function noticias(el) {
  const limite = +el.dataset.limite || 12;
  el.insertAdjacentHTML("afterbegin", `<div class="abas">${REGIOES.map(([r, t], i) => `<button data-r="${r}" class="${i ? "" : "on"}">${t}</button>`).join("")}</div><div class="noticias"></div><div class="noticias-rodape"><span class="atual"></span><span>Manchetes com link para a fonte original. Atualização automática a cada 15 minutos.</span></div>`);
  const lista = el.querySelector(".noticias"); let regiao = "brasil";
  const carrega = async () => {
    try {
      const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/noticias?select=fonte,titulo,link,idioma,publicado_em&regiao=eq.${regiao}&order=publicado_em.desc&limit=${limite}`, { headers: { apikey: CONFIG.supabaseKey } });
      const d = await r.json();
      lista.innerHTML = d.length ? d.map((n) => `<a class="noticia" href="${esc(n.link)}" target="_blank" rel="noopener nofollow"><b>${esc(n.titulo)}</b><span class="meta">${esc(n.fonte)} · ${haQuanto(n.publicado_em)}${n.idioma === "en" ? ' <span class="en">EN</span>' : ""}</span></a>`).join("") : `<p class="soft">Sem manchetes no momento.</p>`;
      el.querySelector(".atual").textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { lista.innerHTML = `<p class="soft">Não foi possível carregar as notícias agora. Tente de novo em instantes.</p>`; }
  };
  el.querySelectorAll(".abas button").forEach((b) => b.onclick = () => { regiao = b.dataset.r; el.querySelectorAll(".abas button").forEach((x) => x.classList.toggle("on", x === b)); carrega(); });
  carrega(); setInterval(carrega, 5 * 60000);
}
document.querySelectorAll("[data-noticias]").forEach(noticias);

/* dicas (Supabase) */
const CATEGORIAS = { mercado: ["Mercado", "#3b82f6"], risco: ["Gestão de risco", "#ef4444"], psicologia: ["Psicologia", "#a855f7"], tecnica: ["Análise técnica", "#10b981"], agenda: ["Agenda da semana", "#f5b301"], iniciante: ["Para iniciantes", "#06b6d4"] };
const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const cartaoDica = (d, base) => { const [cat, cor] = CATEGORIAS[d.categoria] || ["Dica", "#f5b301"]; return `<a class="card dica" href="${base}dicas.html?d=${encodeURIComponent(d.slug)}" style="--c:${cor}"><span class="cat">${cat}</span><h3>${esc(d.titulo)}</h3><p>${esc(d.resumo)}</p><span class="pe">${dataBR(d.publicado_em)}${d.aula ? " · aula " + esc(d.aula) : ""} <b>Ler →</b></span></a>`; };
async function buscaDicas(q) { const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/dicas?${q}`, { headers: { apikey: CONFIG.supabaseKey } }); return r.json(); }
document.querySelectorAll("[data-dicas]").forEach(async (el) => {
  try { const d = await buscaDicas(`select=slug,titulo,resumo,categoria,aula,publicado_em&order=publicado_em.desc&limit=${+el.dataset.dicas || 6}`); el.innerHTML = d.map((x) => cartaoDica(x, el.dataset.base || "")).join("") || "<p class=\"soft\">Em breve.</p>"; }
  catch (e) { el.innerHTML = "<p class=\"soft\">Não foi possível carregar as dicas agora.</p>"; }
});

/* cadastro de contatos (Supabase) */
document.querySelectorAll("form[data-contato]").forEach((f) => f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : ""), msg = f.querySelector(".msg-form");
  const email = v("email") || null, whats = v("whatsapp") || null;
  if (!email && !whats) { msg.textContent = "Informe o e-mail ou o WhatsApp."; msg.style.color = "#fca5a5"; return; }
  if (!f.elements.consentimento.checked) { msg.textContent = "Marque a autorização para receber os conteúdos."; msg.style.color = "#fca5a5"; return; }
  const btn = f.querySelector("button"); btn.disabled = true;
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/rest/v1/contatos`, { method: "POST", headers: { apikey: CONFIG.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ nome: v("nome") || null, email, whatsapp: whats, origem: f.dataset.contato, consentimento: true }) });
    if (!r.ok) throw new Error(await r.text());
    f.reset(); msg.textContent = "Pronto! Você está na lista. Obrigado."; msg.style.color = "#6ee7b7";
  } catch (err) { msg.textContent = "Não deu certo agora. Confira o e-mail e tente de novo."; msg.style.color = "#fca5a5"; }
  btn.disabled = false;
}));

/* widgets do TradingView (cotações e agenda) */
function tradingview(el, tipo, cfg) {
  const s = document.createElement("script");
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${tipo}.js`; s.async = true;
  s.textContent = JSON.stringify(Object.assign({ colorTheme: "dark", isTransparent: true, locale: "br" }, cfg));
  el.innerHTML = '<div class="tradingview-widget-container__widget"></div>'; el.classList.add("tradingview-widget-container"); el.appendChild(s);
}
const ATIVOS = [["FX_IDC:USDBRL", "Dólar"], ["FX_IDC:EURBRL", "Euro"], ["BMFBOVESPA:IBOV", "Ibovespa"], ["FX:EURUSD", "EUR/USD"], ["FX:GBPUSD", "GBP/USD"], ["FX:USDJPY", "USD/JPY"], ["OANDA:XAUUSD", "Ouro"], ["TVC:UKOIL", "Petróleo Brent"], ["FOREXCOM:SPXUSD", "S&P 500"], ["BITSTAMP:BTCUSD", "Bitcoin"]];
document.querySelectorAll("[data-fita]").forEach((el) => tradingview(el, "ticker-tape", { symbols: ATIVOS.map(([proName, title]) => ({ proName, title })), showSymbolLogo: true, displayMode: "adaptive" }));
document.querySelectorAll("[data-painel]").forEach((el) => tradingview(el, "market-overview", {
  dateRange: "1D", showChart: true, width: "100%", height: 520, showSymbolLogo: true, showFloatingTooltip: true, plotLineColorGrowing: "#10b981", plotLineColorFalling: "#ef4444", belowLineFillColorGrowing: "rgba(16,185,129,.12)", belowLineFillColorFalling: "rgba(239,68,68,.12)", symbolActiveColor: "rgba(245,179,1,.12)",
  tabs: [
    { title: "Brasil", symbols: [{ s: "FX_IDC:USDBRL", d: "Dólar / Real" }, { s: "FX_IDC:EURBRL", d: "Euro / Real" }, { s: "BMFBOVESPA:IBOV", d: "Ibovespa" }] },
    { title: "Moedas", symbols: [{ s: "FX:EURUSD", d: "EUR/USD" }, { s: "FX:GBPUSD", d: "GBP/USD" }, { s: "FX:USDJPY", d: "USD/JPY" }, { s: "FX:AUDUSD", d: "AUD/USD" }, { s: "FX:USDCHF", d: "USD/CHF" }] },
    { title: "Índices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }, { s: "INDEX:DEU40", d: "DAX" }, { s: "INDEX:NKY", d: "Nikkei 225" }] },
    { title: "Commodities", symbols: [{ s: "OANDA:XAUUSD", d: "Ouro" }, { s: "TVC:UKOIL", d: "Petróleo Brent" }, { s: "TVC:USOIL", d: "Petróleo WTI" }, { s: "OANDA:XAGUSD", d: "Prata" }] },
  ],
}));
document.querySelectorAll("[data-mini]").forEach((el) => tradingview(el, "mini-symbol-overview", { symbol: el.dataset.mini, width: "100%", height: 220, dateRange: "1D", trendLineColor: "#f5b301", underLineColor: "rgba(245,179,1,.18)", underLineBottomColor: "rgba(245,179,1,0)", chartOnly: false, noTimeScale: false }));
document.querySelectorAll("[data-hotlists]").forEach((el) => tradingview(el, "hotlists", { exchange: "BMFBOVESPA", dateRange: "1D", showChart: true, width: "100%", height: 560, showSymbolLogo: true, showFloatingTooltip: true, plotLineColorGrowing: "#10b981", plotLineColorFalling: "#ef4444", belowLineFillColorGrowing: "rgba(16,185,129,.12)", belowLineFillColorFalling: "rgba(239,68,68,.12)", symbolActiveColor: "rgba(245,179,1,.12)" }));
/* bolsas do mundo em abas por região (o modelo de tabela larga do TradingView rolava para o lado e sobrepunha os nomes) */
document.querySelectorAll("[data-bolsas]").forEach((el) => tradingview(el, "market-overview", {
  dateRange: "1D", showChart: true, width: "100%", height: 560, showSymbolLogo: true, showFloatingTooltip: true, plotLineColorGrowing: "#10b981", plotLineColorFalling: "#ef4444", belowLineFillColorGrowing: "rgba(16,185,129,.12)", belowLineFillColorFalling: "rgba(239,68,68,.12)", symbolActiveColor: "rgba(245,179,1,.12)",
  tabs: [
    { title: "Américas", symbols: [{ s: "BMFBOVESPA:IBOV", d: "Ibovespa (Brasil)" }, { s: "FOREXCOM:SPXUSD", d: "S&P 500 (EUA)" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100 (EUA)" }, { s: "FOREXCOM:DJI", d: "Dow Jones (EUA)" }] },
    { title: "Europa", symbols: [{ s: "INDEX:DEU40", d: "DAX (Alemanha)" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100 (Reino Unido)" }, { s: "INDEX:CAC40", d: "CAC 40 (França)" }, { s: "INDEX:SX5E", d: "Euro Stoxx 50" }] },
    { title: "Ásia", symbols: [{ s: "INDEX:NKY", d: "Nikkei 225 (Japão)" }, { s: "INDEX:HSI", d: "Hang Seng (Hong Kong)" }, { s: "SSE:000001", d: "Xangai (China)" }, { s: "ASX:XJO", d: "ASX 200 (Austrália)" }] },
  ],
}));
document.querySelectorAll("[data-agenda]").forEach((el) => tradingview(el, "events", { width: "100%", height: 560, importanceFilter: "0,1", countryFilter: "br,us,eu,gb,jp,cn" }));
