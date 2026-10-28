# Kit TCC (produto digital pago, vendido pela Hotmart)

Página de venda `/kit-tcc/`. **LIGADO desde 27/10/2026** (`kit.ativo = true`, `legalAtualizadoEm = 2026-10-27`; Lian ativou as vendas na Hotmart no mesmo dia). Com `kit.ativo = false` a página, o `kit.css` e as imagens `assets/img/kit/` **nem entram no site**, nenhuma outra página fala do kit e os textos legais ficam como estavam (provado: o site construído é igual, byte a byte, ao de antes, fora do hash do build). As provas `probar-kit.mjs` e `probar-afiliados.mjs` forçam `ativo:false` nas construções «apagado», por isso valem com o kit ligado ou desligado.
Código: `build-kit.mjs`, `src/kit-tcc/index.html`, `src/assets/css/kit.css`, `conteudo/faq-kit-tcc.json`, `src/assets/img/kit/*.webp`. Desenho aprovado por Lian em 27/10/2026 (lienzo de Design; inclui a tabela «gratuito x kit»).

## Interruptor: bloco `kit` de `site.config.json`
| Campo | Para quê |
|---|---|
| `ativo` | `false` = nada vai ao site. `true` = página, sitemap, links e seções legais. |
| `preco` | Texto, `"29,90"` (preço decidido por Lian em 27/10/2026). Vai para a página, o título, a FAQ e os dados estruturados (`29.90`, BRL). |
| `urlCompra` | Link de compra da Hotmart (`https://pay.hotmart.com/...` ou `https://go.hotmart.com/...`). Só é exigido ao ligar. |
| `garantiaDias` | A garantia escolhida na Hotmart, de 7 a 30 (7 é o mínimo legal nas compras pela internet). Vai para a página, a FAQ e os Termos. |
| `legalAtualizadoEm` | Data (`"2026-11-05"`) em que Termos e Política passam a falar do kit. Só é exigida ao ligar; vira a «Última atualização». |

O build **se recusa** a ligar com `urlCompra` vazio, de fora da Hotmart ou sem `https`, sem data legal, com `garantiaDias` fora de 7–30 ou com `preco` mal escrito.

## Para ligar (depois do produto criado na Hotmart e do OK de Lian)
1. Cole o link em `kit.urlCompra`, confira `preco` e `garantiaDias` (igual ao da Hotmart), ponha a data em `legalAtualizadoEm` e `"ativo": true`.
2. `node build.mjs`, provas, revisor independente, publicar **só com a confirmação de Lian**.
3. Depois: `node indexnow.mjs --todas` (o rodapé muda em todas as páginas) e conferir a página ao vivo.

## O que muda ao ligar
- `/kit-tcc/` entra no sitemap, sem `noindex`.
- Rodapé de **todas** as páginas: «Kit TCC (modelo em Word)». Página do serviço: frase «Ou use o Kit TCC… por R$ 29,90».
- **Termos de Uso:** nova seção 11 «Kit TCC (produto digital)» (compra pela Hotmart, reembolso, licença de uso pessoal, o que o kit não é) e «Lei aplicável» passa a 12.
- **Política de Privacidade:** nova seção 2.5 «Compra do Kit TCC» (a Hotmart trata os dados da compra; o site não recebe pagamentos) e «Publicidade» passa a 2.6; a Hotmart entra na lista de quem recebe dados (seção 5).
- Os trechos ficam entre `<!--KIT:ON-->…<!--/KIT:ON-->` (só ligado) e `<!--KIT:OFF-->…<!--/KIT:OFF-->` (só apagado). A marca de fechamento não pode ficar logo antes de uma quebra de linha (o build a engole): ponha a quebra antes da marca de abertura, como no rodapé.

## Os arquivos do kit NÃO ficam no site NEM no git
**O repositório do GitHub é PÚBLICO.** Por isso a pasta `kit-tcc/` inteira está no `.gitignore`: nela estão o produto (`salida/`), as fontes do checklist e do guia (`fuentes/`), o gerador do Word (`crear-modelo-tcc.ps1`) e o material da Hotmart (`hotmart/`). Se fossem para o git, qualquer pessoa poderia baixar o kit de graça. Faça cópia de segurança da pasta fora do repositório (por exemplo, no Google Drive de Lian).
No site só há imagens de amostra (`src/assets/img/kit/`, páginas do checklist, do guia e do modelo) e o texto de venda, que são públicos de propósito.
Para refazer os arquivos: `powershell -ExecutionPolicy Bypass -File kit-tcc/generar-modelo.ps1` (Word oculto, com limite de tempo) e `node kit-tcc/crear-pdfs.mjs` (checklist e guia); a capa do produto na Hotmart: `node kit-tcc/hotmart/crear-capa.mjs`. Os textos para colar na Hotmart e o passo a passo estão em `kit-tcc/hotmart/anuncio-hotmart.md`.

## Pendências antes de ligar (não dependem de código)
- Contador: se o MEI pode vender produto digital (CNAE) e como emitir nota. Lian conversa com o contador.
- **Decisão de Lian (27/10/2026):** não esperar o contador; kit ligado e vendas ativas porque ele não espera vendas no primeiro mês. A pergunta do contador (CNAE de produto digital e nota fiscal) segue aberta e se trata em outra conversa; a página diz publicamente «MEI, CNPJ ...».
- **Hotmart (27/10/2026):** o produto está criado e aprovado (Curso Online, ID 8821443, R$ 29,90, garantia de 7 dias). O formato «eBook» da Hotmart só aceita PDF, ePub e planilhas (nem .docx nem .zip), por isso o kit é um «Curso Online» com os 4 arquivos como material extra de uma aula (a Hotmart Club aceita docx e zip). O link de compra já está em `kit.urlCompra`. **As vendas na Hotmart estão ATIVAS desde 27/10/2026** (interruptor «Ativar vendas» no cabeçalho do produto; para pausar, desligue-o e ponha `kit.ativo: false`, as duas coisas juntas). Falta confirmar na primeira compra como a Hotmart entrega (a FAQ diz que o comprador recebe o acesso pela Hotmart depois do pagamento aprovado).
- Revisão jurídica dos textos (um advogado amigo de Lian; fica para depois).

## Provas
`node pruebas/probar-kit.mjs` (92 comprobaciones): apagado (nada existe, nada o nombra), encendido (página, sitemap, pie de todas las páginas, servicio, Términos, Política, datos estructurados, tabla), errores del build, 320/390/768/1280 px, axe, CLS, imágenes perezosas, sin pedidos a terceros. Constrói cópias em pasta temporária (não toca em `dist/`). Capturas: `node pruebas/capturas-kit.mjs` (link de PRUEBA, só numa cópia).
