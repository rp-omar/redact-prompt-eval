import { expect, test } from 'bun:test'
import { generateItems } from '../mock/data'
import { filterItems } from './filter'

const items = generateItems(200)

test('filter matches case-insensitively across the listed columns and returns everything when blank', () => {
  expect(filterItems(items, '   ')).toHaveLength(200)
  const hits = filterItems(items, 'MOROCCO')
  expect(hits.length).toBeGreaterThan(0)
  expect(hits.length).toBeLessThan(200)
  expect(hits.every((item) => item.country === 'Morocco')).toBe(true)
  expect(filterItems(items, 'no-such-value-anywhere')).toHaveLength(0)
})
