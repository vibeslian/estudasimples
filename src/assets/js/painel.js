/* Painel do Lian (/painel/). Protegido no servidor pelo Cloudflare Access; esta página só mostra os dados que o servidor entrega. */
(function () {
  "use strict";
  var lista = document.getElementById("pnLista"), detalhe = document.getElementById("pnDetalhe"), erroEl = document.getElementById("pnErro");
  var ROTULO = { recebido: "Recebido", em_andamento: "Em andamento", pronto: "Pronto, aguarda pagamento", pago: "Pago", reembolsado: "Reembolsado" };
  var TAM = { ate30: "até 30 páginas", de31a60: "31 a 60 páginas", mais60: "mais de 60 páginas" };
  var atual = null;

  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "texto") e.textContent = attrs[k]; else if (k === "onclick") e.addEventListener("click", attrs[k]); else e.setAttribute(k, attrs[k]); });
    (filhos || []).forEach(function (f) { e.appendChild(typeof f === "string" ? document.createTextNode(f) : f); });
    return e;
  }
  function erro(t) { erroEl.textContent = t || ""; erroEl.hidden = !t; }
  function api(rota, opcoes) {
    opcoes = opcoes || {};
    if (opcoes.method && opcoes.method !== "GET") opcoes.headers = Object.assign({ "X-Painel": "1" }, opcoes.headers || {});
    return fetch("/api/admin" + rota, opcoes).then(function (r) {
      if (r.ok && /json/.test(r.headers.get("content-type") || "")) return r.json();
      if (r.ok) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.erro || "Erro " + r.status); });
    });
  }
  var quando = function (s) { return s ? new Date(s * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; };
  var reais = function (c) { return c == null ? "" : "R$ " + (c / 100).toFixed(2).replace(".", ","); };

  function carregaLista() {
    api("/pedidos").then(function (d) {
      erro("");
      if (!d.pedidos.length) return lista.replaceChildren(el("p", { texto: "Nenhum pedido por enquanto." }));
      lista.replaceChildren.apply(lista, d.pedidos.map(function (p) {
        return el("button", { type: "button", class: "pn-item pn-" + p.status + (atual === p.id ? " pn-ativo" : ""), onclick: function () { atual = p.id; carregaLista(); abre(p.id); } }, [
          el("strong", { texto: "#" + p.id + " · " + (p.nome || "sem nome") }),
          el("span", { texto: (TAM[p.tamanho] || "") + " · " + quando(p.criado_em) }),
          el("em", { texto: ROTULO[p.status] || p.status })]);
      }));
    }).catch(function (e) { erro(e.message); lista.replaceChildren(); });
  }

  function baixaArquivo(blob, nome) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); }

  function abre(id) {
    api("/pedidos/" + id).then(function (d) {
      var p = d.pedido, entradas = {}, valor = el("input", { type: "number", min: "5", max: "1000", step: "0.01", id: "pnValor", value: p.valor_centavos ? (p.valor_centavos / 100).toFixed(2) : (p.tamanho === "ate30" ? "80.00" : p.tamanho === "de31a60" ? "140.00" : "") });
      var msg = el("p", { class: "pn-ok", role: "status" });
      function campoArquivo(qual, rotulo, aceita) {
        var inp = el("input", { type: "file", accept: aceita, id: "pn-" + qual });
        entradas[qual] = inp;
        var ja = { previa: p.tem_previa, docx: p.tem_docx, pdf: p.tem_pdf }[qual];
        return el("div", { class: "pn-arq" }, [el("label", { for: "pn-" + qual, texto: rotulo + (ja ? " (já enviado)" : "") }), inp]);
      }
      var imgs = null;
      function campoImagens() {
        imgs = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", id: "pn-imgs", multiple: "" });
        return el("div", { class: "pn-arq" }, [el("label", { for: "pn-imgs", texto: "1. Prévia em imagens (até 3, PNG ou JPG)" + (p.previa_imgs ? " (já enviadas: " + [1, 2, 4].filter(function (b) { return p.previa_imgs & b; }).length + ")" : "") }), imgs]);
      }
      function enviaArquivos() {
        var extras = [];
        if (imgs && imgs.files.length) {
          if (imgs.files.length > 3) return Promise.reject(new Error("Escolha no máximo 3 imagens."));
          Array.prototype.forEach.call(imgs.files, function (f, i) { extras.push(fetch("/api/admin/pedidos/" + id + "/arquivo/imagem" + (i + 1) + (i === 0 ? "?limpar=1" : ""), { method: "PUT", headers: { "X-Painel": "1" }, body: f }).then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error("imagem " + (i + 1) + ": " + (j.erro || r.status)); }); })); });
        }
        var tarefas = Object.keys(entradas).filter(function (q) { return entradas[q].files[0]; }).map(function (q) { return fetch("/api/admin/pedidos/" + id + "/arquivo/" + q, { method: "PUT", headers: { "X-Painel": "1" }, body: entradas[q].files[0] }).then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(q + ": " + (j.erro || r.status)); }); }); });
        return Promise.all(tarefas.concat(extras));
      }
      var fechado = p.status === "pago" || p.status === "reembolsado";
      var corpo = [
        el("h3", { texto: "Pedido #" + p.id + " · " + (p.nome || "sem nome") }),
        el("p", { texto: ROTULO[p.status] || p.status }),
        el("p", { texto: "WhatsApp " + (p.whatsapp || "") + " · " + (TAM[p.tamanho] || "") + " · " + (p.arquivo_nome || "") + " (" + Math.round(p.arquivo_bytes / 1024) + " KB)" }),
      ];
      if (p.aviso) corpo.push(el("p", { class: "pd-erro", role: "alert", texto: "Atenção: " + p.aviso }));
      corpo.push(el("p", {}, [el("button", { type: "button", class: "btn", texto: "Baixar o arquivo original", onclick: function () { api("/pedidos/" + id + "/original").then(function (b) { baixaArquivo(b, "original-" + id + "." + p.arquivo_tipo); }).catch(function (e) { erro(e.message); }); } })]));
      if (!fechado) {
        corpo.push(el("h4", { texto: "Quando o trabalho estiver feito" }), campoImagens(), campoArquivo("previa", "1b. Prévia em PDF (opcional)", ".pdf,application/pdf"), campoArquivo("docx", "2. Trabalho em Word", ".docx"), campoArquivo("pdf", "3. Trabalho em PDF", ".pdf,application/pdf"),
          el("div", { class: "pn-arq" }, [el("label", { for: "pnValor", texto: "4. Valor final (R$)" }), valor]),
          el("div", { class: "pn-botoes" }, [
            el("button", { type: "button", class: "btn", texto: "Salvar arquivos", onclick: function () { enviaArquivos().then(function () { msg.textContent = "Arquivos salvos."; carregaLista(); abre(id); }).catch(function (e) { erro(e.message); }); } }),
            el("button", { type: "button", class: "btn btn-acento", texto: "Marcar como pronto", onclick: function () {
              enviaArquivos().then(function () { return api("/pedidos/" + id + "/pronto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor_reais: Number(valor.value) }) }); })
                .then(function (r) { erro(""); window.__ultimoZap = r; carregaLista(); abre(id); setTimeout(function () { var z = document.getElementById("pnZap"); if (z) { z.href = r.whatsapp; z.hidden = false; } }, 400); })
                .catch(function (e) { erro(e.message); }); } })]));
      }
      if (p.status === "pronto" || p.status === "pago") {
        corpo.push(el("div", { class: "pn-botoes" }, [
          el("a", { class: "btn btn-acento", id: "pnZap", href: "https://wa.me/" + p.whatsapp + "?text=" + encodeURIComponent("Oi" + (p.nome ? ", " + p.nome.split(" ")[0] : "") + "! Aqui é o Lian, do Estuda Simples. O seu trabalho está pronto. Veja a prévia e pague (Pix ou cartão) neste link: " + d.link), target: "_blank", rel: "noopener", texto: "Abrir WhatsApp com a mensagem" }),
          el("button", { type: "button", class: "btn", texto: "Copiar o link do cliente", onclick: function () { navigator.clipboard.writeText(d.link).then(function () { msg.textContent = "Link copiado."; }); } })]));
        if (p.baixou_docx_em || p.baixou_pdf_em) corpo.push(el("p", { class: "pd-nota", texto: "Descargas do cliente: " + (p.baixou_docx_em ? "Word em " + quando(p.baixou_docx_em) : "Word ainda não") + "; " + (p.baixou_pdf_em ? "PDF em " + quando(p.baixou_pdf_em) : "PDF ainda não") + "." }));
        corpo.push(el("p", { class: "pd-nota", texto: "Valor: " + reais(p.valor_centavos) + (p.pago_em ? " · pago em " + quando(p.pago_em) : "") + ". Apago os arquivos em " + quando(p.apagar_em) + "." }));
      }
      corpo.push(msg, el("div", { class: "pn-botoes pn-perigo" }, [
        p.status === "pago" ? el("button", { type: "button", class: "btn", texto: "Marcar como reembolsado", onclick: function () { if (confirm("Marcar como reembolsado? O cliente perde o acesso ao download. O reembolso em si é feito no painel do Mercado Pago.")) api("/pedidos/" + id + "/reembolsado", { method: "POST" }).then(function () { carregaLista(); abre(id); }).catch(function (e) { erro(e.message); }); } }) : "",
        el("button", { type: "button", class: "btn", texto: "Apagar o pedido e os arquivos", onclick: function () { if (confirm("Apagar este pedido, os arquivos e os dados do cliente? Não dá para desfazer.")) api("/pedidos/" + id + "/apagar", { method: "POST" }).then(function () { atual = null; detalhe.replaceChildren(el("p", { texto: "Pedido apagado." })); carregaLista(); }).catch(function (e) { erro(e.message); }); } })]));
      detalhe.replaceChildren.apply(detalhe, corpo);
    }).catch(function (e) { erro(e.message); });
  }
  // Novo pedido: o cliente mandou o arquivo pelo WhatsApp e o Lian o coloca aqui para gerar o link de pagamento.
  (function formularioManual() {
    var nome = el("input", { type: "text", id: "pnNovoNome", maxlength: "80", autocomplete: "off" }), tel = el("input", { type: "tel", id: "pnNovoTel", placeholder: "(63) 91234-5678", autocomplete: "off" });
    var tam = el("select", { id: "pnNovoTam" }, [el("option", { value: "ate30", texto: "Até 30 páginas" }), el("option", { value: "de31a60", texto: "31 a 60 páginas" }), el("option", { value: "mais60", texto: "Mais de 60 páginas" })]);
    var arq = el("input", { type: "file", id: "pnNovoArq", accept: ".docx,.pdf" }), msg = el("p", { class: "pn-ok", role: "status" });
    var enviar = el("button", { type: "button", class: "btn btn-acento", texto: "Criar pedido", onclick: function () {
      var f = new FormData(); f.set("nome", nome.value); f.set("whatsapp", tel.value); f.set("tamanho", tam.value);
      if (arq.files[0]) f.set("arquivo", arq.files[0]);
      enviar.disabled = true;
      fetch("/api/admin/pedidos", { method: "POST", headers: { "X-Painel": "1" }, body: f }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.erro || "Erro " + r.status); return j; }); })
        .then(function (j) { erro(""); msg.textContent = "Pedido criado."; nome.value = ""; tel.value = ""; arq.value = ""; atual = j.id; carregaLista(); abre(j.id); })
        .catch(function (e) { erro(e.message); }).then(function () { enviar.disabled = false; });
    } });
    var caixa = el("details", { class: "pn-novo" }, [el("summary", { texto: "Novo pedido (o cliente mandou o arquivo pelo WhatsApp)" }),
      el("div", { class: "pn-arq" }, [el("label", { for: "pnNovoNome", texto: "Nome do cliente (opcional)" }), nome]),
      el("div", { class: "pn-arq" }, [el("label", { for: "pnNovoTel", texto: "WhatsApp do cliente (com DDD)" }), tel]),
      el("div", { class: "pn-arq" }, [el("label", { for: "pnNovoTam", texto: "Tamanho" }), tam]),
      el("div", { class: "pn-arq" }, [el("label", { for: "pnNovoArq", texto: "Arquivo que o cliente mandou (Word ou PDF)" }), arq]), enviar, msg]);
    lista.parentNode.insertBefore(caixa, lista);
  })();
  carregaLista();
  setInterval(carregaLista, 60000);
})();
