-- Contador anônimo e avisos da Hotmart (16/11/2026). Aplicar uma vez:
--   npx.cmd wrangler d1 execute estudasimples-pedidos --remote --file=pedidos/migracao-2026-11-16.sql

-- Contador anônimo (16/11/2026): visitas por página e cliques nos botões de compra. Sem cookies, sem IP, sem dados pessoais.
CREATE TABLE IF NOT EXISTS metricas (
  dia TEXT NOT NULL,                   -- AAAA-MM-DD, horário de Brasília
  pagina TEXT NOT NULL,                -- caminho da página, ex. /kit-tcc/
  evento TEXT NOT NULL,                -- vista | kit | servico | pedir | whatsapp | hotmart | curso | amazon
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, pagina, evento)
);

-- Avisos da Hotmart (webhook 2.0). Sem dados do comprador: só evento, produto, valor e data.
CREATE TABLE IF NOT EXISTS vendas_hotmart (
  transacao TEXT NOT NULL,
  evento TEXT NOT NULL,                -- PURCHASE_APPROVED, PURCHASE_REFUNDED, PURCHASE_OUT_OF_SHOPPING_CART...
  produto TEXT,
  valor_centavos INTEGER,
  moeda TEXT,
  criado_em INTEGER NOT NULL,
  PRIMARY KEY (transacao, evento)
);
CREATE INDEX IF NOT EXISTS idx_vendas_hotmart_data ON vendas_hotmart (criado_em);
