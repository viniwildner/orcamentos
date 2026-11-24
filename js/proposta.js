/* Página da proposta para o cliente: proposta.html?id=<uuid> */
(async function () {
  const app = document.getElementById('app');
  const id = new URLSearchParams(location.search).get('id');
  const aviso = (t, p) => { app.innerHTML = `<div class="aviso"><div><span class="aviso__logo">${WD.logo()}</span><h1>${t}</h1><p>${p}</p></div></div>`; };
  if (!id) return aviso('Proposta não encontrada', 'O link parece incompleto. Peça um novo link para a Wildner Design.');

  let r;
  try { r = await WD.store.publico(id); } catch (e) { console.error(e); }
  if (r && r.orcamento) { delete r.orcamento.interno; delete r.orcamento.historico; } // dados internos (comissão) nunca vão para o cliente
  if (r && r.orcamento && (r.orcamento.excluidoEm || r.orcamento.importado)) r = null;
  if (!r) return aviso('Proposta não encontrada', 'Este link não está mais disponível. Fale com a gente pelo WhatsApp (51) 98019-9884.');

  const o = r.orcamento;
  const cfg = JSON.parse(JSON.stringify(WD.CONFIG_PADRAO));
  if (r.config) { Object.assign(cfg, r.config); cfg.empresa = Object.assign({}, WD.CONFIG_PADRAO.empresa, r.config.empresa || {}); }

  document.title = `Proposta ${o.numero || ''} · ${o.cliente.empresa || cfg.empresa.nome}`;
  const acoes = `<button class="btn-icone btn-pdf so-tela" type="button" id="pdf" title="Baixar PDF" aria-label="Baixar PDF"><svg class="i" style="width:20px;height:20px"><use href="#i-download"/></svg></button>`;
  app.innerHTML = WD.renderProposta(o, cfg, { acoes });

  const ligar = () => {
    const bPdf = document.getElementById('pdf');
    [bPdf, ...document.querySelectorAll('[data-pdf]')].filter(Boolean).forEach(b => b.addEventListener('click', () => WD.menuPDF(b, modo => WD.imprimir(window, modo))));
    WD.ligarProposta(app, o, cfg, escolha => {
      WD.store.registrarEscolha(id, escolha).catch(e => console.warn(e));
      if (escolha.pedidoEm) {
        o.escolha = Object.assign({}, o.escolha, escolha);
        app.innerHTML = WD.renderProposta(o, cfg, { acoes });
        ligar();
        const fim = document.getElementById('aceite'); if (fim) fim.scrollIntoView();
      }
    });
  };
  ligar();
  WD.store.marcarVisto(id).catch(() => {});
  if (location.hash) { const alvo = document.querySelector(location.hash); if (alvo) alvo.scrollIntoView(); }
  const pedido = new URLSearchParams(location.search).get('pdf');
  if (pedido) setTimeout(() => WD.imprimir(window, pedido === 'pb' ? 'pb' : 'cor'), 600);
})();
