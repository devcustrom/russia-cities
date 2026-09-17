const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const citiesPath = path.join(ROOT, 'russia-cities.json')
const regionsPath = path.join(ROOT, 'russia-regions.json')
const newCitiesPath = path.join(ROOT, 'new-cities.json')
const newRegionsPath = path.join(ROOT, 'new-regions.json')

if (!fs.existsSync(newCitiesPath) || !fs.existsSync(newRegionsPath)) {
  console.error('Missing new-cities.json / new-regions.json. Run `npm run enrich:build` first.')
  process.exit(1)
}

let cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'))
let regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'))
const newCities = JSON.parse(fs.readFileSync(newCitiesPath, 'utf8'))
const newRegions = JSON.parse(fs.readFileSync(newRegionsPath, 'utf8'))

// Deduplicate existing cities by guid (fallback to name)
{
  const seen = new Map()
  const deduped = []
  for (const city of cities) {
    const key = city.guid || city.name
    if (key && !seen.has(key)) {
      seen.set(key, true)
      deduped.push(city)
    }
  }
  cities = deduped
  console.log(`After deduplication: ${cities.length} unique cities`)
}

// Deduplicate existing regions by guid (fallback to name)
{
  const seen = new Map()
  const deduped = []
  for (const region of regions) {
    const key = region.guid || region.name
    if (key && !seen.has(key)) {
      seen.set(key, true)
      deduped.push(region)
    }
  }
  regions = deduped
  console.log(`After deduplication: ${regions.length} unique regions`)
}

console.log(`Loaded ${cities.length} existing cities, ${newCities.length} new cities`)
console.log(`Loaded ${regions.length} existing regions, ${newRegions.length} new regions`)

// Composite key: name + region name (so e.g. Артёмовск DNR vs LNR are distinct)
const keyOfCity = (city) => (city.name || '') + '|' + (city.region && city.region.name ? city.region.name : '')

let addedCities = 0
let updatedCities = 0

for (const newCity of newCities) {
  const k = keyOfCity(newCity)
  const existsIdx = cities.findIndex((c) => keyOfCity(c) === k)

  if (existsIdx !== -1) {
    // Refresh the stored record with the freshly generated data
    // (namecase, coords, label, etc. may have been corrected upstream).
    // isDualName is NOT sourced from the build here — run normalize-dual-names.js
    // afterwards, it is the single source of truth for that flag.
    cities[existsIdx] = newCity
    updatedCities++
  } else {
    cities.push(newCity)
    addedCities++
  }
}

console.log(`Added ${addedCities} new cities, refreshed ${updatedCities} existing records`)

const regionNames = new Set(regions.map((r) => r.name))
let addedRegions = 0
let updatedRegions = 0
for (const newRegion of newRegions) {
  const existsIdx = regions.findIndex((r) => r.name === newRegion.name)
  if (existsIdx === -1) {
    regions.push(newRegion)
    regionNames.add(newRegion.name)
    addedRegions++
  } else {
    // Refresh stored record (name_en, namecase, capital, etc.)
    regions[existsIdx] = newRegion
    updatedRegions++
  }
}
console.log(`Added ${addedRegions} new regions, refreshed ${updatedRegions} existing records`)

fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2), 'utf8')
fs.writeFileSync(regionsPath, JSON.stringify(regions, null, 2), 'utf8')
console.log('Successfully updated russia-cities.json and russia-regions.json')
console.log('NOTE: run `npm run dual:normalize` afterwards to recompute isDualName correctly.')