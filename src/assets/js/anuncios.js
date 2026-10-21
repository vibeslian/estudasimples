// Aviso de cookies e anúncios (Etapa 18). Este arquivo só é publicado quando anuncios.adsenseAtivo é true (site.config.json).
// Regras: nenhum anúncio (nem o script do Google) é carregado antes de o visitante escolher; "Recusar anúncios personalizados" pede anúncios
// não personalizados; a escolha fica no localStorage (não é cookie) e pode ser mudada em "Preferências de anúncios", no rodapé.
(function () {
  var CHAVE = "es-anuncios";
  var CLIENTE = "{{ADSENSE_CLIENTE}}";
  var VERSAO = "{{ADSENSE_LEGAL}}"; // data da política: se mudar, o aviso volta a perguntar
  var aviso = document.getElementById("aviso-anuncios");
  if (!aviso) return;
  var carregado = false;

  function lerEscolha() {
    try {
      var partes = (localStorage.getItem(CHAVE) || "").split("@");
      return (partes[0] === "personalizados" || partes[0] === "nao-personalizados") && partes[1] === VERSAO ? partes[0] : null;
    } catch (e) { return null; }
  }
  function guardar(v) { try { localStorage.setItem(CHAVE, v + "@" + VERSAO); } catch (e) { /* sem armazenamento: o aviso volta na próxima página */ } }

  function carregar(escolha) {
    if (carregado) return;
    carregado = true;
    window.adsbygoogle = window.adsbygoogle || [];
    if (escolha === "nao-personalizados") window.adsbygoogle.requestNonPersonalizedAds = 1;
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + CLIENTE;
    document.head.appendChild(s);
    document.querySelectorAll(".anuncio ins.adsbygoogle").forEach(function (ins) {
      if (!ins.offsetWidth) return; // espaço escondido (a lateral some no celular): não pede anúncio
      ins.parentNode.removeAttribute("aria-hidden");
      try { window.adsbygoogle.push({}); } catch (e) { /* o Google recusou este bloco: o espaço fica vazio */ }
    });
  }

  var origem = null; // o link "Preferências de anúncios" que abriu o aviso: o foco volta para ele ao fechar
  function mostrar(foco) {
    aviso.hidden = false;
    document.body.classList.add("com-aviso-anuncios");
    if (foco) { var b = aviso.querySelector("[data-anuncios-escolha]"); if (b) b.focus(); }
  }
  function fechar() {
    aviso.hidden = true;
    document.body.classList.remove("com-aviso-anuncios");
    if (origem && document.body.contains(origem)) origem.focus();
    origem = null;
  }

  function escolher(v) {
    var anterior = lerEscolha();
    guardar(v);
    fechar();
    // anúncios já carregados não se "descarregam": se a pessoa mudou de ideia, a página recarrega com a nova escolha
    if (carregado && anterior !== v) { location.reload(); return; }
    carregar(v);
  }

  aviso.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-anuncios-escolha]") : null;
    if (b) escolher(b.getAttribute("data-anuncios-escolha"));
  });
  document.addEventListener("click", function (e) {
    var l = e.target.closest ? e.target.closest("[data-anuncios-preferencias]") : null;
    if (l) { e.preventDefault(); origem = l; mostrar(true); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !aviso.hidden && lerEscolha()) fechar();
  });

  var atual = lerEscolha();
  if (atual) carregar(atual); else mostrar(false);
})();
