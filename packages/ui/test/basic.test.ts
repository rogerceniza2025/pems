/**
 * Basic test to verify test setup is working
 */

describe('Basic Test Setup', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have DOM environment', () => {
    expect(document).toBeDefined()
    expect(window).toBeDefined()
  })

  it('should have mock matchMedia', () => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    expect(mediaQuery).toBeDefined()
    expect(mediaQuery.matches).toBe(false)
  })
})
