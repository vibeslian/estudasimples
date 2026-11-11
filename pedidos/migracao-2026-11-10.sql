-- Migração única (10/11/2026): imagens da prévia e registro das descargas. Rodar UMA vez em cada base que já existia.
ALTER TABLE pedidos ADD COLUMN previa_imgs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN baixou_docx_em INTEGER;
ALTER TABLE pedidos ADD COLUMN baixou_pdf_em INTEGER;
