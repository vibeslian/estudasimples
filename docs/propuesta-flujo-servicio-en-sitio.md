# Propuesta: pedir, subir y pagar el servicio de formatación dentro del sitio (9/11/2026)

Idea de Lian (9/11/2026): el cliente elige el servicio en el sitio, sube su PDF/Word, deja su teléfono, ve un cartel («listo en menos de 72 horas, te llega un mensaje por WhatsApp»); Lian marca «listo» en un panel; al cliente le llega un enlace de estudasimples.com.br con el trabajo listo, que solo se puede descargar después de pagar. Antes de dejar su número, el cliente ve el perfil de Lian (foto, número, enlace) para saber quién le va a escribir (hay muchas estafas).

Decisión de Lian en el mismo mensaje: **nada gratis, ni descuentos de lanzamiento**. Precios: R$ 80 (hasta 30 pág.), R$ 140 (31 a 60), más de 60 a consultar.

## Opinión de Claude
- La idea de la **confianza** (tarjeta «quién te va a escribir») es buena y barata: se puede hacer YA, sin backend.
- La idea del **flujo completo** (subir, panel, descarga con pago) es buena como producto, pero hoy es grande: necesita servidor, almacenamiento privado, panel con contraseña, pago automático y cambios legales. Con 0 pedidos todavía, conviene construirla solo si el servicio ya tiene pedidos reales.

## Fases propuestas
1. **Ya (sin backend, gratis):** tarjeta de confianza en la página del servicio y antes del botón de WhatsApp: foto de Lian (la que él elija), número de WhatsApp, «solo escribo desde este número», razón social y CNPJ, enlace a Sobre/Contato, «nunca pido contraseña ni pago antes de la prévia». Hecho con textos reales; nada inventado.
2. **Después (poco backend):** formulario con teléfono + archivo que llega a Lian (correo o almacenamiento privado). El pago sigue siendo Pix manual después de la prévia.
3. **Solo si hay pedidos:** panel de Lian (con login), enlace de descarga que se abre después del pago, aviso por WhatsApp. El pago automático necesita proveedor de Pix o Hotmart.

## Decisiones de Lian (9/11/2026, noche)
- Quiere el flujo completo y lo más automatizado posible, por etapas, explicándole cada paso.
- Aprueba la API oficial de WhatsApp Business para los avisos (le parece barata; el aviso solo sale cuando el cliente va a pagar).
- Cobro con Mercado Pago (Pix). Tarifa confirmada por Lian: 0,99 %.
- WhatsApp Web en su Chrome quedó trabado en «Carregando suas conversas [0%]»; no hace falta para la tarjeta: el número ya está en el sitio y la foto se la puede pasar como archivo.

## Datos investigados el 9/11/2026 (verificar antes de contratar)
- **API de WhatsApp Business (oficial, Meta):** el registro es gratis; se paga por mensaje de plantilla. Meta cobra en reales desde el 1/7/2026. Cifras encontradas en blogs (NO confirmadas en la tabla oficial): utilidad ≈ R$ 0,04 a 0,08 por mensaje; marketing hasta ≈ R$ 0,38. Cada número tiene 1.000 mensajes de servicio gratis al mes (conversaciones que inicia el cliente). Desde el 1/10/2026 se empieza a cobrar el exceso y hay que tener medio de pago en el Billing Hub. Un aviso «tu trabajo está listo» es mensaje de plantilla de utilidad. Casi siempre se usa un intermediario (BSP) con mensualidad. Tabla oficial: developers.facebook.com/documentation/business-messaging/whatsapp/pricing (CSV/PDF en reales).
- **Mercado Pago (Pix por API):** una página de Mercado Pago indica 0,99 % por venta Pix, sin mensualidad (no confirmado para la API; ver la tabla de tarifas de la cuenta de Lian). Mercado Pago recomienda la API «Orders» para integraciones nuevas.
- **Búsquedas en Google Brasil por mes (Ubersuggest):** «formatação abnt» 22.200 (mayoría quiere aprender a hacerlo, no pagar); «formatação abnt word» 3.600; «normas para formatação abnt» 3.600; «formatar tcc» 720; «formatar tcc abnt» 1.000; «trabalho formatação abnt» 720; «formatação de tcc» 320; «formatação abnt online» 390; «formatação de tcc valor» 20; «valor para formatar tcc» 10. Las de intención clara de contratar (valor, precio) son muy pocas: el servicio vive de las ~1.000 a 2.000 búsquedas de «formatar tcc» más las que llegan por las guías y herramientas del sitio.

## Lo que hay que decidir antes de la fase 2 y 3
- Dónde se guardan los archivos y quién los ve (la Política dice hoy que las herramientas no suben nada; habría que cambiar Política y Termos, LGPD).
- Aviso por WhatsApp automático: requiere la API oficial de WhatsApp Business (con plantillas aprobadas y costo por mensaje). Alternativa gratis: Lian manda el enlace desde su propio WhatsApp.
- Cómo se cobra: Pix manual (hoy) o proveedor (comisión) o Hotmart.
- Costo mensual del servidor/almacenamiento y quién da soporte si falla.
- Protección contra abuso (archivos con virus, spam, números falsos).
