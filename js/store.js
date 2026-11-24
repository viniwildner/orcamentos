/* Armazenamento dos orçamentos.
   Supabase quando js/config.js estiver preenchido; senão IndexedDB (modo local, só neste navegador). */
window.WD = window.WD || {};

(function () {
  const clone = o => JSON.parse(JSON.stringify(o));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const resumo = o => WD.resumoOrc(o);

  /* ---------- Modo local (IndexedDB) ---------- */
  function abrirDB() {
    return new Promise((ok, erro) => {
      const r = indexedDB.open('wildner_propostas', 1);
      r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('orcamentos', { keyPath: 'id' }); db.createObjectStore('config', { keyPath: 'id' }); };
      r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error);
    });
  }
  async function tx(store, modo, fn) {
    const db = await abrirDB();
    return new Promise((ok, erro) => {
      const t = db.transaction(store, modo); const s = t.objectStore(store); let res;
      const req = fn(s); if (req) req.onsuccess = () => { res = req.result; };
      t.oncomplete = () => ok(res); t.onerror = () => erro(t.error);
    });
  }
  const local = {
    modo: 'local',
    async sessao() { return { local: true }; },
    async entrar() { return { local: true }; },
    async sair() {},
    async listar() { const all = await tx('orcamentos', 'readonly', s => s.getAll()); return (all || []).map(resumo); },
    async obter(id) { return tx('orcamentos', 'readonly', s => s.get(id)); },
    async salvar(o) { o = clone(o); if (!o.id) o.id = uuid(); o.atualizadoEm = new Date().toISOString(); await tx('orcamentos', 'readwrite', s => s.put(o)); return o; },
    async excluir(id) { await tx('orcamentos', 'readwrite', s => s.delete(id)); },
    async obterConfig() { const r = await tx('config', 'readonly', s => s.get(1)); return r ? r.dados : null; },
    async salvarConfig(cfg) { await tx('config', 'readwrite', s => s.put({ id: 1, dados: clone(cfg) })); },
    async publico(id) { const o = await this.obter(id); if (!o) return null; return { orcamento: o, config: await this.obterConfig() }; },
    async registrarEscolha(id, escolha) {
      const o = await this.obter(id); if (!o) return;
      o.escolha = Object.assign({}, o.escolha, escolha);
      if (escolha.aprovadoEm && o.status !== 'aprovado') { o.status = 'aprovado'; WD.registrar(o, 'aprovado', 'cliente'); }
      else if (o.status === 'enviado') { o.status = 'visualizado'; WD.registrar(o, 'visualizado', 'cliente'); }
      await this.salvar(o);
    },
    async marcarVisto(id) { const o = await this.obter(id); if (o && o.status === 'enviado') { o.status = 'visualizado'; o.vistoEm = new Date().toISOString(); WD.registrar(o, 'visualizado', 'cliente'); await this.salvar(o); } }
  };

  /* ---------- Supabase ---------- */
  function criarSupabase() {
    const sb = window.supabase.createClient(WD.SUPABASE_URL, WD.SUPABASE_ANON_KEY);
    const ok = r => { if (r.error) throw r.error; return r.data; };
    const linha = o => ({ id: o.id, numero: o.numero || null, cliente: (o.cliente && o.cliente.empresa) || '', status: o.status || 'rascunho', valor: Number(o.valorBase || 0), tipo: o.tipo || 'website', dados: o, atualizado_em: new Date().toISOString() });
    return {
      modo: 'supabase', sb,
      async sessao() { const { data } = await sb.auth.getSession(); return data.session; },
      async entrar(email, senha) { return ok(await sb.auth.signInWithPassword({ email, password: senha })).session; },
      async sair() { await sb.auth.signOut(); },
      async listar() {
        const rows = ok(await sb.from('orcamentos').select('id,status,atualizado_em,dados').order('atualizado_em', { ascending: false }));
        return rows.map(r => Object.assign(resumo(Object.assign(r.dados || {}, { id: r.id, status: r.status, atualizadoEm: r.atualizado_em })), { atualizado_em: r.atualizado_em }));
      },
      async obter(id) { const r = ok(await sb.from('orcamentos').select('id,dados,status').eq('id', id).maybeSingle()); return r ? Object.assign(r.dados, { id: r.id, status: r.status }) : null; },
      async salvar(o) { o = clone(o); if (!o.id) o.id = uuid(); o.atualizadoEm = new Date().toISOString(); ok(await sb.from('orcamentos').upsert(linha(o))); return o; },
      async excluir(id) { ok(await sb.from('orcamentos').delete().eq('id', id)); },
      async obterConfig() { const r = ok(await sb.from('configuracoes').select('dados').eq('id', 1).maybeSingle()); return r ? r.dados : null; },
      async salvarConfig(cfg) { ok(await sb.from('configuracoes').upsert({ id: 1, dados: cfg, atualizado_em: new Date().toISOString() })); },
      async publico(id) { const r = ok(await sb.rpc('get_proposta', { p_id: id })); return r && r.orcamento ? r : null; },
      async registrarEscolha(id, escolha) { ok(await sb.rpc('registrar_escolha', { p_id: id, p_escolha: escolha })); },
      async marcarVisto(id) { ok(await sb.rpc('marcar_visto', { p_id: id })); }
    };
  }

  WD.temSupabase = () => !!(WD.SUPABASE_URL && WD.SUPABASE_ANON_KEY && window.supabase);
  WD.store = WD.temSupabase() ? criarSupabase() : local;

  /* Configurações sempre completas: o que faltar vem do padrão */
  WD.carregarConfig = async function () {
    let salvo = null;
    try { salvo = await WD.store.obterConfig(); } catch (e) { console.warn('Config', e); }
    const base = clone(WD.CONFIG_PADRAO);
    if (!salvo) return base;
    const cfg = Object.assign(base, salvo);
    cfg.empresa = Object.assign(clone(WD.CONFIG_PADRAO.empresa), salvo.empresa || {});
    cfg.pagamento = Object.assign(clone(WD.CONFIG_PADRAO.pagamento), salvo.pagamento || {});
    // Configurações antigas: marcas eram só nomes; depoimentos não tinham foto.
    const padraoM = WD.CONFIG_PADRAO.empresa.marcas;
    if ((cfg.empresa.marcas || []).some(m => typeof m === 'string')) {
      const nomes = cfg.empresa.marcas.map(m => typeof m === 'string' ? m : m.nome);
      cfg.empresa.marcas = clone(padraoM).concat(nomes.filter(n => !padraoM.some(m => m.nome === n)).map(nome => ({ nome, logo: '' })));
    }
    cfg.modelos = Object.assign({}, salvo.modelos || {});
    Object.keys(WD.CONFIG_PADRAO.modelos).forEach(t => { cfg.modelos[t] = Object.assign(clone(WD.CONFIG_PADRAO.modelos[t]), (salvo.modelos || {})[t] || {}); });
    (cfg.portfolio || []).forEach(p => { if (!p.tipos) { const d = WD.CONFIG_PADRAO.portfolio.find(x => x.id === p.id); p.tipos = d ? d.tipos.slice() : ['website']; } });
    (cfg.depoimentos || []).forEach(d => { const p = WD.CONFIG_PADRAO.depoimentos.find(x => x.id === d.id); if (p && d.foto === undefined) d.foto = p.foto; });
    return cfg;
  };

  /* Numeração travada: sequência por ano, nunca repete.
     2026 começa em 0129; cada ano novo recomeça em 0001. Formato 0129/2026. */
  WD.INICIO_NUMERACAO = { 2026: 129 };
  WD.formatarNumero = (n, ano) => `${String(n).padStart(4, '0')}/${ano}`;
  const anoAtual = () => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date()));
  function numeroPorLista(lista, ano) {
    const n = (lista || []).map(x => String(x.numero || '')).filter(x => x.endsWith('/' + ano)).map(x => parseInt(x, 10) || 0);
    const inicio = WD.INICIO_NUMERACAO[ano] || 1;
    return Math.max(inicio, (n.length ? Math.max(...n) : 0) + 1);
  }
  WD.proximoNumero = async function (lista) {
    const ano = anoAtual();
    if (WD.store.modo === 'supabase') {
      try { const r = await WD.store.sb.rpc('proximo_numero'); if (r.error) throw r.error; return r.data; }
      catch (e) { console.warn('Numeração online indisponível, usando a lista:', e.message || e); return WD.formatarNumero(numeroPorLista(lista, ano), ano); }
    }
    /* Modo local: contador guardado no próprio navegador */
    const salvo = await tx('config', 'readonly', s => s.get('numeracao'));
    let ultimo = salvo && salvo.ano === ano ? salvo.ultimo : 0;
    const proximo = Math.max(ultimo + 1, numeroPorLista(lista, ano));
    await tx('config', 'readwrite', s => s.put({ id: 'numeracao', ano, ultimo: proximo }));
    return WD.formatarNumero(proximo, ano);
  };
})();
