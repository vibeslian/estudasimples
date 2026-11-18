# Pedir opiniones reales (para mostrar en el sitio)

Regla: solo se publican opiniones reales, con autorización escrita de la persona, sin cambiar el sentido. Nunca inventar ni "mejorar" una opinión. Las opiniones aprobadas van a `conteudo/avaliacoes.json` (ver su `_ajuda`).

## Cuándo pedirla
- **Servicio de formatación:** 2 o 3 días después de que el cliente descargó el trabajo (en el panel se ve la fecha de descarga).
- **Kit TCC:** la lección de la Hotmart ya invita a opinar. Si un comprador escribe por e-mail, responder con el mensaje 2.

## Mensaje 1: cliente de la formatación (WhatsApp)

```
Oi, [nome]! Aqui é o Lian, do Estuda Simples. Espero que a entrega do seu TCC tenha dado certo.

Posso te pedir um favor rápido? Se você ficou satisfeito(a), me conta em 1 ou 2 frases como foi o serviço. Com a sua autorização, eu coloco a sua opinião no site, só com o seu primeiro nome e o curso (sem sobrenome, sem foto e sem mudar o que você escreveu).

Se algo não ficou bom, me fala também: eu quero corrigir. Obrigado!
```

## Mensaje 2: comprador del Kit TCC (e-mail)

```
Assunto: Como foi usar o Kit TCC?

Oi, [nome]! Aqui é o Lian, do Estuda Simples.

Obrigado por usar o Kit TCC. Se ele te ajudou, você me conta em 1 ou 2 frases como foi? Com a sua autorização, eu publico a sua opinião na página do kit, só com o seu primeiro nome (sem sobrenome e sem mudar o que você escreveu).

Se encontrou algum problema no modelo, me avise: eu corrijo e te mando a versão nova.

Lian
https://estudasimples.com.br
```

## Cuando la persona responde
1. Guardar la captura del mensaje con la autorización (fuera del repositorio: es un dato personal).
2. Pasarle a Claude el texto y el primer nombre; Claude lo agrega a `conteudo/avaliacoes.json`, construye y publica.
3. Solo con 1 opinión real o más se muestran las estrellas en los datos para Google; nunca antes.
