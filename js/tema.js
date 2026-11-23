/* Modo escuro / modo claro (vale para o painel e para a proposta).
   Carregado no <head> para a página já abrir no modo escolhido, sem piscar. */
(function () {
  var t = null;
  try { t = localStorage.getItem('wd-tema'); } catch (e) { /* navegador sem armazenamento */ }
  document.documentElement.dataset.tema = t === 'escuro' ? 'escuro' : 'claro'; // padrão: claro
})();

window.WD = window.WD || {};
WD.tema = function () { return document.documentElement.dataset.tema; };
WD.definirTema = function (novo) {
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem('wd-tema', novo); } catch (e) { /* ignora */ }
  document.dispatchEvent(new CustomEvent('wd-tema', { detail: novo }));
};
WD.alternarTema = function () { WD.definirTema(WD.tema() === 'claro' ? 'escuro' : 'claro'); };

/* O botão agora é o seletor flutuante na lateral esquerda (abaixo); no topo não aparece mais. */
WD.botaoTema = function () { return ''; };

/* Seletor flutuante Escuro / Claro, na lateral esquerda, como no site da Wildner */
(function () {
  if (window.self !== window.top) return; // não aparece dentro da pré-visualização do painel
  var lua = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var sol = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var css = '.tema-sw{position:fixed;left:14px;top:50%;transform:translateY(-50%);z-index:80;display:flex;flex-direction:column;gap:4px;padding:4px;border-radius:999px;background:#1b1a1d;border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 30px rgba(0,0,0,.35)}' +
    '.tema-sw button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 9px;border-radius:999px;color:rgba(255,255,255,.6);font:600 13px/1 "DM Sans",system-ui,sans-serif;letter-spacing:.02em;transition:background-color .15s,color .15s}' +
    '.tema-sw button span{writing-mode:vertical-rl;transform:rotate(180deg)}' +
    '.tema-sw svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;transform:rotate(-90deg)}' +
    '.tema-sw button:hover{color:#fff}' +
    '.tema-sw button:focus-visible{outline:2px solid #0ffaa4;outline-offset:2px}' +
    '.tema-sw button[aria-pressed="true"]{background:#4d4c4e;color:#fff}' +
    ':root[data-tema="claro"] .tema-sw{background:#fff;border-color:rgba(17,16,19,.14);box-shadow:0 10px 30px rgba(17,16,19,.12)}' +
    ':root[data-tema="claro"] .tema-sw button{color:#4d4c4e}' +
    ':root[data-tema="claro"] .tema-sw button:hover{color:#111013}' +
    ':root[data-tema="claro"] .tema-sw button[aria-pressed="true"]{background:#111013;color:#fff}' +
    '@media (max-width:860px){.tema-sw{left:0;top:auto;bottom:24px;transform:none;border-left:0;border-radius:0 14px 14px 0;padding:3px}.tema-sw button{padding:9px 6px;gap:6px;font-size:11px;border-radius:11px}.tema-sw svg{width:14px;height:14px}}' +
    '@media print{.tema-sw{display:none!important}}';
  function montar() {
    if (document.querySelector('.tema-sw')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div');
    el.className = 'tema-sw'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Modo de cor');
    el.innerHTML = '<button type="button" data-tema-set="escuro" title="Modo escuro">' + lua + '<span>Escuro</span></button>' +
      '<button type="button" data-tema-set="claro" title="Modo claro">' + sol + '<span>Claro</span></button>';
    document.body.appendChild(el);
    marcar();
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-tema-set]'); if (b) WD.definirTema(b.dataset.temaSet); });
  }
  function marcar() {
    var t = WD.tema();
    Array.prototype.forEach.call(document.querySelectorAll('.tema-sw [data-tema-set]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.temaSet === t)); });
  }
  document.addEventListener('wd-tema', marcar);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();

/* Logo nas duas versões; o CSS mostra a certa para cada modo */
WD.logo = function (base, alt, cls) {
  base = base || ''; alt = alt || 'Wildner Design'; cls = cls ? ' ' + cls : '';
  return '<img class="logo logo--branco' + cls + '" src="' + base + 'img/logo-branco.png" alt="' + alt + '">' +
    '<img class="logo logo--escuro' + cls + '" src="' + base + 'img/logo-escuro.png" alt="" aria-hidden="true">';
};

document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('[data-alternar-tema]')) WD.alternarTema();
});
