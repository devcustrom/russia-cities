export interface GeoCoords {
  lat: number | null
  lon: number | null
}

export interface Timezone {
  tzid: string
  abbreviation: string
  utcOffset: string
  mskOffset: string
}

export interface Namecase {
  nominative: string
  genitive: string
  dative: string
  accusative: string
  ablative: string
  prepositional: string
  locative: string
}

export interface Capital {
  name: string
  label: string
  id: string
  okato: string | null
  oktmo: string | null
  contentType: 'city'
}

export interface Region {
  name: string
  label: string
  type: string
  typeShort: string
  contentType: 'region'
  id: string
  okato: string | null
  oktmo: string | null
  guid: string
  code: string
  'iso_3166-2': string | null
  population: number | null
  yearFounded: number | null
  area: number | null
  fullname: string
  unofficialName?: string
  name_en: string
  district: string
  namecase: Namecase
  capital: Capital
}

export interface City {
  name: string
  name_alt: string
  label: string
  type: string
  typeShort: string
  contentType: 'city'
  id: string
  okato: string | null
  oktmo: string | null
  guid: string
  isDualName: boolean
  isCapital: boolean
  zip: number | null
  population: number | null
  yearFounded: number | null
  yearCityStatus: number | null
  name_en: string
  namecase: Namecase
  coords: GeoCoords
  timezone: Timezone
  region: Region
}

export declare const cities: City[]
export declare const regions: Region[]
