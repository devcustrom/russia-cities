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
    w.toLowerCase().split('').map((c) => (c in LINKED_TRANS ? LINKED_TRANS[c] : c)).join('')
  ).join('_')
}

// BGN/PCGN-style romanization for `name_en` (repo convention: Yekaterinburg, Korolyov).
const VOWELS = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я'])
const SOFT = new Set(['ь', 'ъ'])

const SINGLE = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh',
  'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ы': 'y', 'э': 'e',
  'ю': 'yu', 'я': 'ya', 'ь': '', 'ъ': '',
}

function romanizeWord(word) {
  const w = word.toLowerCase()
  let out = ''
  for (let i = 0; i < w.length; i++) {
    const c = w[i]
    const prev = i > 0 ? w[i - 1] : ''
    // word-final "ий"/"ый" collapse to a single "y" (Oktyabrsky, Krasny)
    if ((c === 'и' || c === 'ы') && w[i + 1] === 'й' && i + 2 === w.length) { out += 'y'; i++; continue }
    // word-final "ые" → "ye" (Naberezhnye, Mineralnye)
    if (c === 'ы' && w[i + 1] === 'е' && i + 2 === w.length) { out += 'ye'; i++; continue }
    // "лекс" + а/е → "lex" (Alexandrov, Alexeyevka)
    if (c === 'к' && prev === 'е' && w[i - 2] === 'л' && w[i + 1] === 'с' && (w[i + 2] === 'а' || w[i + 2] === 'е')) { out += 'x'; i++; continue }
    // ь before и → "y" (Krasnoturyinsk)
    if (c === 'ь' && w[i + 1] === 'и') { out += 'y'; continue }
    if (c === 'е') {
      out += prev === '' || VOWELS.has(prev) || SOFT.has(prev) ? 'ye' : 'e'
      continue
    }
    if (c === 'ё') { out += 'yo'; continue }
    if (SINGLE[c] !== undefined) { out += SINGLE[c]; continue }
    out += c
  }
  return out
}

function romanizeName(name) {
  return name
    .split(/([-\s]+)/)
    .map((part) => {
      if (/^[-\s]+$/.test(part)) return part
      if (part.toLowerCase() === 'на') return 'on'
      return part.replace(/[А-Яа-яЁё]+/g, (m) => {
        const r = romanizeWord(m)
        return r.charAt(0).toUpperCase() + r.slice(1)
      })
    })
    .join('')
}

module.exports = { transliterate, romanizeName, LABEL_OVERRIDES }