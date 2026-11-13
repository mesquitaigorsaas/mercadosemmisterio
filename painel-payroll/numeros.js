/* Números oficiais do Resumo do dia, calculados do JSON da função dados-payroll (BLS + FRED).
   Usado pela página (tabela "Números oficiais agora") e pelo gerador do resumo (plataformas/radar-payroll),
   para o texto e a tabela mostrarem exatamente os mesmos valores. Nada aqui é digitado à mão.
   Cada dado também vota no Placar do dia: +1 favorável ao Nasdaq, -1 desfavorável, 0 neutro, com o porquê.
   Regra central: na fase de inflação, mercado de trabalho forte = mais juros = ruim para o Nasdaq; em recessão ou fase neutra, forte = bom. */
(function (raiz) {
  const fmt = (n, c = 0) => n == null || isNaN(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
  const mais = (n, c = 0) => n == null || isNaN(n) ? "—" : (n > 0 ? "+" : "") + fmt(n, c);
  const mesBR = (ym) => { const [a, m] = ym.split("-"); return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+m - 1] + "/" + a; };
  const diaBR = (iso) => new Date(iso.slice(0, 10) + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const par = (s) => (s && s.length > 1 ? [s[s.length - 1], s[s.length - 2]] : null);

  /* mesma regra do painel: Sahm >= 0,5 = recessão; CPI 12 meses >= 3% = inflação; senão neutra */
  function faseDoDia(d) {
    const cpi = d.cpi || [], u = (d.unrate || []).map((x) => x[1]);
    const cpi12 = cpi.length >= 13 ? (cpi[cpi.length - 1][1] / cpi[cpi.length - 13][1] - 1) * 100 : null;
    let sahm = null;
    if (u.length >= 15) { const m3 = (k) => (u[k] + u[k - 1] + u[k - 2]) / 3; let min = Infinity; for (let k = u.length - 13; k < u.length - 1; k++) min = Math.min(min, m3(k)); sahm = m3(u.length - 1) - min; }
    return sahm != null && sahm >= 0.5 ? "recessao" : cpi12 != null && cpi12 >= 3 ? "inflacao" : "neutra";
  }
  /* emprego forte (+1) ou fraco (-1) vira voto para o Nasdaq conforme a fase */
  const votoEmprego = (forca, fase, oQue) => {
    if (!forca) return [0, oQue + " está dentro do normal recente: não muda o quadro."];
    if (fase === "inflacao") return forca > 0 ? [-1, oQue + " mostra emprego forte. Com inflação alta, isso reforça juros altos por mais tempo, o que pesa no Nasdaq."] : [1, oQue + " mostra emprego esfriando. Com inflação alta, isso alivia a pressão por juros, o que ajuda o Nasdaq."];
    return forca > 0 ? [1, oQue + " mostra emprego forte. Sem inflação preocupante, isso indica economia saudável, bom para o Nasdaq."] : [-1, oQue + " mostra emprego esfriando. Isso aumenta o medo de desaceleração, ruim para o Nasdaq."];
  };
  const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;

  /* devolve [{dado, valor, referencia, fonte, voto, porque}] (voto null = não vota) */
  function fatosDoDia(d) {
    const L = [], fase = faseDoDia(d), add = (dado, valor, referencia, fonte, v) => L.push({ dado, valor, referencia, fonte, voto: v ? v[0] : null, porque: v ? v[1] : "" });
    const b = d.bls;
    if (b && b.vagasNivel && b.vagasNivel.length > 1) {
      const [u, a] = par(b.vagasNivel);
      const nv = b.vagasNivel, dif = (i) => nv[i][1] - nv[i - 1][1], k = nv.length - 1;
      const mPrev = k >= 4 ? media([dif(k - 1), dif(k - 2), dif(k - 3)]) : null, vg = u[1] - a[1];
      add("Vagas criadas (payroll)", mais(vg) + " mil", mesBR(u[0]) + (u[2] ? " · preliminar" : "") + (d.ultimaDivulgacao ? " · divulgado em " + diaBR(d.ultimaDivulgacao) : "") + (mPrev == null ? "" : " · média dos 3 meses anteriores " + mais(mPrev) + " mil"), "BLS",
        mPrev == null ? null : votoEmprego(vg > mPrev + 25 ? 1 : vg < mPrev - 25 ? -1 : 0, fase, "O payroll, comparado à média dos 3 meses anteriores,"));
      const de = par(b.desemprego);
      if (de) add("Taxa de desemprego", fmt(de[0][1], 1) + "%", mesBR(de[0][0]) + " · antes " + fmt(de[1][1], 1) + "%", "BLS", votoEmprego(Math.sign(de[1][1] - de[0][1]), fase, de[0][1] < de[1][1] ? "O desemprego em queda" : de[0][1] > de[1][1] ? "O desemprego em alta" : "O desemprego estável"));
      const s = par(b.salario);
      if (s) {
        const s12 = b.salario.find((x) => x[0] === (+s[0][0].slice(0, 4) - 1) + s[0][0].slice(4));
        const sm = (s[0][1] / s[1][1] - 1) * 100;
        add("Salário médio por hora", mais(sm, 2) + "% no mês", mesBR(s[0][0]) + (s12 ? " · " + mais((s[0][1] / s12[1] - 1) * 100, 2) + "% em 12 meses" : ""), "BLS",
          sm > 0.3 ? [-1, "Salário subindo mais de 0,30% no mês alimenta a inflação de serviços e mantém o Fed duro: pesa no Nasdaq."] : sm < 0.2 ? [1, "Salário subindo menos de 0,20% no mês reduz a pressão de inflação: ajuda o Nasdaq."] : [0, "Salário subindo entre 0,20% e 0,30% no mês: ritmo neutro para a inflação."]);
      }
    }
    const A = d.adp || [];
    if (A.length >= 5) {
      const dv = (i) => (A[i][1] - A[i - 1][1]) / 1000, k = A.length - 1, v = dv(k), m = media([dv(k - 1), dv(k - 2), dv(k - 3)]);
      add("Emprego privado (ADP)", mais(v) + " mil", mesBR(A[k][0].slice(0, 7)) + " · média dos 3 meses anteriores " + mais(m) + " mil", "FRED/ADP", votoEmprego(v > m + 25 ? 1 : v < m - 25 ? -1 : 0, fase, "O ADP, comparado à média dos 3 meses anteriores,"));
    }
    if (d.icsa && d.icsa.length >= 4) {
      const u = d.icsa[d.icsa.length - 1], m4 = d.icsa.slice(-4).reduce((a, x) => a + x[1], 0) / 4;
      const dfc = (u[1] - m4) / 1000;
      add("Pedidos de seguro-desemprego", fmt(u[1] / 1000) + " mil", "semana até " + diaBR(u[0]) + " · média de 4 semanas " + fmt(m4 / 1000, 1) + " mil", "FRED/DOL", votoEmprego(dfc < -5 ? 1 : dfc > 5 ? -1 : 0, fase, "O seguro-desemprego (menos pedidos = emprego forte)"));
    }
    if (d.ccsa && d.ccsa.length >= 5) { const u = d.ccsa[d.ccsa.length - 1], a4 = d.ccsa[d.ccsa.length - 5], dfc = (u[1] - a4[1]) / 1000; add("Pedidos contínuos", fmt(u[1] / 1e6, 3) + " milhão", "semana até " + diaBR(u[0]) + " · 4 semanas antes " + fmt(a4[1] / 1e6, 3) + " milhão", "FRED/DOL", votoEmprego(dfc < -20 ? 1 : dfc > 20 ? -1 : 0, fase, "O número de pedidos contínuos (menos gente recebendo = emprego forte)")); }
    const jo = par(d.jolts); if (jo) { const dj = jo[0][1] - jo[1][1]; add("Vagas abertas (JOLTS)", fmt(jo[0][1] / 1000, 2) + " milhões", mesBR(jo[0][0].slice(0, 7)) + " · antes " + fmt(jo[1][1] / 1000, 2) + " milhões", "FRED/BLS", votoEmprego(dj > 150 ? 1 : dj < -150 ? -1 : 0, fase, "O número de vagas abertas (JOLTS)")); }
    if (d.cpi && d.cpi.length > 12) { const u = d.cpi[d.cpi.length - 1], a = d.cpi[d.cpi.length - 13]; const c12 = (u[1] / a[1] - 1) * 100; add("Inflação ao consumidor (CPI)", fmt(c12, 2) + "% em 12 meses", mesBR(u[0].slice(0, 7)), "FRED/BLS", c12 >= 3 ? [-1, "Inflação em 3% ou mais, acima da meta de 2% do Fed: juros altos por mais tempo, ruim para o Nasdaq."] : c12 <= 2.5 ? [1, "Inflação perto da meta de 2% do Fed: abre espaço para juros menores, bom para o Nasdaq."] : [0, "Inflação um pouco acima da meta: efeito neutro."]); }
    for (const [k, nome] of [["dgs2", "Juros do Treasury de 2 anos"], ["dgs10", "Juros do Treasury de 10 anos"]]) {
      const x = par(d[k]); if (x) { const dj = x[0][1] - x[1][1]; add(nome, fmt(x[0][1], 2) + "%", diaBR(x[0][0]) + " · dia anterior " + fmt(x[1][1], 2) + "%", "FRED", dj >= 0.03 ? [-1, "Juro subindo: o dinheiro fica mais caro e as ações de tecnologia valem menos no cálculo do investidor."] : dj <= -0.03 ? [1, "Juro caindo: alivia o custo do dinheiro e favorece as ações de tecnologia."] : [0, "Juro praticamente parado: sem efeito."]); }
    }
    const nd = par(d.ndx); if (nd) { const vn = (nd[0][1] / nd[1][1] - 1) * 100; add("Nasdaq 100 (fechamento)", fmt(nd[0][1], 2) + " pontos", diaBR(nd[0][0]) + " · " + mais(vn, 2) + "% no dia", "FRED/Nasdaq", vn >= 0.2 ? [1, "O índice fechou em alta: o humor do mercado está positivo."] : vn <= -0.2 ? [-1, "O índice fechou em queda: o humor do mercado está negativo."] : [0, "O índice fechou quase estável."]); }
    if (d.proximaDivulgacao) add("Próximo payroll", diaBR(d.proximaDivulgacao), "8h30 de Nova York", "BLS (calendário)");
    return L;
  }
  raiz.fatosDoDia = fatosDoDia; raiz.faseDoDia = faseDoDia;
  if (typeof module !== "undefined") module.exports = { fatosDoDia, faseDoDia };
})(typeof window !== "undefined" ? window : globalThis);
