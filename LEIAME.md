# Site mercadosemmisterio.com.br — anotações

Site estático (HTML, CSS e JS), sem build. Para ver localmente: `node ../aulas/_motor/servidor.js . 5578` dentro desta pasta → http://localhost:5578

## Páginas
- `index.html`: portal com faixa de cotações, sessões ao vivo, painel do mercado e agenda (widgets do TradingView), notícias (Supabase) e lista de contatos.
- `curso.html`: página de vendas (preço em `assets/site.js` → `CONFIG`).
- `aula-gratis/`: aula 9.3 completa (cópia do motor do curso, com o caminho `motor/`).
- `ferramentas/calculadora.html`: cópia da calculadora do curso.
- `privacidade.html` e `termos.html`: têm campos **[a preencher]** (nome/CPF ou CNPJ, e-mail, cidade/UF).

## Configuração (`assets/site.js` → `CONFIG`)
- `checkoutUrl`: link do checkout da Hotmart/Kiwify. Vazio = botões levam à lista de espera.
- `precoDe`, `precoPor`, `parcelas`: textos de preço usados nas páginas.

## Supabase — projeto "Mercado Sem Mistério" (kgyhgfxkhrdeucvsvehk, São Paulo, plano grátis)
- Tabela `noticias`: manchete, fonte, link e data; leitura pública; só a função escreve. Limpeza automática acima de 15 dias.
- Tabela `contatos`: o site só cadastra (com consentimento); ninguém lê pela API pública. Ver os contatos: painel do Supabase → Table Editor → contatos.
- Edge Function `atualizar-noticias`: 19 feeds RSS (Brasil, EUA, Europa, Ásia, bancos centrais), respeita a codificação de cada feed. Agendada pelo pg_cron a cada 15 min (`atualizar-noticias-15min`).
- Para pausar o projeto "Nuestro Impasto" foi preciso liberar a vaga do plano grátis (limite de 2 projetos ativos).

## Animações (`assets/anim.js`)
Candles decorativos no topo (`canvas[data-velas]`), linha das sessões em horário de Brasília (`[data-linha-sessoes]`), contadores (`[data-contar]`) e a simulação "o risco decide" (`[data-curvas-risco]`, 200 operações, 42% de acerto, payoff 1,5; a primeira exibição sempre mostra um caso típico). Tudo pausa fora da tela e respeita "reduzir movimento" do sistema.

## Dicas (Supabase, tabela `dicas`)
- Aparecem na página inicial (6 mais recentes) e em `dicas.html` (lista por categoria; `dicas.html?d=<slug>` abre o artigo).
- Para publicar uma dica nova: inserir uma linha em `dicas` com `publicado = true` (campos: slug, titulo, resumo, conteudo em HTML simples, categoria, aula). Categorias: mercado, risco, psicologia, tecnica, agenda, iniciante.
- As dicas são educativas: contexto e método, nunca "compre/venda" (recomendação exige registro na CVM).

## "Sobe e desce agora"
Widgets do TradingView: maiores altas e baixas da B3 (`hotlists`) e as bolsas do mundo por região (`market-quotes`).

## Publicar
Qualquer hospedagem de site estático serve (Netlify, Cloudflare Pages, Vercel). Basta enviar esta pasta. Depois, apontar o domínio mercadosemmisterio.com.br no Registro.br para a hospedagem.

## Fotos das aulas
`assets/img/aula-*.jpg` e `ferr-*.jpg` foram capturadas das aulas reais (1600×900) com o Chrome em modo headless.
