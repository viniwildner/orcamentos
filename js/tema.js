/* Modo escuro / modo claro (vale para o painel e para a proposta).
   Carregado no <head> para a página já abrir no modo escolhido, sem piscar. */
(function () {
  var t = null;
  try { t = localStorage.getItem('wd-tema'); } catch (e) { /* navegador sem armazenamento */ }
  document.documentElement.dataset.tema = t === 'claro' ? 'claro' : 'escuro';
})();

window.WD = window.WD || {};
WD.tema = function () { return document.documentElement.dataset.tema; };
WD.definirTema = function (novo) {
  document.documentElement.dataset.tema = novo;
  try { localStorage.setItem('wd-tema', novo); } catch (e) { /* ignora */ }
  document.dispatchEvent(new CustomEvent('wd-tema', { detail: novo }));
};
WD.alternarTema = function () { WD.definirTema(WD.tema() === 'claro' ? 'escuro' : 'claro'); };

WD.botaoTema = function (cls) {
  return '<button type="button" class="' + (cls || 'icone-btn') + ' btn-tema" data-alternar-tema aria-label="Alternar modo claro e escuro" title="Modo claro / modo escuro">' +
    '<svg class="i i-sol"><use href="#i-sun"/></svg><svg class="i i-lua"><use href="#i-moon"/></svg></button>';
};

/* Logo nas duas versões; o CSS mostra a certa para cada modo */
WD.logo = function (base, alt, cls) {
  base = base || ''; alt = alt || 'Wildner Design'; cls = cls ? ' ' + cls : '';
  return '<img class="logo logo--branco' + cls + '" src="' + base + 'img/logo-branco.png" alt="' + alt + '">' +
    '<img class="logo logo--escuro' + cls + '" src="' + base + 'img/logo-escuro.png" alt="" aria-hidden="true">';
};

document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('[data-alternar-tema]')) WD.alternarTema();
});
