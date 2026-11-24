/* Monta a proposta (HTML) a partir dos dados do orçamento.
   Usado no painel (pré-visualização) e na página do cliente (proposta.html). */
window.WD = window.WD || {};

(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v, cents = true) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  const ic = (id, cls = 'i') => `<svg class="${cls}"><use href="#i-${esc(id)}"/></svg>`;
  const fmtData = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + Number(n || 0)); return d.toISOString().slice(0, 10); };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${Number(d)} de ${MESES[Number(m) - 1]} de ${y}`; };

  WD.util = { esc, brl, fmtData, addDias, dataExtenso };

  /* Título com a parte do cliente em verde: "Um novo site para a {cliente}" */
  function titulo(o) {
    const nome = esc(o.cliente.empresa || 'sua empresa');
    const t = esc(o.titulo || '{cliente}');
    return t.includes('{cliente}') ? t.replace('{cliente}', `<em>${nome}</em>`) : t;
  }

  WD.semanasTotais = o => Math.max(1, ...(o.etapas || []).map(e => Number(e.inicio || 1) + Number(e.duracao || 1) - 1));

  /* Cálculo de valores (usado na tela e no texto do WhatsApp) */
  WD.calcular = function (o, escolha) {
    escolha = escolha || {};
    const marcados = escolha.opcionais || (o.opcionais || []).map(x => !!x.marcado);
    let total = Number(o.valorBase || 0);
    const linhas = [[o.descricaoBase || 'Projeto', total]];
    let mensal = 0;
    (o.opcionais || []).forEach((op, i) => {
      if (!marcados[i]) return;
      if (op.tipo === 'mensal') mensal += Number(op.valor || 0);
      else { total += Number(op.valor || 0); linhas.push([op.nome, Number(op.valor || 0)]); }
    });
    const p = o.pagamento || {};
    const formas = WD.ordemPagamento(p).filter(k => p[k] && p[k].ativo);
    let forma = escolha.pagamento || o.pagamentoPadrao;
    if (!formas.includes(forma)) forma = formas[0] || 'parcelado';
    const desc = p.avista ? Number(p.avista.desconto || 0) : 0;
    const avista = total * (1 - desc / 100);
    const nParc = p.parcelado ? Number(p.parcelado.parcelas || 1) : 1;
    const entrada = p.parcelado ? total * Number(p.parcelado.entradaPct || 0) / 100 : 0;
    const parcela = (total - entrada) / nParc;
    const nCartao = p.cartao ? Number(p.cartao.parcelas || 1) : 1;
    const cartao = total / nCartao;
    const final = forma === 'avista' ? avista : total;
    return { total, linhas, mensal, forma, formas, desc, avista, entrada, nParc, parcela, nCartao, cartao, final, marcados };
  };

  /* ---------- Andamento: histórico de status, comissão e prazo ---------- */
  WD.NOMES_STATUS = { criado: 'Criado', rascunho: 'Rascunho', enviado: 'Enviado', visualizado: 'Visualizado', aprovado: 'Aprovado', recusado: 'Recusado' };
  /* Acrescenta um evento ao histórico do orçamento (não repete o mesmo status seguido) */
  WD.registrar = function (o, status, por) {
    o.historico = Array.isArray(o.historico) ? o.historico : WD.historico(o);
    const ult = o.historico[o.historico.length - 1];
    if (ult && ult.status === status) return;
    o.historico.push({ status, em: new Date().toISOString(), por: por || 'voce' });
  };
  /* Histórico completo: o que foi gravado + datas antigas (data, enviadoEm, vistoEm, aprovadoEm) */
  WD.historico = function (o) {
    const h = (Array.isArray(o.historico) ? o.historico : []).filter(e => e && e.status && e.em).map(e => Object.assign({}, e));
    const tem = s => h.some(e => e.status === s);
    const add = (status, em, por) => { if (em && !tem(status)) h.push({ status, em: String(em), por, derivado: true }); };
    add('criado', o.criadoEm || (o.data ? o.data + 'T12:00:00' : null), 'voce');
    add('enviado', o.enviadoEm, 'voce');
    add('visualizado', o.vistoEm, 'cliente');
    add('aprovado', o.escolha && o.escolha.aprovadoEm, 'cliente');
    return h.sort((a, b) => new Date(a.em) - new Date(b.em));
  };
  /* Data em que o orçamento entrou no status atual */
  WD.dataStatus = function (o, h) {
    h = h || WD.historico(o);
    const st = o.status || 'rascunho';
    for (let i = h.length - 1; i >= 0; i--) if (h[i].status === st || (st === 'rascunho' && h[i].status === 'criado')) return h[i].em;
    return o.atualizadoEm || null;
  };
  /* Comissão sobre o valor que o cliente paga na forma escolhida (ou a padrão) */
  WD.comissao = function (o) {
    const c = WD.calcular(o, o.escolha);
    const it = o.interno || {}; const pct = Number(it.comissaoPct || 0);
    const valor = pct > 0 ? c.final * pct / 100 : 0;
    return { pct, para: it.comissaoPara || '', valor, bruto: c.final, liquido: c.final - valor, forma: c.forma, mensal: c.mensal };
  };
  /* Cronograma com datas reais: começa na aprovação (ou na data de início definida) */
  const diaISO = d => { const x = new Date(d); return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return diaISO(d); };
  WD.cronograma = function (o, h) {
    h = h || WD.historico(o);
    const ap = [...h].reverse().find(e => e.status === 'aprovado');
    const inicio = (o.interno && o.interno.inicio) || (ap ? diaISO(ap.em) : null);
    if (!inicio) return null;
    const etapas = (o.etapas || []).map(e => {
      const ini = Number(e.inicio || 1), dur = Math.max(1, Number(e.duracao || 1));
      return { nome: e.nome, tipo: e.tipo, de: somaDias(inicio, (ini - 1) * 7), ate: somaDias(inicio, (ini + dur - 1) * 7 - 1) };
    });
    const entrega = etapas.length ? etapas.map(e => e.ate).sort().pop() : somaDias(inicio, WD.semanasTotais(o) * 7 - 1);
    return { inicio, entrega, etapas, semanas: WD.semanasTotais(o), manual: !!(o.interno && o.interno.inicio) };
  };
  WD.diasAte = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(diaISO(new Date()) + 'T12:00:00')) / 86400000);
  /* Resumo usado na lista e no painel */
  WD.resumoOrc = function (o) {
    const h = WD.historico(o);
    const com = WD.comissao(o);
    const st = o.status || 'rascunho';
    const crono = st === 'aprovado' ? WD.cronograma(o, h) : null;
    return {
      id: o.id, numero: o.numero, cliente: (o.cliente && o.cliente.empresa) || '', contato: (o.cliente && o.cliente.contato) || '',
      whatsapp: (o.cliente && o.cliente.whatsapp) || '', email: (o.cliente && o.cliente.email) || '',
      status: st, tipo: o.tipo || 'website', valor: com.bruto, comissao: com.valor, comissaoPara: com.para, liquido: com.liquido, mensal: com.mensal,
      historico: h, dataStatus: WD.dataStatus(o, h), entrega: crono && crono.entrega, inicio: crono && crono.inicio,
      atualizado_em: o.atualizadoEm || o.data
    };
  };

  WD.FORMAS_PAG = ['avista', 'parcelado', 'cartao'];
  WD.NOMES_PAG = { avista: 'À vista no Pix', parcelado: 'Entrada + parcelas', cartao: 'Cartão de crédito' };
  WD.ordemPagamento = function (p) {
    const o = ((p && p.ordem) || []).filter(k => WD.FORMAS_PAG.includes(k));
    return o.concat(WD.FORMAS_PAG.filter(k => !o.includes(k)));
  };
  /* Título e descrição de cada forma: texto livre do orçamento ou o padrão.
     Atalhos: {desconto} {entrada} {parcelas} {cartao} */
  WD.textosPagamento = function (forma, p, c) {
    const x = (p && p[forma]) || {};
    const pad = {
      avista: ['À vista no Pix', 'Pagamento único na assinatura'],
      parcelado: c.entrada > 0 ? ['Entrada + {parcelas} parcelas', '{entrada}% na assinatura e o restante em {parcelas}x sem juros'] : ['{parcelas} parcelas', 'Em {parcelas}x sem juros'],
      cartao: ['Cartão de crédito', 'Em até {cartao}x, com as taxas da operadora']
    }[forma];
    const sub = t => String(t).replace(/\{desconto\}/g, c.desc).replace(/\{entrada\}/g, p.parcelado ? p.parcelado.entradaPct : 0).replace(/\{parcelas\}/g, c.nParc).replace(/\{cartao\}/g, c.nCartao);
    return [sub(x.titulo || pad[0]), sub(x.descricao || pad[1])];
  };

  WD.textoForma = function (c) {
    if (c.forma === 'avista') return `à vista no Pix, com ${c.desc}% off`;
    if (c.forma === 'cartao') return `em até ${c.nCartao}x no cartão`;
    return c.entrada > 0 ? `entrada + ${c.nParc} parcelas` : `em ${c.nParc} parcelas`;
  };

  function mockupCapa() {
    const site = cel => `<div class="site ${cel ? 'site--cel ' : ''}s-mare"><div class="site__nav"><b></b>${cel ? '' : '<i></i><i></i><i></i>'}</div><div class="site__hero">${cel ? '<div class="site__img"></div><div class="t"><span></span><span class="p"></span><span class="p"></span><span class="b"></span></div>' : '<div class="t"><span></span><span></span><span class="p"></span><span class="p"></span><span class="b"></span></div><div class="site__img"></div>'}</div><div class="site__faixa"><i></i><i></i>${cel ? '' : '<i></i>'}</div></div>`;
    return `<div class="palco" aria-hidden="true"><div class="palco__circulo"></div><div class="note"><div class="note__tela">${site(false)}</div><div class="note__base"></div></div><div class="cel">${site(true)}</div></div>`;
  }

  WD.renderProposta = function (o, cfg, opts) {
    opts = opts || {};
    const E = cfg.empresa;
    const c = WD.calcular(o, o.escolha);
    const validoAte = WD.util.addDias(o.data, o.validadeDias);
    const semanas = WD.semanasTotais(o);
    const num = o.numero || 'rascunho';
    const port = (o.portfolio || []).map(id => cfg.portfolio.find(p => p.id === id)).filter(Boolean);
    const deps = (o.depoimentos || []).map(id => cfg.depoimentos.find(d => d.id === id)).filter(Boolean);
    const sub = s => String(s).replace('{suporte}', o.suporteDias).replace('{hora}', brl(o.horaTecnica, false)).replace('{validade}', o.validadeDias).replace('{validoAte}', fmtData(validoAte));
    const totalPaginas = 1 + (o.mapa || []).reduce((n, m) => n + 1 + (m.sub || []).length, 0);
    const paginas = o.paginasQtd || totalPaginas;
    const secoes = [];
    const indice = [];
    const add = (id, nome, html) => { indice.push([id, nome]); secoes.push(html); };

    add('capa', 'Apresentação', `
    <section class="folha capa" id="capa">
      <span class="so-print logo-print">${WD.logo(opts.base, esc(E.nome))}</span>
      <div>
        <p class="rotulo">Proposta de website</p>
        <h1>${titulo(o)}</h1>
        ${o.abertura ? `<p class="lead">${esc(o.abertura)}</p>` : ''}
        <dl class="ficha">
          <div><dt>Preparado para</dt><dd>${esc(o.cliente.contato || o.cliente.empresa || '—')}</dd></div>
          <div><dt>Data</dt><dd class="num">${fmtData(o.data)}</dd></div>
          <div><dt>Válida até</dt><dd class="num">${fmtData(validoAte)}</dd></div>
        </dl>
      </div>
      ${E.imagemCapa ? `<div class="palco palco--foto" aria-hidden="true"><img src="${esc(E.imagemCapa)}" alt=""></div>` : mockupCapa()}
    </section>`);

    const marcas = (E.marcas || []).map(m => typeof m === 'string' ? { nome: m, logo: '' } : m).filter(m => m && m.nome);
    const tituloSobre = (() => { const t = esc(E.sobreTitulo || `Somos a ${E.nome}`); const n = esc(E.nome); return t.includes(n) ? t.replace(n, `<em>${n}</em>`) : t.replace(/(\S+)$/, '<em>$1</em>'); })();
    add('sobre', 'Quem somos', `
    <section class="folha" id="sobre">
      <div class="sobre">
        <div>
          <p class="rotulo">Quem somos</p>
          <h2 class="titulo">${tituloSobre}</h2>
          <p class="lead">${esc(E.sobre)}</p>
          ${(E.servicos || []).length ? `<ul class="servicos">${E.servicos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <div class="contadores"><div class="contador"><b class="num">${esc(E.clientes)}</b><span>Clientes<br>atendidos</span></div><div class="contador"><b class="num">${esc(E.anos)}</b><span>Anos de<br>experiência</span></div></div>
        </div>
        <div class="difs">${(cfg.diferenciais || []).map(d => `<div class="dif"><div class="ic">${ic(d.icone)}</div><div><h3>${esc(d.titulo)}</h3><p>${esc(d.texto)}</p></div></div>`).join('')}</div>
      </div>
      ${marcas.length ? `<div class="marcas"><p class="rotulo">Marcas que confiam na ${esc(E.nome)}</p><ul>${marcas.map(m => `<li title="${esc(m.nome)}">${m.logo ? `<img src="${esc(m.logo)}" alt="${esc(m.nome)}" loading="lazy">` : `<span>${esc(m.nome)}</span>`}</li>`).join('')}</ul></div>` : ''}
    </section>`);

    add('resumo', 'Resumo', `
    <section class="folha" id="resumo">
      <div class="cab"><p class="rotulo">Em resumo</p><h2 class="titulo">A proposta em <em>30 segundos</em></h2></div>
      <div class="resumo">
        <div class="kpi">${ic('wallet')}<div class="kpi__v verde num" data-total>R$ ${brl(c.final, false)}</div><div class="kpi__l">Investimento no projeto<br><span data-forma>${esc(WD.textoForma(c))}</span></div></div>
        <div class="kpi">${ic('calendar')}<div class="kpi__v num">${semanas} semana${semanas > 1 ? 's' : ''}</div><div class="kpi__l">Do briefing ao site no ar</div></div>
        <div class="kpi">${ic('layout')}<div class="kpi__v num">${paginas} página${paginas > 1 ? 's' : ''}</div><div class="kpi__l">Com painel para editar o conteúdo</div></div>
        <div class="kpi">${ic('life')}<div class="kpi__v num">${esc(o.suporteDias)} dias</div><div class="kpi__l">De suporte e ajustes depois da publicação</div></div>
      </div>
    </section>`);

    if (o.contexto || (o.objetivos || []).length) add('objetivo', 'Seu objetivo', `
    <section class="folha" id="objetivo">
      <div class="cab"><p class="rotulo">O que entendemos</p><h2 class="titulo">Seu objetivo com o <em>novo site</em></h2>${o.contexto ? `<p class="lead">${esc(o.contexto)}</p>` : ''}</div>
      <div class="objetivos">${(o.objetivos || []).map(x => `<div class="obj">${ic(x.icone)}<h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div>
    </section>`);

    if (port.length) add('portfolio', 'Projetos', `
    <section class="folha" id="portfolio">
      <div class="cab"><p class="rotulo">Projetos recentes</p><h2 class="titulo">Alguns sites que <em>já entregamos</em></h2><p class="lead">Clique em cada um para ver o projeto completo.</p></div>
      <div class="port">${port.map(p => `
        <article class="proj">
          <a class="proj__img" href="${esc(p.link)}" target="_blank" rel="noopener">${p.imagem ? `<img class="proj__foto" src="${esc(p.imagem)}" alt="Site ${esc(p.nome)}" loading="lazy">` : ''}</a>
          <div class="proj__meta"><span class="tag">${esc(p.segmento)}</span></div>
          <h3>${esc(p.nome)}</h3><p>${esc(p.texto)}</p>
          ${p.link ? `<a class="proj__link" href="${esc(p.link)}" target="_blank" rel="noopener">Ver projeto</a>` : ''}
        </article>`).join('')}</div>
    </section>`);

    const nRamos = (o.mapa || []).length;
    add('escopo', 'O que vamos criar', `
    <section class="folha" id="escopo">
      <div class="cab"><p class="rotulo">O que vamos criar</p><h2 class="titulo">O mapa do seu <em>novo site</em></h2><p class="lead">Estas são todas as páginas do projeto e como elas se conectam. Tudo o que está aqui está no preço.</p></div>
      <div class="mapa"><div class="arvore">
        <div class="no no--raiz">Início<small>página principal</small></div>
        ${nRamos ? `<div class="tronco"></div><div class="ramos${nRamos === 1 ? ' ramos--um' : ''}">${o.mapa.map(m => `<div class="ramo"><div class="no">${esc(m.nome)}</div>${(m.sub || []).length ? `<div class="sub">${m.sub.map(s => `<div class="no">${esc(s)}</div>`).join('')}</div>` : ''}</div>`).join('')}</div>` : ''}
        ${(o.utilitarias || []).length ? `<div class="util">${o.utilitarias.map(u => `<div class="no">${esc(u)}</div>`).join('')}</div>` : ''}
      </div></div>
      ${(o.paginasDetalhe || []).length ? `<div class="paginas">${o.paginasDetalhe.map(p => `<div class="pag"><h3>${esc(p.titulo)} <span>${esc(p.qtd)}</span></h3><ul>${(p.itens || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>` : ''}
      ${(o.funcionalidades || []).length ? `<h3 class="sub-t">Funcionalidades incluídas</h3><div class="funcs">${o.funcionalidades.map(f => `<div class="func">${ic(f.icone)}<div><b>${esc(f.titulo)}</b><span>${esc(f.texto)}</span></div></div>`).join('')}</div>` : ''}
    </section>`);

    const aprov = (o.etapas || []).find(e => e.tipo === 'aprovacao');
    const fim = (o.etapas || []).find(e => e.tipo === 'final');
    add('processo', 'Prazo e etapas', `
    <section class="folha" id="processo">
      <div class="cab"><p class="rotulo">Prazo e etapas</p><h2 class="titulo">Seu site no ar em <em>${semanas} semana${semanas > 1 ? 's' : ''}</em></h2><p class="lead">Você aprova cada etapa antes de seguirmos para a próxima. O prazo conta a partir do pagamento da entrada e do envio dos materiais.</p></div>
      <div class="gantt"><div class="gantt__grid" style="grid-template-columns:220px repeat(${semanas},minmax(0,1fr))">
        <div></div>${Array.from({ length: semanas }, (_, i) => `<div class="gantt__sem">Sem ${i + 1}</div>`).join('')}
        ${(o.etapas || []).map((e, i) => {
          const ini = Math.max(1, Number(e.inicio || 1)), dur = Math.max(1, Number(e.duracao || 1));
          const cls = e.tipo === 'aprovacao' ? ' barra--aprov' : e.tipo === 'final' ? ' barra--fim' : '';
          return `<div class="gantt__et" style="grid-row:${i + 2};grid-column:1"><b><span>${i + 1}</span>${esc(e.nome)}</b><small>${esc(e.desc)}</small></div>` +
            `<div class="barra${cls}" style="grid-row:${i + 2};grid-column:${ini + 1} / span ${Math.min(dur, semanas - ini + 1)}">${esc(e.barra || e.nome)}</div>`;
        }).join('')}
      </div></div>
      <div class="marcos">
        ${aprov ? `<div class="marco">${ic('eye')}<div><b>Você vê o layout na semana ${esc(aprov.inicio)}</b><span>${esc(aprov.desc)}</span></div></div>` : ''}
        ${fim ? `<div class="marco">${ic('flag')}<div><b>Site de teste na semana ${Math.max(1, Number(fim.inicio))}</b><span>Navegue e revise antes de publicar.</span></div></div>` : ''}
        <div class="marco">${ic('rocket')}<div><b>No ar na semana ${semanas}</b><span>Com ${esc(o.suporteDias)} dias de suporte inclusos.</span></div></div>
      </div>
    </section>`);

    const p = o.pagamento || {};
    const opcao = (forma, titulo, desc, valor, selo) => `<label class="opcao${c.forma === forma ? ' on' : ''}" data-pag="${forma}"><input type="radio" name="pag" value="${forma}"${c.forma === forma ? ' checked' : ''}><span class="marca"></span><span><b>${titulo}${selo ? ` <span class="selo" style="margin-left:6px">${selo}</span>` : ''}</b><span class="d">${desc}</span></span><span class="v num" data-v="${forma}">${valor}</span></label>`;
    add('investimento', 'Investimento', `
    <section class="folha" id="investimento">
      <div class="cab"><p class="rotulo">Investimento</p><h2 class="titulo">Escolha como prefere <em>pagar</em></h2><p class="lead">Marque a forma de pagamento e os serviços opcionais. O valor se atualiza na hora.</p></div>
      <div class="inv">
        <div>
          <div class="preco"><div class="preco__l">Total do projeto</div><div class="preco__v"><small>R$</small><span data-total-n>${brl(c.final)}</span></div><div class="linhas" data-linhas></div></div>
          <div class="pagto" role="radiogroup" aria-label="Forma de pagamento">
            ${c.formas.map(k => { const [t, d] = WD.textosPagamento(k, p, c).map(esc); return opcao(k, t, d, k === 'avista' ? 'R$ ' + brl(c.avista) : '', k === 'avista' && c.desc ? c.desc + '% off' : ''); }).join('')}
          </div>
        </div>
        ${(o.opcionais || []).length ? `<div class="extras">
          <h3>Serviços opcionais</h3><p class="ajuda so-tela"><b>Você escolhe:</b> toque para marcar os serviços que quer incluir ou desmarcar os que não quer. O total se atualiza na hora.</p><p class="ajuda so-print">Serviços que podem ser incluídos no projeto. Os marcados já estão somados no total.</p>
          ${o.opcionais.map((op, i) => `<label class="opcao extra${c.marcados[i] ? ' on' : ''}" data-extra="${i}"><input type="checkbox"${c.marcados[i] ? ' checked' : ''}><span class="marca"></span><span><b>${esc(op.nome)}</b><span class="d">${esc(op.desc)}</span><span class="estado so-tela"><span class="e-add">+ Adicionar</span><span class="e-ok">Incluído · toque para remover</span></span></span><span class="v num">R$ ${brl(op.valor, false)}${op.tipo === 'mensal' ? '<small>por mês</small>' : ''}</span></label>`).join('')}
          <div class="mensal"><span>Mensalidade a partir da publicação</span><b data-mensal></b></div>
        </div>` : ''}
      </div>
    </section>`);

    add('incluso', 'O que está incluso', `
    <section class="folha" id="incluso">
      <div class="cab"><p class="rotulo">Sem surpresas</p><h2 class="titulo">O que está e o que <em>não está</em> incluso</h2></div>
      <div class="inc">
        <div class="card sim"><h3>Incluso no projeto</h3><ul>${(o.incluso || []).map(t => `<li>${ic('check')}${esc(t)}</li>`).join('')}</ul></div>
        <div class="card nao"><h3>Não incluso</h3><ul>${(o.naoIncluso || []).map(t => `<li>${ic('x')}${esc(t)}</li>`).join('')}</ul></div>
      </div>
    </section>`);

    if (deps.length) add('depoimentos', 'Depoimentos', `
    <section class="folha" id="depoimentos">
      <div class="cab"><p class="rotulo">Depoimentos</p><h2 class="titulo">O que falam sobre o <em>nosso trabalho</em></h2></div>
      <div class="depo">${deps.map(d => `<figure class="card quote" style="margin:0"><blockquote>${esc(d.texto)}</blockquote><figcaption class="autor">${d.foto ? `<img src="${esc(d.foto)}" alt="" loading="lazy">` : `<i>${esc(d.nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 1).join('') + (d.nome.split(' ').slice(-1)[0] || '')[0])}</i>`}<div><b>${esc(d.nome)}</b><span>${esc(d.empresa)}</span></div></figcaption></figure>`).join('')}</div>
    </section>`);

    add('condicoes', 'Condições', `
    <section class="folha" id="condicoes">
      <div class="cab"><p class="rotulo">Condições gerais</p><h2 class="titulo">Combinado <em>não sai caro</em></h2></div>
      <div class="conds">${(o.condicoes || []).map((x, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(x.titulo)}${ic('plus')}</summary><p>${esc(sub(x.texto))}</p></details>`).join('')}</div>
    </section>`);

    const aprovado = o.escolha && o.escolha.aprovadoEm;
    add('aceite', 'Próximos passos', `
    <section class="folha" id="aceite">
      <div class="aceite">
        <div>
          <p class="rotulo">Próximos passos</p>
          <h2 class="titulo">${aprovado ? 'Proposta aprovada' : 'Vamos começar?'}</h2>
          <ol class="passos">
            <li><span><b>Aprove a proposta</b>Pelo botão de aprovar ou respondendo no WhatsApp.</span></li>
            <li><span><b>Assinatura e entrada</b>Enviamos o contrato digital e o Pix da entrada.</span></li>
            <li><span><b>Reunião de imersão</b>Em até 3 dias úteis marcamos a primeira conversa.</span></li>
          </ol>
          <div class="contato">
            ${E.telefoneExibicao ? `<a href="https://wa.me/${esc(String(E.whatsapp || '').replace(/\D/g, ''))}" target="_blank" rel="noopener">${ic('whats')}${esc(E.telefoneExibicao)}</a>` : ''}
            ${E.email ? `<a href="mailto:${esc(E.email)}">${ic('mail')}${esc(E.email)}</a>` : ''}
            ${E.site ? `<a href="${esc(/^https?:/.test(E.site) ? E.site : 'https://' + E.site)}" target="_blank" rel="noopener">${ic('globe')}${esc(E.site.replace(/^https?:\/\//, ''))}</a>` : ''}
          </div>
        </div>
        <div class="assin">
          <div class="ctas so-tela">
            <a class="btn btn--p" id="aprovar" href="https://wa.me/${esc(E.whatsapp)}" target="_blank" rel="noopener">${aprovado ? 'Falar no WhatsApp' : 'Aprovar pelo WhatsApp'}</a>
            <a class="btn btn--s" href="https://wa.me/${esc(E.whatsapp)}" target="_blank" rel="noopener">Tirar uma dúvida</a>
            ${opts.acoes ? `<button class="btn btn--s" type="button" data-pdf>Baixar PDF</button>` : ''}
          </div>
          <div class="linhas-a"><div>${esc(E.responsavel)}<br>${esc(E.nome)}</div><div>${esc(o.cliente.contato || '')}<br>${esc(o.cliente.empresa || '')}</div></div>
        </div>
      </div>
      <footer class="rodape"><span class="rodape__logo">${WD.logo(opts.base, esc(E.nome))}</span><span>${esc(E.cidade)}, ${dataExtenso(o.data)} · Proposta ${esc(num)}</span></footer>
    </section>`);

    return `${WD.SPRITE}
<header class="topo"><div class="topo__in">
  <span class="topo__logo">${WD.logo(opts.base, esc(E.nome))}</span>
  <div class="topo__meta">Proposta <b class="num">${esc(num)}</b></div>
  ${opts.acoes || ''}
  ${opts.semTema ? '' : WD.botaoTema('btn-icone so-tela')}
  <a class="btn btn--p so-tela" href="#aceite">Aprovar<span class="so-largo"> proposta</span></a>
</div></header>
<div class="casca">
  <nav class="indice" aria-label="Seções da proposta"><ol>${indice.map(([id, n]) => `<li><a href="#${id}">${n}</a></li>`).join('')}</ol></nav>
  <main>${secoes.join('\n')}</main>
</div>
<div class="barra-ap so-tela" aria-hidden="true"><div><small data-barra-forma></small><b class="num" data-barra-total></b></div><a class="btn btn--p" href="#aceite" tabindex="-1">${aprovado ? 'Ver próximos passos' : 'Aprovar proposta'}</a></div>`;
  };

  /* ---------- PDF: colorido (como na tela) ou preto e branco (fundo branco) ---------- */
  function ajustarPagina(win) {
    const d = win.document;
    let s = d.getElementById('wd-pagina');
    if (!s) { s = d.createElement('style'); s.id = 'wd-pagina'; d.head.appendChild(s); }
    const cor = win.getComputedStyle(d.documentElement).getPropertyValue('--fundo').trim() || '#111013';
    s.textContent = `@page{background:${cor}}`;
  }
  WD.ajustarPagina = ajustarPagina;
  WD.imprimir = function (win, modo) {
    const d = win.document, root = d.documentElement;
    if (modo === 'pb') root.dataset.impressao = 'pb'; else delete root.dataset.impressao;
    d.querySelectorAll('.conds details').forEach(x => { x.open = true; });
    ajustarPagina(win);
    const fim = () => { delete root.dataset.impressao; ajustarPagina(win); win.removeEventListener('afterprint', fim); };
    win.addEventListener('afterprint', fim);
    win.focus(); win.print();
  };
  WD.menuPDF = function (botao, aoEscolher) {
    document.querySelectorAll('.menu-pdf').forEach(m => m.remove());
    const m = document.createElement('div');
    m.className = 'menu-pdf'; m.setAttribute('role', 'menu');
    m.innerHTML = `<button type="button" role="menuitem" data-m="cor"><svg><use href="#i-palette"/></svg><span>PDF colorido<small>Igual à tela, para enviar ao cliente</small></span></button>` +
      `<button type="button" role="menuitem" data-m="pb"><svg><use href="#i-printer"/></svg><span>Preto e branco<small>Fundo branco e pouca tinta, para imprimir</small></span></button>`;
    (botao.closest('dialog') || document.body).appendChild(m);
    const r = botao.getBoundingClientRect();
    const acima = r.bottom + m.offsetHeight + 12 > innerHeight;
    m.style.top = (acima ? r.top - m.offsetHeight - 6 : r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + 'px';
    const fechar = () => { m.remove(); document.removeEventListener('pointerdown', fora, true); document.removeEventListener('keydown', tecla, true); };
    const fora = e => { if (!m.contains(e.target) && !botao.contains(e.target)) fechar(); };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); botao.focus(); } };
    setTimeout(() => { document.addEventListener('pointerdown', fora, true); document.addEventListener('keydown', tecla, true); });
    m.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; fechar(); aoEscolher(b.dataset.m); });
    m.querySelector('button').focus();
  };

  /* Interatividade: escolha de pagamento e opcionais, índice ativo, link de aprovação */
  WD.ligarProposta = function (root, o, cfg, aoEscolher) {
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const estado = { pagamento: (o.escolha && o.escolha.pagamento) || null, opcionais: (o.escolha && o.escolha.opcionais) || (o.opcionais || []).map(x => !!x.marcado) };

    function atualizar(notificar) {
      const c = WD.calcular(o, estado);
      estado.pagamento = c.forma;
      $$('.opcao[data-pag]').forEach(el => { const on = el.dataset.pag === c.forma; el.classList.toggle('on', on); el.querySelector('input').checked = on; });
      $$('.extra').forEach(el => { const on = !!estado.opcionais[el.dataset.extra]; el.classList.toggle('on', on); el.querySelector('input').checked = on; });
      const vp = $('[data-v="parcelado"]'); if (vp) vp.textContent = c.entrada > 0 ? `R$ ${brl(c.entrada)} + ${c.nParc}x ${brl(c.parcela)}` : `${c.nParc}x R$ ${brl(c.parcela)}`;
      const vc = $('[data-v="cartao"]'); if (vc) vc.textContent = `${c.nCartao}x R$ ${brl(c.cartao)}`;
      const va = $('[data-v="avista"]'); if (va) va.textContent = `R$ ${brl(c.avista)}`;
      $('[data-total-n]').textContent = brl(c.final);
      $('[data-total]').textContent = 'R$ ' + brl(c.final, false);
      $('[data-forma]').textContent = WD.textoForma(c);
      let h = c.linhas.map(([n, v]) => `<div class="linha"><span>${esc(n)}</span><b>R$ ${brl(v)}</b></div>`).join('');
      if (c.forma === 'avista' && c.desc) h += `<div class="linha"><span>Desconto à vista (${c.desc}%)</span><b>− R$ ${brl(c.total - c.avista)}</b></div>`;
      const rot = c.forma === 'avista' ? 'Total à vista' : c.forma === 'cartao' ? `${c.nCartao}x no cartão` : c.entrada > 0 ? `Entrada de R$ ${brl(c.entrada)} + ${c.nParc}x` : `${c.nParc}x`;
      const val = c.forma === 'avista' ? c.avista : c.forma === 'cartao' ? c.cartao : c.parcela;
      h += `<div class="linha linha--total"><span>${rot}</span><b>R$ ${brl(val)}</b></div>`;
      $('[data-linhas]').innerHTML = h;
      const m = $('[data-mensal]'); if (m) m.textContent = c.mensal ? `R$ ${brl(c.mensal)}/mês` : 'Nenhuma';
      const bt = $('[data-barra-total]'); if (bt) bt.textContent = `R$ ${brl(c.final)}`;
      const bf = $('[data-barra-forma]'); if (bf) bf.textContent = WD.textoForma(c) + (c.mensal ? ` · + R$ ${brl(c.mensal, false)}/mês` : '');

      const extras = (o.opcionais || []).filter((_, i) => estado.opcionais[i]).map(x => x.nome).join(', ');
      const msg = `Olá! Aprovo a proposta ${o.numero || ''} (${o.cliente.empresa || 'website'}). Forma de pagamento: ${WD.textoForma(c)}. Total: R$ ${brl(c.final)}.` + (extras ? ` Opcionais: ${extras}.` : '') + (c.mensal ? ` Mensalidade: R$ ${brl(c.mensal)}.` : '');
      const ap = $('#aprovar'); if (ap) ap.href = `https://wa.me/${cfg.empresa.whatsapp}?text=${encodeURIComponent(msg)}`;
      if (notificar && aoEscolher) aoEscolher({ pagamento: c.forma, opcionais: estado.opcionais.slice() });
    }
    root.addEventListener('change', e => {
      const lab = e.target.closest('.opcao'); if (!lab) return;
      if (lab.dataset.pag) estado.pagamento = lab.dataset.pag;
      if (lab.dataset.extra != null) estado.opcionais[lab.dataset.extra] = e.target.checked;
      atualizar(true);
    });
    const ap = $('#aprovar');
    if (ap && aoEscolher) ap.addEventListener('click', () => { const c = WD.calcular(o, estado); aoEscolher({ pagamento: c.forma, opcionais: estado.opcionais.slice(), aprovadoEm: new Date().toISOString() }); });
    atualizar(false);

    /* Barra fixa no celular: aparece depois da capa e some ao chegar nos próximos passos */
    const barra = $('.barra-ap'), capa = $('#capa'), fim = $('#aceite');
    if (barra && capa && fim && 'IntersectionObserver' in window) {
      const vis = { capa: true, fim: false };
      const io2 = new IntersectionObserver(es => {
        es.forEach(e => { vis[e.target === capa ? 'capa' : 'fim'] = e.isIntersecting; });
        const on = !vis.capa && !vis.fim; barra.classList.toggle('on', on); barra.setAttribute('aria-hidden', String(!on));
        const a = barra.querySelector('a'); if (a) a.tabIndex = on ? 0 : -1;
      });
      io2.observe(capa); io2.observe(fim);
    }
    const links = $$('.indice a');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
      $$('main .folha').forEach(s => io.observe(s));
    }
    /* Linha horizontal do mapa: vai do centro do primeiro ao centro do último ramo */
    const ajustarMapa = () => $$('.ramos').forEach(r => {
      const rs = r.querySelectorAll(':scope > .ramo'); if (rs.length < 2) return;
      r.style.setProperty('--l', rs[0].offsetWidth / 2 + 'px');
      r.style.setProperty('--r', rs[rs.length - 1].offsetWidth / 2 + 'px');
    });
    ajustarMapa(); if (document.fonts) document.fonts.ready.then(ajustarMapa);
    const win = root.ownerDocument.defaultView;
    if (!win.__wdImpressao) { win.__wdImpressao = true; win.addEventListener('beforeprint', () => { win.document.querySelectorAll('.conds details').forEach(d => { d.open = true; }); ajustarPagina(win); }); }
  };
})();
