// URLs de fotos do Wikimedia Commons a partir do nome do arquivo.
// Special:FilePath redireciona para a miniatura na largura pedida (use 330, 500, 960, 1280, 1920 ou 3840,
// que são as larguras padrão em cache no Commons).

export const commons = (file, width = 1280) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`;

// Página do arquivo (autoria e licença)
export const commonsPage = file =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;
