// Transliteration of Russian toponyms into English labels (repo convention).
// Extracted from the enrichment pipeline so it can be reused.

const LINKED_TRANS = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}

// Names whose transliteration deviates from the letter-by-letter rule
const LABEL_OVERRIDES = {
  'Красный Лиман': 'krasny_liman',
  'Красный Луч': 'krasny_luch',
  'Часов Яр': 'chasov_yar',
}

function transliterate(name) {
  if (LABEL_OVERRIDES[name]) return LABEL_OVERRIDES[name]
  return name.split(/[-\s]+/).map((w) =>
    w.toLowerCase().split('').map((c) => LINKED_TRANS[c] || c).join('')
  ).join('_')
}

module.exports = { transliterate, LABEL_OVERRIDES }