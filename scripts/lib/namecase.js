// Namecase generator for Russian toponyms (7 cases).
// Extracted from the enrichment pipeline so it can be reused.

const EXCEPTIONS = {
  'Красный Лиман': { nominative: 'Красный Лиман', genitive: 'Красного Лимана', dative: 'Красному Лиману', accusative: 'Красный Лиман', ablative: 'Красным Лиманом', prepositional: 'Красном Лимане', locative: 'Красном Лимане' },
  'Красный Луч': { nominative: 'Красный Луч', genitive: 'Красного Луча', dative: 'Красному Лучу', accusative: 'Красный Луч', ablative: 'Красным Лучом', prepositional: 'Красном Луче', locative: 'Красном Луче' },
  'Часов Яр': { nominative: 'Часов Яр', genitive: 'Часового Яра', dative: 'Часовому Яру', accusative: 'Часов Яр', ablative: 'Часовым Яром', prepositional: 'Часовом Яре', locative: 'Часовом Яре' },
  'Каменка-Днепровская': { nominative: 'Каменка-Днепровская', genitive: 'Каменки-Днепровской', dative: 'Каменке-Днепровской', accusative: 'Каменку-Днепровскую', ablative: 'Каменкой-Днепровской', prepositional: 'Каменке-Днепровской', locative: 'Каменке-Днепровской' },
  'Ровеньки': { nominative: 'Ровеньки', genitive: 'Ровеньков', dative: 'Ровенькам', accusative: 'Ровеньки', ablative: 'Ровеньками', prepositional: 'Ровеньках', locative: 'Ровеньках' },
  'Пологи': { nominative: 'Пологи', genitive: 'Пологов', dative: 'Пологам', accusative: 'Пологи', ablative: 'Пологами', prepositional: 'Пологах', locative: 'Пологах' },
}

const VOWELS = 'аеёиоуыэюя'

function inflectName(name) {
  if (EXCEPTIONS[name]) return { ...EXCEPTIONS[name] }

  const parts = name.split(/[-\s]+/)
  if (parts.length > 1) {
    const naIdx = parts.indexOf('на')
    const first = inflectName(parts[0])
    const last = inflectName(parts[parts.length - 1])
    const result = { nominative: name }
    for (const [caseName] of Object.entries(EXCEPTIONS['Красный Луч'])) {
      if (caseName === 'nominative') continue
      if (naIdx > 0) {
        const head = parts.slice(0, naIdx).map((p, i) => (i === 0 ? first[caseName] : p)).join(' ')
        result[caseName] = (head ? head + ' ' : '') + 'на ' + parts.slice(naIdx + 1, -1).join(' ') + (parts.length - 1 !== naIdx ? (parts.slice(naIdx + 1, -1).length ? ' ' : '') + last[caseName] : '')
        result[caseName] = result[caseName].trim()
      } else {
        result[caseName] = first[caseName] + '-' + last[caseName]
      }
    }
    return result
  }

  const stem = name
  const last = name[name.length - 1]
  const last2 = name.slice(-2)
  const last3 = name.slice(-3)

  let gen, dat, acc, abl, pre
  let kind = ''

  if (last2 === 'ая' || last2 === 'яя') {
    // adjective feminine: Узловая -> Узловой, Ясиноватая -> Ясиноватой
    kind = 'adj-f'
    const s = stem.slice(0, -2)
    gen = dat = pre = s + 'ой'
    acc = s + 'ую'
    abl = s + 'ой'
  } else if (last2 === 'ое' || last2 === 'ее') {
    // adjective neuter: Видное -> Видного, Белицкое -> Белицкого,
    // Куровское -> Куровским (instrumental -им after г/к/х/ж/ш/ч/щ)
    kind = 'adj-n'
    const s = stem.slice(0, -2)
    const gkh = 'гкхжшчщ'.includes(s[s.length - 1])
    gen = s + 'ого'
    dat = s + 'ому'
    acc = name
    abl = s + (gkh ? 'им' : 'ым')
    pre = s + 'ом'
  } else if (last2 === 'ий' || last2 === 'ый' || last2 === 'ой') {
    // adjective masculine: Мирный -> Мирного
    kind = 'adj-m'
    const s = stem.slice(0, -2)
    gen = s + 'ого'
    dat = s + 'ому'
    acc = name
    abl = s + (last2 === 'ий' ? 'им' : 'ым')
    pre = s + 'ом'
  } else if (last === 'ь') {
    const isMale = /поль$/.test(name.replace(/ё/g, 'е'))
    if (!isMale) {
      kind = 'f-ь'
      const s = stem.slice(0, -1)
      gen = dat = pre = s + 'и'
      acc = name
      abl = s + 'ью'
    } else {
      kind = 'm-ь'
      const s = stem.slice(0, -1)
      gen = s + 'я'
      dat = s + 'ю'
      acc = name
      abl = s + 'ем'
      pre = s + 'е'
    }
  } else if (last === 'й') {
    kind = 'm-й'
    const s = stem.slice(0, -1)
    gen = s + 'я'
    dat = s + 'ю'
    acc = name
    abl = s + 'ем'
    pre = s + 'е'
  } else if (last === 'а' || last === 'я') {
    // feminine noun
    kind = 'f'
    const s = stem.slice(0, -1)
    const gkh = 'гкхжшчщ'.includes(s[s.length - 1])
    if (last === 'а') {
      gen = s + (gkh ? 'и' : 'ы')
      dat = pre = s + 'е'
      acc = s + 'у'
      abl = s + 'ой'
    } else {
      gen = dat = pre = s + 'и'
      acc = s + 'ю'
      abl = s + 'ей'
    }
  } else if (last === 'о' || last === 'е') {
    // neuter noun
    kind = 'n'
    const s = stem.slice(0, -1)
    const prev = s[s.length - 1]
    if (prev === 'ш' || prev === 'ж' || prev === 'ч' || prev === 'щ' || prev === 'ц') {
      gen = s + 'а'; dat = s + 'у'; acc = name; abl = s + 'ем'; pre = s + 'е'
    } else if (last === 'е') {
      gen = s + 'я'; dat = s + 'ю'; acc = name; abl = s + 'ем'; pre = s + 'е'
    } else {
      gen = s + 'а'; dat = s + 'у'; acc = name; abl = s + 'ом'; pre = s + 'е'
    }
  } else if (last === 'и' || last === 'ы') {
    // plural: Туймазы -> Туймаз (усечение)
    kind = 'pl'
    const s = stem.slice(0, -1)
    if (['ц', 'ш', 'ч', 'щ', 'ж'].includes(s[s.length - 1])) {
      gen = s + 'ей'
    } else {
      gen = s
    }
    dat = s + 'ам'
    acc = name
    abl = s + 'ами'
    pre = s + 'ах'
  } else {
    // masculine on consonant
    kind = 'm'
    const s = stem
    const lastChar = s[s.length - 1]
    const soft2 = ['ж', 'ш', 'ч', 'щ', 'ц'].includes(lastChar)
    gen = s + 'а'
    dat = s + 'у'
    acc = name
    abl = soft2 ? s + 'ем' : s + 'ом'
    pre = s + 'е'
  }

  return {
    nominative: name,
    genitive: gen,
    dative: dat,
    accusative: acc,
    ablative: abl,
    prepositional: pre,
    locative: pre,
  }
}

module.exports = { inflectName, EXCEPTIONS, VOWELS }