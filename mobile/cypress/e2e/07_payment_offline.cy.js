describe("07_payment_offline", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute offline payment flow correctly", () => {
    // 1. Iniciar sesión como pasajero
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("pasajero@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").filter(':visible').click({ force: true });
    cy.contains("Viajes en tu zona", { timeout: 15000 }).filter(':visible').should("be.visible");

    // 2. Navegar a la pestaña Pagos
    cy.contains("Pagos").filter(':visible').click({ force: true });
    cy.contains("Gestión de Pagos", { timeout: 8000 }).filter(':visible').should("be.visible");

    // 3. Ubicar tarjeta pendiente y abrir modal
    cy.contains("Pendiente de Pago").filter(':visible').should("be.visible");
    cy.contains("Pagar Aporte").filter(':visible').click({ force: true });

    // 4. Modal de pago (Seleccionar Efectivo)
    cy.contains("Aporte de Gasolina", { timeout: 5000 }).filter(':visible').should("be.visible");
    cy.contains(/^Efectivo$/).filter(':visible').click({ force: true });

    // 5. Preparar interceptor y declarar pago
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Pago Declarado');
      }
    });

    cy.contains("Declarar Pago").filter(':visible').click({ force: true });

    // 6. Validar que la interfaz se actualizó
    cy.contains("Por verificar (Efectivo)", { timeout: 8000 }).filter(':visible').should("be.visible");
    cy.screenshot("07_payment_offline-success");
  });
});