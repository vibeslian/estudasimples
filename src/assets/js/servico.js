// Página do serviço de formatação: se o visitante veio de uma ferramenta (#origem=capa; ?origem=capa também vale, para links de fora), o botão do WhatsApp
// leva a mensagem daquela página, para eu saber de onde veio o pedido. Sem JavaScript, vale a mensagem padrão.
// Só usa links que já estão na página (nada vem do endereço, a não ser o nome da origem, que tem de existir na lista).
(function () {
  var lista = document.getElementById("whatsapp-origens");
  if (!lista) return;
  var links;
  try { links = JSON.parse(lista.textContent); } catch (e) { return; }
  var origem = new URLSearchParams(location.hash.replace(/^#/, "")).get("origem") || new URLSearchParams(location.search).get("origem");
  if (!origem || !Object.prototype.hasOwnProperty.call(links, origem)) return;
  document.querySelectorAll("a[data-whatsapp]").forEach(function (a) { a.href = links[origem]; });
})();

// Barra fixa do WhatsApp (celular): aparece enquanto nenhum outro botão do WhatsApp está à vista, e some quando um aparece.
// Sem JavaScript ela fica escondida (os botões da página continuam lá).
(function () {
  var barra = document.getElementById("barraWhatsapp");
  var botoes = document.querySelectorAll("a[data-whatsapp]:not([data-barra])");
  if (!barra || !botoes.length || !("IntersectionObserver" in window)) return;
  var visiveis = new Set();
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { if (e.isIntersecting) visiveis.add(e.target); else visiveis.delete(e.target); });
    barra.classList.toggle("visivel", visiveis.size === 0);
  });
  botoes.forEach(function (b) { io.observe(b); });
})();
