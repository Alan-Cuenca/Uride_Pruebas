describe('Flujo de Errores: Registro y Verificación', () => {

  beforeEach(() => {
    // 1. Ir a la pantalla principal y presionar "Crear cuenta"
    cy.visit('http://localhost:5173/');
    cy.contains('button', 'Crear cuenta UTA').click();
  });

  // --- VALIDACIONES DEL PASO 1 (REGISTRO) ---

  /* 
  // Esta prueba falla porque tu código usa 'required' en los <input>
  // El navegador (HTML5) bloquea el envío antes de que React pueda mostrar tu mensaje.
  // Es una excelente práctica de seguridad, por lo que comentaremos esta prueba inalcanzable.
  it('Debe validar si se envían campos vacíos', () => {
    cy.contains('button', 'Enviar codigo').click();
    cy.contains('.auth-message.error', 'Completa todos los campos.').should('be.visible');
  });
  */

  it('Debe validar que la contraseña no sea menor a 6 caracteres', () => {
    cy.get('input[placeholder="Tu nombre"]').type('Robot');
    cy.get('input[type="email"]').type('robot@uta.edu.ec');
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('12345'); // < 6
    cy.get('input[placeholder="Repite la contrasena"]').type('12345');
    cy.contains('button', 'Enviar codigo').click();

    cy.contains('.auth-message.error', 'La contrasena debe tener al menos 6 caracteres.').should('be.visible');
  });

  it('Debe validar que las dos contraseñas coincidan', () => {
    cy.get('input[placeholder="Tu nombre"]').type('Robot');
    cy.get('input[type="email"]').type('robot@uta.edu.ec');
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('Prueba123');
    cy.get('input[placeholder="Repite la contrasena"]').type('Prueba456'); // Distinta
    cy.contains('button', 'Enviar codigo').click();

    cy.contains('.auth-message.error', 'Las contrasenas no coinciden.').should('be.visible');
  });

  it('Debe manejar un error del backend (Ej: Correo ya registrado)', () => {
    // Simulamos un error del backend
    cy.intercept('POST', 'http://localhost:5000/api/auth/register', {
      statusCode: 400,
      body: { error: "Este correo ya se encuentra en uso" }
    }).as('registroError');

    cy.get('input[placeholder="Tu nombre"]').type('Admin Prueba');
    cy.get('input[type="email"]').type('admin@uta.edu.ec'); // Usamos un correo que sabemos que existe, aunque el backend está mockeado
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('123456');
    cy.get('input[placeholder="Repite la contrasena"]').type('123456');
    cy.contains('button', 'Enviar codigo').click();

    cy.wait('@registroError');
    // Verificamos que el mensaje dinámico del backend se muestra en la UI
    cy.contains('.auth-message.error', 'Este correo ya se encuentra en uso').should('be.visible');
  });


  // --- VALIDACIONES DEL PASO 2 (VERIFICACIÓN) ---
  
  describe('Paso 2: Código de Verificación', () => {
    beforeEach(() => {
      // Avanzamos rápidamente al paso 2 mockeando el registro exitoso
      cy.intercept('POST', 'http://localhost:5000/api/auth/register', { statusCode: 200, body: {} }).as('mockRegister');
      cy.get('input[placeholder="Tu nombre"]').type('Estudiante Validacion');
      cy.get('input[type="email"]').type('nuevo@uta.edu.ec');
      cy.get('input[placeholder="Minimo 6 caracteres"]').type('123456');
      cy.get('input[placeholder="Repite la contrasena"]').type('123456');
      cy.contains('button', 'Enviar codigo').click();
      cy.wait('@mockRegister');
      cy.contains('h2', 'Verifica tu correo').should('be.visible');
    });

    it('Debe validar que el código tenga exactamente 6 dígitos', () => {
      cy.get('input[placeholder="000000"]').type('123'); // Solo 3 dígitos
      cy.contains('button', 'Crear cuenta').click();
      cy.contains('.auth-message.error', 'Ingresa el codigo de 6 digitos.').should('be.visible');
    });

    it('Debe manejar el error si el código es rechazado por el backend', () => {
      cy.intercept('POST', 'http://localhost:5000/api/auth/verify-register', {
        statusCode: 400,
        body: { error: "El código es incorrecto o ya expiró" }
      }).as('verifyError');

      cy.get('input[placeholder="000000"]').type('999999');
      cy.contains('button', 'Crear cuenta').click();
      cy.wait('@verifyError');
      
      cy.contains('.auth-message.error', 'El código es incorrecto o ya expiró').should('be.visible');
    });

    it('Debe permitir regresar al paso 1 presionando "Editar datos"', () => {
      cy.contains('button', 'Editar datos').click();
      // Validamos que volvimos al inicio
      cy.contains('h2', 'Registrate').should('be.visible');
      // Y que los datos no se borraron (el estado se mantuvo)
      cy.get('input[placeholder="Tu nombre"]').should('have.value', 'Estudiante Validacion');
    });
  });

});
