/* Área do aluno: serve o curso interativo a partir do depósito privado do Supabase.
   Tudo em area/curso/... é buscado com o login do aluno; sem login (ou sem compra ativa) volta para a página de entrada.
   A sessão fica no IndexedDB "area-aluno", gravada pela página de entrada. */
const SB = "https://kgyhgfxkhrdeucvsvehk.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_tqDOSHFcYthq7tHKzpHp-A_9Lstfpqz";
const TIPOS = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", pdf: "application/pdf", json: "application/json", webp: "image/webp" };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* ---------- sessão (IndexedDB) ---------- */
const abrir = () => new Promise((ok, erro) => {
  const r = indexedDB.open("area-aluno", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("sessao");
  r.onsuccess = () => ok(r.result);
  r.onerror = () => erro(r.error);
});
const ler = async () => { const db = await abrir(); return new Promise((ok) => { const r = db.transaction("sessao").objectStore("sessao").get("atual"); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); };
const gravar = async (s) => { const db = await abrir(); return new Promise((ok) => { const t = db.transaction("sessao", "readwrite"); s ? t.objectStore("sessao").put(s, "atual") : t.objectStore("sessao").delete("atual"); t.oncomplete = ok; t.onerror = ok; }); };

let renovando = null;
async function renovar(s) {
  if (!renovando) renovando = (async () => {
    try {
      const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: CHAVE_PUBLICA, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) { await gravar(null); return null; }
      const d = await r.json();
      const nova = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at };
      await gravar(nova);
      return nova;
    } catch (e) { return s; } /* sem internet: tenta com a sessão que tem */
    finally { renovando = null; }
  })();
  return renovando;
}
async function sessaoValida() {
  const s = await ler();
  if (!s) return null;
  return s.expires_at * 1000 - Date.now() < 60000 ? renovar(s) : s;
}

/* ---------- arquivos do curso ---------- */
const BASE = new URL("curso/", self.registration.scope).pathname;
const paraEntrar = (rel) => Response.redirect(new URL("./?volta=" + encodeURIComponent(rel), self.registration.scope).href, 302);

/* ---------- proteção das aulas (as apostilas em PDF continuam baixáveis) ---------- */
const emailDe = (s) => { try { return JSON.parse(atob(s.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || ""; } catch (e) { return ""; } };
/* roda dentro de cada página HTML do curso; vai como texto para o <script> */
function proteger(email) {
  const d = document;
  /* cópia salva no computador ou aberta fora da Área do aluno: não mostra a aula */
  if (location.protocol === "file:" || !(navigator.serviceWorker && navigator.serviceWorker.controller)) {
    d.documentElement.innerHTML = '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050e1f;color:#eef3fb;font:17px system-ui;text-align:center;padding:16px">As aulas só abrem na Área do aluno do site Mercado Sem Mistério.</body>';
    return;
  }
  const css = d.createElement("style");
  css.textContent = "html,body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}img,canvas,svg{-webkit-user-drag:none}@media print{body{display:none!important}}"
    + ".msm-marca{position:fixed;inset:0;z-index:2147483647;pointer-events:none;overflow:hidden;opacity:.045}.msm-marca span{position:absolute;white-space:nowrap;font:600 15px system-ui;color:#fff;text-shadow:0 0 2px #000;transform:rotate(-24deg)}";
  d.head.appendChild(css);
  const bloquear = (e) => e.preventDefault();
  ["copy", "cut", "dragstart", "selectstart"].forEach((t) => d.addEventListener(t, (e) => { if (!e.target.closest || !e.target.closest("input,textarea,select,[contenteditable]")) bloquear(e); }, true));
  d.addEventListener("contextmenu", bloquear, true);
  addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (k === "f12" || (mod && ["s", "p", "u"].includes(k)) || (mod && e.shiftKey && ["i", "j", "c"].includes(k))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener("beforeprint", () => { d.body.style.visibility = "hidden"; });
  addEventListener("afterprint", () => { d.body.style.visibility = ""; });
  if (email) {
    const marca = d.createElement("div");
    marca.className = "msm-marca";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const sp = d.createElement("span");
      sp.textContent = email + " · uso pessoal";
      sp.style.left = (x * 28 + (y % 2) * 14 - 6) + "%";
      sp.style.top = (y * 13 + 4) + "%";
      marca.appendChild(sp);
    }
    (d.body || d.documentElement).appendChild(marca);
  }
}

async function servir(req) {
  const url = new URL(req.url);
  let rel = decodeURIComponent(url.pathname.slice(BASE.length));
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const navegacao = req.mode === "navigate";

  let s = await sessaoValida();
  if (!s) return navegacao ? paraEntrar(rel) : new Response("", { status: 401 });

  const buscar = (token) => fetch(`${SB}/storage/v1/object/authenticated/curso/${rel.split("/").map(encodeURIComponent).join("/")}`, { headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + token } });
  let r = await buscar(s.access_token);
  if (!r.ok && (r.status === 400 || r.status === 401 || r.status === 403)) {
    s = await renovar(s);
    if (s) r = await buscar(s.access_token);
  }
  if (!r.ok) {
    if (navegacao) return paraEntrar(rel);
    return new Response("", { status: r.status === 404 ? 404 : 403 });
  }
  const ext = (rel.split(".").pop() || "").toLowerCase();
  if (ext === "html") {
    const html = (await r.text()).replace(/<\/body>/i, `<script>(${proteger})(${JSON.stringify(emailDe(s))})</script></body>`);
    return new Response(html, { status: 200, headers: { "Content-Type": TIPOS.html, "Cache-Control": "no-store" } });
  }
  return new Response(r.body, { status: 200, headers: { "Content-Type": TIPOS[ext] || r.headers.get("Content-Type") || "application/octet-stream", "Cache-Control": "no-store" } });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(BASE) && e.request.method === "GET") e.respondWith(servir(e.request));
});
