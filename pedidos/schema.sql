-- Base de datos D1 de los pedidos de formatación. Se aplica con:
--   npx.cmd wrangler d1 execute estudasimples-pedidos --remote --file=pedidos/schema.sql
-- (para pruebas locales: --local en vez de --remote). Es seguro repetirlo: usa IF NOT EXISTS.

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
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status, criado_em);
CREATE INDEX IF NOT EXISTS idx_pedidos_apagar ON pedidos (apagado_em, apagar_em);

CREATE TABLE IF NOT EXISTS limites (
  chave TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  expira INTEGER NOT NULL
);
