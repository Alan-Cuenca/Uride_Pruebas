// import '@cypress/code-coverage/support';
// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

Cypress.on('window:before:load', (win) => {
  if (win.navigator && win.navigator.geolocation) {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb, err) => {
      return cb({ coords: { latitude: -1.2543, longitude: -78.6229, accuracy: 10 } });
    });
  }
});
// Aquí podemos interceptar los Alerts nativos si es necesario en el futuro
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false
})
