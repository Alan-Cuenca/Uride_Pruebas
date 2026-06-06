describe('Flujo de Recuperación de Contraseña E2E', () => {

  it('Debe completar todo el flujo mockeando el envío y validación de correos', () => {
    // 1. Ir a la aplicación
    cy.visit('http://localhost:5173/');

    // MOCKS: Interceptar las dos peticiones al backend relacionadas con este flujo
    // Mock 1: Evitamos que el backend envíe el correo real
    cy.intercept('POST', 'http://localhost:5000/api/auth/forgot-password', {
      statusCode: 200,
      body: { message: "Mock: Código de recuperación enviado" }
    }).as('mockForgot');

    // Mock 2: Evitamos que el backend valide si el código de 6 dígitos es real
    cy.intercept('POST', 'http://localhost:5000/api/auth/reset-password', {
      statusCode: 200,
      body: { message: "Mock: Contraseña restablecida con éxito" }
    }).as('mockReset');


    // 2. Hacer clic en el enlace de recuperación
    cy.contains('button', '¿Olvidaste tu contrasena?').click();

    // 3. Comprobar que el título cambió al Paso 1
    cy.contains('h2', 'Recuperar contrasena').should('be.visible');

    // 4. Llenar el campo de correo y enviar
    cy.get('input[type="email"]').type('estudiante@uta.edu.ec');
    cy.contains('button', 'Enviar codigo').click();

    // Esperar a que pase el mock 1
    cy.wait('@mockForgot');

    // 5. Verificar que la pantalla cambia al Paso 2
    cy.contains('h2', 'Restablecer contrasena').should('be.visible');
    cy.contains('Revisa el codigo enviado a estudiante@uta.edu.ec').should('be.visible');

    // 6. Llenar los datos de la nueva contraseña y el código (Paso 2)
    // El código puede ser cualquiera porque está mockeado, pero debe tener 6 dígitos según tu validación frontend
    cy.get('input[placeholder="000000"]').type('123456'); 
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('NuevaClave123');
    cy.get('input[placeholder="Repite la nueva contrasena"]').type('NuevaClave123');

    // 7. Guardar la nueva contraseña
    cy.contains('button', 'Guardar nueva contrasena').click();

    // Esperar a que pase el mock 2
    cy.wait('@mockReset');

    // 8. Verificar que el proceso fue exitoso y regresamos al login
    cy.contains('h2', 'Iniciar sesion').should('be.visible');
    
    // Validar el mensaje verde de éxito que programaste en App.jsx
    cy.contains('Contrasena actualizada. Ya puedes iniciar sesion.').should('be.visible');
  });

  it('Debe mostrar un error si el correo no es institucional al recuperar', () => {
    cy.visit('http://localhost:5173/');
    cy.contains('button', '¿Olvidaste tu contrasena?').click();

    // Llenamos con un correo inválido
    cy.get('input[type="email"]').type('invitado@hotmail.com');
    cy.contains('button', 'Enviar codigo').click();

    // Comprobar que el error del frontend aparece sin hacer peticiones al backend
    cy.contains('Usa tu correo @uta.edu.ec.').should('be.visible');
  });

});
