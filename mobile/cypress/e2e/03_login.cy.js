describe("03_login", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute login flow correctly", () => {
    // 1. Validar pantalla inicial
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    
    // 2. Llenar Formulario de Login (Usuario Pasajero Existente)
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type("pasajero@test.uta.edu.ec");
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");

    // 3. Iniciar Sesión
    cy.contains("Iniciar Sesión").filter(':visible').click({ force: true });

    // 4. Validar navegación exitosa al Home (Pasajero)
    cy.contains("Hola,", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.contains("Viajes en tu zona").filter(':visible').should("be.visible");
    cy.screenshot("03_login-success");
  });
});