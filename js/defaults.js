/* Wildner Design — padrões do sistema de orçamentos.
   Tudo aqui pode ser alterado em Configurações; estes valores só servem de ponto de partida. */
window.WD = window.WD || {};

WD.ICONES = {
  target: 'Alvo', phone: 'Celular', search: 'Busca', trend: 'Crescimento', pen: 'Caneta', gauge: 'Velocidade',
  handshake: 'Aperto de mão', whats: 'WhatsApp', bed: 'Cama', panel: 'Painel', chart: 'Gráfico', cookie: 'Cookies',
  shield: 'Segurança', globe: 'Globo', mail: 'E-mail', calendar: 'Calendário', layout: 'Layout', code: 'Código',
  rocket: 'Foguete', eye: 'Olho', flag: 'Bandeira', wallet: 'Carteira', life: 'Suporte'
};

WD.CONFIG_PADRAO = {
  empresa: {
    nome: 'Wildner Design',
    responsavel: 'Marcus Vinicius Wildner',
    whatsapp: '5551980199884',
    telefoneExibicao: '(51) 98019-9884',
    email: 'contato@wildnerdesign.com.br',
    site: 'wildnerdesign.com.br',
    cidade: 'Porto Alegre/RS',
    cnpj: '38.097.297/0001-28',
    sobre: 'A Wildner Design é uma agência de design digital. Criamos websites, identidades visuais, chatbots e peças gráficas para empresas que querem crescer com uma presença digital de verdade.',
    clientes: '+120',
    anos: '10',
    sobreTitulo: 'Somos a Wildner Design',
    servicos: ['Websites', 'Identidade visual', 'Chatbots', 'Design gráfico'],
    imagemCapa: 'img/capa-celulares.webp',
    marcas: [
      { nome: 'Sicredi', logo: 'img/marcas/sicredi-2.webp' },
      { nome: 'Unimed VTRP', logo: 'img/marcas/unimed-vtrp.svg' },
      { nome: 'CRON', logo: 'img/marcas/cron-1.webp' },
      { nome: 'Plastrela', logo: 'img/marcas/plastrela.webp' },
      { nome: 'Imobiliária Joner', logo: 'img/marcas/imobiliaria-joner.webp' },
      { nome: 'Thomas Representações', logo: 'img/marcas/thomas-representacoes.webp' },
      { nome: 'Tomasi Logística', logo: 'img/marcas/tomasi-logistica.webp' },
      { nome: 'Proinst Engenharia', logo: 'img/marcas/proinst-engenharia.webp' },
      { nome: 'STW', logo: 'img/marcas/stw.webp' },
      { nome: 'Guillante Arquitetura', logo: 'img/marcas/guillante-arquitetura.webp' },
      { nome: 'Joel Imóveis', logo: 'img/marcas/joel-imoveis.webp' },
      { nome: 'Fazenda Santa Rosa', logo: 'img/marcas/fazenda-santa-rosa.webp' },
      { nome: 'Dinamize Engenharia', logo: 'img/marcas/dinamize.webp' },
      { nome: 'Salvini Contabilidade', logo: 'img/marcas/salvini.webp' },
      { nome: 'Rocket Tecnologia', logo: 'img/marcas/rocket-tecnologia.webp' },
      { nome: 'Nexsul', logo: 'img/marcas/nexsul.webp' },
      { nome: 'Saneban', logo: 'img/marcas/saneban.webp' },
      { nome: 'Refricomp', logo: 'img/marcas/refricomp.webp' },
      { nome: 'Viabile Engenharia', logo: 'img/marcas/viabile-engenharia.webp' },
      { nome: 'Agrotech', logo: 'img/marcas/agrotech.webp' },
      { nome: 'Tempereasy', logo: 'img/marcas/tempereasy.webp' },
      { nome: 'Bela Vista Esquadrias', logo: 'img/marcas/bela-vistta-esquadrias-e-vidracaria.webp' },
      { nome: 'Carmelito e Beto', logo: 'img/marcas/carmelito-e-beto.webp' },
      { nome: "Viccenzo's Café", logo: 'img/marcas/viccezos-cafe.webp' }
    ]
  },
  diferenciais: [
    { icone: 'pen', titulo: 'Layout exclusivo', texto: 'Nada de tema pronto. Cada site nasce da identidade e do público da sua marca.' },
    { icone: 'gauge', titulo: 'Rápido e leve', texto: 'Otimizado para carregar em poucos segundos, até no 4G.' },
    { icone: 'handshake', titulo: 'Atendimento direto', texto: 'Você fala com quem desenha e programa o seu site, sem intermediários.' },
    { icone: 'trend', titulo: 'Foco em resultado', texto: 'Cada página tem um objetivo claro: contato, reserva ou venda.' }
  ],
  portfolio: [
    { id: 'cron', nome: 'CRON – Centro Regional de Oncologia', segmento: 'Saúde', imagem: 'img/cron-mockup.webp', link: 'https://wildnerdesign.com.br/projeto/cron/', texto: 'Site responsivo que organiza informações médicas complexas em uma navegação simples, para pacientes e profissionais.' },
    { id: 'joner', nome: 'Imobiliária Joner', segmento: 'Imobiliária', imagem: 'img/joner-mockup.webp', link: 'https://wildnerdesign.com.br/projeto/imobiliaria-joner/', texto: 'Plataforma com filtros de imóveis, blog e plantão de vendas para uma imobiliária com mais de 30 anos de mercado.' },
    { id: 'thomas', nome: 'Thomas Representações', segmento: 'Construção civil', imagem: 'img/thomas-mockup.webp', link: 'https://wildnerdesign.com.br/projeto/thomas-representacoes/', texto: 'Identidade visual e site para uma representante de pisos e porcelanatos, com foco em confiança e tradição.' }
  ],
  depoimentos: [
    { id: 'tomasi', foto: 'img/dep-carlos.webp', nome: 'Carlos Eduardo Tomasi', empresa: 'Thomas Representações', texto: 'A Wildner Design transformou nossa marca em algo que realmente conecta com nossos clientes. O trabalho foi ágil, criativo e superou todas as expectativas!' },
    { id: 'knecht', foto: 'img/dep-fernando.webp', nome: 'Fernando André Knecht', empresa: 'Proinst Engenharia', texto: 'O cuidado com os detalhes e a originalidade do design nos conquistaram. Trabalhar com a Wildner Design foi a melhor decisão para nosso projeto.' },
    { id: 'soares', foto: 'img/dep-tonho.webp', nome: 'Luiz Antônio Soares', empresa: 'Flip Estratégia', texto: 'A experiência de mais de 10 anos se reflete na qualidade e profissionalismo. A Wildner Design conseguiu traduzir exatamente o que nossa agência precisava.' }
  ],
  funcionalidades: [
    { icone: 'whats', titulo: 'WhatsApp flutuante', texto: 'Com mensagem pronta que diz de qual página o cliente veio.' },
    { icone: 'panel', titulo: 'Painel de edição', texto: 'Troque textos, fotos e preços sem precisar de programador.' },
    { icone: 'search', titulo: 'SEO inicial', texto: 'Títulos, descrições e mapa do site configurados para o Google.' },
    { icone: 'chart', titulo: 'Google Analytics', texto: 'Para saber quantas pessoas visitam e de onde elas vêm.' },
    { icone: 'cookie', titulo: 'Aviso de cookies (LGPD)', texto: 'Banner de consentimento e política de privacidade.' },
    { icone: 'shield', titulo: 'Certificado SSL', texto: 'Navegação segura com cadeado (https).' },
    { icone: 'bed', titulo: 'Motor de reservas', texto: 'Integração com o sistema de reservas que você já usa.' },
    { icone: 'globe', titulo: 'Site em mais idiomas', texto: 'Versões traduzidas para atender visitantes de fora.' }
  ],
  opcionais: [
    { nome: 'Textos das páginas', desc: 'Redação pensada para o Google, feita por nós', valor: 1200, tipo: 'unico' },
    { nome: 'Versão em inglês e espanhol', desc: 'Para turistas e clientes estrangeiros', valor: 1800, tipo: 'unico' },
    { nome: 'Tratamento de fotos', desc: 'Até 60 fotos ajustadas para o site', valor: 600, tipo: 'unico' },
    { nome: 'Hospedagem e segurança', desc: 'Servidor, SSL, backup diário e e-mails', valor: 69, tipo: 'mensal' },
    { nome: 'Manutenção mensal', desc: 'Atualizações e até 2h de alterações por mês', valor: 290, tipo: 'mensal' }
  ],
  incluso: [
    'Layout exclusivo para computador, tablet e celular',
    'Até 2 rodadas de ajustes no layout',
    'Painel para editar textos, fotos e blog',
    'Treinamento de 1h por videochamada',
    'SEO inicial e Google Analytics',
    '30 dias de suporte após a publicação'
  ],
  naoIncluso: [
    'Registro do domínio (cerca de R$ 40 por ano no Registro.br)',
    'Produção de fotos e vídeos',
    'Textos e traduções, se não forem contratados como opcionais',
    'Anúncios pagos (Google e Instagram)'
  ],
  condicoes: [
    { titulo: 'Início e prazo', texto: 'O projeto começa depois da assinatura e do pagamento da entrada. Enquanto aguardamos materiais ou aprovações, o prazo fica pausado e retomamos assim que recebermos o retorno.' },
    { titulo: 'Alterações de escopo', texto: 'Novas páginas ou funcionalidades pedidas durante o projeto são orçadas à parte e só entram depois da sua aprovação, com novo prazo quando necessário.' },
    { titulo: 'Ajustes e suporte', texto: 'Durante {suporte} dias após a publicação, corrigimos sem custo qualquer erro de funcionamento. Depois desse período, alterações custam R$ {hora} por hora, sempre com estimativa aprovada antes.' },
    { titulo: 'Propriedade', texto: 'Após a quitação, o site, o domínio e o layout são seus. Você recebe todos os acessos.' },
    { titulo: 'Validade da proposta', texto: 'Esta proposta vale por {validade} dias, até {validoAte}.' }
  ],
  mensagens: {
    whatsapp: 'Olá, {contato}! Tudo bem? Aqui é o Marcus, da Wildner Design. Preparei a proposta do novo site da {empresa}. Você pode ver tudo, escolher a forma de pagamento e aprovar por este link: {link}\n\nQualquer dúvida, é só me chamar por aqui.',
    emailAssunto: 'Proposta {numero} · Novo site da {empresa}',
    emailCorpo: 'Olá, {contato}!\n\nSegue a proposta do novo site da {empresa}. No link abaixo você vê o escopo, o prazo e o investimento, escolhe a forma de pagamento e pode aprovar online:\n\n{link}\n\nSe preferir, a proposta também pode ser salva em PDF pelo botão no topo da página.\n\nFico à disposição.\n\nMarcus Vinicius Wildner\nWildner Design · (51) 98019-9884'
  },
  horaTecnica: 140,
  validadeDias: 30,
  suporteDias: 30,
  pagamento: {
    avista: { ativo: true, desconto: 5 },
    parcelado: { ativo: true, entradaPct: 30, parcelas: 5 },
    cartao: { ativo: true, parcelas: 10 }
  }
};

