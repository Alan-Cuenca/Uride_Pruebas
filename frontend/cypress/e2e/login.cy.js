describe('Flujo de Autenticación E2E', () => {

  it('Debe permitir a un usuario iniciar sesión y redirigirlo al Dashboard (CP-RF003)', () => {

    // 1. Visitar la URL principal (App.jsx controla la vista según el estado)
    cy.visit('http://localhost:5173/');

    // 2. Encontrar el campo de Correo (type="email")
    cy.get('input[type="email"]')
      .type(Cypress.env('ADMIN_EMAIL')); // Carga el correo desde cypress.env.json

    // 3. Encontrar el campo de Contraseña (type="password")
    cy.get('input[type="password"]')
      .type(Cypress.env('ADMIN_PASSWORD')); // Carga la clave desde cypress.env.json

    // 4. Hacer clic en el botón de "Acceder al panel"
    cy.contains('button', 'Acceder al panel').click();

    // 5. Verificaciones (Aserciones)
    // El frontend verifica el token y luego muestra el panel de Gestión de Reportes
    cy.contains('Gestion de Reportes').should('be.visible');
    cy.contains('Panel de Administracion').should('be.visible');
  });

});
