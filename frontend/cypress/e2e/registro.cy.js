describe('Flujo de Registro E2E', () => {

  it('Debe permitir llenar el formulario y pasar al paso de verificación (Paso 1)', () => {
    // 1. Ir a la aplicación
    cy.visit('http://localhost:5173/');

    // MOCK: Interceptar la petición al backend para que no intente enviar un correo real
    // Le decimos a Cypress que cuando la app intente hacer POST a /api/auth/register, 
    // Cypress responda automáticamente con un éxito (200 OK) sin tocar el backend.
    cy.intercept('POST', 'http://localhost:5000/api/auth/register', {
      statusCode: 200,
      body: { message: "Mock: Correo enviado" }
    }).as('mockRegistro');

    // 2. Hacer clic en el enlace para cambiar a la vista de registro
    cy.contains('button', 'Crear cuenta UTA').click();

    // 3. Comprobar que el título cambió
    cy.contains('h2', 'Registrate').should('be.visible');

    // 4. Llenar los campos usando los 'placeholder' para identificarlos (según App.jsx)
    cy.get('input[placeholder="Tu nombre"]').type('Robot Cypress');
    
    // Cypress genera un número aleatorio para no crear correos duplicados si lo ejecutas varias veces
    const randomEmail = `robot${Math.floor(Math.random() * 1000)}@uta.edu.ec`;
    cy.get('input[type="email"]').type(randomEmail);
    
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('PruebaSegura123');
    cy.get('input[placeholder="Repite la contrasena"]').type('PruebaSegura123');

    // 5. Hacer clic en enviar
    cy.contains('button', 'Enviar codigo').click();

    // Opcional: Le decimos a Cypress que espere a que nuestro mock sea llamado
    cy.wait('@mockRegistro');

    // 6. Verificar que la pantalla cambia al Paso 2
    // Cypress es inteligente y espera automáticamente a que el backend responda
    cy.contains('h2', 'Verifica tu correo').should('be.visible');
    cy.contains(`Se envio un codigo a ${randomEmail}`).should('be.visible');
  });

  it('Debe mostrar error si el correo NO pertenece a la institución', () => {
    cy.visit('http://localhost:5173/');
    cy.contains('button', 'Crear cuenta UTA').click();

    // Intentamos usar un Gmail
    cy.get('input[placeholder="Tu nombre"]').type('Hacker Perez');
    cy.get('input[type="email"]').type('hacker@gmail.com');
    cy.get('input[placeholder="Minimo 6 caracteres"]').type('123456');
    cy.get('input[placeholder="Repite la contrasena"]').type('123456');

    cy.contains('button', 'Enviar codigo').click();

    // 7. El frontend debe mostrar un mensaje de error sin llamar al backend
    // Validamos que el mensaje rojo aparezca en pantalla
    cy.contains('Usa tu correo institucional @uta.edu.ec.').should('be.visible');
  });

});
