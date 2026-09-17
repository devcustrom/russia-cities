// Recomputes isDualName for the whole dataset from actual name occurrence counts.
// Per repo convention (README): isDualName is true ONLY for names that occur more than once.
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const citiesPath = path.join(ROOT, 'russia-cities.json')

const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'))

const byName = {}
for (const c of cities) {
  byName[c.name] = (byName[c.name] || 0) + 1
}

const wrong = []
const dups = new Set()
for (const [name, count] of Object.entries(byName)) {
  if (count > 1) dups.add(name)
}

for (const c of cities) {
  const correct = byName[c.name] > 1
  const actual = c.isDualName === true
  if (actual !== correct) {
    wrong.push(`${c.name} (${c.region && c.region.name}): was ${actual} -> should be ${correct}`)
    c.isDualName = correct
  }
  // Also update labels? No — labels handled by build; only dual flag here.
}

fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2), 'utf8')

console.log(`Names occurring more than once (${dups.size}):`)
for (const name of [...dups].sort()) {
  const entries = cities.filter((c) => c.name === name)
  console.log(`  ${name} (${byName[name]}): ${entries.map((c) => c.region.name).join(', ')}`)
}

console.log('\nCorrected entries:', wrong.length)
wrong.slice(0, 50).forEach((w) => console.log('  ' + w))
if (wrong.length > 50) console.log(`  ... and ${wrong.length - 50} more`)