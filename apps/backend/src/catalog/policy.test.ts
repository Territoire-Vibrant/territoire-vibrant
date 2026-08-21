import { describe, expect, it } from 'vitest'

import { selectRelated, toProductWrite } from './policy'

describe('toProductWrite', () => {
  const base = { name: 'Livro', price: 89.9, type: 'PHYSICAL' as const, isActive: true }

  it('converts a decimal price to integer cents', () => {
    const result = toProductWrite(base)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.priceCents).toBe(8990)
      expect(result.value.currency).toBe('CAD')
    }
  })

  it('rounds instead of truncating floating point drift', () => {
    // 0.1 + 0.2 territory: 19.99 * 100 must land on exactly 1990.
    const result = toProductWrite({ ...base, price: 19.99 })
    expect(result.ok && result.value.priceCents === 1999).toBe(true)
  })

  it('rejects a zero or negative price as a typed failure', () => {
    const rejected = toProductWrite({ ...base, price: 0 })
    const rejectedNegative = toProductWrite({ ...base, price: -5 })
    expect(!rejected.ok && rejected.failure._tag === 'ValidationFailure').toBe(true)
    expect(!rejectedNegative.ok && rejectedNegative.failure._tag === 'ValidationFailure').toBe(true)
  })

  it('normalizes empty optional strings to undefined', () => {
    const result = toProductWrite({ ...base, description: '   ', imageUrl: '' })
    expect(result.ok && result.value.description === undefined && result.value.imageUrl === undefined).toBe(true)
  })
})

describe('selectRelated', () => {
  const product = (id: string, type: 'PHYSICAL' | 'DIGITAL') => ({ _id: id, type })

  it('keeps same-type products and excludes the current one', () => {
    const current = product('a', 'PHYSICAL')
    const candidates = [product('a', 'PHYSICAL'), product('b', 'PHYSICAL'), product('c', 'DIGITAL')]
    const related = selectRelated(candidates, current)
    expect(related.map((item) => item._id)).toEqual(['b'])
  })

  it('respects the limit', () => {
    const current = product('a', 'DIGITAL')
    const candidates = ['b', 'c', 'd', 'e', 'f'].map((id) => product(id, 'DIGITAL'))
    expect(selectRelated(candidates, current, 3)).toHaveLength(3)
  })
})
