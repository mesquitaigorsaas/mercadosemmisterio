/* Compra: todos os botões com data-comprar levam direto ao checkout da Hotmart do curso.
   O curso vem de data-curso (forex, bolsa-do-zero, day-trade, price-action, swing-trade ou nasdaq);
   sem data-curso, vale o curso da própria página. Link direto: ...?comprar=bolsa-do-zero leva ao checkout.
   (A compra pelo Mercado Pago, função "pagar" do Supabase, ficou desligada no site em 12/11/2026.) */
(() => {
  const HOTMART = {
    "forex": "https://pay.hotmart.com/B108196908U",
    "bolsa-do-zero": "https://pay.hotmart.com/V108276074N",
    "day-trade": "https://pay.hotmart.com/O108276123F",
    "price-action": "https://pay.hotmart.com/H108451175O",
    "swing-trade": "https://pay.hotmart.com/M108459916G",
    "nasdaq": "https://pay.hotmart.com/U108449993E",
  };
  const PAGINA = { "curso-bolsa": "bolsa-do-zero", "curso-day-trade": "day-trade", "curso-price-action": "price-action", "curso-swing-trade": "swing-trade", "curso-nasdaq": "nasdaq" };
  const daPagina = PAGINA[(location.pathname.split("/").pop() || "").replace(/\.html$/, "")] || "forex";
  const link = (c) => HOTMART[c] || HOTMART[daPagina];

  const ligar = () => document.querySelectorAll("[data-comprar]").forEach((a) => {
    a.href = link(a.dataset.curso);
    a.removeAttribute("target");
    a.rel = "noopener";
  });
  ligar();
  /* garante o destino mesmo se outro script mexer no href antes do clique */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-comprar]");
    if (!a) return;
    e.preventDefault();
    location.href = link(a.dataset.curso);
  });

  const pedido = new URLSearchParams(location.search).get("comprar");
  if (pedido !== null) location.replace(link(pedido));
})();
