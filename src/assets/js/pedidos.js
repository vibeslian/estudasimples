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

  // ---------- Formulário ----------
  var form = document.getElementById("formPedido");
  if (form) {
    var erro = document.getElementById("pdErro");
    var enviar = document.getElementById("pdEnviar");
    var mostrarErro = function (t) { erro.textContent = t; erro.hidden = !t; if (t) erro.scrollIntoView({ block: "center" }); };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      mostrarErro("");
      var arq = document.getElementById("pdArquivo").files[0];
      var digitos = document.getElementById("pdWhats").value.replace(/\D/g, "");
      if (digitos.length !== 10 && digitos.length !== 11) return mostrarErro("Confira o WhatsApp: use o DDD e o número, por exemplo (63) 91234-5678.");
      if (!arq) return mostrarErro("Anexe o arquivo do trabalho.");
      if (arq.size > MAX) return mostrarErro("O arquivo é grande demais. O limite é de 25 MB.");
      if (!/\.(docx|pdf)$/i.test(arq.name)) return mostrarErro("O arquivo precisa ser Word (.docx) ou PDF.");
      if (!document.getElementById("pdConsent").checked) return mostrarErro("É preciso concordar com os Termos de Uso e a Política de Privacidade.");
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
    if (copiar) copiar.addEventListener("click", function () {
      var campo = document.getElementById("pdLink"); campo.select();
      (navigator.clipboard ? navigator.clipboard.writeText(campo.value) : Promise.reject()).then(function () { copiar.textContent = "Copiado"; }, function () { document.execCommand("copy"); copiar.textContent = "Copiado"; });
    });
  }

  // ---------- Página do pedido ----------
  var app = document.getElementById("pedidoApp");
  if (!app) return;
  var m = /^#([A-Za-z0-9_-]{43})/.exec(location.hash);
  var codigo = m && m[1];
  var voltouDoPagamento = /(collection_status|status)=approved|payment_id=/.test(location.hash);
  var urlPrevia = null;

  function mostra(filhos) { app.replaceChildren.apply(app, filhos); }
  function cartao(filhos) { return el("div", { class: "pd-cartao" }, filhos); }
  function selo(t) { return el("span", { class: "etiqueta", texto: t }); }

  function baixar(tipo, botao) {
    botao.disabled = true;
    postar("/api/pedido/baixar/" + tipo, { codigo: codigo })
      .then(function (r) { if (!r.ok) throw r; return r.blob(); })
      .then(function (b) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "trabalho-formatado." + tipo;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      })
      .catch(function () { alert("Não foi possível baixar agora. Tente de novo ou chame no WhatsApp."); })
      .then(function () { botao.disabled = false; });
  }

  function desenha(p) {
    var ola = p.nome ? "Olá, " + p.nome + "! " : "";
    if (p.status === "recebido" || p.status === "em_andamento") {
      return mostra([cartao([selo(p.status === "recebido" ? "Pedido recebido" : "Em andamento"), el("h2", { texto: ola + "Estou cuidando do seu trabalho" }),
        el("p", { texto: "Assim que ficar pronto, você recebe uma mensagem no WhatsApp com este mesmo link para ver a prévia e pagar. Você só paga depois de ver a prévia." }),
        el("p", { class: "pd-nota", texto: "Pedido " + p.id + ". Guarde este link." })])]);
    }
    if (p.status === "pronto") {
      var abrir = el("a", { class: "btn", href: "#", target: "_blank", rel: "noopener", texto: "Abrir a prévia (PDF)" });
      if (urlPrevia) abrir.href = urlPrevia; else abrir.setAttribute("aria-disabled", "true");
      var pagar = el("button", { class: "btn btn-acento btn-grande", type: "button", texto: "Pagar com Pix" });
      var aviso = el("p", { class: "pd-erro", role: "alert", hidden: "" });
      pagar.addEventListener("click", function () {
        pagar.disabled = true; pagar.textContent = "Abrindo o pagamento…";
        postar("/api/pedido/pagar", { codigo: codigo }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (x) {
            if (x.ok && x.j.url && /^https:\/\//.test(x.j.url)) { location.href = x.j.url; return; }
            if (x.ok && x.j.ja_pago) { carrega(false); return; }
            aviso.textContent = (x.j && x.j.erro) || "Não consegui abrir o pagamento agora."; aviso.hidden = false; pagar.disabled = false; pagar.textContent = "Pagar com Pix";
          }).catch(function () { aviso.textContent = "Sem conexão. Tente de novo."; aviso.hidden = false; pagar.disabled = false; pagar.textContent = "Pagar com Pix"; });
      });
      return mostra([cartao([selo("Seu trabalho está pronto"), el("h2", { texto: ola + "Veja a prévia e pague para baixar" }),
        el("p", { texto: "A prévia mostra a capa e uma página do seu texto já formatadas." }), el("p", {}, [abrir]),
        el("p", { class: "pd-valor" }, [el("span", { texto: "Valor do serviço" }), el("b", { texto: reais(p.valor_centavos) })]),
        el("p", {}, [pagar]), aviso,
        el("p", { class: "pd-nota", texto: "O pagamento é feito por Pix no site do Mercado Pago. Quando for aprovado, o download libera aqui, na hora. Você pode desistir em até 7 dias." })])]);
    }
    if (p.status === "pago") {
      var w = el("button", { class: "btn btn-acento btn-grande", type: "button", texto: "Baixar em Word (.docx)" });
      var d = el("button", { class: "btn btn-grande", type: "button", texto: "Baixar em PDF" });
      w.addEventListener("click", function () { baixar("docx", w); }); d.addEventListener("click", function () { baixar("pdf", d); });
      return mostra([cartao([selo("Pagamento confirmado"), el("h2", { texto: "Seu trabalho está liberado" }), el("p", {}, [w]), el("p", {}, [d]),
        el("p", { class: "pd-nota", texto: "Os arquivos ficam neste link até " + dataBr(p.apagar_em) + ". Depois eu apago tudo, como combinado. Se precisar de um ajuste, é só chamar no WhatsApp." })])]);
    }
    if (p.status === "reembolsado") return mostra([cartao([selo("Reembolsado"), el("h2", { texto: "O pagamento deste pedido foi reembolsado" }), el("p", { texto: "O download não está mais disponível. Em caso de dúvida, chame no WhatsApp." })])]);
    mostra([cartao([el("h2", { texto: "Pedido não encontrado" })])]);
  }

  function carrega(verificar) {
    if (!codigo) return mostra([cartao([el("h2", { texto: "Link incompleto" }), el("p", { texto: "Abra o link completo que chegou no seu WhatsApp, ou chame no WhatsApp do site." })])]);
    postar("/api/pedido/estado", { codigo: codigo, verificar: !!verificar }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) return mostra([cartao([el("h2", { texto: "Pedido não encontrado" }), el("p", { texto: "O link pode estar incompleto, ou o pedido já foi apagado (os arquivos são apagados 15 dias depois da entrega)." })])]);
        var p = x.j.pedido;
        if (p.status === "pronto" && p.tem_previa && !urlPrevia) {
          return postar("/api/pedido/previa", { codigo: codigo }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { if (b) urlPrevia = URL.createObjectURL(b); desenha(p); }).catch(function () { desenha(p); });
        }
        desenha(p);
        if (voltouDoPagamento && p.status === "pronto" && (carrega.tentativas = (carrega.tentativas || 0) + 1) < 24) setTimeout(function () { carrega(true); }, 5000);
      })
      .catch(function () { mostra([cartao([el("h2", { texto: "Sem conexão" }), el("p", { texto: "Confira a internet e abra o link de novo." })])]); });
  }
  carrega(voltouDoPagamento);
})();
