describe('Flujo del Dashboard de Administrador', () => {

  // El bloque beforeEach se ejecuta antes de CADA prueba en este archivo.
  // Nos sirve para ahorrarnos el código de iniciar sesión cada vez.
  beforeEach(() => {
    // 1. Iniciar sesión automáticamente (usando las variables del cypress.env.json)
    cy.visit('http://localhost:5173/');
    cy.get('input[type="email"]').type(Cypress.env('ADMIN_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('ADMIN_PASSWORD'));
    cy.contains('button', 'Acceder al panel').click();
    
    // Asegurarnos de que el panel cargó antes de probar nada
    cy.contains('Gestion de Reportes').should('be.visible');
  });

  it('Debe calcular y renderizar correctamente las tarjetas de estadísticas', () => {
    // 2. Verificar que las tarjetas superiores funcionen en base a nuestros datos de prueba
    // Insertamos 2 reportes (1 Abierto, 1 Resuelto) y hay 2 usuarios (Juan y Pedro)

    cy.contains('.stat-label', 'Reportes Abiertos')
      .siblings('.stat-value')
      .should('contain', '1');

    cy.contains('.stat-label', 'Resueltos')
      .siblings('.stat-value')
      .should('contain', '1');

    cy.contains('.stat-label', 'Total Reportes')
      .siblings('.stat-value')
      .should('contain', '2');
      
    cy.contains('.stat-label', 'Usuarios Involucrados')
      .siblings('.stat-value')
      .should('contain', '2');
  });

  it('Debe permitir expandir un reporte en la tabla para ver el Motivo y la Evidencia', () => {
    // 3. Buscar en la tabla la fila del reporte hacia "Pedro Conductor"
    // Al hacer clic en su nombre (o en cualquier parte de la fila), tu código App.jsx la expande
    cy.contains('td', 'Pedro Conductor').click();

    // 4. Validar que aparezcan los textos de detalle que antes estaban ocultos
    cy.contains('Motivo Completo').should('be.visible');
    
    // Revisamos que parte del motivo que insertamos exista en pantalla
    cy.contains('El conductor manejaba a exceso de velocidad').should('be.visible');

    // 5. Verificar que el enlace de Evidencia está presente (porque este reporte sí tiene)
    cy.contains('Ver Evidencia').should('be.visible')
      .and('have.attr', 'href')
      .and('include', '/uploads/evidencia_1.jpg'); // Validamos la ruta de la evidencia
  });

  it('Debe permitir refrescar los datos manualmente llamando al backend', () => {
    // 6. Interceptar la petición GET para validar que el botón de refrescar sí se comunica con la API
    cy.intercept('GET', 'http://localhost:5000/api/admin/reportes').as('getReportes');
    
    // Hacer clic en el botón superior de Actualizar
    cy.contains('button', 'Actualizar').click();
    
    // Cypress esperará a que se complete la petición y validamos que el backend respondió con éxito (200 OK)
    cy.wait('@getReportes').its('response.statusCode').should('be.oneOf', [200, 304]);
  });

});
