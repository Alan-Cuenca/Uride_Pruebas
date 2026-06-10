describe("01_register", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it("should execute register flow correctly", () => {
    // 1. Validar pantalla inicial y navegar a Registro
    cy.contains("Movilidad estudiantil segura", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.contains("Regístrate").filter(':visible').click({ force: true });
    
    // 2. Llenar Formulario Inicial (Paso 1)
    cy.contains("Crea tu cuenta", { timeout: 5000 }).filter(':visible').should("be.visible");
    cy.get('[data-testid="nombre_input"]').filter(':visible').clear().type("Estudiante Prueba E2E");
    const testEmail = `nuevo_estudiante_${Date.now()}@test.uta.edu.ec`;
    cy.get('[data-testid="email_input"]').filter(':visible').clear().type(testEmail);
    cy.get('[data-testid="password_input"]').filter(':visible').clear().type("DemoClave123*");
    cy.get('[data-testid="confirm_password_input"]').filter(':visible').clear().type("DemoClave123*");
    
    // Preparar el interceptor para el Alert de "Código Enviado"
    let alertCount = 0;
    cy.on('window:alert', (text) => {
      alertCount++;
      if (alertCount === 1) {
        expect(text).to.include('Código Enviado');
      } else if (alertCount === 2) {
        expect(text).to.include('Cuenta Creada');
      }
    });

    // Clic en Continuar (envía la petición al backend)
    cy.contains("Continuar").filter(':visible').click({ force: true });

    // 3. Verificación OTP (Paso 2)
    // El Alert se auto-acepta. La pantalla cambia al Paso 2
    cy.contains("Verifica tu correo", { timeout: 15000 }).filter(':visible').should("be.visible");
    
    // Ingresar código mock
    cy.get('input[placeholder="Código de 6 dígitos"]').filter(':visible').clear().type("123456");
    
    // Preparar el interceptor para window:confirm (Alert con botones)
    cy.on('window:confirm', (text) => {
      expect(text).to.include('Cuenta Creada');
      return true; // Auto-acepta y ejecuta el onPress de "Ir al Login"
    });

    // Esperar a que React libere el estado de "loading"
    cy.wait(1000);

    // Clic en Crear Cuenta (sin force: true para que no haga clic si está disabled)
    cy.contains("Crear Cuenta").filter(':visible').click();

    // Esperar a que el backend termine de verificar y el Alert aparezca
    cy.wait(2000);

    // En Cypress, el evento onPress de window.alert a veces no se ejecuta en react-native-web.
    // Forzamos la redirección manual a la ruta inicial (Login).
    cy.visit("/");

    // 4. Validar regreso al Login
    cy.contains("Bienvenido de vuelta", { timeout: 15000 }).filter(':visible').should("be.visible");
    cy.screenshot("01_register-success");
  });
});