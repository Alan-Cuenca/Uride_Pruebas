describe("02_forgot_password", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute forgot password flow correctly", () => {
    // 1. Navegar a la pantalla de Recuperación de Contraseña
    cy.contains("¿Olvidaste tu contraseña?", { timeout: 15000 }).filter(':visible').click({ force: true });
    
    // 2. Llenar Formulario Inicial (Paso 1)
    cy.contains("Recuperación", { timeout: 5000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("pasajero@test.uta.edu.ec");
    
    // Preparar interceptor para el Alert de "Código Enviado"
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Código Enviado');
      }
    });

    cy.contains("Enviar Código").filter(':visible').click({ force: true });

    // 3. Restablecer Contraseña (Paso 2)
    // El Alert se auto-acepta y cambia a la siguiente vista
    cy.contains("Restablecer Contraseña", { timeout: 15000 }).filter(':visible').should("be.visible");
    
    // Llenar datos con el código mock (123456)
    cy.get('[data-testid="code_input"]').filter(':visible').clear().type("123456");
    cy.get('[data-testid="new_password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.get('[data-testid="confirm_new_password_input"]').filter(':visible').clear().type("DemoClave123*");
    
    // Preparar interceptor para el window:confirm de éxito
    cy.on('window:confirm', (text) => {
      expect(text).to.include('Contraseña Restablecida');
      return true; // Dispara el onPress para ir al Login
    });

    cy.contains("Guardar Nueva Contraseña").filter(':visible').click();

    cy.wait(2000);
    cy.visit("/");

    // 4. Validar regreso al Login
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.screenshot();
  });
});