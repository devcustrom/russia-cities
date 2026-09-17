const fs = require('fs')
const path = require('path')
const { inflectName } = require('./lib/namecase')

const CONFIG_PATH = process.argv[2] || path.join(__dirname, 'enrichment-config.json')
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

for (const region of config.regions) {
  const names = new Set(region.cities)
  for (const rusName of Object.values(region.renamed || {})) names.add(rusName)
  console.log('=== ' + region.name + ' ===')
  for (const name of [...names]) {
    const nc = inflectName(name)
    console.log(
      name,
      '|', nc.genitive, '|', nc.ablative, '|', nc.prepositional
    )
  }
  console.log()
}