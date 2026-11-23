/* Painel interno: lista, editor com pré-visualização ao vivo, envio e configurações. */
(function () {
  const { esc, brl, fmtData } = WD.util;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = id => `<svg class="i"><use href="#i-${id}"/></svg>`;
  const clone = o => JSON.parse(JSON.stringify(o));
  const tela = $('#tela');
  const dlg = $('#dialogo');
  $('#sprite').innerHTML = WD.SPRITE;

  const STATUS = { rascunho: 'Rascunho', enviado: 'Enviado', visualizado: 'Visualizado', aprovado: 'Aprovado', recusado: 'Recusado' };
  const TIPOS_ETAPA = { normal: 'Etapa normal', aprovacao: 'Aprovação do cliente', final: 'Publicação' };
  const ICONES = Object.entries(WD.ICONES);

  let cfg = null;
  let lista = [];
  let atual = null;          // orçamento aberto no editor
  let timerSalvar = null, timerPrev = null, sujo = false;

  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 2200); }
  function erro(e) { console.error(e); toast('Algo deu errado: ' + (e.message || e)); }

  /* ---------- Caminhos (ex.: "cliente.empresa", "etapas.2.nome") ---------- */
  const ler = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function gravar(o, p, v) { const ks = p.split('.'); const ult = ks.pop(); const alvo = ks.reduce((a, k) => (a[k] == null ? (a[k] = {}) : a[k]), o); alvo[ult] = v; }

  /* ---------- Campos do formulário ---------- */
  const F = (path, label, tipo = 'text', x = {}) => Object.assign({ path, label, tipo }, x);

  function campoHTML(f, dados, base) {
    const p = base ? base + '.' + f.path : f.path;
    const v = ler(dados, p);
    const larg = f.w ? ' ' + f.w : '';
    const dica = f.dica ? `<span class="dica">${f.dica}</span>` : '';
    const id = 'c_' + p.replace(/\./g, '_');
    const at = `id="${id}" data-path="${p}" data-tipo="${f.tipo}"`;
    switch (f.tipo) {
      case 'textarea': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><textarea ${at} rows="${f.rows || 3}">${esc(v)}</textarea>${dica}</div>`;
      case 'linhas': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><textarea ${at} rows="${f.rows || 4}">${esc((v || []).join('\n'))}</textarea><span class="dica">${f.dica || 'Um item por linha.'}</span></div>`;
      case 'csv': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><input type="text" ${at} value="${esc((v || []).join(', '))}"><span class="dica">${f.dica || 'Separe por vírgula.'}</span></div>`;
      case 'numero': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><input type="number" inputmode="decimal" step="${f.step || 1}" ${at} value="${esc(v)}">${dica}</div>`;
      case 'dinheiro': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><div class="prefixo"><span>R$</span><input type="number" inputmode="decimal" step="0.01" ${at} value="${esc(v)}"></div>${dica}</div>`;
      case 'data': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><input type="date" ${at} value="${esc(v)}">${dica}</div>`;
      case 'check': return `<div class="campo${larg}"><label class="check"><input type="checkbox" ${at}${v ? ' checked' : ''}>${f.label}</label>${dica}</div>`;
      case 'select': { const ops = typeof f.opcoes === 'function' ? f.opcoes() : f.opcoes; return `<div class="campo${larg}"><label for="${id}">${f.label}</label><select ${at}>${Object.entries(ops).map(([k, n]) => `<option value="${esc(k)}"${String(v) === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>${dica}</div>`; }
      case 'icone': return `<div class="campo${larg}"><label for="${id}">${f.label}</label><select ${at}>${ICONES.map(([k, n]) => `<option value="${k}"${v === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;
      case 'imagem': return `<div class="campo${larg}"><label for="${id}">${f.label}</label>${v ? `<img class="miniatura" src="${esc(v)}" alt="">` : ''}<div style="display:flex;gap:8px"><input type="text" ${at} value="${esc(v && v.startsWith('data:') ? '(imagem enviada)' : v)}" placeholder="img/arquivo.webp ou https://…" style="flex:1"><label class="btn btn--sm btn--g">${ic('image')}Enviar<input type="file" accept="image/*" hidden data-upload="${p}"></label></div><span class="dica">Imagem horizontal, de preferência 1600 × 1000 px.</span></div>`;
      case 'subtitulo': return `<div class="subtit">${f.label}</div>`;
      case 'escolha': {
        const ops = f.opcoes(); const sel = v || [];
        return `<div class="campo"><span class="rot">${f.label}</span>${dica}</div><div class="escolhas">${ops.map(([k, n]) => `<label class="check"><input type="checkbox" data-escolha="${p}" value="${esc(k)}"${sel.includes(k) ? ' checked' : ''}>${esc(n)}</label>`).join('') || '<span class="dica">Nada cadastrado em Configurações.</span>'}</div>`;
      }
      case 'lista': {
        const arr = v || [];
        const cat = f.catalogo ? f.catalogo() : null;
        return `${f.label ? `<div class="campo"><span class="rot">${f.label}</span>${dica}</div>` : ''}<div class="itens">${arr.map((it, i) => `
          <div class="item"><header><b>${esc(f.resumo(it, i))}</b>
            <button type="button" class="icone-btn" title="Subir" data-acao="up" data-lista="${p}" data-i="${i}"${i === 0 ? ' disabled' : ''}>${ic('up')}</button>
            <button type="button" class="icone-btn" title="Descer" data-acao="down" data-lista="${p}" data-i="${i}"${i === arr.length - 1 ? ' disabled' : ''}>${ic('down')}</button>
            <button type="button" class="icone-btn perigo" title="Remover" data-acao="del" data-lista="${p}" data-i="${i}">${ic('trash')}</button>
          </header><div class="corpo">${f.campos.map(sf => campoHTML(sf, dados, p + '.' + i)).join('')}</div></div>`).join('')}
          <div class="add"><button type="button" class="btn btn--sm btn--g" data-acao="add" data-lista="${p}">${ic('plus')}${f.novoRotulo || 'Adicionar'}</button>
          ${cat && cat.length ? `<select data-catalogo="${p}"><option value="">Adicionar do catálogo…</option>${cat.map((c, i) => `<option value="${i}">${esc(f.resumo(c, i))}</option>`).join('')}</select>` : ''}</div></div>`;
      }
      default: return `<div class="campo${larg}"><label for="${id}">${f.label}</label><input type="${f.input || 'text'}" ${at} value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''}>${dica}</div>`;
    }
  }

  function secoesHTML(secoes, dados, abertas) {
    return secoes.map((s, i) => `<details class="secao" id="sec-${s.id}" data-sec="${s.id}"${abertas.has(s.id) ? ' open' : ''}><summary><span class="n">${i + 1}</span><span>${s.titulo}<small>${s.desc || ''}</small></span></summary><div class="corpo">${s.campos.map(f => campoHTML(f, dados)).join('')}</div></details>`).join('');
  }

  function achaCampo(secoes, path) {
    const semIdx = path.replace(/\.\d+(\.|$)/g, '.').replace(/\.$/, '');
    for (const s of secoes) for (const f of s.campos) if (f.path === semIdx || semIdx.startsWith(f.path + '.')) return f;
    return null;
  }

  /* Liga um formulário gerado: grava no objeto e avisa quem chamou */
  function ligarForm(root, getDados, secoes, aoMudar, rerender) {
    root.addEventListener('input', e => {
      const el = e.target; const p = el.dataset.path; if (!p) return;
      const t = el.dataset.tipo; let v = el.value;
      if (t === 'check') v = el.checked;
      else if (t === 'numero' || t === 'dinheiro') v = v === '' ? '' : Number(v);
      else if (t === 'linhas') v = v.split('\n').map(s => s.trim()).filter(Boolean);
      else if (t === 'csv') v = v.split(',').map(s => s.trim()).filter(Boolean);
      else if (t === 'imagem' && v === '(imagem enviada)') return;
      gravar(getDados(), p, v);
      const head = el.closest('.item') && el.closest('.item').querySelector('header b');
      if (head) { const lp = el.closest('.item').querySelector('[data-acao="del"]'); const f = achaCampo(secoes, lp.dataset.lista); const arr = ler(getDados(), lp.dataset.lista); if (f && f.resumo) head.textContent = f.resumo(arr[lp.dataset.i], Number(lp.dataset.i)); }
      aoMudar();
    });
    root.addEventListener('change', async e => {
      const el = e.target;
      if (el.dataset.tipo === 'check' || el.tagName === 'SELECT' && el.dataset.path) { el.dispatchEvent(new Event('input', { bubbles: true })); return; }
      if (el.dataset.escolha) {
        const p = el.dataset.escolha; const marcados = $$(`[data-escolha="${p}"]`, root).filter(x => x.checked).map(x => x.value);
        gravar(getDados(), p, marcados); aoMudar(); return;
      }
      if (el.dataset.catalogo && el.value !== '') {
        const p = el.dataset.catalogo; const f = achaCampo(secoes, p); const item = clone(f.catalogo()[el.value]);
        const arr = ler(getDados(), p) || []; arr.push(item); gravar(getDados(), p, arr); aoMudar(); rerender(); return;
      }
      if (el.dataset.upload && el.files[0]) {
        try { const url = await reduzirImagem(el.files[0]); gravar(getDados(), el.dataset.upload, url); aoMudar(); rerender(); } catch (er) { erro(er); }
      }
    });
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-acao]'); if (!b) return;
      const p = b.dataset.lista; const arr = ler(getDados(), p) || []; const i = Number(b.dataset.i);
      const f = achaCampo(secoes, p);
      if (b.dataset.acao === 'add') arr.push(f.novo());
      if (b.dataset.acao === 'del') { if (!confirm('Remover este item?')) return; arr.splice(i, 1); }
      if (b.dataset.acao === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (b.dataset.acao === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      gravar(getDados(), p, arr); aoMudar(); rerender();
    });
  }

  function reduzirImagem(file) {
    return new Promise((ok, erro) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1600; const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok(c.toDataURL('image/webp', 0.82));
      };
      img.onerror = () => erro(new Error('Não foi possível ler a imagem'));
      img.src = url;
    });
  }

  /* ---------- Esquema do orçamento (website) ---------- */
  const itemObj = { icone: 'target', titulo: '', texto: '' };
  function secoesOrcamento() {
    return [
      { id: 'cliente', titulo: 'Cliente e proposta', desc: 'Quem recebe, número e validade', campos: [
        F('cliente.empresa', 'Empresa', 'text', { ph: 'Pousada Maré Alta' }),
        F('cliente.contato', 'Nome do contato', 'text', { w: 'm3' }),
        F('cliente.cidade', 'Cidade', 'text', { w: 'm3' }),
        F('cliente.whatsapp', 'WhatsApp', 'text', { w: 'm3', input: 'tel', ph: '(48) 99999-9999' }),
        F('cliente.email', 'E-mail', 'text', { w: 'm3', input: 'email' }),
        F('numero', 'Número', 'text', { w: 'm2' }),
        F('data', 'Data', 'data', { w: 'm2' }),
        F('validadeDias', 'Validade (dias)', 'numero', { w: 'm2' })
      ] },
      { id: 'capa', titulo: 'Capa', desc: 'Título e frase de abertura', campos: [
        F('titulo', 'Título', 'text', { dica: 'Use {cliente} para inserir o nome da empresa em verde.' }),
        F('abertura', 'Frase de abertura', 'textarea', { rows: 2 })
      ] },
      { id: 'objetivo', titulo: 'Objetivo do cliente', desc: 'O que entendemos da necessidade', campos: [
        F('contexto', 'Contexto', 'textarea', { rows: 4, dica: 'Ex.: a pousada depende de agências e quer mais reservas diretas. Se ficar vazio, só os objetivos aparecem.' }),
        F('objetivos', 'Objetivos', 'lista', { campos: [F('icone', 'Ícone', 'icone', { w: 'm2' }), F('titulo', 'Título', 'text', { w: 'm4' }), F('texto', 'Texto', 'textarea', { rows: 2 })], novo: () => clone(itemObj), resumo: (x, i) => x.titulo || `Objetivo ${i + 1}` })
      ] },
      { id: 'escopo', titulo: 'Escopo', desc: 'Mapa do site, páginas e funcionalidades', campos: [
        F('paginasQtd', 'Total de páginas', 'numero', { w: 'm2', dica: 'Aparece no resumo.' }),
        F('suporteDias', 'Dias de suporte', 'numero', { w: 'm2' }),
        F('horaTecnica', 'Hora técnica', 'dinheiro', { w: 'm2' }),
        F('mapa', 'Mapa do site (páginas abaixo do Início)', 'lista', { campos: [F('nome', 'Página', 'text', { w: 'm3' }), F('sub', 'Subpáginas', 'csv', { w: 'm3' })], novo: () => ({ nome: 'Nova página', sub: [] }), resumo: (x, i) => x.nome || `Página ${i + 1}`, novoRotulo: 'Adicionar página' }),
        F('utilitarias', 'Páginas de apoio', 'csv', { dica: 'Ex.: Política de privacidade, Página 404.' }),
        F('paginasDetalhe', 'O que tem em cada página', 'lista', { campos: [F('titulo', 'Grupo', 'text', { w: 'm4' }), F('qtd', 'Quantidade', 'text', { w: 'm2' }), F('itens', 'Conteúdo', 'linhas', { rows: 3 })], novo: () => ({ titulo: '', qtd: '1 página', itens: [] }), resumo: (x, i) => x.titulo || `Grupo ${i + 1}` }),
        F('funcionalidades', 'Funcionalidades incluídas', 'lista', { campos: [F('icone', 'Ícone', 'icone', { w: 'm2' }), F('titulo', 'Título', 'text', { w: 'm4' }), F('texto', 'Texto', 'text')], novo: () => clone({ icone: 'code', titulo: '', texto: '' }), resumo: (x, i) => x.titulo || `Funcionalidade ${i + 1}`, catalogo: () => cfg.funcionalidades })
      ] },
      { id: 'etapas', titulo: 'Prazo e etapas', desc: 'Cronograma em semanas', campos: [
        F('etapas', '', 'lista', { campos: [F('nome', 'Etapa', 'text', { w: 'm3' }), F('barra', 'Texto na barra', 'text', { w: 'm3' }), F('desc', 'Descrição', 'text'), F('inicio', 'Começa na semana', 'numero', { w: 'm2' }), F('duracao', 'Duração (semanas)', 'numero', { w: 'm2' }), F('tipo', 'Tipo', 'select', { w: 'm2', opcoes: TIPOS_ETAPA })], novo: () => ({ nome: 'Nova etapa', desc: '', barra: '', inicio: 1, duracao: 1, tipo: 'normal' }), resumo: (x, i) => `${i + 1}. ${x.nome || 'Etapa'} · sem ${x.inicio}${x.duracao > 1 ? '–' + (Number(x.inicio) + Number(x.duracao) - 1) : ''}`, novoRotulo: 'Adicionar etapa' })
      ] },
      { id: 'valores', titulo: 'Investimento', desc: 'Valor, formas de pagamento e opcionais', campos: [
        F('descricaoBase', 'Descrição do projeto', 'text', { w: 'm4' }),
        F('valorBase', 'Valor', 'dinheiro', { w: 'm2' }),
        F('', 'Formas de pagamento', 'subtitulo'),
        F('pagamento.avista.ativo', 'À vista no Pix', 'check', { w: 'm3' }),
        F('pagamento.avista.desconto', 'Desconto à vista (%)', 'numero', { w: 'm3' }),
        F('pagamento.parcelado.ativo', 'Entrada + parcelas', 'check', { w: 'm2' }),
        F('pagamento.parcelado.entradaPct', 'Entrada (%)', 'numero', { w: 'm2' }),
        F('pagamento.parcelado.parcelas', 'Parcelas', 'numero', { w: 'm2' }),
        F('pagamento.cartao.ativo', 'Cartão de crédito', 'check', { w: 'm3' }),
        F('pagamento.cartao.parcelas', 'Até quantas vezes', 'numero', { w: 'm3' }),
        F('pagamentoPadrao', 'Forma que já vem marcada', 'select', { opcoes: { avista: 'À vista no Pix', parcelado: 'Entrada + parcelas', cartao: 'Cartão de crédito' } }),
        F('', 'Serviços opcionais', 'subtitulo'),
        F('opcionais', '', 'lista', { campos: [F('nome', 'Nome', 'text', { w: 'm4' }), F('valor', 'Valor', 'dinheiro', { w: 'm2' }), F('desc', 'Descrição', 'text'), F('tipo', 'Cobrança', 'select', { w: 'm3', opcoes: { unico: 'Valor único', mensal: 'Mensal' } }), F('marcado', 'Já vem marcado', 'check', { w: 'm3' })], novo: () => ({ nome: '', desc: '', valor: 0, tipo: 'unico', marcado: false }), resumo: (x, i) => `${x.nome || 'Opcional ' + (i + 1)} · R$ ${brl(x.valor, false)}${x.tipo === 'mensal' ? '/mês' : ''}`, catalogo: () => cfg.opcionais.map(o => ({ ...o, marcado: false })), novoRotulo: 'Adicionar opcional' })
      ] },
      { id: 'incluso', titulo: 'Incluso e não incluso', campos: [
        F('incluso', 'Incluso no projeto', 'linhas', { rows: 6 }),
        F('naoIncluso', 'Não incluso', 'linhas', { rows: 4 })
      ] },
      { id: 'prova', titulo: 'Portfólio e depoimentos', desc: 'Escolha o que mostrar', campos: [
        F('portfolio', 'Projetos', 'escolha', { opcoes: () => cfg.portfolio.map(p => [p.id, p.nome]), dica: 'Cadastre novos projetos em Configurações.' }),
        F('depoimentos', 'Depoimentos', 'escolha', { opcoes: () => cfg.depoimentos.map(d => [d.id, `${d.nome} · ${d.empresa}`]) })
      ] },
      { id: 'condicoes', titulo: 'Condições gerais', desc: 'Prazos, ajustes e validade', campos: [
        F('condicoes', '', 'lista', { dica: 'Atalhos no texto: {suporte} dias de suporte, {hora} valor da hora, {validade} dias, {validoAte} data final.', campos: [F('titulo', 'Título', 'text'), F('texto', 'Texto', 'textarea', { rows: 3 })], novo: () => ({ titulo: '', texto: '' }), resumo: (x, i) => x.titulo || `Condição ${i + 1}`, catalogo: () => cfg.condicoes })
      ] }
    ];
  }

  /* ---------- Esquema das configurações ---------- */
  const novoId = () => Math.random().toString(36).slice(2, 8);
  function secoesConfig() {
    return [
      { id: 'empresa', titulo: 'Empresa', desc: 'Dados que aparecem em todas as propostas', campos: [
        F('empresa.nome', 'Nome', 'text', { w: 'm3' }), F('empresa.responsavel', 'Responsável', 'text', { w: 'm3' }),
        F('empresa.whatsapp', 'WhatsApp (só números, com 55)', 'text', { w: 'm3' }), F('empresa.telefoneExibicao', 'Telefone como aparece', 'text', { w: 'm3' }),
        F('empresa.email', 'E-mail', 'text', { w: 'm3' }), F('empresa.site', 'Site', 'text', { w: 'm3' }),
        F('empresa.cidade', 'Cidade', 'text', { w: 'm3' }), F('empresa.cnpj', 'CNPJ', 'text', { w: 'm3' }),
        F('empresa.sobre', 'Quem somos', 'textarea', { rows: 4 }),
        F('empresa.clientes', 'Clientes', 'text', { w: 'm3' }), F('empresa.anos', 'Anos de experiência', 'text', { w: 'm3' }),
        F('empresa.marcas', 'Marcas que confiam', 'linhas', { rows: 5 })
      ] },
      { id: 'padroes', titulo: 'Valores padrão', desc: 'Usados em todo orçamento novo', campos: [
        F('horaTecnica', 'Hora técnica', 'dinheiro', { w: 'm2' }), F('validadeDias', 'Validade (dias)', 'numero', { w: 'm2' }), F('suporteDias', 'Suporte (dias)', 'numero', { w: 'm2' }),
        F('', 'Formas de pagamento', 'subtitulo'),
        F('pagamento.avista.ativo', 'À vista no Pix', 'check', { w: 'm3' }), F('pagamento.avista.desconto', 'Desconto à vista (%)', 'numero', { w: 'm3' }),
        F('pagamento.parcelado.ativo', 'Entrada + parcelas', 'check', { w: 'm2' }), F('pagamento.parcelado.entradaPct', 'Entrada (%)', 'numero', { w: 'm2' }), F('pagamento.parcelado.parcelas', 'Parcelas', 'numero', { w: 'm2' }),
        F('pagamento.cartao.ativo', 'Cartão de crédito', 'check', { w: 'm3' }), F('pagamento.cartao.parcelas', 'Até quantas vezes', 'numero', { w: 'm3' })
      ] },
      { id: 'diferenciais', titulo: 'Diferenciais', desc: 'Bloco "Quem somos"', campos: [
        F('diferenciais', '', 'lista', { campos: [F('icone', 'Ícone', 'icone', { w: 'm2' }), F('titulo', 'Título', 'text', { w: 'm4' }), F('texto', 'Texto', 'textarea', { rows: 2 })], novo: () => clone({ icone: 'pen', titulo: '', texto: '' }), resumo: (x, i) => x.titulo || `Diferencial ${i + 1}` })
      ] },
      { id: 'portfolio', titulo: 'Portfólio', desc: 'Projetos que você pode escolher em cada proposta', campos: [
        F('portfolio', '', 'lista', { campos: [F('nome', 'Nome', 'text', { w: 'm4' }), F('segmento', 'Segmento', 'text', { w: 'm2' }), F('imagem', 'Imagem (mockup)', 'imagem'), F('link', 'Link do projeto', 'text', { input: 'url' }), F('texto', 'Descrição', 'textarea', { rows: 2 })], novo: () => ({ id: novoId(), nome: '', segmento: '', imagem: '', link: '', texto: '' }), resumo: (x, i) => x.nome || `Projeto ${i + 1}`, novoRotulo: 'Adicionar projeto' })
      ] },
      { id: 'depoimentos', titulo: 'Depoimentos', campos: [
        F('depoimentos', '', 'lista', { campos: [F('nome', 'Nome', 'text', { w: 'm3' }), F('empresa', 'Empresa', 'text', { w: 'm3' }), F('texto', 'Depoimento', 'textarea', { rows: 3 })], novo: () => ({ id: novoId(), nome: '', empresa: '', texto: '' }), resumo: (x, i) => x.nome || `Depoimento ${i + 1}` })
      ] },
      { id: 'funcionalidades', titulo: 'Catálogo de funcionalidades', desc: 'As 6 primeiras entram em todo orçamento novo', campos: [
        F('funcionalidades', '', 'lista', { campos: [F('icone', 'Ícone', 'icone', { w: 'm2' }), F('titulo', 'Título', 'text', { w: 'm4' }), F('texto', 'Texto', 'text')], novo: () => ({ icone: 'code', titulo: '', texto: '' }), resumo: (x, i) => x.titulo || `Funcionalidade ${i + 1}` })
      ] },
      { id: 'opcionais', titulo: 'Catálogo de opcionais', desc: 'Serviços extras e mensalidades', campos: [
        F('opcionais', '', 'lista', { campos: [F('nome', 'Nome', 'text', { w: 'm4' }), F('valor', 'Valor', 'dinheiro', { w: 'm2' }), F('desc', 'Descrição', 'text', { w: 'm4' }), F('tipo', 'Cobrança', 'select', { w: 'm2', opcoes: { unico: 'Valor único', mensal: 'Mensal' } })], novo: () => ({ nome: '', desc: '', valor: 0, tipo: 'unico' }), resumo: (x, i) => `${x.nome || 'Opcional ' + (i + 1)} · R$ ${brl(x.valor, false)}${x.tipo === 'mensal' ? '/mês' : ''}` })
      ] },
      { id: 'incluso', titulo: 'Incluso e não incluso', campos: [F('incluso', 'Incluso', 'linhas', { rows: 6 }), F('naoIncluso', 'Não incluso', 'linhas', { rows: 4 })] },
      { id: 'condicoes', titulo: 'Condições gerais', desc: 'Texto padrão das condições', campos: [
        F('condicoes', '', 'lista', { dica: 'Atalhos: {suporte}, {hora}, {validade}, {validoAte}.', campos: [F('titulo', 'Título', 'text'), F('texto', 'Texto', 'textarea', { rows: 3 })], novo: () => ({ titulo: '', texto: '' }), resumo: (x, i) => x.titulo || `Condição ${i + 1}` })
      ] },
      { id: 'mensagens', titulo: 'Mensagens de envio', desc: 'WhatsApp e e-mail', campos: [
        F('mensagens.whatsapp', 'Mensagem do WhatsApp', 'textarea', { rows: 5, dica: 'Atalhos: {contato}, {empresa}, {numero}, {link}.' }),
        F('mensagens.emailAssunto', 'Assunto do e-mail', 'text'),
        F('mensagens.emailCorpo', 'Texto do e-mail', 'textarea', { rows: 8 })
      ] }
    ];
  }

  /* ---------- Login ---------- */
  function telaLogin() {
    $('#nav').hidden = true;
    tela.innerHTML = `<div class="login"><form id="f-login"><img src="img/logo-branco.png" alt="Wildner Design" style="height:22px;align-self:flex-start"><h1>Entrar</h1><p>Painel de orçamentos.</p>
      <div class="campo"><label for="l-email">E-mail</label><input type="email" id="l-email" autocomplete="username" required></div>
      <div class="campo"><label for="l-senha">Senha</label><input type="password" id="l-senha" autocomplete="current-password" required></div>
      <span class="erro" id="l-erro" hidden></span><button class="btn btn--p" type="submit">Entrar</button></form></div>`;
    $('#f-login').addEventListener('submit', async e => {
      e.preventDefault();
      try { await WD.store.entrar($('#l-email').value, $('#l-senha').value); iniciar(); }
      catch (er) { const el = $('#l-erro'); el.hidden = false; el.textContent = 'E-mail ou senha incorretos.'; }
    });
  }

  /* ---------- Lista ---------- */
  let filtro = 'todos', busca = '';
  async function telaLista() {
    marcarNav('lista');
    tela.innerHTML = `<div class="pagina"><p style="color:var(--texto-3)">Carregando…</p></div>`;
    try { lista = await WD.store.listar(); } catch (e) { return erro(e); }
    lista.sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)));
    const soma = arr => arr.reduce((n, x) => n + Number(x.valor || 0), 0);
    const abertos = lista.filter(x => x.status === 'enviado' || x.status === 'visualizado');
    const aprov = lista.filter(x => x.status === 'aprovado');
    const decididos = lista.filter(x => x.status === 'aprovado' || x.status === 'recusado').length;
    tela.innerHTML = `<div class="pagina">
      ${WD.store.modo === 'local' ? `<div class="aviso-local">${ic('monitor')}<div><b>Modo local.</b> Os orçamentos ficam só neste navegador e o link para o cliente não funciona em outro aparelho. Para isso, conecte o Supabase (veja o README). Enquanto isso, envie o PDF.</div></div>` : ''}
      <div class="cab-pag"><div><h1>Orçamentos</h1><p>${lista.length} ${lista.length === 1 ? 'proposta' : 'propostas'} no total.</p></div>
        <div class="acoes"><button class="btn btn--p" id="novo">${ic('plus')}Novo orçamento</button></div></div>
      <div class="kpis">
        <div class="kpi"><span>Em aberto</span><b>${abertos.length}</b><small>R$ ${brl(soma(abertos), false)}</small></div>
        <div class="kpi kpi--verde"><span>Aprovados</span><b>${aprov.length}</b><small>R$ ${brl(soma(aprov), false)}</small></div>
        <div class="kpi"><span>Taxa de aprovação</span><b>${decididos ? Math.round(aprov.length / decididos * 100) + '%' : '—'}</b><small>entre aprovados e recusados</small></div>
        <div class="kpi"><span>Rascunhos</span><b>${lista.filter(x => x.status === 'rascunho').length}</b><small>ainda não enviados</small></div>
      </div>
      <div class="filtros">${['todos', ...Object.keys(STATUS)].map(s => `<button class="chip${filtro === s ? ' on' : ''}" data-filtro="${s}">${s === 'todos' ? 'Todos' : STATUS[s]}</button>`).join('')}
        <input class="busca" type="search" placeholder="Buscar cliente ou número" value="${esc(busca)}" id="busca"></div>
      <div class="lista" id="lista"></div>
      <p style="margin-top:24px;font-size:13px;color:var(--texto-3)">Orçamentos do sistema anterior: <a href="antigo.html">abrir sistema antigo</a>.</p></div>`;
    desenharLista();
    $('#novo').onclick = escolherTipo;
    $$('[data-filtro]').forEach(b => b.onclick = () => { filtro = b.dataset.filtro; $$('[data-filtro]').forEach(x => x.classList.toggle('on', x === b)); desenharLista(); });
    $('#busca').oninput = e => { busca = e.target.value; desenharLista(); };
  }

  function desenharLista() {
    const q = busca.trim().toLowerCase();
    const itens = lista.filter(x => (filtro === 'todos' || x.status === filtro) && (!q || `${x.cliente} ${x.contato} ${x.numero}`.toLowerCase().includes(q)));
    const el = $('#lista');
    if (!lista.length) { el.innerHTML = `<div class="vazio"><h2>Nenhum orçamento ainda</h2><p>Crie o primeiro. Ele já vem preenchido com os seus padrões.</p><p style="margin-top:16px"><button class="btn btn--p" onclick="document.getElementById('novo').click()">${ic('plus')}Novo orçamento</button></p></div>`; return; }
    if (!itens.length) { el.innerHTML = `<div class="vazio">Nada encontrado com esse filtro.</div>`; return; }
    el.innerHTML = `<div class="linha-o cab"><span>Nº</span><span>Cliente</span><span>Valor</span><span>Status</span><span class="col-data">Atualizado</span><span></span></div>` +
      itens.map(x => `<div class="linha-o" data-id="${x.id}" tabindex="0" role="button" aria-label="Abrir ${esc(x.cliente || 'orçamento')}">
        <span class="col-num num">${esc(x.numero || '—')}</span>
        <span class="cli"><b>${esc(x.cliente || 'Sem nome')}</b><span>${esc(x.contato || 'Website')}</span></span>
        <span class="col-valor num">R$ ${brl(x.valor, false)}</span>
        <span class="col-status"><span class="status status--${x.status}">${STATUS[x.status] || x.status}</span></span>
        <span class="col-data num" style="color:var(--texto-3);font-size:13.5px">${fmtData(String(x.atualizado_em || '').slice(0, 10))}</span>
        <span class="acts"><button class="icone-btn" title="Duplicar" data-dup="${x.id}">${ic('copy')}</button><button class="icone-btn perigo" title="Excluir" data-del="${x.id}">${ic('trash')}</button></span></div>`).join('');
    $$('.linha-o[data-id]', el).forEach(r => {
      r.onclick = e => { if (e.target.closest('button')) return; location.hash = '#/o/' + r.dataset.id; };
      r.onkeydown = e => { if (e.key === 'Enter') location.hash = '#/o/' + r.dataset.id; };
    });
    $$('[data-dup]', el).forEach(b => b.onclick = () => duplicar(b.dataset.dup));
    $$('[data-del]', el).forEach(b => b.onclick = () => excluir(b.dataset.del));
  }

  function escolherTipo() {
    dlg.innerHTML = `<div class="dlg"><h2>Novo orçamento</h2><p>Escolha o tipo de projeto. Tudo já vem preenchido com os seus padrões e pode ser alterado.</p>
      <div class="tipos"><button class="tipo" data-tipo="website"><b>Website</b><span>Site institucional, landing page ou blog</span></button>
      <button class="tipo" disabled><b>Identidade visual</b><span>Em breve</span></button>
      <button class="tipo" disabled><b>Chatbot</b><span>Em breve</span></button>
      <button class="tipo" disabled><b>Peças gráficas</b><span>Em breve</span></button></div>
      <div class="acoes"><button class="btn btn--g" data-fechar>Cancelar</button></div></div>`;
    dlg.showModal();
    dlg.querySelector('[data-fechar]').onclick = () => dlg.close();
    dlg.querySelector('[data-tipo="website"]').onclick = async () => {
      dlg.close();
      const o = WD.novoOrcamentoWebsite(cfg);
      o.numero = WD.proximoNumero(lista);
      try { const s = await WD.store.salvar(o); location.hash = '#/o/' + s.id; } catch (e) { erro(e); }
    };
  }

  async function duplicar(id) {
    try {
      const o = await WD.store.obter(id); delete o.id;
      Object.assign(o, { numero: WD.proximoNumero(lista), status: 'rascunho', escolha: null, data: new Date().toISOString().slice(0, 10), enviadoEm: null, vistoEm: null });
      o.cliente = Object.assign({}, o.cliente, { empresa: (o.cliente.empresa || '') + ' (cópia)' });
      const s = await WD.store.salvar(o); toast('Orçamento duplicado'); location.hash = '#/o/' + s.id;
    } catch (e) { erro(e); }
  }
  async function excluir(id) {
    const x = lista.find(l => l.id === id);
    if (!confirm(`Excluir o orçamento ${x ? x.numero + ' de ' + (x.cliente || 'sem nome') : ''}? Essa ação não pode ser desfeita.`)) return;
    try { await WD.store.excluir(id); toast('Orçamento excluído'); telaLista(); } catch (e) { erro(e); }
  }

  /* ---------- Editor ---------- */
  let abertasEd = new Set(['cliente']);
  let modoPrev = 'desktop';
  async function telaEditor(id) {
    marcarNav('lista');
    try { atual = await WD.store.obter(id); } catch (e) { return erro(e); }
    if (!atual) { tela.innerHTML = `<div class="pagina"><div class="vazio"><h2>Orçamento não encontrado</h2><p><a href="#/">Voltar para a lista</a></p></div></div>`; return; }
    if (!lista.length) { try { lista = await WD.store.listar(); } catch (e) { /* segue */ } }
    sujo = false;
    tela.innerHTML = `<div class="editor" id="editor">
      <section class="form" aria-label="Formulário">
        <div class="form-topo">
          <a class="icone-btn" href="#/" title="Voltar">${ic('back')}</a>
          <div class="tit"><b id="ed-tit"></b><span class="salvo" id="salvo">Salvo</span></div>
          <select id="ed-status" title="Status">${Object.entries(STATUS).map(([k, n]) => `<option value="${k}"${atual.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
          <button class="btn btn--sm btn--g alternar-prev" id="ver-prev">${ic('eye')}Ver</button>
          <button class="btn btn--sm btn--p" id="enviar">${ic('send')}Enviar</button>
        </div>
        <div id="campos"></div>
      </section>
      <section class="preview" aria-label="Pré-visualização">
        <div class="preview-topo"><span class="rot">Pré-visualização</span>
          <div class="seg"><button data-prev="desktop" class="${modoPrev === 'desktop' ? 'on' : ''}">${ic('monitor')}Computador</button><button data-prev="celular" class="${modoPrev === 'celular' ? 'on' : ''}">${ic('phone')}Celular</button></div>
          <button class="btn btn--sm btn--g" id="pdf">${ic('download')}PDF</button>
          <button class="btn btn--sm btn--g" id="fechar-prev" hidden>${ic('x')}</button>
        </div>
        <div class="palco-prev" id="palco"><iframe id="frame" title="Proposta"></iframe></div>
      </section></div>`;
    const secoes = secoesOrcamento();
    const desenhar = () => {
      $$('#campos details').forEach(d => d.open ? abertasEd.add(d.dataset.sec) : abertasEd.delete(d.dataset.sec));
      const y = $('.form').scrollTop; $('#campos').innerHTML = secoesHTML(secoes, atual, abertasEd); $('.form').scrollTop = y;
    };
    desenhar();
    ligarForm($('#campos'), () => atual, secoes, mudou, desenhar);
    $('#campos').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sec) { d.open ? abertasEd.add(d.dataset.sec) : abertasEd.delete(d.dataset.sec); if (d.open) irPara(d.dataset.sec); } }, true);
    $('#ed-status').onchange = e => { atual.status = e.target.value; mudou(); };
    $('#enviar').onclick = abrirEnvio;
    $('#pdf').onclick = gerarPDF;
    $('#ver-prev').onclick = () => { $('#editor').classList.add('ver-prev'); $('#fechar-prev').hidden = false; escalar(); };
    $('#fechar-prev').onclick = () => { $('#editor').classList.remove('ver-prev'); $('#fechar-prev').hidden = true; };
    $$('[data-prev]').forEach(b => b.onclick = () => { modoPrev = b.dataset.prev; $$('[data-prev]').forEach(x => x.classList.toggle('on', x === b)); escalar(); });
    titulo();
    montarPreview();
    window.addEventListener('resize', escalar);
  }

  /* Seção do formulário → seção da proposta */
  const MAPA_SEC = { cliente: 'capa', capa: 'capa', objetivo: 'objetivo', escopo: 'escopo', etapas: 'processo', valores: 'investimento', incluso: 'incluso', prova: 'portfolio', condicoes: 'condicoes' };
  function irPara(sec) { const f = $('#frame'); const d = f && f.contentDocument; const alvo = d && d.getElementById(MAPA_SEC[sec]); if (alvo) d.defaultView.scrollTo({ top: alvo.offsetTop - 70, behavior: 'smooth' }); }

  function titulo() { const t = $('#ed-tit'); if (t) t.textContent = `${atual.numero || ''} · ${atual.cliente.empresa || 'Novo orçamento'}`; }

  function mudou() {
    sujo = true; $('#salvo').textContent = 'Alterações não salvas';
    titulo();
    clearTimeout(timerPrev); timerPrev = setTimeout(atualizarPreview, 250);
    clearTimeout(timerSalvar); timerSalvar = setTimeout(salvarAgora, 1200);
  }
  async function salvarAgora() {
    clearTimeout(timerSalvar);
    if (!sujo || !atual) return;
    $('#salvo').textContent = 'Salvando…';
    try { const s = await WD.store.salvar(atual); atual.id = s.id; sujo = false; const el = $('#salvo'); if (el) el.textContent = 'Salvo'; }
    catch (e) { erro(e); const el = $('#salvo'); if (el) el.textContent = 'Erro ao salvar'; }
  }
  window.addEventListener('beforeunload', e => { if (sujo) { salvarAgora(); e.preventDefault(); e.returnValue = ''; } });

  function docPreview() {
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${base}"><meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@900&display=swap">
      <link rel="stylesheet" href="assets/proposta.css"><style>html{scroll-behavior:auto}</style></head><body><div id="app"></div></body></html>`;
  }
  function montarPreview() {
    const f = $('#frame');
    f.onload = () => { atualizarPreview(); escalar(); };
    f.srcdoc = docPreview();
  }
  function atualizarPreview() {
    const f = $('#frame'); if (!f) return; const d = f.contentDocument; const app = d && d.getElementById('app'); if (!app) return;
    const y = d.defaultView.scrollY;
    app.innerHTML = WD.renderProposta(atual, cfg, {});
    $$('a[href^="#"]', app).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = d.querySelector(a.getAttribute('href')); if (t) d.defaultView.scrollTo({ top: t.offsetTop - 70, behavior: 'smooth' }); }));
    $$('a[target]', app).forEach(a => a.addEventListener('click', e => e.preventDefault()));
    WD.ligarProposta(app, atual, cfg, null);
    d.defaultView.scrollTo(0, y);
  }
  function escalar() {
    const palco = $('#palco'), f = $('#frame'); if (!palco || !f) return;
    const w = modoPrev === 'celular' ? 390 : 1280;
    const k = Math.min(1, (palco.clientWidth - (modoPrev === 'celular' ? 32 : 0)) / w);
    f.style.width = w + 'px'; f.style.height = (palco.clientHeight / k) + 'px';
    f.style.transform = `translateX(-50%) scale(${k})`;
  }

  /* ---------- Envio ---------- */
  function linkCliente() { return location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + 'proposta.html?id=' + atual.id; }
  function preencher(t) {
    return String(t || '').replace(/\{contato\}/g, (atual.cliente.contato || '').split(' ')[0] || 'tudo bem').replace(/\{empresa\}/g, atual.cliente.empresa || 'sua empresa').replace(/\{numero\}/g, atual.numero || '').replace(/\{link\}/g, linkCliente());
  }
  function foneCliente() { let n = String(atual.cliente.whatsapp || '').replace(/\D/g, ''); if (n && n.length <= 11) n = '55' + n; return n; }

  async function abrirEnvio() {
    await salvarAgora();
    const m = cfg.mensagens || WD.CONFIG_PADRAO.mensagens;
    const local = WD.store.modo === 'local';
    dlg.innerHTML = `<div class="dlg"><h2>Enviar proposta</h2>
      ${local ? `<div class="aviso-local" style="margin:0">${ic('monitor')}<div><b>Modo local:</b> o link só abre neste navegador. Envie o PDF até conectar o Supabase.</div></div>` : `<p>O cliente abre a proposta pelo link, escolhe a forma de pagamento e aprova. Você acompanha o status aqui.</p>`}
      <div class="link"><input readonly value="${esc(linkCliente())}" id="env-link"><button class="btn btn--g" id="env-copiar">${ic('link')}Copiar</button></div>
      <div class="tabs seg"><button class="on" data-canal="whats">${ic('whats')}WhatsApp</button><button data-canal="email">${ic('mail')}E-mail</button></div>
      <div id="env-whats"><textarea id="env-msg">${esc(preencher(m.whatsapp))}</textarea><p class="dica" style="font-size:12.5px;color:var(--texto-3);margin-top:6px">${atual.cliente.whatsapp ? 'Vai para ' + esc(atual.cliente.whatsapp) : 'Sem WhatsApp do cliente: você escolhe o contato ao abrir.'}</p></div>
      <div id="env-email" hidden><div class="campo" style="margin-bottom:8px"><input type="text" id="env-assunto" value="${esc(preencher(m.emailAssunto))}"></div><textarea id="env-corpo" style="min-height:180px">${esc(preencher(m.emailCorpo))}</textarea><p class="dica" style="font-size:12.5px;color:var(--texto-3);margin-top:6px">${atual.cliente.email ? 'Para ' + esc(atual.cliente.email) + '. Abre no seu programa de e-mail.' : 'Sem e-mail do cliente cadastrado.'}</p></div>
      <div class="acoes"><button class="btn btn--g" data-fechar>Fechar</button><button class="btn btn--g" id="env-pdf">${ic('download')}PDF</button><button class="btn btn--p" id="env-ir">${ic('send')}Abrir WhatsApp</button></div></div>`;
    dlg.showModal();
    let canal = 'whats';
    dlg.querySelector('[data-fechar]').onclick = () => dlg.close();
    $$('[data-canal]', dlg).forEach(b => b.onclick = () => {
      canal = b.dataset.canal; $$('[data-canal]', dlg).forEach(x => x.classList.toggle('on', x === b));
      $('#env-whats').hidden = canal !== 'whats'; $('#env-email').hidden = canal !== 'email';
      $('#env-ir').innerHTML = `${ic('send')}${canal === 'whats' ? 'Abrir WhatsApp' : 'Abrir e-mail'}`;
    });
    $('#env-copiar').onclick = async () => { try { await navigator.clipboard.writeText(linkCliente()); } catch (e) { $('#env-link').select(); document.execCommand('copy'); } toast('Link copiado'); marcarEnviado(); };
    $('#env-pdf').onclick = gerarPDF;
    $('#env-ir').onclick = () => {
      if (canal === 'whats') { const n = foneCliente(); window.open(`https://wa.me/${n}?text=${encodeURIComponent($('#env-msg').value)}`, '_blank', 'noopener'); }
      else location.href = `mailto:${encodeURIComponent(atual.cliente.email || '')}?subject=${encodeURIComponent($('#env-assunto').value)}&body=${encodeURIComponent($('#env-corpo').value)}`;
      marcarEnviado(); dlg.close();
    };
  }
  async function marcarEnviado() {
    if (atual.status === 'rascunho') { atual.status = 'enviado'; atual.enviadoEm = new Date().toISOString(); const s = $('#ed-status'); if (s) s.value = 'enviado'; sujo = true; await salvarAgora(); }
  }

  /* PDF: imprime a pré-visualização (Salvar como PDF, A4) */
  async function gerarPDF() {
    await salvarAgora();
    const f = $('#frame'); if (!f) return;
    const w = f.contentWindow; const d = f.contentDocument;
    d.title = `Proposta ${atual.numero || ''} - ${atual.cliente.empresa || 'Wildner Design'}`;
    const t = document.title; document.title = d.title;
    $$('.conds details', d).forEach(x => x.open = true);
    w.focus(); w.print();
    document.title = t;
  }

  /* ---------- Configurações ---------- */
  let abertasCfg = new Set(['empresa']);
  function telaConfig() {
    marcarNav('config');
    const secoes = secoesConfig();
    const rascunho = clone(cfg);
    let timer = null;
    tela.innerHTML = `<div class="pagina"><div class="cab-pag"><div><h1>Configurações</h1><p>Padrões que entram em todo orçamento novo. Cada orçamento continua editável.</p></div>
      <div class="acoes"><button class="btn btn--g btn--perigo" id="restaurar">Restaurar padrões</button><span class="salvo" id="cfg-salvo" style="align-self:center">Salvo</span></div></div>
      <div class="cfg"><nav class="cfg-nav">${secoes.map(s => `<a href="#sec-${s.id}" data-ir="${s.id}">${s.titulo}</a>`).join('')}</nav><div id="cfg-campos"></div></div></div>`;
    const desenhar = () => { $$('#cfg-campos details').forEach(d => d.open ? abertasCfg.add(d.dataset.sec) : abertasCfg.delete(d.dataset.sec)); $('#cfg-campos').innerHTML = secoesHTML(secoes, rascunho, abertasCfg); };
    desenhar();
    $$('[data-ir]').forEach(a => a.onclick = e => { e.preventDefault(); const d = $('#sec-' + a.dataset.ir); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const salvar = async () => { try { (rascunho.portfolio || []).forEach(p => { if (!p.id) p.id = novoId(); }); (rascunho.depoimentos || []).forEach(p => { if (!p.id) p.id = novoId(); }); await WD.store.salvarConfig(rascunho); cfg = clone(rascunho); $('#cfg-salvo').textContent = 'Salvo'; } catch (e) { erro(e); } };
    ligarForm($('#cfg-campos'), () => rascunho, secoes, () => { $('#cfg-salvo').textContent = 'Salvando…'; clearTimeout(timer); timer = setTimeout(salvar, 800); }, desenhar);
    $('#restaurar').onclick = async () => {
      if (!confirm('Voltar todas as configurações para o padrão original? Os orçamentos já criados não mudam.')) return;
      Object.keys(rascunho).forEach(k => delete rascunho[k]); Object.assign(rascunho, clone(WD.CONFIG_PADRAO)); await salvar(); desenhar(); toast('Padrões restaurados');
    };
  }

  /* ---------- Rotas ---------- */
  function marcarNav(n) { $('#nav').hidden = false; $$('[data-nav]').forEach(a => a.classList.toggle('ativo', a.dataset.nav === n)); }
  async function rota() {
    if (sujo) await salvarAgora();
    window.removeEventListener('resize', escalar);
    atual = null;
    const h = location.hash.replace(/^#/, '') || '/';
    if (h.startsWith('/o/')) return telaEditor(h.slice(3));
    if (h === '/config') return telaConfig();
    return telaLista();
  }

  async function iniciar() {
    const modo = $('#modo');
    modo.className = 'modo' + (WD.store.modo === 'local' ? ' local' : '');
    modo.innerHTML = `<span>${WD.store.modo === 'local' ? 'Modo local' : 'Online'}</span>`;
    if (WD.store.modo === 'supabase') {
      const s = await WD.store.sessao();
      if (!s) return telaLogin();
      $('#sair').hidden = false;
      $('#sair').onclick = async () => { await WD.store.sair(); location.hash = ''; location.reload(); };
    }
    cfg = await WD.carregarConfig();
    window.onhashchange = rota;
    rota();
  }
  iniciar().catch(erro);
})();
