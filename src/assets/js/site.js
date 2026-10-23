// JS mínimo do site: (1) aparecer suavemente ao rolar, (2) pausar as manchas quando saem da tela.
// Nada disso roda dentro do formulário ou da prévia da capa.
(function () {
  var reduzir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var itens = document.querySelectorAll(".revelar");

  // Menu: no computador "Ferramentas" abre um painel; no celular o botão abre a lista. Sem JavaScript os links continuam normais.
  try {
    var botao = document.getElementById("menuBotao");
    var menu = document.getElementById("menuPrincipal");
    var grupo = document.querySelector(".nav-grupo");
    var gatilho = document.querySelector(".nav-ferramentas");
    var movel = window.matchMedia("(max-width: 899px)");
    var fechaPainel = function (devolveFoco) {
      if (!grupo) return;
      grupo.classList.remove("aberto");
      if (gatilho) { gatilho.setAttribute("aria-expanded", "false"); if (devolveFoco) gatilho.focus(); }
    };
    var fechaMenu = function (devolveFoco) {
      if (!menu) return;
      menu.classList.remove("aberto");
      if (botao) { botao.setAttribute("aria-expanded", "false"); botao.setAttribute("aria-label", "Abrir o menu"); if (devolveFoco) botao.focus(); }
    };
    if (gatilho && grupo) {
      gatilho.setAttribute("role", "button");
      gatilho.setAttribute("aria-controls", "menuFerramentas");
      gatilho.setAttribute("aria-expanded", "false"); // no computador é um botão que abre o painel (sem JavaScript continua sendo o link para as ferramentas)
      var alterna = function (e) {
        if (movel.matches) return; // no celular as ferramentas já aparecem na lista do menu
        e.preventDefault();
        var abrir = !grupo.classList.contains("aberto");
        grupo.classList.toggle("aberto", abrir);
        gatilho.setAttribute("aria-expanded", String(abrir));
      };
      gatilho.addEventListener("click", alterna);
      gatilho.addEventListener("keydown", function (e) { if (e.key === " ") alterna(e); });
    }
    // página atual marcada no menu (aria-current)
    var atual = location.pathname.replace(/index\.html$/, "");
    document.querySelectorAll(".nav > a:not(.btn), .mega a").forEach(function (a) {
      var h = a.getAttribute("href") || "";
      if (h.split("?")[0].split("#")[0] === atual && h.indexOf("#") === -1) a.setAttribute("aria-current", "page");
    });
    // 6) um link do menu que leva para a mesma página (ex.: /#escolha) fecha o menu do celular
    if (menu) menu.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a && menu.classList.contains("aberto")) fechaMenu(false);
    });
    if (botao && menu) {
      botao.addEventListener("click", function () {
        var abrir = !menu.classList.contains("aberto");
        menu.classList.toggle("aberto", abrir);
        botao.setAttribute("aria-expanded", String(abrir));
        botao.setAttribute("aria-label", abrir ? "Fechar o menu" : "Abrir o menu");
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (grupo && grupo.classList.contains("aberto")) { fechaPainel(true); return; }
      if (menu && menu.classList.contains("aberto")) fechaMenu(true);
    });
    document.addEventListener("click", function (e) {
      if (grupo && grupo.classList.contains("aberto") && !grupo.contains(e.target)) fechaPainel(false);
      if (menu && menu.classList.contains("aberto") && !menu.contains(e.target) && botao && !botao.contains(e.target)) fechaMenu(false);
    });
    document.addEventListener("focusin", function (e) {
      if (grupo && grupo.classList.contains("aberto") && !grupo.contains(e.target)) fechaPainel(false); // o foco saiu do painel
    });
    var aoMudarTela = function () { fechaPainel(false); fechaMenu(false); };
    if (movel.addEventListener) movel.addEventListener("change", aoMudarTela);
  } catch (e) { /* os links do menu continuam funcionando sem isto */ }

  // «Pular para o conteúdo»: depois do clique o foco passa para o conteúdo (senão o foco do teclado fica «perdido» no topo)
  try {
    var pular = document.querySelector("a.skip");
    if (pular) pular.addEventListener("click", function () {
      var alvo = document.getElementById((pular.getAttribute("href") || "").slice(1));
      if (alvo) { alvo.setAttribute("tabindex", "-1"); alvo.focus(); }
    });
  } catch (e) { /* o link continua funcionando sem isto */ }

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