/* Modelo "Website": cria um orçamento novo já preenchido. */
WD.novoOrcamentoWebsite = function (cfg) {
  const hoje = new Date();
  return {
    tipo: 'website',
    status: 'rascunho',
    numero: '',
    data: hoje.toISOString().slice(0, 10),
    validadeDias: cfg.validadeDias,
    cliente: { empresa: '', contato: '', email: '', whatsapp: '', cidade: '' },
    titulo: 'Um novo site para a {cliente}',
    abertura: 'Um site rápido, bonito no celular e pensado para transformar visitas em contatos e vendas.',
    contexto: '',
    objetivos: [
      { icone: 'target', titulo: 'Mais contatos e vendas', texto: 'Chamadas para ação visíveis em todas as páginas, com WhatsApp integrado.' },
      { icone: 'phone', titulo: 'Perfeito no celular', texto: 'Pensado primeiro para o celular, onde está a maior parte dos visitantes.' },
      { icone: 'search', titulo: 'Ser encontrado no Google', texto: 'Estrutura otimizada para as buscas mais importantes do seu negócio.' }
    ],
    paginasQtd: 6,
    suporteDias: cfg.suporteDias,
    horaTecnica: cfg.horaTecnica,
    mapa: [
      { nome: 'Sobre', sub: [] },
      { nome: 'Serviços', sub: [] },
      { nome: 'Blog', sub: ['Post'] },
      { nome: 'Contato', sub: [] }
    ],
    utilitarias: ['Política de privacidade', 'Página 404'],
    paginasDetalhe: [
      { titulo: 'Início', qtd: '1 página', itens: ['Abertura com chamada principal', 'Apresentação dos serviços', 'Depoimentos de clientes', 'Chamada final para contato'] },
      { titulo: 'Sobre e Serviços', qtd: '2 páginas', itens: ['História, equipe e diferenciais', 'Serviços com benefícios de cada um'] },
      { titulo: 'Blog e Contato', qtd: '2 páginas', itens: ['Blog com categorias, editável pelo painel', 'Formulário, WhatsApp, mapa e horários'] }
    ],
    funcionalidades: cfg.funcionalidades.slice(0, 6).map(f => ({ ...f })),
    etapas: [
      { nome: 'Imersão', desc: 'Briefing e referências', barra: 'Reunião', inicio: 1, duracao: 1, tipo: 'normal' },
      { nome: 'Estrutura', desc: 'Mapa e conteúdo de cada página', barra: 'Wireframes', inicio: 1, duracao: 2, tipo: 'normal' },
      { nome: 'Design', desc: 'Layout no computador e no celular', barra: 'Layout', inicio: 2, duracao: 2, tipo: 'normal' },
      { nome: 'Aprovação do layout', desc: 'Até 2 rodadas de ajustes', barra: 'Aprovação', inicio: 4, duracao: 1, tipo: 'aprovacao' },
      { nome: 'Desenvolvimento', desc: 'Programação e painel', barra: 'Programação e conteúdo', inicio: 4, duracao: 3, tipo: 'normal' },
      { nome: 'Publicação', desc: 'Testes, SEO e site no ar', barra: 'No ar', inicio: 7, duracao: 2, tipo: 'final' }
    ],
    valorBase: 9800,
    descricaoBase: 'Website completo',
    pagamento: JSON.parse(JSON.stringify(cfg.pagamento)),
    pagamentoPadrao: 'parcelado',
    opcionais: cfg.opcionais.map(o => ({ ...o, marcado: o.tipo === 'mensal' && /hospedagem/i.test(o.nome) })),
    incluso: cfg.incluso.slice(),
    naoIncluso: cfg.naoIncluso.slice(),
    portfolio: cfg.portfolio.map(p => p.id),
    depoimentos: cfg.depoimentos.map(d => d.id),
    condicoes: cfg.condicoes.map(c => ({ ...c })),
    escolha: null
  };
};
