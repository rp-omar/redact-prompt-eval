// Deterministic mock data. Seeded PRNG so every run and both renderer builds see identical rows.
export type Item = {
  id: string
  name: string
  email: string
  company: string
  role: string
  country: string
  status: 'active' | 'paused' | 'invited' | 'archived'
  amount: number
  updatedAt: string
}
export type ItemDetail = Item & { notes: string; manager: string }
export type ActivityEvent = { id: string; at: string; kind: string; summary: string }

export const SEED = 20261125
export const ROW_COUNT = 5000

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = [
  'Amira',
  'Ahmed',
  'Bilal',
  'Dalia',
  'Dina',
  'Fadi',
  'Farah',
  'Farid',
  'Ghada',
  'Hana',
  'Ibrahim',
  'Jamal',
  'Karim',
  'Leila',
  'Mariam',
  'Nadia',
  'Omar',
  'Rania',
  'Qasim',
  'Reem',
  'Samir',
  'Tariq',
  'Salma',
  'Walid',
  'Yara',
  'Zaid',
  'Yusuf',
  'Zeina',
  'Hassan',
  'Layla',
]
const LAST = [
  'Haddad',
  'Mansour',
  'Khoury',
  'Nasser',
  'Al-Sayed',
  'Darwish',
  'Hamdan',
  'Rahman',
  'Saleh',
  'Farouk',
  'Aziz',
  'Jaber',
  'Khalil',
  'Najjar',
  'Sabbagh',
  'Bakr',
  'Qasim',
  'Shaheen',
  'Khan',
  'Zidan',
  'Al-Amin',
  'Barakat',
  'Tahan',
  'Suleiman',
  'Abdullah',
]
const COMPANY = [
  'Northwind',
  'Helio Labs',
  'Brightwave',
  'Cobalt Freight',
  'Andromeda Health',
  'Juniper Works',
  'Tessellate',
  'Kestrel Bank',
  'Paper Crane',
  'Orchard Systems',
  'Lumen Grid',
  'Sandbar Media',
  'Ironbridge',
  'Fathom Analytics',
  'Verdant Foods',
]
const ROLE = [
  'Software Engineer',
  'Product Designer',
  'Account Executive',
  'Data Analyst',
  'Support Specialist',
  'Engineering Manager',
  'Recruiter',
  'Finance Lead',
  'Marketing Manager',
  'QA Engineer',
]
const COUNTRY = [
  'Morocco',
  'Germany',
  'Brazil',
  'Japan',
  'Canada',
  'Nigeria',
  'Poland',
  'India',
  'Mexico',
  'Sweden',
  'Turkey',
  'Vietnam',
  'France',
  'Kenya',
  'Spain',
]
const STATUS: Item['status'][] = ['active', 'active', 'active', 'paused', 'invited', 'archived']
const KIND = ['payment', 'contract', 'profile', 'document', 'comment']
const SUMMARY = [
  'Invoice approved',
  'Contract amended',
  'Bank details updated',
  'Document uploaded',
  'Comment added by manager',
  'Payment scheduled',
  'Time off requested',
  'Compensation reviewed',
]

const pick = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!

export function generateItems(count = ROW_COUNT, seed = SEED): Item[] {
  const rand = mulberry32(seed)
  const base = Date.UTC(2026, 10, 1)
  const items: Item[] = []
  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST)
    const last = pick(rand, LAST)
    const company = pick(rand, COMPANY)
    items.push({
      id: String(1000 + i),
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@${company.replace(/\s+/g, '').toLowerCase()}.example`.toLowerCase(),
      company,
      role: pick(rand, ROLE),
      country: pick(rand, COUNTRY),
      status: pick(rand, STATUS),
      amount: Math.round(1500 + rand() * 9000),
      updatedAt: new Date(base - Math.floor(rand() * 90) * 86_400_000).toISOString().slice(0, 10),
    })
  }
  return items
}

export function detailFor(item: Item): ItemDetail {
  const rand = mulberry32(SEED ^ Number(item.id))
  return {
    ...item,
    manager: `${pick(rand, FIRST)} ${pick(rand, LAST)}`,
    notes: `${item.name} works as ${item.role} at ${item.company}, based in ${item.country}.`,
  }
}

export function activityFor(id: string, count = 20): ActivityEvent[] {
  const rand = mulberry32((SEED * 31) ^ Number(id))
  const base = Date.UTC(2026, 10, 20)
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-${i}`,
    at: new Date(base - i * 86_400_000 * (1 + Math.floor(rand() * 3))).toISOString().slice(0, 10),
    kind: pick(rand, KIND),
    summary: pick(rand, SUMMARY),
  }))
}
