// JS mínimo do site: (1) aparecer suavemente ao rolar, (2) pausar as manchas quando saem da tela.
// Nada disso roda dentro do formulário ou da prévia da capa.
(function () {
  var reduzir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var itens = document.querySelectorAll(".revelar");

  window.__siteJs = true; // avisa ao head-common.html que este arquivo carregou (ele revela as seções se não carregar)

  // Capa de exemplo da portada: "se escreve sozinha" uma vez (só no computador, onde ela aparece; com movimento reduzido já vem pronta).
  // Cada letra ganha um <span> só enquanto escreve: só a opacidade muda (CLS 0). Ao terminar, o texto original volta (mantém o kerning).
  // Dentro de try/catch: se algo falhar aqui, o resto da página (as seções que aparecem ao rolar) continua funcionando.
  try {
    var capa = document.querySelector(".mini-capa");
    if (capa && !reduzir && capa.offsetParent !== null) {
      var hero = capa.parentNode, letras = [], grupos = [], nos = [];
      var caminho = document.createTreeWalker(capa, NodeFilter.SHOW_TEXT);
      while (caminho.nextNode()) if (caminho.currentNode.nodeValue.trim()) nos.push(caminho.currentNode);
      nos.forEach(function (no) {
        var frag = document.createDocumentFragment(), grupo = { no: no, spans: [] };
        Array.from(no.nodeValue).forEach(function (c) { var s = document.createElement("span"); s.className = "ch"; s.textContent = c; frag.appendChild(s); letras.push(s); grupo.spans.push(s); });
        no.parentNode.replaceChild(frag, no);
        grupos.push(grupo);
      });
      capa.classList.add("digitando");
      hero.classList.add("espera");
      var inicio = null, pos = 0, MS = 22, ATRASO = 1500;
      var restaura = function () {
        grupos.forEach(function (g) { var p = g.spans[0].parentNode; p.insertBefore(g.no, g.spans[0]); g.spans.forEach(function (s) { p.removeChild(s); }); });
        capa.classList.remove("digitando");
        hero.classList.remove("espera");
      };
      var escreve = function (t) {
        if (inicio === null) inicio = t;
        var n = Math.floor((t - inicio - ATRASO) / MS);
        while (pos <= n && pos < letras.length) letras[pos++].classList.add("on");
        if (pos < letras.length) requestAnimationFrame(escreve); else setTimeout(restaura, 250);
      };
      requestAnimationFrame(escreve);
    }
  } catch (e) { /* sem a animação, a capa fica pronta como no HTML */ }

  if (reduzir || !("IntersectionObserver" in window)) {
    itens.forEach(function (el) { el.classList.add("visivel"); });
    return;
  }

  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("visivel"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  itens.forEach(function (el) { io.observe(el); });

  var manchas = document.querySelectorAll(".manchas");
  if (manchas.length) {
    var io2 = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle("pausado", !e.isIntersecting); });
    });
    manchas.forEach(function (m) { io2.observe(m); });
  }
})();
