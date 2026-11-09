# Plan de 2 semanas: servicio y vitrina, sitio en mantenimiento (9 al 22/11/2026)

Foco adoptado por Lian el 9/11/2026 (propuesto por los analistas, ver `docs/analisis-ofertas-2026-11-07.md`): los próximos 90 días el dinero esperable viene del **servicio de formatación** y de usar el sitio como **vitrina** (herramientas que funcionan y fuentes visibles) para los otros trabajos de Lian; el sitio queda en **mantenimiento** (2 horas a la semana, sin guías nuevas). La prueba de Uninter es del 9 al 15/11 y vale el 100 %: **la semana 1 casi no pide tiempo a Lian**.

## Reglas del foco (qué se hace y qué se deja)
- SE HACE: pedidos del servicio (con tope de pedidos), muestra gratis del kit, primeras opiniones reales, medir 5 números, consultar al contador.
- SE DEJA (hasta revisar el 31/1/2027): guías nuevas, Pinterest, campaña de backlinks, AdSense y /anuncie/, más libros o cursos de afiliado, más informes de estrategia.
- Mantenimiento del sitio (Claude, ~2 h/semana): título y descripción de las guías con impresiones, quitar el aviso del ENEM el 17/11, fusionar guías que se pisan solo si Search Console lo confirma en 4 semanas.
- Honestidad: nada de opiniones, cifras ni clientes inventados. Cada opinión se publica solo con permiso escrito de la persona y marcada si el servicio fue gratis («formatado em troca de uma opinião sincera»).

## Los 5 números de cada lunes (10 minutos; Claude los junta)
1. Clics e impresiones de Google (Search Console), y el CTR de las 4 guías con más impresiones.
2. Conversas de WhatsApp que llegaron desde el sitio (el mensaje ya dice de qué página vienen: «Vim pelo site… (página …)»). Lian las cuenta a mano.
3. Pedidos del servicio (cuántos, de cuántas páginas, cuánto tardó cada uno en minutos).
4. Descargas de la muestra del kit (peticiones a `/assets/downloads/amostra-kit-tcc.pdf` en Cloudflare).
5. Ventas del kit y del curso (Hotmart) y clics a Amazon (panel de Associados).
Metas de 14 días (supuestos, no garantías): 3 personas contactadas, 1 a 3 trabajos de prueba entregados, 1 opinión real publicada, la consulta al contador enviada, los 5 números anotados una vez como línea de base.

## Semana 1 (9 al 15/11): preparar, sin presión
**Claude (sin tiempo de Lian):**
1. Dejar listos los textos de abajo (mensajes y plantillas) y el proceso de cada pedido (ya está en `docs/servico-procedimientos.md`).
2. Mirar el primer día del ENEM (8/11) en Search Console cuando haya datos (tardan 1 o 2 días) y reportar.
3. El 10/11: revisar AdSense (no hay que hacer nada, solo ver el estado).
4. Preparar el cambio de la página del servicio, SOLO si Lian lo aprueba (ver «Decisiones»).

**Lian (máximo 30 minutos en total esta semana):**
1. Enviar el mensaje al contador o a Sebrae (texto abajo). Es la tarea más importante: sin esa respuesta no se cobra el primer cliente.
2. Elegir en silencio a 3 compañeros de Uninter a quienes pedirás el favor (la semana 2). No escribirles todavía si no quieres.
3. Estudiar y hacer la prueba.

## Semana 2 (16 al 22/11): salir a hablar, poco y bien
- **Mar 17/11 (Claude):** quitar el aviso del ENEM de la portada y avisar a buscadores.
- **Lian:** escribir a los 3 compañeros (texto abajo), uno por día o los tres juntos. Para cada uno que acepte: recibir el .docx, formatearlo (Claude hace el trabajo, Lian revisa y entrega), en 3 días como máximo.
- **Al entregar:** pedir la opinión (texto abajo). Con su permiso escrito, Claude la agrega al sitio (`conteudo/avaliacoes.json`).
- **Grupos de Uninter:** antes de escribir nada, preguntar a los administradores si se puede compartir una herramienta gratuita. Solo si dicen que sí, publicar el mensaje 2 (abajo). Sin mensajes masivos.
- **Si alguien pregunta el precio:** R$ 80 hasta 30 páginas, R$ 140 de 31 a 60; precio final en el orçamento y antes del Pix. NO cobrar a nadie hasta tener la respuesta del contador.

## Textos listos (portugués de Brasil, para copiar)
**1) A un compañero (WhatsApp)**
```
Oi, [nome]! Tudo bem? Estou começando um serviço de formatação ABNT de trabalhos acadêmicos e preciso de 3 pessoas para testar. Se você tiver um trabalho em Word (TCC, artigo ou relatório) que precise de capa, sumário, margens e referências no padrão ABNT, eu formato de graça, em até 3 dias. Em troca, só peço uma opinião sincera (pode ser boa ou ruim) e, se você deixar, eu publico no site com o seu primeiro nome. Se não quiser, sem problema nenhum. Quer que eu explique como funciona?
```
(Si el compañero pregunta cómo se hace: decir la verdad, que se usa la herramienta Claude de IA y que Lian revisa; así lo dice la página del servicio. Pedir que quite del archivo datos personales de terceros.)

**2) Grupo de Uninter (solo con permiso de los administradores)**
```
Pessoal, fiz um site com ferramentas gratuitas para capa, folha de rosto, sumário e referências ABNT. Funciona no navegador, sem cadastro, e o que você digita não é enviado para ninguém: estudasimples.com.br. Se alguém tiver dúvida de formatação, posso dar uma olhada. Não estou vendendo nada por aqui, é só para ajudar.
```

**3) Al contador o a Sebrae**
```
Olá! Sou MEI (CNPJ 67.704.102/0001-69, CNAE principal 4759-8/99) e quero oferecer um serviço de formatação de trabalhos acadêmicos em Word e PDF (cobrado por Pix) e vender um modelo digital de R$ 29,90 pela Hotmart. Preciso incluir ou alterar algum CNAE? Posso emitir nota fiscal desses serviços? Qual o procedimento e o custo? Além disso, se eu formatar trabalhos de graça em troca de uma opinião, isso exige algum cuidado? Obrigado!
```

**4) Pedido de opinión al entregar**
```
Pronto, [nome]! O trabalho está formatado. Se tiver algum ajuste, me avise. Se quiser, escreva 2 ou 3 frases sinceras sobre como foi (pode ser crítica também) e me diga se posso publicar com o seu primeiro nome e a observação «formatado em troca de uma opinião sincera». Se preferir não publicar, tudo bem.
```

## Decisiones que necesita Lian (solo estas dos)
1. **Primera página antes del Pix.** Propuesta de los analistas: en la página del servicio decir «Te mando a primeira página formatada antes do Pix». Cuesta unos 10 minutos por pedido y es la mayor ayuda contra la desconfianza de pagar a una persona. Si Lian dice que sí, Claude cambia la página y las pruebas. Mientras tanto la página sigue como está.
2. **Precio de lanzamiento** para los 3 primeros clientes pagos, real y con fecha (por ejemplo hasta el 31/12/2026), o mantener R$ 80 y R$ 140. Los blogs de prestadores piden R$ 3 a 10 por página (no verificado): R$ 80 por 30 páginas ya está en el piso.

## Revisión
- 23/11: revisar los 5 números, qué respondieron los compañeros y qué dijo el contador; decidir si el servicio sigue, si se amplía el nicho o si se mueve el esfuerzo.
- 31/1/2027: si el kit no tiene ventas, pausarlo; si el servicio no tuvo ni un pedido, replantear el foco.
