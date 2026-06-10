describe("06_accept_request", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute accept request flow correctly", () => {
    // 1. Iniciar sesión como conductor
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("conductor@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").filter(':visible').click({ force: true });
    cy.contains("Tus Viajes Publicados", { timeout: 15000 }).filter(':visible').should("be.visible");

    // 2. Navegar a la pestaña "Solicitudes"
    cy.contains("Solicitudes").filter(':visible').click({ force: true });
    cy.contains("Bandeja de Solicitudes", { timeout: 8000 }).filter(':visible').should("be.visible");

    // 3. Validar solicitud Pendiente y Aceptar
    cy.contains("Pendiente", { timeout: 5000 }).filter(':visible').should("be.visible");

    // Preparar interceptor para Alert
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Cupo Confirmado');
      }
    });

    // Tocamos el botón de Aceptar
    cy.contains("Aceptar").filter(':visible').click({ force: true });

    // 4. Validar que la interfaz se recargó y la solicitud está Aceptada o ya no hay botón
    cy.contains("Aceptar").should("not.exist");
    cy.contains("Bandeja de Solicitudes", { timeout: 8000 }).filter(':visible').should("be.visible");
    cy.screenshot("06_accept_request-success");
  });
});