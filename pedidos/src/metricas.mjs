// Contador anônimo do site: quantas vezes cada página foi vista e quantos cliques houve nos botões de compra.
// Sem cookies e sem dados pessoais: guarda só o dia, o caminho da página, o tipo de evento e um número.
import { json, erro, lerJson, limitar } from "./util.mjs";

export const EVENTOS = ["vista", "kit", "servico", "pedir", "whatsapp", "hotmart", "curso", "amazon"];
const PAGINA_RE = /^\/[a-z0-9\-\/]{0,90}$/;
const ROBO_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch/i;
const MAX_POR_DIA = 5000; // teto de registros por dia (contra abuso); não depende de quem envia

// Dia no horário de Brasília (UTC-3), no formato AAAA-MM-DD.
export const diaBrasil = (ms = Date.now()) => new Date(ms - 3 * 3600 * 1000).toISOString().slice(0, 10);

export async function registra(request, env) {
  if (ROBO_RE.test(request.headers.get("User-Agent") || "")) return new Response(null, { status: 204 });
  // Só conta o que vem das páginas do próprio site (o navegador manda Sec-Fetch-Site ou Origin)
  const mesmoSite = request.headers.get("Sec-Fetch-Site") === "same-origin" || request.headers.get("Origin") === env.PUBLIC_BASE;
  if (!mesmoSite) return erro(403, "Origem não permitida.");
  const corpo = await lerJson(request, 512);
  if (!corpo) return erro(400, "Dados inválidos.");
  const pagina = typeof corpo.p === "string" ? corpo.p.toLowerCase() : "";
  const evento = corpo.e;
  if (!PAGINA_RE.test(pagina) || pagina.includes("//") || !EVENTOS.includes(evento)) return erro(400, "Dados inválidos.");
  // Só páginas que existem de verdade no site (evita encher a base com caminhos inventados)
  if (env.ASSETS) {
    const r = await env.ASSETS.fetch(new Request(env.PUBLIC_BASE + pagina, { method: "HEAD" }));
    if (r.status !== 200) return new Response(null, { status: 204 });
  }
  const dia = diaBrasil();
  if (!(await limitar(env, `metricas|${dia}`, MAX_POR_DIA, 2 * 86400))) return new Response(null, { status: 204 });
  await env.DB.prepare(
    "INSERT INTO metricas (dia, pagina, evento, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(dia, pagina, evento) DO UPDATE SET n = n + 1",
  ).bind(dia, pagina, evento).run();
  return new Response(null, { status: 204 });
}

// Resumo para o painel: totais por evento e as páginas que mais geraram cliques de compra, nos últimos N dias.
export async function resumo(env, dias = 7) {
  const n = Math.min(Math.max(Number(dias) || 7, 1), 90);
  const desde = diaBrasil(Date.now() - (n - 1) * 86400 * 1000);
  const porEvento = await env.DB.prepare("SELECT evento, SUM(n) AS n FROM metricas WHERE dia >= ?1 GROUP BY evento ORDER BY n DESC").bind(desde).all();
  const porPagina = await env.DB.prepare(
    "SELECT pagina, SUM(CASE WHEN evento='vista' THEN n ELSE 0 END) AS vistas, SUM(CASE WHEN evento<>'vista' THEN n ELSE 0 END) AS cliques " +
      "FROM metricas WHERE dia >= ?1 GROUP BY pagina ORDER BY cliques DESC, vistas DESC LIMIT 40",
  ).bind(desde).all();
  const vendas = await env.DB.prepare(
    "SELECT evento, produto, COUNT(*) AS n, SUM(valor_centavos) AS centavos FROM vendas_hotmart WHERE criado_em >= ?1 GROUP BY evento, produto ORDER BY n DESC",
  ).bind(Math.floor(Date.parse(desde + "T03:00:00Z") / 1000)).all();
  return json({ ok: true, dias: n, desde, porEvento: porEvento.results, porPagina: porPagina.results, hotmart: vendas.results });
}
