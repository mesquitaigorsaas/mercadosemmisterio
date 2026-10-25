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
  return new Response(r.body, { status: 200, headers: { "Content-Type": TIPOS[ext] || r.headers.get("Content-Type") || "application/octet-stream", "Cache-Control": "no-store" } });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(BASE) && e.request.method === "GET") e.respondWith(servir(e.request));
});
