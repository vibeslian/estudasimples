// Worker de pedidos del Estuda Simples. Solo atiende /api/*; el resto del sitio lo sirve Cloudflare como archivos estáticos.
import { json, erro } from "./util.mjs";
import { verificaAcesso } from "./access.mjs";
import * as cliente from "./cliente.mjs";
import * as admin from "./admin.mjs";

function origemValida(request, env) {
  // Defensa contra pedidos enviados desde otro sitio: si el navegador manda «Origin», tiene que ser el nuestro.
  const o = request.headers.get("Origin");
  return !o || o === env.PUBLIC_BASE || (env.ORIGENS_EXTRA || "").split(",").includes(o);
}

async function rotaAdmin(request, env, partes) {
  const acesso = await verificaAcesso(request, env);
  if (!acesso.ok) return erro(acesso.status, acesso.erro);
  const metodo = request.method;
  if (metodo !== "GET" && request.headers.get("X-Painel") !== "1") return erro(403, "Pedido não permitido."); // contra CSRF
  // Rutas: /api/admin/pedidos[/:id[/acción[/tipo]]]; partes = ["", "api", "admin", "pedidos", id, acción, tipo]
  const p = partes.slice(3);
  if (p[0] === "limpeza" && metodo === "POST") return json({ ok: true, apagados: await admin.limpezaDiaria(env) }); // o mesmo que a limpeza diária, sob demanda
  if (p[0] !== "pedidos") return erro(404, "Não encontrado.");
  if (p.length === 1 && metodo === "GET") return admin.listar(env);
  const pid = p[1];
  if (p.length === 2 && metodo === "GET") return admin.detalhe(env, pid);
  if (p[2] === "original" && metodo === "GET") return admin.baixarOriginal(env, pid);
  if (p[2] === "arquivo" && metodo === "PUT") return admin.subir(request, env, pid, p[3]);
  if (p[2] === "andamento" && metodo === "POST") return admin.andamento(env, pid);
  if (p[2] === "pronto" && metodo === "POST") return admin.marcarPronto(request, env, pid);
  if (p[2] === "reembolsado" && metodo === "POST") return admin.reembolsado(env, pid);
  if (p[2] === "apagar" && metodo === "POST") return admin.apagar(env, pid);
  return erro(404, "Não encontrado.");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const partes = url.pathname.replace(/\/+$/, "").split("/"); // ["", "api", ...]
    if (partes[1] !== "api") return env.ASSETS.fetch(request);
    const metodo = request.method;
    if (metodo !== "GET" && metodo !== "HEAD" && !origemValida(request, env)) return erro(403, "Origem não permitida.");
    try {
      const rota = partes.slice(2).join("/");
      if (partes[2] === "admin") return await rotaAdmin(request, env, partes);
      if (metodo === "POST") {
        if (rota === "pedidos") return await cliente.criaPedido(request, env);
        if (rota === "pedido/estado") return await cliente.estado(request, env);
        if (rota === "pedido/previa") return await cliente.previa(request, env);
        if (rota === "pedido/pagar") return await cliente.pagar(request, env);
        if (rota === "pedido/baixar/docx") return await cliente.baixar(request, env, "docx");
        if (rota === "pedido/baixar/pdf") return await cliente.baixar(request, env, "pdf");
        if (rota === "mp/webhook") return await cliente.webhookMp(request, env);
      }
      if (metodo === "GET" && rota === "mp/webhook") return await cliente.webhookMp(request, env); // formato antigo do aviso (IPN)
      if (rota === "saude" && metodo === "GET") return json({ ok: true });
      return erro(404, "Não encontrado.");
    } catch (e) {
      console.error("erro interno", e && e.message);
      return erro(500, "Algo deu errado. Tente de novo em instantes.");
    }
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(admin.limpezaDiaria(env));
  },
};
