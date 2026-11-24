# Design · Orçamentos Wildner Design

Regras visuais do sistema de orçamentos. Valem para o painel (`assets/admin.css`) e para a proposta do cliente (`assets/proposta.css`). Siga estas regras em qualquer tela ou modelo novo.

## Princípios

1. **A proposta vende, o painel trabalha.** A proposta pode ter respiro, títulos grandes e mockups. O painel é denso, rápido de ler e sem enfeite.
2. **Uma cor de destaque por vez.** O verde marca a ação principal e o número mais importante da tela. Se tudo é verde, nada é.
3. **Fácil de entender em 30 segundos.** O valor, o prazo e o próximo passo devem estar visíveis sem precisar rolar.
4. **O PDF é parte do produto.** Cada mudança na proposta é conferida também em A4.

## Cores

Tem dois modos, escolhidos pelo seletor Escuro/Claro flutuante na lateral esquerda e lembrados no navegador. O **claro** é o padrão. No **claro**, o fundo é branco e o destaque em texto vira um verde escuro legível `#077A52` na proposta do cliente (decisão do Marcus em 24/11/2026); o verde vivo continua nos botões e formas.

### Modo escuro

| Token | Valor | Uso |
| --- | --- | --- |
| `--fundo` | `#111013` | Fundo de tudo |
| `--superficie` | `#242326` (proposta) / `#1b1a1d` (painel) | Cartões e painéis |
| `--superficie-elevada` | `#4d4c4e` | Barras do cronograma, botão secundário |
| `--texto` | `#ffffff` | Títulos e valores |
| `--texto-secundario` | `rgba(255,255,255,.75)` | Texto corrido |
| `--texto-suave` | `#82838c` | Rótulos, datas, legendas |
| `--verde` | `#0ffaa4` (hover `#04dc8d`) | Botão principal, destaque no título, valor aprovado |
| `--sobre-verde` | `#111013` | Texto em cima do verde |
| `--coral` | `#ff6a3d` | Cor de apoio, no máximo ~5% da tela: selo de desconto, status recusado, aviso de modo local. Nunca no botão principal |
| `--borda` / `--borda-sutil` | `rgba(255,255,255,.2)` / `.075` | Divisórias |

Status no painel: rascunho cinza, enviado lilás `#8f8fe8`, visualizado branco, aprovado verde, recusado coral.

## Tipografia

- **Títulos:** Playfair Display 900. A parte importante do título vai em verde (`<em>`), por exemplo "Um novo site para a **Pousada Maré Alta**".
- **Todo o resto:** DM Sans 400, 500, 600 e 700. Números sempre com `font-variant-numeric: tabular-nums` (classe `.num`).
- **Logo:** só o arquivo `img/logo-branco.png`. A fonte do logo (Exo) não é usada em texto.
- **Rótulos de seção:** DM Sans 500, maiúsculas, espaçamento 0,06–0,08em, em verde na proposta e cinza-suave no painel.

## Forma

- Raio dos cantos: `5.6px`. Pílulas (status, filtros) usam raio total.
- Ícones: Lucide, traço 1,5px, sempre pelo sprite `js/sprite.js` (`<use href="#i-nome">`).
- Bordas finas no lugar de sombras.

## Componentes

- **Botões:** principal verde (uma vez por área), secundário cinza, fantasma com borda.
- **Painel de números:** um bloco só, colunas separadas por linha fina, com a barra de valor por status embaixo.
- **Lista:** cliente com iniciais em círculo, número e data em cinza, valor alinhado à direita, ações aparecem ao passar o mouse.
- **Formulário:** seções numeradas que abrem e fecham. Cada campo tem rótulo acima e dica curta abaixo quando precisa.

## PDF (A4)

- Duas versões: **colorido** (igual à tela, no modo escolhido) e **preto e branco** (fundo branco, sem fundos chapados, imagens em cinza, para imprimir).
- Layout de computador reduzido (`zoom: .74`) para caber em A4 sem cair no layout de celular.
- Capa sozinha com o logo no topo e o mockup de celulares (`img/capa-celulares.webp`, trocável em Configurações → Empresa). No modo claro e no preto e branco o mockup fica num painel escuro de cantos arredondados.
- Logo depois da capa vem **Quem somos**: título, texto, serviços, contadores, diferenciais e o mural de logos das marcas (logos em cinza escuro com fundo transparente; no modo escuro viram brancos por filtro). Depois o conteúdo corre direto, sem página meio vazia; blocos não se partem e títulos não ficam sozinhos no pé da página.
- A cor do fundo da página, incluindo as margens, vem de `@page` e é ajustada pelo JS na hora de imprimir.
- Todas as formas de pagamento e os opcionais aparecem, com a escolha atual destacada.

## Textos

- Português do Brasil, frases curtas e diretas, tratando o cliente por "você".
- Datas como `23/11/2026`; valores como `R$ 9.800` (resumos) ou `R$ 9.800,00` (detalhe do preço).
- Botões com verbo: "Aprovar proposta", "Novo orçamento", "Baixar PDF".
