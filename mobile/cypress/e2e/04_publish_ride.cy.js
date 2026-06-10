describe("04_publish_ride", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute publish ride flow correctly", () => {
    // 1. Iniciar sesión como conductor
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("conductor@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.contains("Iniciar Sesión").filter(':visible').click({ force: true });
    cy.contains("Hola,", { timeout: 15000 }).filter(':visible').should("be.visible");

    // 2. Navegar a Publicar Viaje (Usamos el texto de la Tab bar)
    cy.contains("Publicar").filter(':visible').click({ force: true });
    cy.contains("Publicar Viaje", { timeout: 8000 }).filter(':visible').should("be.visible");

    // 3. Seleccionar Origen en el Mapa Simulado
    cy.get('[data-testid="btn_origen"]').filter(':visible').click({ force: true });
    // Verify GPS loading is gone
    cy.contains('Obteniendo ubicación GPS...').should('not.exist');
    // Hacemos click en el mapa mock para que genere coordenadas de Origen
    cy.get('[data-testid="mock_map_view"]').should('exist').filter(':visible').click({ force: true });
    // Asegurarse de que se marcó
    cy.contains("Origen ✓").filter(':visible').should("be.visible");

    // 4. Seleccionar Destino en el Mapa Simulado
    cy.get('[data-testid="btn_destino"]').filter(':visible').click({ force: true });
    // Hacemos click de nuevo para generar coordenadas de Destino
    cy.get('[data-testid="mock_map_view"]').filter(':visible').click({ force: true });
    cy.contains("Destino ✓").filter(':visible').should("be.visible");

    // 5. Llenar Detalles (Cupos, Reglas, etc)
    cy.get('input[placeholder="3"]').filter(':visible').clear().type("4");
    cy.get('textarea').filter(':visible').clear().type("Reglas de prueba: No comer en el auto.");

    cy.on('window:confirm', (text) => {
      expect(text).to.include('Viaje Publicado');
      return true; // Auto-acepta para volver al Home
    });
    cy.on('window:alert', (text) => {
      throw new Error(`Alert Error from API: ${text}`);
    });

    cy.intercept('POST', '**/viajes').as('publishRide');
    // 6. Enviar
    cy.get('[data-testid="submit_publish"]').click({ force: true });

    // Comprobar que no hay errores de validación de RNW
    cy.contains('Las reglas del viaje son obligatorias.').should('not.exist');
    cy.contains('Faltan coordenadas de origen o destino.').should('not.exist');
    cy.contains('Debe haber al menos 1 cupo.').should('not.exist');
    cy.contains('La fecha y hora de salida no puede estar en el pasado.').should('not.exist');
    
    cy.wait('@publishRide').then((interception) => {
      expect(interception.response.statusCode).to.be.oneOf([200, 201]);
    });
    cy.visit("/");

    // 7. Validar redirección al Home
    cy.contains("Tus Viajes Publicados", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.screenshot("04_publish_ride-success");
  });
});