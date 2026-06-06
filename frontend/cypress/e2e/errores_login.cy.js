describe('Flujo de Errores: Iniciar Sesión', () => {

  beforeEach(() => {
    cy.visit('http://localhost:5173/');
  });

  it('Debe mostrar un mensaje de error si las credenciales son incorrectas (Catch Block)', () => {
    // Interceptamos la petición para simular un error 401 desde el backend
    cy.intercept('POST', 'http://localhost:5000/api/auth/login', {
      statusCode: 401,
      body: { error: "Credenciales incorrectas o usuario no encontrado" }
    }).as('loginError');

    // Intentamos iniciar sesión
    cy.get('input[type="email"]').type('cualquiera@uta.edu.ec');
    cy.get('input[type="password"]').type('claveMala123');
    cy.contains('button', 'Acceder al panel').click();

    cy.wait('@loginError');

    // Validamos que el mensaje de error rojo aparezca en la interfaz
    cy.contains('.auth-message.error', 'Credenciales incorrectas o usuario no encontrado').should('be.visible');
  });

  it('Debe denegar el acceso si el rol del usuario no es ADMINISTRADOR', () => {
    // Interceptamos para devolver un usuario válido, pero que es PASAJERO (como "Juan Pasajero")
    cy.intercept('POST', 'http://localhost:5000/api/auth/login', {
      statusCode: 200,
      body: {
        token: "fake-jwt-token",
        usuario: { rol: 'PASAJERO' }
      }
    }).as('loginNoAdmin');

    cy.get('input[type="email"]').type('juan@uta.edu.ec');
    cy.get('input[type="password"]').type('123456');
    cy.contains('button', 'Acceder al panel').click();

    cy.wait('@loginNoAdmin');

    // Validamos la lógica del Frontend que bloquea a los no-administradores
    cy.contains('.auth-message.error', 'Tu cuenta no tiene permisos de administrador.').should('be.visible');
  });

});
