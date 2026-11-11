/* Pedido de formatação: formulário (/pedir-formatacao/) e página do pedido (/pedido/#código).
   Todo o texto que vem do servidor entra com textContent (nunca innerHTML). */
(function () {
  "use strict";
  var MAX = 25 * 1024 * 1024;

  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "texto") e.textContent = attrs[k];
      else if (k === "onclick") e.addEventListener("click", attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { e.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return e;
  }
  function postar(rota, corpo) {
    return fetch(rota, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  }
  function reais(centavos) { return "R$ " + (centavos / 100).toFixed(2).replace(".", ","); }
  function dataBr(seg) { return new Date(seg * 1000).toLocaleDateString("pt-BR"); }
  function tamanho(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  // ---------- Formulário ----------
  var form = document.getElementById("formPedido");
  if (form) {
    var erro = document.getElementById("pdErro");
    var enviar = document.getElementById("pdEnviar");
    var campoArq = document.getElementById("pdArquivo");
    var nomeArq = document.getElementById("pdArquivoNome");
    if (campoArq && nomeArq) campoArq.addEventListener("change", function () {
      var f = campoArq.files[0];
      nomeArq.textContent = f ? f.name + " · " + tamanho(f.size) : "Nenhum arquivo escolhido";
    });
    var mostrarErro = function (t, campo) {
      erro.textContent = t; erro.hidden = !t;
      if (t) { if (campo) { campo.focus(); campo.setAttribute("aria-invalid", "true"); } erro.scrollIntoView({ block: "center" }); }
    };
    form.addEventListener("input", function (ev) { if (ev.target.removeAttribute) ev.target.removeAttribute("aria-invalid"); });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      mostrarErro("");
      var whats = document.getElementById("pdWhats");
      var arq = campoArq.files[0];
      var digitos = whats.value.replace(/\D/g, "");
      if (digitos.length !== 10 && digitos.length !== 11) return mostrarErro("Confira o WhatsApp: use o DDD e o número, por exemplo (63) 91234-5678.", whats);
      if (!arq) return mostrarErro("Anexe o arquivo do trabalho.", campoArq);
      if (arq.size > MAX) return mostrarErro("O arquivo é grande demais. O limite é de 25 MB.", campoArq);
      if (!/\.(docx|pdf)$/i.test(arq.name)) return mostrarErro("O arquivo precisa ser Word (.docx) ou PDF.", campoArq);
      if (!document.getElementById("pdConsent").checked) return mostrarErro("É preciso concordar com os Termos de Uso e a Política de Privacidade.", document.getElementById("pdConsent"));
      var dados = new FormData(form);
      dados.set("consentimento", "sim");
      enviar.disabled = true; enviar.textContent = "Enviando…";
      fetch("/api/pedidos", { method: "POST", body: dados })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j.codigo) { mostrarErro((x.j && x.j.erro) || "Não foi possível enviar agora. Tente de novo em instantes."); enviar.disabled = false; enviar.textContent = "Enviar pedido"; return; }
          var link = location.origin + "/pedido/#" + x.j.codigo;
          form.hidden = true;
          var feito = document.getElementById("pdFeito");
          document.getElementById("pdLink").value = link;
          document.getElementById("pdAbrir").href = link;
          feito.hidden = false; feito.focus(); feito.scrollIntoView({ block: "start" });
        })
        .catch(function () { mostrarErro("Sem conexão. Confira a internet e tente de novo."); enviar.disabled = false; enviar.textContent = "Enviar pedido"; });
    });
    var copiar = document.getElementById("pdCopiar");
    var aviso = document.getElementById("pdCopiado");
    if (copiar) copiar.addEventListener("click", function () {
      var campo = document.getElementById("pdLink"); campo.select();
      var feito = function () { copiar.textContent = "Copiado"; if (aviso) aviso.textContent = "Link copiado."; };
      (navigator.clipboard ? navigator.clipboard.writeText(campo.value) : Promise.reject()).then(feito, function () { document.execCommand("copy"); feito(); });
    });
  }

  // ---------- Página do pedido ----------
  var app = document.getElementById("pedidoApp");
  if (!app) return;
  var m = /^#([A-Za-z0-9_-]{43})/.exec(location.hash);
  var codigo = m && m[1];
  var voltouDoPagamento = /(collection_status|status)=approved|payment_id=/.test(location.hash);
  var urlPrevia = null, urlsImg = [], previaCarregada = false;
  var tentativas = 0, temporizador = null, emCurso = false;

  function mostra(filhos) { app.replaceChildren.apply(app, filhos); }
  function cartao(filhos) { return el("div", { class: "pd-cartao" }, filhos); }
  function selo(t) { return el("span", { class: "etiqueta", texto: t }); }

  function baixar(tipo, botao, aviso) {
    botao.disabled = true; aviso.hidden = true;
    postar("/api/pedido/baixar/" + tipo, { codigo: codigo })
      .then(function (r) { if (!r.ok) throw r; return r.blob(); })
      .then(function (b) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "trabalho-formatado." + tipo;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      })
      .catch(function () { aviso.textContent = "Não foi possível baixar agora. Tente de novo ou chame no WhatsApp (63) 99216-7482."; aviso.hidden = false; })
      .then(function () { botao.disabled = false; });
  }

  function galeria() {
    return el("div", { class: "pd-galeria" }, urlsImg.map(function (u, i) {
      return el("a", { href: u, target: "_blank", rel: "noopener", "aria-label": "Abrir a página " + (i + 1) + " da prévia em tamanho grande" }, [el("img", { src: u, alt: "Prévia, página " + (i + 1), loading: "lazy" })]);
    }));
  }

  function desenha(p) {
    var ola = p.nome ? "Olá, " + p.nome + "! " : "";
    if (p.status === "recebido" || p.status === "em_andamento") {
      return mostra([cartao([selo(p.status === "recebido" ? "Pedido recebido" : "Em andamento"), el("h2", { texto: ola + "Estou cuidando do seu trabalho" }),
        el("p", { texto: "Assim que ficar pronto, você recebe uma mensagem no WhatsApp com este mesmo link para ver a prévia e pagar. Você só paga depois de ver a prévia." }),
        el("p", { class: "pd-nota", texto: "Pedido " + p.id + ". Guarde este link." })])]);
    }
    if (p.status === "pronto") {
      var partes = [selo("Seu trabalho está pronto"), el("h2", { texto: ola + "Veja a prévia e pague para baixar" })];
      if (urlsImg.length) partes.push(el("p", { texto: "Veja como ficou a formatação (toque numa imagem para ampliar):" }), galeria());
      if (urlPrevia) partes.push(el("p", {}, [el("a", { class: "btn", href: urlPrevia, target: "_blank", rel: "noopener", texto: "Abrir a prévia em PDF (abre em nova aba)" })]));
      if (!urlsImg.length && !urlPrevia) partes.push(el("p", { class: "pd-nota", texto: "A prévia não carregou. Recarregue a página ou chame no WhatsApp (63) 99216-7482." }));
      var pagar = el("button", { class: "btn btn-acento btn-grande", type: "button", texto: "Pagar com Pix ou cartão" });
      var aviso = el("p", { class: "pd-erro", role: "alert", hidden: "" });
      pagar.addEventListener("click", function () {
        pagar.disabled = true; pagar.textContent = "Abrindo o pagamento…";
        postar("/api/pedido/pagar", { codigo: codigo }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (x) {
            if (x.ok && x.j.url && /^https:\/\//.test(x.j.url)) { location.href = x.j.url; return; }
            if (x.ok && x.j.ja_pago) { carrega(false); return; }
            aviso.textContent = (x.j && x.j.erro) || "Não consegui abrir o pagamento agora."; aviso.hidden = false; pagar.disabled = false; pagar.textContent = "Pagar com Pix ou cartão";
          }).catch(function () { aviso.textContent = "Sem conexão. Tente de novo."; aviso.hidden = false; pagar.disabled = false; pagar.textContent = "Pagar com Pix ou cartão"; });
      });
      partes.push(el("p", { class: "pd-valor" }, [el("span", { texto: "Valor do serviço" }), el("b", { texto: reais(p.valor_centavos) })]), el("p", {}, [pagar]), aviso);
      if (p.pagamento_iniciado) partes.push(el("p", { class: "pd-nota", role: "status", texto: "Se você já pagou, aguarde um instante: esta página confirma o pagamento sozinha e libera o download." }));
      partes.push(el("p", { class: "pd-nota", texto: "O pagamento é feito no site do Mercado Pago, por Pix ou cartão. Quando for aprovado, o download libera aqui, na hora. Você pode desistir em até 7 dias: é só avisar pelo WhatsApp (63) 99216-7482, e eu devolvo o valor." }));
      return mostra([cartao(partes)]);
    }
    if (p.status === "pago") {
      var w = el("button", { class: "btn btn-acento btn-grande", type: "button", texto: "Baixar em Word (.docx)" });
      var d = el("button", { class: "btn btn-grande", type: "button", texto: "Baixar em PDF" });
      var avisoDl = el("p", { class: "pd-erro", role: "alert", hidden: "" });
      w.addEventListener("click", function () { baixar("docx", w, avisoDl); }); d.addEventListener("click", function () { baixar("pdf", d, avisoDl); });
      return mostra([cartao([selo("Pagamento confirmado"), el("h2", { texto: "Seu trabalho está liberado" }), el("p", {}, [w]), el("p", {}, [d]), avisoDl,
        el("p", { class: "pd-nota", texto: "Os arquivos ficam neste link até " + dataBr(p.apagar_em) + ". Guarde o link: se você voltar a ele, o download continua liberado. Depois dessa data eu apago tudo, como combinado. Se precisar de um ajuste, é só chamar no WhatsApp (63) 99216-7482." })])]);
    }
    if (p.status === "reembolsado") return mostra([cartao([selo("Reembolsado"), el("h2", { texto: "O pagamento deste pedido foi reembolsado" }), el("p", { texto: "O download não está mais disponível. Em caso de dúvida, chame no WhatsApp." })])]);
    mostra([cartao([el("h2", { texto: "Pedido não encontrado" })])]);
  }

  function carregaPrevia(p) {
    if (previaCarregada) return Promise.resolve();
    var tarefas = [];
    if (p.tem_previa) tarefas.push(postar("/api/pedido/previa", { codigo: codigo }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b) urlPrevia = URL.createObjectURL(b); }));
    (p.previa_imgs || []).forEach(function (n) {
      tarefas.push(postar("/api/pedido/previa-imagem", { codigo: codigo, n: n }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b) urlsImg[n - 1] = URL.createObjectURL(b); }));
    });
    return Promise.all(tarefas).then(function () { urlsImg = urlsImg.filter(Boolean); previaCarregada = !!(urlPrevia || urlsImg.length || (!p.tem_previa && !(p.previa_imgs || []).length)); }).catch(function () { /* mostra o que carregou */ });
  }

  function carrega(verificar) {
    clearTimeout(temporizador);
    if (emCurso) return;
    emCurso = true;
    if (!codigo) return mostra([cartao([el("h2", { texto: "Link incompleto" }), el("p", { texto: "Abra o link completo que chegou no seu WhatsApp, ou chame no WhatsApp do site." })])]);
    postar("/api/pedido/estado", { codigo: codigo, verificar: !!verificar }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (x) {
        if (x.status === 429) return mostra([cartao([el("h2", { texto: "Aguarde um instante" }), el("p", { texto: "Muitas consultas em pouco tempo. Esta página tenta de novo sozinha." })])]) || (temporizador = setTimeout(function () { carrega(true); }, 30000));
        if (!x.ok) return mostra([cartao([el("h2", { texto: "Pedido não encontrado" }), el("p", { texto: "O link pode estar incompleto, ou o pedido já foi apagado (os arquivos são apagados 15 dias depois da entrega)." })])]);
        var p = x.j.pedido;
        var depois = p.status === "pronto" ? carregaPrevia(p) : Promise.resolve();
        return depois.then(function () {
          desenha(p);
          // Pagamento em andamento (ou acabou de voltar do Mercado Pago): confere sozinho a cada 6 segundos, até uns 15 minutos
          if (p.status === "pronto" && (voltouDoPagamento || p.pagamento_iniciado) && tentativas++ < 80) temporizador = setTimeout(function () { carrega(true); }, tentativas < 20 ? 6000 : 30000); // 2 minutos de 6 em 6 s e depois de 30 em 30 s
        });
      })
      .catch(function () { mostra([cartao([el("h2", { texto: "Sem conexão" }), el("p", { texto: "Confira a internet e abra o link de novo." })])]); })
      .then(function () { emCurso = false; });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && tentativas < 80) carrega(true); });
  carrega(voltouDoPagamento);
})();
