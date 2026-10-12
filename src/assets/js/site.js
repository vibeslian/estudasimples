// JS mínimo do site: (1) aparecer suavemente ao rolar, (2) pausar as manchas quando saem da tela.
// Nada disso roda dentro do formulário ou da prévia da capa.
(function () {
  var reduzir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var itens = document.querySelectorAll(".revelar");

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
