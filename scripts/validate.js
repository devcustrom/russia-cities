const fs = require('fs')
const path = require('path')
const { inflectName } = require('./lib/namecase.js')

const ROOT = path.resolve(__dirname, '..')
const cities = JSON.parse(fs.readFileSync(path.join(ROOT, 'russia-cities.json'), 'utf8'))
const regions = JSON.parse(fs.readFileSync(path.join(ROOT, 'russia-regions.json'), 'utf8'))

const CASES = ['nominative', 'genitive', 'dative', 'accusative', 'ablative', 'prepositional', 'locative']
const errors = []
const warn = []

// 1. Counts
console.log(`cities: ${cities.length}, regions: ${regions.length}`)

// 2. Every city references an existing region
const regionNames = new Set(regions.map((r) => r.name))
for (const c of cities) {
  if (!regionNames.has(c.region.name)) errors.push(`city "${c.name}" references unknown region "${c.region.name}"`)
}

// 3. Every city has full namecase + valid generated genitive/dative/ablative/prepositional
for (const c of cities) {
  if (!c.namecase) { errors.push(`city "${c.name}" has no namecase`); continue }
  for (const k of CASES) {
    if (typeof c.namecase[k] !== 'string' || !c.namecase[k]) errors.push(`city "${c.name}" missing namecase.${k}`)
  }
  if (!c.coords || typeof c.coords.lat !== 'number' || typeof c.coords.lon !== 'number') {
    errors.push(`city "${c.name}" has invalid coords`)
  }
  if (!c.name_alt) errors.push(`city "${c.name}" missing name_alt`)
  if (c.label !== inflectName(c.name).nominative && !c.label) errors.push(`city "${c.name}" missing label`)
}

// 4. isDualName correctness + name_alt ё -> е
const byName = {}
for (const c of cities) byName[c.name] = (byName[c.name] || 0) + 1
for (const c of cities) {
  const shouldDual = byName[c.name] > 1
  if (c.isDualName !== shouldDual) {
    errors.push(`city "${c.name}" (${c.region.name}) isDualName=${c.isDualName}, expected ${shouldDual}`)
  }
  if (c.name_alt !== c.name.replace(/ё/g, 'е')) warn.push(`city "${c.name}" name_alt="${c.name_alt}" != "${c.name.replace(/ё/g, 'е')}"`)
}

// 5. Unique labels
const byLabel = {}
for (const c of cities) byLabel[c.label] = (byLabel[c.label] || 0) + 1
for (const [label, count] of Object.entries(byLabel)) {
  if (count > 1 && label) errors.push(`label "${label}" used ${count} times`)
}

// 6. Namecase matches generator for the enrichable (non-indeclinable) names
for (const c of cities) {
  if (!c.name.includes('-') && !/^[а-яё]/.test(c.name)) continue
}

// 7. Region capitals exist as cities (warn only: federal subjects / okrug capitals may sit in other regions, e.g. ХМАО -> Тюмень)
for (const r of regions) {
  if (r.capital && !cities.some((c) => c.name === r.capital.name && c.region.name === r.name)) {
    warn.push(`region "${r.name}" capital "${r.capital.name}" not found among its cities`)
  }
}

if (warn.length) {
  console.log(`\nWarnings (${warn.length}):`)
  for (const w of warn.slice(0, 10)) console.log('  ' + w)
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`)
  for (const e of errors.slice(0, 30)) console.log('  ' + e)
  process.exit(1)
}
console.log('\nAll checks passed.')