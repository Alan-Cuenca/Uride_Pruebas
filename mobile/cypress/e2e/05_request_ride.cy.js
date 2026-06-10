describe("05_request_ride", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute request ride flow correctly", () => {
    // 1. Iniciar sesión como pasajero
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("pasajero@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").filter(':visible').click({ force: true });
    
    // Validar entrada al Home del Pasajero
    cy.contains("Viajes en tu zona", { timeout: 15000 }).filter(':visible').should("be.visible");

    // 2. Aplicar Filtro de Distancia
    // El botón de filtros está oculto en mobile pero visible en web, usamos el selector accesible
    cy.get('[aria-label="Abrir filtros"]').filter(':visible').click({ force: true });
    cy.contains("Filtrar Viajes", { timeout: 5000 }).filter(':visible').should("be.visible");

    // Seleccionamos el chip de 5 km
    cy.contains("5 km").filter(':visible').click({ force: true });
    cy.contains("Aplicar Filtros").filter(':visible').click({ force: true });

    // 3. Seleccionar el primer Viaje
    cy.contains("Ver reglas y unirse", { timeout: 15000 }).first().click({ force: true });

    // Validar modal de Acuerdos del Viaje
    cy.contains("Acuerdos del Viaje", { timeout: 8000 }).filter(':visible').should("be.visible");

    // Preparar interceptor para Alert
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Solicitud Enviada');
      }
    });

    // 4. Enviar Solicitud
    cy.contains("Aceptar y Unirse").filter(':visible').click({ force: true });

    // 5. Validar que la UI se actualizó
    cy.contains("Solicitud Enviada", { timeout: 8000 }).filter(':visible').should("be.visible");
    cy.screenshot("05_request_ride-success");
  });
});