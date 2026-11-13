// Resumo do dia do Radar do Payroll, passo 1: junta os FATOS que o texto pode usar.
// Uso: node coletar-resumo.js   → grava entrada-resumo.json nesta pasta
//      node coletar-resumo.js --so-fatos   → atualiza só os fatos e mantém as manchetes já coletadas
// - fatos: os mesmos números da tabela "Números oficiais agora" (site/painel-payroll/numeros.js), da função dados-payroll (BLS + FRED)
// - manchetes: notícias reais das últimas 36 h da tabela noticias (Supabase), filtradas por emprego, Fed, inflação, juros e Nasdaq
// O texto do resumo só pode citar números que aparecem aqui (validar-resumo.js confere antes de publicar).
const fs = require("fs");
const path = require("path");
const { fatosDoDia } = require("../numeros.js");

const SB = "https://kgyhgfxkhrdeucvsvehk.supabase.co";
const CHAVE = "sb_publishable_tqDOSHFcYthq7tHKzpHp-A_9Lstfpqz"; // chave pública (só lê notícias)
const TEMAS = ["payroll", "nonfarm", "jobs", "job ", "jobless", "labor", "labour", "employment", "unemployment", "hiring", "layoff", "jolts", "adp",
  " fed ", "fed's", "fomc", "powell", "warsh", "rate cut", "rate hike", "interest rate", "inflation", "cpi", "pce", "treasury", "yields", "bond", "nasdaq", "wall street", "stocks", "s&p",
  "emprego", "desemprego", "trabalho", "juros", "inflação", "treasuries", "títulos", "bolsas de nova york", "dólar"];

(async () => {
  const d = await (await fetch(`${SB}/functions/v1/dados-payroll`, { cache: "no-store" })).json();
  if (d.erro) throw new Error("dados-payroll: " + d.erro);
  const falhas = Object.entries(d.fontes || {}).filter(([, v]) => !v.ok).map(([k]) => k);

  const desde = new Date(Date.now() - 36 * 3600e3).toISOString();
  const url = `${SB}/rest/v1/noticias?select=regiao,fonte,titulo,link,idioma,publicado_em&publicado_em=gte.${desde}&regiao=in.(eua,brasil,europa,bancos_centrais)&order=publicado_em.desc&limit=1000`;
  const todas = await (await fetch(url, { headers: { apikey: CHAVE } })).json();
  const soFatos = process.argv.includes("--so-fatos") && fs.existsSync(path.join(__dirname, "entrada-resumo.json"));
  const vistos = new Set();
  const manchetes = todas.filter((n) => {
    const t = " " + n.titulo.toLowerCase() + " ";
    if (!TEMAS.some((k) => t.includes(k))) return false;
    const chave = n.titulo.toLowerCase().replace(/\W+/g, " ").slice(0, 60);
    if (vistos.has(chave)) return false; vistos.add(chave); return true;
  }).slice(0, 80).map((n, i) => ({ id: i + 1, ...n }));
  if (soFatos) manchetes.splice(0, manchetes.length, ...JSON.parse(fs.readFileSync(path.join(__dirname, "entrada-resumo.json"), "utf8")).manchetes);

  const agoraBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const saida = {
    data: agoraBR,
    coletadoEm: new Date().toISOString(),
    proximoPayroll: d.proximaDivulgacao, ultimoPayroll: d.ultimaDivulgacao, hojeEPayroll: d.hojeEPayroll,
    fontesComFalha: falhas,
    fatos: fatosDoDia(d),
    manchetes,
  };
  fs.writeFileSync(path.join(__dirname, "entrada-resumo.json"), JSON.stringify(saida, null, 2));
  console.log(`ok: ${saida.fatos.length} fatos, ${manchetes.length} manchetes${falhas.length ? ", FONTES COM FALHA: " + falhas.join(", ") : ""}`);
  for (const f of saida.fatos) console.log(`- ${f.dado}: ${f.valor} (${f.referencia}; ${f.fonte})`);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
