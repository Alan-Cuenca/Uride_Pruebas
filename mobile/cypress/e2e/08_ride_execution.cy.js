describe("08_ride_execution", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute ride correctly", () => {
    // 1. Iniciar sesión como conductor
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).should("be.visible");
    cy.get('[data-testid="email_input"]').clear().type("conductor@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").click({ force: true });
    cy.contains("Tus Viajes Publicados", { timeout: 15000 }).should("be.visible");

    // 2. Seleccionar el Viaje
    cy.contains("Ver detalles").first().click({ force: true });
    cy.contains("Acuerdos del Viaje", { timeout: 5000 }).should("be.visible");

    // 3. Iniciar el Viaje
    // Preparar interceptor para Alert
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Viaje iniciado');
      } else if (alertCount === 2) {
        expect(text).to.include('Viaje finalizado');
      }
    });

    cy.contains("Iniciar").click({ force: true });

    // 4. Validar estado cambiado a EN_CURSO y finalizar
    // Esperamos a que la petición fetchRides actualice el estado en la lista para evitar abrir el modal viejo
    cy.contains("EN_CURSO", { timeout: 10000 }).should("exist");
    
    cy.contains("Ver detalles").first().click({ force: true });
    cy.contains("Finalizar").click({ force: true });

    // 5. Validar que regresamos y ya no hay "Finalizar"
    cy.contains("Finalizar").should("not.exist");
    cy.screenshot("08_ride_execution-success");
  });
});