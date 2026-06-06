describe('Flujo de Errores: Recuperación de Contraseña', () => {

  beforeEach(() => {
    // 1. Navegar a la pantalla de Olvidaste tu contraseña
    cy.visit('http://localhost:5173/');
    cy.contains('button', '¿Olvidaste tu contrasena?').click();
  });

  // --- VALIDACIONES DEL PASO 1 (SOLICITAR CÓDIGO) ---

  it('Debe manejar un error del backend si el correo no existe en la BD', () => {
    // Simulamos que el backend responde con error 404
    cy.intercept('POST', 'http://localhost:5000/api/auth/forgot-password', {
      statusCode: 404,
      body: { error: "No se encontró ninguna cuenta con ese correo institucional" }
    }).as('forgotError');

    cy.get('input[type="email"]').type('fantasma@uta.edu.ec');
    cy.contains('button', 'Enviar codigo').click();

    cy.wait('@forgotError');
    // Validamos que el mensaje del backend se renderiza
    cy.contains('.auth-message.error', 'No se encontró ninguna cuenta con ese correo').should('be.visible');
  });

  // Nota: La validación de campos vacíos la saltamos aquí también porque los campos tienen 'required=true'

  // --- VALIDACIONES DEL PASO 2 (RESTABLECER CONTRASEÑA) ---

  describe('Paso 2: Restablecer Contraseña', () => {
    beforeEach(() => {
      // Avanzamos al paso 2 mockeando el éxito del paso 1
      cy.intercept('POST', 'http://localhost:5000/api/auth/forgot-password', { statusCode: 200 }).as('mockForgot');
      cy.get('input[type="email"]').type('estudiante@uta.edu.ec');
      cy.contains('button', 'Enviar codigo').click();
      cy.wait('@mockForgot');
      cy.contains('h2', 'Restablecer contrasena').should('be.visible');
    });

    it('Debe validar que el código de recuperación tenga exactamente 6 dígitos', () => {
      cy.get('input[placeholder="000000"]').type('123'); // Muy corto
      // Llenamos las contraseñas para que el navegador no bloquee el envío (required)
      cy.get('input[placeholder="Minimo 6 caracteres"]').type('123456');
      cy.get('input[placeholder="Repite la nueva contrasena"]').type('123456');
      cy.contains('button', 'Guardar nueva contrasena').click();
      cy.contains('.auth-message.error', 'Ingresa el codigo de 6 digitos.').should('be.visible');
    });

    it('Debe validar que la nueva contraseña tenga al menos 6 caracteres', () => {
      cy.get('input[placeholder="000000"]').type('123456');
      cy.get('input[placeholder="Minimo 6 caracteres"]').type('12345'); // Corta
      cy.get('input[placeholder="Repite la nueva contrasena"]').type('12345');
      cy.contains('button', 'Guardar nueva contrasena').click();
      
      cy.contains('.auth-message.error', 'La contrasena debe tener al menos 6 caracteres.').should('be.visible');
    });

    it('Debe validar que las nuevas contraseñas coincidan', () => {
      cy.get('input[placeholder="000000"]').type('123456');
      cy.get('input[placeholder="Minimo 6 caracteres"]').type('Prueba123');
      cy.get('input[placeholder="Repite la nueva contrasena"]').type('Prueba456'); // Diferente
      cy.contains('button', 'Guardar nueva contrasena').click();
      
      cy.contains('.auth-message.error', 'Las contrasenas no coinciden.').should('be.visible');
    });

    it('Debe manejar error del backend si el código es incorrecto o está caducado', () => {
      // Simulamos que el backend rechaza el cambio de contraseña
      cy.intercept('POST', 'http://localhost:5000/api/auth/reset-password', {
        statusCode: 400,
        body: { error: "El código ingresado es incorrecto o ha caducado" }
      }).as('resetError');

      cy.get('input[placeholder="000000"]').type('999999');
      cy.get('input[placeholder="Minimo 6 caracteres"]').type('Nueva123');
      cy.get('input[placeholder="Repite la nueva contrasena"]').type('Nueva123');
      cy.contains('button', 'Guardar nueva contrasena').click();

      cy.wait('@resetError');
      cy.contains('.auth-message.error', 'El código ingresado es incorrecto o ha caducado').should('be.visible');
    });

    it('Debe permitir regresar al paso 1 mediante el botón "Cambiar correo"', () => {
      cy.contains('button', 'Cambiar correo').click();
      
      // Comprobamos que volvimos al inicio
      cy.contains('h2', 'Recuperar contrasena').should('be.visible');
      // Y que el correo sigue escrito (el estado de React se preservó)
      cy.get('input[type="email"]').should('have.value', 'estudiante@uta.edu.ec');
    });
  });

});
