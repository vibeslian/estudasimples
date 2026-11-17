-- Aplicar uma vez:
--   npx.cmd wrangler d1 execute estudasimples-pedidos --remote --file=pedidos/migracao-2026-11-17.sql

-- Pacote, urgência e manual da faculdade (17/11/2026)
ALTER TABLE pedidos ADD COLUMN pacote TEXT NOT NULL DEFAULT 'formatacao'; -- formatacao | banca
ALTER TABLE pedidos ADD COLUMN urgente INTEGER NOT NULL DEFAULT 0;         -- 1 = pediu entrega em 24 h
ALTER TABLE pedidos ADD COLUMN manual_tipo TEXT;                           -- docx | pdf quando o cliente anexou o manual
