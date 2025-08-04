// Import commands
import './commands'
import { mount } from '@cypress/react'

// Mount function for component testing
Cypress.Commands.add('mount', mount)

// Example custom command for component testing
Cypress.Commands.add('mountWithProviders', (component, options = {}) => {
  const { providers = [], ...mountOptions } = options
  const wrappedComponent = providers.reduce(
    (acc, Provider) => <Provider>{acc}</Provider>,
    component
  )

  return mount(wrappedComponent, mountOptions)
})
