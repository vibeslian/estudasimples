-- Base de datos D1 de los pedidos de formatación. Se aplica con:
--   npx.cmd wrangler d1 execute estudasimples-pedidos --remote --file=pedidos/schema.sql
-- (para pruebas locales: --local en vez de --remote). Es seguro repetirlo: usa IF NOT EXISTS.
-- En una base que YA existe antes de las imágenes de la prévia (10/11/2026), añadir la columna una sola vez:
--   ALTER TABLE pedidos ADD COLUMN previa_imgs INTEGER NOT NULL DEFAULT 0;
--   ALTER TABLE pedidos ADD COLUMN baixou_docx_em INTEGER;
--   ALTER TABLE pedidos ADD COLUMN baixou_pdf_em INTEGER;

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,                 -- código corto que ve Lian (8 letras/números)
  token TEXT NOT NULL UNIQUE,          -- código largo y secreto del enlace del cliente
  nome TEXT,
  whatsapp TEXT,                       -- 55 + DDD + número
  tamanho TEXT NOT NULL,               -- ate30 | de31a60 | mais60
  arquivo_nome TEXT,                   -- nombre original (solo para mostrar)
  arquivo_tipo TEXT NOT NULL,          -- docx | pdf
  arquivo_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'recebido', -- recebido | em_andamento | pronto | pago | reembolsado | apagado
  valor_centavos INTEGER,
  tem_previa INTEGER NOT NULL DEFAULT 0,
  tem_docx INTEGER NOT NULL DEFAULT 0,
  tem_pdf INTEGER NOT NULL DEFAULT 0,
  baixou_docx_em INTEGER,               -- quando o cliente baixou o Word (primeira vez)
  baixou_pdf_em INTEGER,                -- quando o cliente baixou o PDF (primeira vez)
  previa_imgs INTEGER NOT NULL DEFAULT 0, -- imagens da prévia (até 3): 1 = imagem 1, 2 = imagem 2, 4 = imagem 3 (soma)
  mp_preferencia_id TEXT,
  mp_url TEXT,
  mp_pagamento_id TEXT,
  aviso TEXT,                          -- nota para Lian (por ejemplo, pago con valor diferente)
  criado_em INTEGER NOT NULL,
  pronto_em INTEGER,
  pago_em INTEGER,
  apagar_em INTEGER NOT NULL,          -- fecha en que el cron borra los archivos y los datos personales
  apagado_em INTEGER,
  consentimento_em INTEGER NOT NULL,
  consentimento_versao TEXT NOT NULL,
  ip_hash TEXT,
  pacote TEXT NOT NULL DEFAULT 'formatacao', -- formatacao | banca
  urgente INTEGER NOT NULL DEFAULT 0,        -- 1 = pediu entrega em 24 h
  manual_tipo TEXT                           -- docx | pdf quando o cliente anexou o manual da faculdade
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status, criado_em);
CREATE INDEX IF NOT EXISTS idx_pedidos_apagar ON pedidos (apagado_em, apagar_em);

CREATE TABLE IF NOT EXISTS ajustes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS limites (
  chave TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  expira INTEGER NOT NULL
);

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
