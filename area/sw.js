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

/* ---------- liberação gradual: o banco decide (função abre_em); aqui só se mostra a data ---------- */
async function abreEm(s, nome) {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/abre_em`, { method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ p_nome: nome }) });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}
const dataBR = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
function paginaBloqueada(rel, quando) {
  const indice = new URL("curso/" + (rel.includes("/") && !/^(modulo-|prova\/|materiais\/)/.test(rel) ? rel.split("/")[0] + "/" : ""), self.registration.scope).href;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Módulo ainda não liberado</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;background:#050e1f;color:#eef3fb;font:16px/1.6 Inter,system-ui,sans-serif}.c{max-width:460px;text-align:center;background:linear-gradient(180deg,#102a52,#0b1730);border:1px solid rgba(245,179,1,.35);border-radius:22px;padding:34px 26px}b.d{display:block;font-size:30px;color:#f5b301;margin:10px 0 6px}p{color:#cbd5e1}a{display:inline-block;margin-top:14px;padding:12px 20px;border-radius:12px;background:#f5b301;color:#111;font-weight:800;text-decoration:none}</style></head>
<body><div class="c"><div style="font-size:42px">🔒</div><h1 style="font-size:22px;margin:8px 0 0">Este conteúdo ainda não foi liberado</h1><b class="d">${dataBR(quando)}</b><p>O curso é liberado aos poucos: um módulo novo a cada 3 dias. Assim você estuda no ritmo certo e pratica cada assunto antes do próximo.</p><a href="${indice}">Voltar ao curso</a></div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": TIPOS.html, "Cache-Control": "no-store" } });
}
/* índice do curso: marca os módulos que ainda não abriram (pergunta ao service worker em _liberacao) */
const MARCAR_INDICE = `(async()=>{const mods=[...document.querySelectorAll("section.mod")].map(s=>[s,s.querySelector("a.aula")]).filter(x=>x[1]);
const nomes=mods.map(x=>new URL(x[1].getAttribute("href"),location.href).pathname);
try{const r=await fetch("_liberacao?n="+encodeURIComponent(JSON.stringify(nomes)));if(!r.ok)return;const d=await r.json();
mods.forEach(([s],i)=>{const q=d[i];if(!q||new Date(q)<=new Date())return;s.style.opacity=".55";const h=s.querySelector("header .cont");if(h)h.textContent="🔒 abre em "+new Date(q).toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"});});}catch(e){}})();`;
async function liberacao(req) {
  const s = await sessaoValida();
  if (!s) return new Response("[]", { status: 401 });
  let nomes = [];
  try { nomes = JSON.parse(new URL(req.url).searchParams.get("n") || "[]").slice(0, 40); } catch (e) {}
  const datas = await Promise.all(nomes.map((p) => p.startsWith(BASE) ? abreEm(s, decodeURIComponent(p.slice(BASE.length))) : null));
  return new Response(JSON.stringify(datas), { headers: { "Content-Type": TIPOS.json, "Cache-Control": "no-store" } });
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
    if (navegacao && s) {
      const quando = await abreEm(s, rel);
      if (quando && new Date(quando) > new Date()) return paginaBloqueada(rel, quando);
    }
    if (navegacao) return paraEntrar(rel);
    return new Response("", { status: r.status === 404 ? 404 : 403 });
  }
  const ext = (rel.split(".").pop() || "").toLowerCase();
  if (ext === "html" && /(^|\/)index\.html$/.test(rel)) {
    const html = (await r.text()).replace("</body>", `<script>${MARCAR_INDICE}</script></body>`);
    return new Response(html, { status: 200, headers: { "Content-Type": TIPOS.html, "Cache-Control": "no-store" } });
  }
  return new Response(r.body, { status: 200, headers: { "Content-Type": TIPOS[ext] || r.headers.get("Content-Type") || "application/octet-stream", "Cache-Control": "no-store" } });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || e.request.method !== "GET") return;
  e.respondWith(url.pathname.endsWith("/_liberacao") ? liberacao(e.request) : servir(e.request));
});
