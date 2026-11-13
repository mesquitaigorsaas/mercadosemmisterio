// Resumo do dia do Radar do Payroll, passo 3: confere o resumo.json antes de publicar.
// Uso: node validar-resumo.js   (lê entrada-resumo.json e site/painel-payroll/resumo.json; sai com erro se algo não confere)
// Regras:
// - todo número do texto precisa aparecer nos fatos oficiais ou no título de uma manchete usada
//   (exceções fixas: nomes como "Nasdaq 100", "2 anos", "3 meses", "10 anos", "12 meses", "4 semanas", "8h30", e o ano/dia das datas dos fatos)
// - toda manchete do resumo precisa existir na entrada (mesmo título e link); toda referência [n] precisa existir
// - cada manchete tem voto (sinal 1, 0 ou -1) e o porquê; toda manchete da entrada está no resumo ou em descartadas (nenhuma fica de fora sem decisão)
// - a data do resumo é a de hoje
const fs = require("fs");
const path = require("path");

const entrada = JSON.parse(fs.readFileSync(path.join(__dirname, "entrada-resumo.json"), "utf8"));
const arq = path.join(__dirname, "../resumo.json");
const r = JSON.parse(fs.readFileSync(arq, "utf8"));
const erros = [];

for (const k of ["data", "escritoEm", "titulo", "paragrafos", "espera", "manchetes", "descartadas"]) if (r[k] == null) erros.push("falta o campo " + k);
if (r.data !== entrada.data) erros.push(`data do resumo (${r.data}) não é a de hoje (${entrada.data})`);
if (!Array.isArray(r.paragrafos) || r.paragrafos.length < 2) erros.push("paragrafos: pelo menos 2");
if (!Array.isArray(r.espera) || r.espera.length < 1) erros.push("espera: pelo menos 1 parágrafo");

const porLink = new Map(entrada.manchetes.map((m) => [m.link, m]));
(r.manchetes || []).forEach((m, i) => {
  const e = porLink.get(m.link);
  if (!e) erros.push(`manchete [${i + 1}] não está na entrada: ${m.link}`);
  else if (e.titulo !== m.titulo || e.fonte !== m.fonte || e.publicado_em !== m.publicado_em) erros.push(`manchete [${i + 1}] foi alterada (título, fonte ou hora)`);
});

(r.manchetes || []).forEach((m, i) => {
  if (![1, 0, -1].includes(m.sinal)) erros.push(`manchete [${i + 1}] sem voto válido (sinal 1, 0 ou -1)`);
  if (!m.porque || m.porque.length < 15) erros.push(`manchete [${i + 1}] sem o porquê do voto`);
});
const decididos = new Set([...(r.manchetes || []).map((m) => m.link), ...(r.descartadas || [])]);
const semDecisao = entrada.manchetes.filter((m) => !decididos.has(m.link));
if (semDecisao.length) erros.push(`${semDecisao.length} manchete(s) da entrada sem decisão (nem no resumo nem em descartadas): ids ` + semDecisao.slice(0, 8).map((m) => m.id).join(", "));
(r.descartadas || []).forEach((l) => { if (!porLink.has(l)) erros.push("descartada que não está na entrada: " + l); });

const numeros = (t) => (String(t).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/^0+(?=\d)/, ""));
const permitidos = new Set(["2", "3", "10", "100", "12", "4", "8", "30"]);
const juntar = (t) => numeros(t).forEach((n) => { permitidos.add(n); permitidos.add(n.replace(/\./g, "").replace(",", ".")); permitidos.add(n.replace(",", ".")); permitidos.add(n.replace(".", ",")); });
for (const f of entrada.fatos) { juntar(f.valor); juntar(f.referencia); }
(r.manchetes || []).forEach((m) => juntar(m.titulo));
[entrada.data, entrada.proximoPayroll, entrada.ultimoPayroll].filter(Boolean).forEach((iso) => { const [a, m, d] = iso.split("-"); [a, String(+m), String(+d), d, m, `${d}/${m}`].forEach((x) => permitidos.add(x)); });

const textos = [r.titulo, ...(r.paragrafos || []), ...(r.espera || []), ...(r.manchetes || []).map((m) => m.porque || "")];
const nRef = (r.manchetes || []).length;
textos.forEach((t, i) => {
  const semRef = String(t).replace(/\[(\d+)\]/g, (m, n) => { if (+n < 1 || +n > nRef) erros.push(`referência [${n}] não existe (texto ${i + 1})`); return ""; });
  for (const n of numeros(semRef)) if (!permitidos.has(n) && !permitidos.has(n.replace(",", "."))) erros.push(`número "${n}" no texto ${i + 1} não está nos dados oficiais nem nas manchetes`);
});

if (erros.length) { console.error("RESUMO REPROVADO:\n- " + erros.join("\n- ")); process.exit(1); }
console.log(`RESUMO APROVADO: ${textos.length} trechos, ${nRef} manchetes, todos os números conferem.`);
