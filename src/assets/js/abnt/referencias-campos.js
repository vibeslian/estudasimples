// Campos do gerador de referências ABNT (NBR 6023:2018): o que se pergunta para cada tipo de fonte.
// Este arquivo é a ÚNICA fonte: o build.mjs o usa para escrever o HTML dos formulários (assim a página já chega pronta, sem salto de layout)
// e o referencias.js o usa para ler os campos. Sem DOM: pode ser importado no Node.
//
// Cada tipo é uma lista de blocos:
//   { k: "autoria", id, ... }            quem escreveu: pessoas (sobrenome + nome), instituição ou ninguém
//   { k: "texto" | "num" | "area", id, rotulo, ajuda?, placeholder?, obrig? }
//   { k: "select", id, rotulo, opcoes: [[valor, rótulo], ...] }
//   { k: "check", id, rotulo }
//   { k: "data", id, rotulo, partes: ["dia","mes","ano"], obrig? }     (artigo: "mesIni","mesFim","ano")
//   { k: "online", id: "online", doi? }  Disponível em + Acesso em (e DOI nos artigos)
//   { k: "mais", rotulo, campos: [...] }  grupo recolhido "Mais opções"
// O id do DOM é "<tipo>__<id>" (ex.: livro__titulo).

export const MESES = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
export const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const OPCOES_MES = [["", "—"], ...MESES_EXTENSO.map((m, i) => [String(i + 1), m])];

export const PAPEIS = [
  ["autor", "Autor"],
  ["org", "Organizador (org.)"],
  ["coord", "Coordenador (coord.)"],
  ["ed", "Editor (ed.)"],
  ["comp", "Compilador (comp.)"],
];
export const TIPOS_ANO = [
  ["documento", "O ano aparece no documento"],
  ["provavel", "O ano não aparece, mas é provável: [2018?]"],
  ["certo", "O ano não aparece, mas tenho certeza: [2017]"],
  ["aproximado", "O ano é aproximado: [ca. 2015]"],
  ["decada", "Só sei a década (certa): [200-]"],
  ["decadaProvavel", "Só sei a década (provável): [201-?]"],
];
export const TIPOS_NORMA = ["Lei", "Lei complementar", "Decreto", "Decreto-lei", "Medida provisória", "Portaria", "Resolução", "Instrução normativa", "Emenda constitucional"];
export const TIPOS_TRABALHO = [
  ["tcc", "Trabalho de Conclusão de Curso", "Graduação"],
  ["tccEsp", "Trabalho de Conclusão de Curso", "Especialização"],
  ["monografia", "Monografia", "Especialização"],
  ["dissertacao", "Dissertação", "Mestrado"],
  ["tese", "Tese", "Doutorado"],
];

const ano = (extra = {}) => ({ k: "data", id: "pub", rotulo: "Ano de publicação", partes: ["ano"], obrig: true, ...extra });
const anoTipo = { k: "select", id: "anoTipo", rotulo: "Se o documento não traz o ano", opcoes: TIPOS_ANO };
const online = (doi = false) => ({ k: "online", id: "online", doi });

