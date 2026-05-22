export interface Wine {
  id: string
  producer: string
  cuvee: string
  appellation: string | null
  region: string | null
  country: string
  vintage: number | null
  format: string
  color: string
  grapes: string | null
  apogee_start_year: number | null
  apogee_end_year: number | null
  apogee_source: string | null
  notes_general: string | null
  created_at: string
  updated_at: string
}

export interface WineWithStock extends Wine {
  stock: number
}

export interface Lot {
  id: string
  wine_id: string
  quantity_initial: number
  quantity_remaining: number
  unit_price: number | null
  currency: string
  purchase_date: string | null
  source: string | null
  cellar_location: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Consumption {
  id: string
  lot_id: string
  date: string
  rating_20: number | null
  rating_external_100: number | null
  food_paired: string | null
  pairing_success: 'réussi' | 'moyen' | 'raté' | null
  context: string | null
  tasting_notes: string | null
  created_at: string
}

export interface ConsumptionWithWine extends Consumption {
  producer: string
  cuvee: string
  vintage: number | null
  color: string
  cellar_location: string
}

export type WineColor = 'rouge' | 'blanc' | 'rosé' | 'effervescent' | 'vin doux'
export type PairingSuccess = 'réussi' | 'moyen' | 'raté'
export type WishlistPriority = 'haute' | 'moyenne' | 'basse'

export interface WishlistItem {
  id: string
  producer: string | null
  cuvee: string | null
  appellation: string | null
  vintage: number | null
  target_price: number | null
  source_seen: string | null
  reason: string | null
  priority: WishlistPriority
  notes: string | null
  created_at: string
}
