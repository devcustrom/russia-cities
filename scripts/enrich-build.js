const fs = require('fs')
const path = require('path')
const { inflectName } = require('./lib/namecase')
const { transliterate, romanizeName } = require('./lib/translit')

const ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = process.argv[2] || path.join(__dirname, 'enrichment-config.json')

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const existingCities = require(path.join(ROOT, 'russia-cities.json'))
const existingRegions = require(path.join(ROOT, 'russia-regions.json'))

const fetchResults = JSON.parse(fs.readFileSync(path.join(ROOT, 'dadata-fetch-results.json'), 'utf8'))
const renamedResults = JSON.parse(fs.readFileSync(path.join(ROOT, 'dadata-renamed-results.json'), 'utf8'))

// Кураторские почтовые индексы новых регионов (ДНР/ЛНР/Запорожская).
// Источники: официальный справочник Почты России (dom.gogov.ru) + правило «2» + старый
// 5-значный индекс (ukrindex.ru). Имеют приоритет над postal_code из DaData.
const ZIP_OVERRIDES = JSON.parse(fs.readFileSync(path.join(__dirname, 'new-regions-zip.json'), 'utf8'))

const foundMap = {}
for (const r of fetchResults.found) {
  foundMap[r.region + '|' + r.name] = r
}

const renamedMap = {}
for (const r of renamedResults.found) {
  renamedMap[r.region + '|' + r.query] = r
}

// Build region objects + rename maps from config
const REGIONS = {}
const NEW_REGIONS = {}
const RENAME_MAP = {}
const CITY_LISTS = {}

for (const rc of config.regions) {
  REGIONS[rc.key] = {
    fias: rc.fias,
    kladr: rc.kladr,
    okato: rc.okato,
    oktmo: rc.oktmo,
  }
  NEW_REGIONS[rc.key] = {
    name: rc.name,
    label: rc.label,
    type: rc.type,
    typeShort: rc.typeShort,
    contentType: 'region',
    id: rc.kladr,
    okato: rc.okato,
    oktmo: rc.oktmo,
    guid: rc.fias,
    code: rc.code,
    iso_3166_2: null,
    population: null,
    yearFounded: null,
    area: null,
    fullname: rc.fullname,
    name_en: rc.name_en,
    district: rc.district,
  }
  for (const [ukrName, rusName] of Object.entries(rc.renamed || {})) {
    RENAME_MAP[rc.key + '|' + ukrName] = rusName
  }
  CITY_LISTS[rc.key] = rc.cities
}

function getRegion(regionKey) {
  return NEW_REGIONS[regionKey]
}

// Region namecase for full official name
function regionNamecaseManual(region) {
  const base = region.name
  const noun = region.type === 'Республика' ? 'республика' : 'область'
  const abl = region.type === 'Республика' ? 'республикой' : 'областью'
  const obl = region.type === 'Республика' ? 'республики' : 'области'
  const full = base + ' ' + noun
  const baseG = base.replace(/ая$/, 'ой')
  return {
    nominative: full,
    genitive: baseG + ' ' + obl,
    dative: baseG + ' ' + (region.type === 'Республика' ? 'республике' : 'области'),
    accusative: base.replace(/[ая]$/, 'ую') + ' ' + (region.type === 'Республика' ? 'республику' : 'область'),
    ablative: baseG + ' ' + abl,
    prepositional: baseG + ' ' + (region.type === 'Республика' ? 'республике' : 'области'),
    locative: baseG + ' ' + (region.type === 'Республика' ? 'республике' : 'области'),
  }
}

const newCities = []
const usedLabels = new Set(existingCities.map((c) => c.label))
const usedNames = new Set(existingCities.map((c) => c.name))
const skipped = []

