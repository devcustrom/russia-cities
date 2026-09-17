const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = process.argv[2] || path.join(__dirname, 'enrichment-config.json')
const TOKEN_ENV = process.env.DADATA_TOKEN

const DADATA_TOKEN = TOKEN_ENV || '91efb6b473bfb0d2f4eb9efb5cab817e92c65c59'
const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function suggest(query, locations) {
  const res = await fetch(DADATA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + DADATA_TOKEN },
    body: JSON.stringify({
      query,
      count: 10,
      locations: locations || [],
      from_bound: { value: 'city' },
      to_bound: { value: 'city' },
    }),
  })
  const data = await res.json()
  return (data.suggestions || []).map((s) => s.data)
}

// Step 1: fetch cities by their (likely Ukrainian) names from the config
async function fetchByConfigNames() {
  const results = { found: [], notFound: [], mismatch: [] }

  for (const region of config.regions) {
    for (const cityName of region.cities) {
      const matches = await suggest(cityName, [{ region_fias_id: region.fias }])
      await sleep(150)

      const cityLevel = matches.filter((m) => (m.fias_level === '3' || m.fias_level === '4') && m.city === cityName && !m.settlement && m.area_fias_id === undefined)
      const cityEntry = cityLevel[0] || matches.find((m) => m.city === cityName && (m.fias_level === '3' || m.fias_level === '4'))

      if (cityEntry) {
        results.found.push({ region: region.name, name: cityName, ...cityEntry })
        console.log('[+]', region.name, cityName, '->', cityEntry.value, '(level', cityEntry.fias_level + ')')
      } else {
        results.notFound.push({ region: region.name, name: cityName })
        console.log('[-]', region.name, cityName, 'NOT FOUND', matches.length ? '-> matches: ' + matches.map((m) => m.value + ' [lvl' + m.fias_level + ' city=' + m.city + ']').join(' | ') : '')
      }
    }
  }

  return results
}

// Step 2: fetch renamed cities by their official Russian names (from config `renamed` map and renamed targets)
async function fetchRenamed() {
  const queries = []

  for (const region of config.regions) {
    const rusNames = new Set(Object.values(region.renamed || {}))
    for (const rusName of rusNames) {
      queries.push([region, rusName])
    }
  }

  const out = { found: [], missed: [] }

  for (const [region, query] of queries) {
    const res = await suggest(query, [{ region_fias_id: region.fias }])
    await sleep(180)

    const exact = res.filter((s) => s.city === query && (s.fias_level === '3' || s.fias_level === '4'))
    const pick = exact[0] || res.find((s) => s.fias_level === '3' || s.fias_level === '4') || res[0]

    if (pick && pick.city) {
      out.found.push({ region: region.name, query, ...pick })
      console.log('[+]', region.name, query, '->', pick.city, pick.city_with_type, 'lvl' + pick.fias_level, pick.capital_marker)
    } else {
      out.missed.push({ region: region.name, query })
      console.log('[-]', region.name, query, 'MISSED', res.map((s) => s.value).slice(0, 5).join(' | '))
    }
  }

  return out
}

async function main() {
  console.log('=== STEP 1: fetch by config names ===')
  const byName = await fetchByConfigNames()
  fs.writeFileSync(path.join(ROOT, 'dadata-fetch-results.json'), JSON.stringify(byName, null, 2), 'utf8')
  console.log('\nFound:', byName.found.length, 'Not found:', byName.notFound.length)

  console.log('\n=== STEP 2: fetch renamed (Russian official names) ===')
  const renamed = await fetchRenamed()
  fs.writeFileSync(path.join(ROOT, 'dadata-renamed-results.json'), JSON.stringify(renamed, null, 2), 'utf8')
  console.log('\nfound:', renamed.found.length, 'missed:', renamed.missed.length)

  console.log('\nSaved dadata-fetch-results.json & dadata-renamed-results.json')
}

main().catch((e) => { console.error(e); process.exit(1) })