export const TIPOS = [
  {
    id: "livro", nome: "Livro", exemplo: "SILVA, Maria Helena. Escrita acadêmica na prática. 2. ed. São Paulo: Editora Exemplo, 2022.",
    blocos: [
      { k: "autoria", id: "autoria", papel: true, entidade: true, sem: true },
      { k: "texto", id: "titulo", rotulo: "Título do livro", obrig: true, placeholder: "Ex.: Escrita acadêmica na prática" },
      { k: "texto", id: "subtitulo", rotulo: "Subtítulo", opcional: true, placeholder: "Ex.: do projeto ao TCC" },
      { k: "texto", id: "edicao", rotulo: "Edição", opcional: true, ajuda: "Só o número, se aparecer no livro (a partir da 2ª). Ex.: 2", placeholder: "Ex.: 2" },
      { k: "texto", id: "local", rotulo: "Cidade", ajuda: "Está na folha de rosto do livro. Se não houver, deixe em branco (sai [S. l.]).", placeholder: "Ex.: São Paulo" },
      { k: "texto", id: "editora", rotulo: "Editora", ajuda: "Sem \"Ltda.\" nem \"S.A.\". Se não houver, deixe em branco (sai [s. n.]).", placeholder: "Ex.: Editora Exemplo" },
      ano(),
      { k: "mais", rotulo: "Mais opções (volume, tradutor, e-book, link)", campos: [
        { k: "texto", id: "volume", rotulo: "Volume", opcional: true, ajuda: "Só se for uma obra em vários volumes. Ex.: 2", placeholder: "Ex.: 2" },
        { k: "texto", id: "tradutor", rotulo: "Tradutor", opcional: true, placeholder: "Ex.: Maria Antonia Simões Nunes" },
        { k: "check", id: "ebook", rotulo: "É um e-book" },
        anoTipo,
        online(),
      ] },
    ],
  },
  {
    id: "capitulo", nome: "Capítulo de livro", exemplo: "COSTA, Rafael. A leitura na universidade. In: SILVA, Maria Helena (org.). Escrita acadêmica na prática. São Paulo: Editora Exemplo, 2022. p. 45-62.",
    blocos: [
      { k: "autoria", id: "autoria", sem: true, rotulo: "Quem escreveu o capítulo" },
      { k: "texto", id: "titulo", rotulo: "Título do capítulo", obrig: true, placeholder: "Ex.: A leitura na universidade" },
      { k: "titulo2", rotulo: "O livro onde o capítulo está" },
      { k: "autoria", id: "obraAutoria", papel: true, entidade: true, sem: true, rotulo: "Quem escreveu ou organizou o livro" },
      { k: "texto", id: "obraTitulo", rotulo: "Título do livro", obrig: true, placeholder: "Ex.: Escrita acadêmica na prática" },
      { k: "texto", id: "obraSubtitulo", rotulo: "Subtítulo do livro", opcional: true },
      { k: "texto", id: "edicao", rotulo: "Edição", opcional: true, placeholder: "Ex.: 2" },
      { k: "texto", id: "local", rotulo: "Cidade", placeholder: "Ex.: São Paulo" },
      { k: "texto", id: "editora", rotulo: "Editora", placeholder: "Ex.: Editora Exemplo" },
      ano(),
      { k: "linha", campos: [
        { k: "texto", id: "capNum", rotulo: "Capítulo nº", opcional: true, placeholder: "Ex.: 3" },
        { k: "texto", id: "pagIni", rotulo: "Página inicial", opcional: true, placeholder: "Ex.: 45" },
        { k: "texto", id: "pagFim", rotulo: "Página final", opcional: true, placeholder: "Ex.: 62" },
      ] },
      { k: "mais", rotulo: "Mais opções (volume, link)", campos: [
        { k: "texto", id: "volume", rotulo: "Volume do livro", opcional: true, placeholder: "Ex.: 2" },
        anoTipo,
        online(),
      ] },
    ],
  },
  {
    id: "artigo", nome: "Artigo de revista ou periódico", exemplo: "PEREIRA, Carla. Redes sociais e aprendizagem. Revista Exemplo de Educação, São Paulo, v. 12, n. 2, p. 33-48, jul./dez. 2021.",
    blocos: [
      { k: "autoria", id: "autoria", sem: true, rotulo: "Quem escreveu o artigo" },
      { k: "texto", id: "titulo", rotulo: "Título do artigo", obrig: true, placeholder: "Ex.: Redes sociais e aprendizagem" },
      { k: "texto", id: "subtitulo", rotulo: "Subtítulo do artigo", opcional: true },
      { k: "texto", id: "periodico", rotulo: "Nome da revista ou periódico", obrig: true, placeholder: "Ex.: Revista Exemplo de Educação" },
      { k: "texto", id: "local", rotulo: "Cidade da revista", ajuda: "Se não constar, deixe em branco (sai [s. l.]).", placeholder: "Ex.: São Paulo" },
      { k: "linha", campos: [
        { k: "texto", id: "volume", rotulo: "Volume (v.)", opcional: true, placeholder: "Ex.: 12" },
        { k: "texto", id: "numero", rotulo: "Número (n.)", opcional: true, placeholder: "Ex.: 2" },
      ] },
      { k: "linha", campos: [
        { k: "texto", id: "pagIni", rotulo: "Página inicial", opcional: true, placeholder: "Ex.: 33" },
        { k: "texto", id: "pagFim", rotulo: "Página final", opcional: true, placeholder: "Ex.: 48" },
      ] },
      { k: "data", id: "pub", rotulo: "Data da edição", partes: ["mesIni", "mesFim", "ano"], obrig: true },
      { k: "mais", rotulo: "Mais opções (DOI, link, artigo só online)", campos: [
        { k: "texto", id: "eloc", rotulo: "Número do artigo (e-location)", opcional: true, ajuda: "Para artigos só online, no lugar das páginas. Ex.: e185305", placeholder: "Ex.: e185305" },
        anoTipo,
        online(true),
      ] },
    ],
  },
  {
    id: "site", nome: "Site ou página da internet", exemplo: "SOUZA, Marta. Como planejar a semana de provas. Recife, 2 jun. 2025. Portal: Exemplo Escola. Disponível em: https://www.exemplo.com.br/semana-de-provas. Acesso em: 15 out. 2026.",
    blocos: [
      { k: "autoria", id: "autoria", sem: true, entidade: true },
      { k: "texto", id: "titulo", rotulo: "Título da página", obrig: true, placeholder: "Ex.: Como planejar a semana de provas" },
      { k: "texto", id: "nomeSite", rotulo: "Nome do site", opcional: true, ajuda: "Ex.: o nome do portal ou do blog.", placeholder: "Ex.: Exemplo Escola" },
      { k: "texto", id: "local", rotulo: "Cidade", ajuda: "Só se aparecer na página. Se não, deixe em branco (sai [S. l.]).", placeholder: "Ex.: Recife" },
      { k: "data", id: "pub", rotulo: "Data da publicação", partes: ["dia", "mes", "ano"], obrig: true },
      { k: "mais", rotulo: "Mais opções (a página não tem ano)", campos: [anoTipo] },
      online(),
    ],
  },
  {
    id: "noticia", nome: "Notícia ou reportagem online", exemplo: "NOBEL alternativo de literatura: muitas mulheres e nenhum autor de língua portuguesa na lista. El País, Madri, 12 jul. 2018. Cultura. Disponível em: https://brasil.elpais.com/. Acesso em: 29 nov. 2018.",
    blocos: [
      { k: "autoria", id: "autoria", sem: true, entidade: true },
      { k: "texto", id: "titulo", rotulo: "Título da notícia", obrig: true, placeholder: "Ex.: Ritmo de vacinação cai na semana" },
      { k: "texto", id: "jornal", rotulo: "Nome do jornal ou portal", obrig: true, placeholder: "Ex.: Folha de S.Paulo" },
      { k: "texto", id: "local", rotulo: "Cidade do jornal", ajuda: "Se não constar, deixe em branco (sai [s. l.]).", placeholder: "Ex.: São Paulo" },
      { k: "data", id: "pub", rotulo: "Data da publicação", partes: ["dia", "mes", "ano"], obrig: true },
      { k: "linha", campos: [
        { k: "texto", id: "secao", rotulo: "Seção ou caderno", opcional: true, placeholder: "Ex.: Cultura" },
        { k: "texto", id: "edicao", rotulo: "Edição", opcional: true, placeholder: "Ex.: 6406" },
        { k: "texto", id: "pagina", rotulo: "Página", opcional: true, placeholder: "Ex.: 7" },
      ] },
      { k: "mais", rotulo: "Mais opções (a página não tem ano)", campos: [anoTipo] },
      online(),
    ],
  },
  {
    id: "lei", nome: "Lei ou legislação", exemplo: "BRASIL. Lei nº 9.610, de 19 de fevereiro de 1998. Altera, atualiza e consolida a legislação sobre direitos autorais e dá outras providências. Brasília, DF: Presidência da República, 1998. Disponível em: https://www.planalto.gov.br/ccivil_03/leis/l9610.htm. Acesso em: 15 out. 2026.",
    blocos: [
      { k: "texto", id: "jurisdicao", rotulo: "Jurisdição", obrig: true, valor: "BRASIL", ajuda: "País, estado ou município. Ex.: BRASIL, SÃO PAULO (Estado), CAMPINAS", placeholder: "Ex.: BRASIL" },
      { k: "texto", id: "orgao", rotulo: "Órgão", opcional: true, ajuda: "Só para portarias, resoluções etc. Ex.: Ministério da Educação", placeholder: "Ex.: Ministério da Educação" },
      { k: "select", id: "tipoNorma", rotulo: "Tipo da norma", opcoes: TIPOS_NORMA.map((t) => [t, t]) },
      { k: "texto", id: "numero", rotulo: "Número", opcional: true, ajuda: "Como está na lei. Ex.: 9610 (os pontos saem sozinhos)", placeholder: "Ex.: 9610" },
      { k: "texto", id: "dataNorma", rotulo: "Data da norma", obrig: true, tipoCampo: "date" },
      { k: "area", id: "ementa", rotulo: "Ementa", obrig: true, ajuda: "É o resumo que vem logo abaixo do nome da lei. Copie como está.", placeholder: "Ex.: Altera, atualiza e consolida a legislação sobre direitos autorais e dá outras providências." },
      { k: "texto", id: "local", rotulo: "Local da publicação", valor: "Brasília, DF", placeholder: "Ex.: Brasília, DF" },
      { k: "texto", id: "publicador", rotulo: "Quem publica", valor: "Presidência da República", ajuda: "No site do Planalto: Presidência da República.", placeholder: "Ex.: Presidência da República" },
      { k: "data", id: "pub", rotulo: "Ano da publicação", partes: ["ano"], obrig: true, ajuda: "Em geral, o mesmo ano da lei." },
      online(),
    ],
  },
  {
    id: "video", nome: "Vídeo (YouTube)", exemplo: "COMO fazer um bom resumo acadêmico. [S. l.: s. n.], 2024. 1 vídeo (12 min). Publicado pelo canal Exemplo Estudos. Disponível em: https://www.youtube.com/watch?v=XXXXXXXXXXX. Acesso em: 15 out. 2026.",
    blocos: [
      { k: "autoria", id: "autoria", sem: true, entidade: true, ajudaSem: "A maioria dos vídeos do YouTube não tem autor na norma: a entrada é pelo título." },
      { k: "texto", id: "titulo", rotulo: "Título do vídeo", obrig: true, placeholder: "Ex.: Como fazer um bom resumo acadêmico" },
      { k: "texto", id: "canal", rotulo: "Nome do canal", opcional: true, placeholder: "Ex.: Exemplo Estudos" },
      { k: "texto", id: "duracao", rotulo: "Duração (minutos)", opcional: true, placeholder: "Ex.: 12" },
      { k: "data", id: "pub", rotulo: "Data da publicação", partes: ["dia", "mes", "ano"], obrig: true },
      { k: "mais", rotulo: "Mais opções (cidade, produtora, vídeo sem ano)", campos: [
        { k: "texto", id: "local", rotulo: "Cidade", opcional: true, ajuda: "Só se constar. Se não, sai [S. l.].", placeholder: "Ex.: Goiânia" },
        { k: "texto", id: "produtora", rotulo: "Produtora ou instituição", opcional: true, ajuda: "Só se constar. Se não, sai [s. n.].", placeholder: "Ex.: UFG" },
        anoTipo,
      ] },
      online(),
    ],
  },
  {
    id: "tcc", nome: "TCC, dissertação ou tese", exemplo: "SANTOS, Ana. Leitura em voz alta na sala de aula. 2023. Trabalho de Conclusão de Curso (Graduação em Pedagogia) – Faculdade de Educação, Universidade Exemplo, Recife, 2023.",
    blocos: [
      { k: "autoria", id: "autoria" },
      { k: "texto", id: "titulo", rotulo: "Título do trabalho", obrig: true, placeholder: "Ex.: Leitura em voz alta na sala de aula" },
      { k: "texto", id: "subtitulo", rotulo: "Subtítulo", opcional: true },
      { k: "select", id: "tipoTrabalho", rotulo: "Tipo do trabalho", opcoes: TIPOS_TRABALHO.map(([id, nome, grau]) => [id, `${nome} (${grau})`]) },
      { k: "texto", id: "curso", rotulo: "Curso ou programa", obrig: true, placeholder: "Ex.: Pedagogia" },
      { k: "texto", id: "unidade", rotulo: "Faculdade, instituto ou centro", opcional: true, placeholder: "Ex.: Faculdade de Educação" },
      { k: "texto", id: "instituicao", rotulo: "Instituição", obrig: true, placeholder: "Ex.: Universidade Exemplo" },
      { k: "texto", id: "local", rotulo: "Cidade", obrig: true, placeholder: "Ex.: Recife" },
      { k: "linha", campos: [
        { k: "num", id: "anoDeposito", rotulo: "Ano de depósito", obrig: true, placeholder: "Ex.: 2023" },
        { k: "num", id: "anoDefesa", rotulo: "Ano da defesa", opcional: true, ajuda: "Se for igual ao de depósito, deixe em branco.", placeholder: "Ex.: 2023" },
      ] },
      { k: "mais", rotulo: "Mais opções (orientador, folhas, link)", campos: [
        { k: "select", id: "orientadorRotulo", rotulo: "Orientação", opcoes: [["Orientador", "Orientador"], ["Orientadora", "Orientadora"], ["Orientador(a)", "Orientador(a)"]] },
        { k: "texto", id: "orientador", rotulo: "Nome do orientador", opcional: true, placeholder: "Ex.: Maria Souza" },
        { k: "num", id: "folhas", rotulo: "Número de folhas", opcional: true, placeholder: "Ex.: 123" },
        online(),
      ] },
    ],
  },
];

export const TIPO_POR_ID = Object.fromEntries(TIPOS.map((t) => [t.id, t]));
export const idCampo = (tipo, id) => `${tipo}__${id}`;