for (const [regionKey, names] of Object.entries(CITY_LISTS)) {
  const region = NEW_REGIONS[regionKey]
  const regionDisplay = region.name

  for (const ukrName of names) {
    const key = regionDisplay + '|' + ukrName
    let record = foundMap[key]
    let usedSource = 'found'

    let finalName = ukrName
    if (!record) {
      const rusName = RENAME_MAP[regionKey + '|' + ukrName] || ukrName
      record = renamedMap[regionDisplay + '|' + rusName]
      usedSource = 'renamed'
      finalName = rusName
    }

    if (!record) {
      skipped.push(key)
      continue
    }

    let nameAlt = finalName.replace(/ё/g, 'е')

    // label uniqueness
    let baseLabel = transliterate(finalName)
    let label = baseLabel
    if (usedLabels.has(label)) {
      label = baseLabel + '_' + region.label
    }
    usedLabels.add(label)

    // dual name: name already exists among existing cities (or among new ones already added)
    const dual = usedNames.has(finalName)
    usedNames.add(finalName)

    const cityRecord = {
      name: finalName,
      name_alt: nameAlt,
      label,
      type: 'Город',
      typeShort: 'г',
      contentType: 'city',
      id: record.city_kladr_id || record.kladr_id,
      okato: record.okato || null,
      oktmo: record.oktmo || null,
      guid: record.city_fias_id || record.fias_id,
      isDualName: dual,
      isCapital: finalName === 'Донецк' || finalName === 'Луганск' || finalName === 'Запорожье',
      zip: ZIP_OVERRIDES[regionDisplay + '|' + finalName] ?? (record.postal_code ? Number(record.postal_code) : null),
      population: null,
      yearFounded: null,
      yearCityStatus: null,
      name_en: romanizeName(finalName),
      namecase: inflectName(finalName),
      coords: {
        lat: record.geo_lat ? Number(record.geo_lat) : null,
        lon: record.geo_lon ? Number(record.geo_lon) : null,
      },
      timezone: {
        tzid: 'Europe/Moscow',
        abbreviation: 'MSK',
        utcOffset: 'UTC+03:00',
        mskOffset: 'MSK+00',
      },
      region,
    }

    if (!cityRecord.id || !cityRecord.guid) {
      skipped.push(key)
      continue
    }

    newCities.push(cityRecord)
  }
}

const newRegions = []
for (const [key, region] of Object.entries(NEW_REGIONS)) {
  const capName = config.regions.find((r) => r.key === key).capital
  const capCity = newCities.find((c) => c.isCapital && c.region === region)
  if (!capCity) {
    console.error('WARNING: Capital not found for region', region.name, `(expected "${capName}")`)
    continue
  }
  newRegions.push({
    name: region.name,
    label: region.label,
    type: region.type,
    typeShort: region.typeShort,
    contentType: region.contentType,
    id: region.id,
    okato: region.okato,
    oktmo: region.oktmo,
    guid: region.guid,
    code: region.code,
    iso_3166_2: region.iso_3166_2,
    population: region.population,
    yearFounded: region.yearFounded,
    area: region.area,
    fullname: region.fullname,
    name_en: region.name_en,
    district: region.district,
    namecase: regionNamecaseManual(region),
    capital: {
      name: capCity.name,
      label: capCity.label,
      id: capCity.id,
      okato: capCity.okato,
      oktmo: capCity.oktmo,
      contentType: 'city',
    },
  })
}

// Deterministic order: keep names within each region in list order
console.log('=== PROCESSING SUMMARY ===')
console.log('Cities processed:', newCities.length)
console.log('Regions to add:', newRegions.length)
if (skipped.length) {
  console.log('!!! SKIPPED (missing data):', skipped)
}

fs.writeFileSync(path.join(ROOT, 'new-cities.json'), JSON.stringify(newCities, null, 2), 'utf8')
fs.writeFileSync(path.join(ROOT, 'new-regions.json'), JSON.stringify(newRegions, null, 2), 'utf8')
console.log('\nSaved new-cities.json & new-regions.json')

const namesToMarkDual = [...new Set(newCities.map((c) => c.name))]
const existingToPatch = existingCities.filter((c) => namesToMarkDual.includes(c.name) && !c.isDualName)
console.log('\n=== EXISTING CITIES TO PATCH (set isDualName=true) ===')
existingToPatch.forEach((c) => {
  console.log(c.name + ' (' + c.region.name + ') id=' + c.id)
})
console.log('Count:', existingToPatch.length)