// Comprueba que quien entra al panel pasó por Cloudflare Access (el código que llega al correo de Lian).
// Si Access no está configurado, el panel queda CERRADO (falla cerrando, nunca abierto).

let cacheClaves = { em: 0, chaves: null, dominio: "" };

function b64urlParaBytes(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

const jsonDe = (s) => JSON.parse(new TextDecoder().decode(b64urlParaBytes(s)));

async function chavesDe(dominio) {
  if (cacheClaves.chaves && cacheClaves.dominio === dominio && Date.now() - cacheClaves.em < 3600_000) return cacheClaves.chaves;
  const r = await fetch(`https://${dominio}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("não foi possível ler as chaves do Access");
  const { keys } = await r.json();
  cacheClaves = { em: Date.now(), chaves: keys, dominio };
  return keys;
}

export async function verificaAcesso(request, env) {
  // Atalho SÓ para testes locais; nunca está definido na configuração de produção.
  if (env.DEV_ADMIN_BYPASS === "sim-local") return { ok: true, email: "teste@local" };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return { ok: false, status: 503, erro: "Painel ainda não configurado (falta o Cloudflare Access)." };
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return { ok: false, status: 401, erro: "Sem acesso." };
  try {
    const [h, p, s] = jwt.split(".");
    const cab = jsonDe(h);
    if (cab.alg !== "RS256") return { ok: false, status: 401, erro: "Sem acesso." };
    const chave = (await chavesDe(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === cab.kid);
    if (!chave) return { ok: false, status: 401, erro: "Sem acesso." };
    const cripto = await crypto.subtle.importKey("jwk", chave, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valida = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cripto, b64urlParaBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!valida) return { ok: false, status: 401, erro: "Sem acesso." };
    const dados = jsonDe(p);
    const agora = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
    if (!aud.includes(env.ACCESS_AUD)) return { ok: false, status: 401, erro: "Sem acesso." };
    if (dados.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return { ok: false, status: 401, erro: "Sem acesso." };
    if (!dados.exp || dados.exp < agora || (dados.nbf && dados.nbf > agora + 60)) return { ok: false, status: 401, erro: "Sem acesso." };
    if (env.ADMIN_EMAIL && String(dados.email || "").toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return { ok: false, status: 403, erro: "Sem acesso." };
    return { ok: true, email: dados.email || "" };
  } catch {
    return { ok: false, status: 401, erro: "Sem acesso." };
  }
}
