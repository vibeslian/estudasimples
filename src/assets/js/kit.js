// Página do Kit TCC: a barra fixa de compra (celular) só aparece enquanto nenhum outro botão de compra está à vista, e some quando um aparece.
// Sem JavaScript ela fica escondida (os botões da página continuam lá).
(function () {
  var barra = document.getElementById("barraKit");
  var botoes = document.querySelectorAll('.hero a[href*="hotmart.com"], main a[href*="hotmart.com"]');
  if (!barra || !botoes.length || !("IntersectionObserver" in window)) return;
  var visiveis = new Set();
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { if (e.isIntersecting) visiveis.add(e.target); else visiveis.delete(e.target); });
    barra.classList.toggle("visivel", visiveis.size === 0);
  });
  botoes.forEach(function (b) { io.observe(b); });
})();

// Medir de onde vêm as compras sem guardar nada de ninguém: o nome da página de origem (#origem=guia-margens-abnt, por exemplo) vai no link da Hotmart como «src»,
// e a Hotmart mostra esse nome no relatório de vendas. É só o nome da página, nunca um dado pessoal.
(function () {
  try {
    var origem = new URLSearchParams(location.hash.replace(/^#/, "")).get("origem");
    if (!origem || !/^[a-z0-9-]{1,70}$/.test(origem)) return;
    document.querySelectorAll('a[href*="hotmart.com"]').forEach(function (a) {
      var u = new URL(a.href);
      u.searchParams.set("src", origem);
      a.href = u.toString();
    });
  } catch (e) { /* o link continua funcionando sem o rótulo */ }
})();
