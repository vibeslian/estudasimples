-- Migração (11/11/2026): tabela de ajustes (guarda a conversa do Telegram do administrador). Seguro repetir.
CREATE TABLE IF NOT EXISTS ajustes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
