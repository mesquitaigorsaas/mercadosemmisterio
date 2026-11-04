/* Compra direta pelo site: janela com nome, e-mail e CPF → função "pagar" do Supabase → página segura do Mercado Pago.
   Qualquer link com data-comprar abre a janela; o curso vem de data-curso (forex, bolsa-do-zero ou day-trade). */
(() => {
  const FUNCAO = "https://kgyhgfxkhrdeucvsvehk.supabase.co/functions/v1/pagar";
  const CURSOS = {
    "forex": { nome: "Forex do Zero — Entenda e Aprenda a Operar", resumo: "99 aulas · 14 módulos · apostilas e certificado" },
    "bolsa-do-zero": { nome: "Aprenda Bolsa de Valores do Zero", resumo: "65 aulas · 10 módulos · prova e certificado" },
    "day-trade": { nome: "Day Trade — Dominando o Mini Índice e o Mini Dólar", resumo: "56 aulas · simulador de day trade · certificado" },
  };
  const HOTMART = { "forex": "https://pay.hotmart.com/B108196908U", "bolsa-do-zero": "https://pay.hotmart.com/V108276074N" };
  const PRECO = "R$ 97", PARCELAS = "à vista no Pix ou em até 12x no cartão";

  const css = `
  .cmp-fundo{position:fixed;inset:0;z-index:200;background:rgba(2,6,16,.78);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px}
  .cmp-fundo.on{display:flex}
  .cmp{position:relative;width:100%;max-width:480px;max-height:calc(100vh - 32px);overflow:auto;background:linear-gradient(180deg,#102a52,#0b1730);border:1px solid rgba(245,179,1,.35);border-radius:22px;padding:26px 24px 22px;box-shadow:0 40px 100px rgba(0,0,0,.6);color:#eef3fb}
  .cmp-x{position:absolute;top:12px;right:14px;background:none;border:0;color:#9fb0c6;font-size:26px;cursor:pointer;line-height:1}
  .cmp .eyebrow{display:block}
  .cmp h3{font-size:22px;margin:8px 0 4px}
  .cmp .res{color:#9fb0c6;font-size:14px;margin:0 0 14px}
  .cmp .preco{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);margin-bottom:18px}
  .cmp .preco b{font:800 30px "Plus Jakarta Sans",Inter,sans-serif}.cmp .preco span{color:#9fb0c6;font-size:14px}
  .cmp label{display:block;font:700 13.5px Inter,sans-serif;color:#cbd5e1;margin-bottom:12px}
  .cmp input[type=text],.cmp input[type=email]{display:block;width:100%;margin-top:6px;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#071428;color:#fff;font:500 16px Inter,sans-serif}
  .cmp input:focus{outline:2px solid rgba(245,179,1,.6);border-color:transparent}
  .cmp .aceite{display:flex;gap:10px;align-items:flex-start;font-weight:500;font-size:13px;color:#9fb0c6}
  .cmp .aceite input{margin-top:3px;width:18px;height:18px;flex:none}
  .cmp .btn{width:100%;justify-content:center;margin-top:6px}
  .cmp .msg{min-height:20px;margin:10px 0 0;font:600 14px Inter,sans-serif}.cmp .msg.erro{color:#fca5a5}.cmp .msg.ok{color:#86efac}
  .cmp .seguro{display:flex;flex-wrap:wrap;gap:6px 16px;justify-content:center;margin-top:14px;color:#9fb0c6;font:600 12.5px Inter,sans-serif}
  .cmp .obs{color:#7d93b3;font-size:12px;margin:12px 0 0;text-align:center}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  document.body.insertAdjacentHTML("beforeend", `
  <div class="cmp-fundo" id="cmpFundo" role="dialog" aria-modal="true" aria-labelledby="cmpTitulo">
    <div class="cmp">
      <button class="cmp-x" type="button" aria-label="Fechar">×</button>
      <span class="eyebrow">Inscrição</span>
      <h3 id="cmpTitulo"></h3>
      <p class="res" id="cmpResumo"></p>
      <div class="preco"><b>${PRECO}</b><span>${PARCELAS}</span></div>
      <form id="cmpForm" novalidate>
        <label>Nome completo<input type="text" name="nome" autocomplete="name" maxlength="120" required></label>
        <label>E-mail<input type="email" name="email" autocomplete="email" maxlength="200" required placeholder="o mesmo que vai usar para entrar no curso"></label>
        <label>CPF<input type="text" name="cpf" inputmode="numeric" autocomplete="off" maxlength="14" required placeholder="000.000.000-00"></label>
        <label class="aceite"><input type="checkbox" name="aceite"><span>Li e aceito os <a href="termos.html" target="_blank">termos de uso e o aviso de risco</a>. Entendo que o curso é educacional e não promete ganho.</span></label>
        <button class="btn btn-ouro btn-g" type="submit" id="cmpBotao">Ir para o pagamento seguro</button>
        <p class="msg" id="cmpMsg" role="status"></p>
      </form>
      <div class="seguro"><span>🔒 Pagamento pelo Mercado Pago</span><span>⚡ Pix, cartão ou boleto</span></div>
      <p class="obs">O acesso é liberado assim que o pagamento é aprovado. Para entrar na Área do aluno, use este e-mail e o seu CPF.</p>
    </div>
  </div>`);

  const fundo = document.getElementById("cmpFundo"), form = document.getElementById("cmpForm");
  const msg = (t, tipo) => { const m = document.getElementById("cmpMsg"); m.textContent = t; m.className = "msg " + (tipo || ""); };
  let curso = "forex";
  const abrir = (c) => {
    curso = CURSOS[c] ? c : "forex";
    document.getElementById("cmpTitulo").textContent = CURSOS[curso].nome;
    document.getElementById("cmpResumo").textContent = CURSOS[curso].resumo;
    msg(""); fundo.classList.add("on"); document.body.style.overflow = "hidden";
    setTimeout(() => form.nome.focus(), 50);
  };
  const fechar = () => { fundo.classList.remove("on"); document.body.style.overflow = ""; };
  fundo.addEventListener("click", (e) => { if (e.target === fundo || e.target.closest(".cmp-x")) fechar(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && fundo.classList.contains("on")) fechar(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-comprar]");
    if (!a) return;
    e.preventDefault(); abrir(a.dataset.curso);
  });
  /* link direto: ...?comprar=bolsa-do-zero abre a janela */
  const pedido = new URLSearchParams(location.search).get("comprar");
  if (pedido) abrir(pedido);

  form.cpf.addEventListener("input", () => {
    const d = form.cpf.value.replace(/\D/g, "").slice(0, 11);
    form.cpf.value = d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim(), email = form.email.value.trim(), cpf = form.cpf.value.replace(/\D/g, "");
    if (nome.split(/\s+/).length < 2) return msg("Informe o nome completo.", "erro");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Confira o e-mail.", "erro");
    if (cpf.length !== 11) return msg("Confira o CPF.", "erro");
    if (!form.aceite.checked) return msg("Para continuar, aceite os termos de uso.", "erro");
    const botao = document.getElementById("cmpBotao");
    botao.disabled = true; msg("Preparando o pagamento…");
    try {
      const r = await fetch(FUNCAO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curso, nome, email, cpf }) });
      const d = await r.json().catch(() => ({}));
      // 503 = Mercado Pago ainda sem token: Forex e Bolsa seguem pela Hotmart; o Day Trade só é vendido aqui
      if (r.status === 503 && HOTMART[curso]) { msg("Levando você ao pagamento seguro…", "ok"); location.href = HOTMART[curso]; return; }
      if (r.status === 503) { msg("As inscrições deste curso abrem em breve. Volte nos próximos dias.", "erro"); botao.disabled = false; return; }
      if (!r.ok || !d.url) { msg(d.erro || "Não foi possível iniciar o pagamento. Tente de novo.", "erro"); botao.disabled = false; return; }
      try { localStorage.setItem("msm.ultimo-pedido", d.codigo); } catch (_) {}
      msg("Tudo certo! Levando você ao Mercado Pago…", "ok");
      location.href = d.url;
    } catch (_) { msg("Sem conexão. Confira a internet e tente de novo.", "erro"); botao.disabled = false; }
  });
})();
