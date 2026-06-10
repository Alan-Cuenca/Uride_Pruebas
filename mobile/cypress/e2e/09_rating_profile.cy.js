describe("09_rating_profile", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute rating and logout flow correctly", () => {
    // 1. Iniciar sesión como pasajero
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).should("be.visible");
    cy.get('[data-testid="email_input"]').clear().type("pasajero@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").click({ force: true });
    cy.contains("Viajes en tu zona", { timeout: 15000 }).should("be.visible");

    // 2. Navegar a Solicitudes
    cy.contains("Solicitudes").click({ force: true });
    cy.contains("Bandeja de Solicitudes", { timeout: 8000 }).should("be.visible");

    // 3. Calificar
    // El viaje 11 o el que sea fue cerrado en el flujo 08, así que debería haber un botón "Calificar"
    cy.contains("Calificar", { timeout: 8000 }).first().click({ force: true });
    cy.contains("Calificar Compañero", { timeout: 5000 }).should("be.visible");

    // Seleccionar 5 estrellas
    cy.get('[data-testid="star_5"]').click({ force: true });
    cy.contains("Excelente").should("be.visible");

    // Comentario
    cy.get('textarea').clear().type("Excelente compañero de viaje.");

    // Interceptar Alert
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Evaluación enviada');
      }
    });

    // Enviar
    cy.contains("Enviar Evaluación").click({ force: true });
    
    // Esperamos que desaparezca el modal (a veces el alert asincrónico molesta)
    cy.wait(2000);
    cy.visit("/");

    cy.contains("Viajes en tu zona", { timeout: 8000 }).should("be.visible");

    // 4. Ir al Perfil
    cy.contains("Perfil").click({ force: true });
    cy.contains("Cerrar Sesión", { timeout: 8000 }).should("exist");

    // 5. Cerrar Sesión
    cy.contains("Cerrar Sesión").click({ force: true });

    // 6. Validar que volvimos al Login
    cy.contains("Movilidad estudiantil segura", { timeout: 8000 }).should("be.visible");
    cy.screenshot("09_rating_profile-success");
  });
});