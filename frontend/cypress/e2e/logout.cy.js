describe('Flujo de Cierre de Sesión (Logout)', () => {

  beforeEach(() => {
    // 1. Entramos e iniciamos sesión automáticamente para estar dentro del sistema
    cy.visit('http://localhost:5173/');
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PASSWORD'));
    cy.contains('button', 'Acceder al panel').click();
    
    // Verificamos que ya cargó el dashboard
    cy.contains('Gestion de Reportes').should('be.visible');
  });

  it('Debe cerrar sesión, borrar el token del navegador y redirigir al inicio', () => {
    // 2. Hacer clic en el botón "Salir" de la barra superior derecha
    cy.contains('button', 'Salir').click();

    // 3. Validar visualmente que la aplicación nos devolvió al Login
    cy.contains('h2', 'Iniciar sesion').should('be.visible');
    cy.contains('Acceso web para estudiantes y administracion').should('be.visible');

    // 4. Validar técnicamente (Seguridad) que el LocalStorage se limpió
    // Tu código en App.jsx usa localStorage.removeItem('admin_token')
    cy.window().then((ventanaDelNavegador) => {
      // Usamos 'expect' para aserciones de variables y código puro
      expect(ventanaDelNavegador.localStorage.getItem('admin_token')).to.be.null;
    });
  });

});
