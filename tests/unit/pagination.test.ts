import { describe, it, expect } from 'vitest'
import { parsePagination } from '@/lib/http/pagination'

describe('parsePagination', () => {
  it('returns defaults when missing', () => {
    const sp = new URLSearchParams()
    const { skip, take } = parsePagination(sp, { defaultTake: 20, maxTake: 50 })
    expect(skip).toBe(0)
    expect(take).toBe(20)
  })

  it('caps take to max', () => {
    const sp = new URLSearchParams({ take: '999', page: '1' })
    const { take } = parsePagination(sp, { defaultTake: 20, maxTake: 50 })
    expect(take).toBe(50)
  })

  it('calculates skip correctly', () => {
    const sp = new URLSearchParams({ take: '10', page: '3' })
    const { skip, take } = parsePagination(sp)
    expect(take).toBe(10)
    expect(skip).toBe(20)
  })
})


