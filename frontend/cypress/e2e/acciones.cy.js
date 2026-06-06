describe('Flujo de Acciones Disciplinarias (Administrador)', () => {

  beforeEach(() => {
    // 1. Iniciar sesión automáticamente
    cy.visit('http://localhost:5173/');
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PASSWORD'));
    cy.contains('button', 'Acceder al panel').click();
    
    cy.contains('Gestion de Reportes').should('be.visible');
  });

  it('Debe abrir el modal y enviar una Advertencia al usuario reportado', () => {
    // 2. Interceptar la petición de resolución para no afectar la DB real
    // Usamos el comodín '*' porque no sabemos qué ID tendrá el reporte
    cy.intercept('PUT', 'http://localhost:5000/api/admin/reportes/*/resolver', {
      statusCode: 200,
      body: { message: "Mock: Reporte resuelto con advertencia" }
    }).as('mockResolverAdvertencia');

    // 3. Buscar el botón de Advertir en la tabla y hacer clic
    // Este botón solo aparece en los reportes que están ABIERTOS
    cy.contains('button', 'Advertir').click();

    // 4. Validar que se abre el modal correcto
    cy.contains('h3', 'Enviar Advertencia').should('be.visible');
    cy.contains('El reporte se marcara como resuelto').should('be.visible');
    
    // 5. Confirmar la acción en el modal
    cy.contains('button', 'Confirmar').click();

    // 6. Esperar a que el frontend llame a la API
    cy.wait('@mockResolverAdvertencia');
  });

  it('Debe abrir el modal de Suspensión y procesar la acción severa', () => {
    // 2. Aquí hay dos peticiones, porque suspender implica cambiar el estado del reporte Y banear al usuario
    cy.intercept('PUT', 'http://localhost:5000/api/admin/reportes/*/resolver', {
      statusCode: 200,
      body: { message: "Mock: Reporte resuelto con suspensión" }
    }).as('mockResolverSuspension');

    cy.intercept('PUT', 'http://localhost:5000/api/admin/usuarios/*/suspender', {
      statusCode: 200,
      body: { message: "Mock: Usuario suspendido" }
    }).as('mockSuspenderUsuario');

    // 3. Buscar el botón rojo de Suspender y hacer clic
    cy.contains('button', 'Suspender').click();

    // 4. Validar que se abre el modal de severidad (color rojo)
    cy.contains('h3', 'Suspender Usuario').should('be.visible');
    cy.contains('El usuario perdera la capacidad de publicar viajes').should('be.visible');

    // 5. Confirmar
    cy.contains('button', 'Confirmar').click();

    // 6. Esperar a que se envíen AMBAS peticiones críticas
    cy.wait('@mockSuspenderUsuario');
    cy.wait('@mockResolverSuspension');
  });

});
