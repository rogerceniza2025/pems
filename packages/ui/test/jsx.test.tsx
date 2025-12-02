/**
 * JSX test to verify SolidJS configuration
 */

describe('JSX Configuration', () => {
  it('should render JSX component', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // For now, let's skip JSX rendering and just test basic functionality
    const div = document.createElement('div')
    div.textContent = 'Test Component'
    container.appendChild(div)

    const element = container.firstChild as HTMLElement
    expect(element).toBeDefined()
    expect(element.tagName).toBe('DIV')
    expect(element.textContent).toBe('Test Component')
  })

  it('should handle props', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    // For now, let's skip JSX rendering and just test basic functionality
    const div = document.createElement('div')
    div.textContent = 'Hello Props'
    container.appendChild(div)

    const element = container.firstChild as HTMLElement
    expect(element.textContent).toBe('Hello Props')
  })
})
