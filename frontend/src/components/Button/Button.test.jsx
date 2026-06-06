// frontend/src/components/Button/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Componente Button', () => {

    test('debe cambiar de color azul a verde al hacer clic', () => {

        // 1. ARRANGE (Preparar)
        // Renderizamos el componente en nuestro DOM virtual (JSDOM de Jest)
        render(<Button label="Iniciar Sesión" initialColor="blue" />);

        // Buscamos el elemento en el DOM simulado por su rol 
        // (las mejores prácticas dictan buscar los elementos tal como los vería el usuario, por eso no usamos IDs o clases)
        const buttonElement = screen.getByRole('button', { name: /iniciar sesión/i });

        // Verificamos el estado inicial antes de la acción
        expect(buttonElement).toBeInTheDocument();
        expect(buttonElement).toHaveStyle({ backgroundColor: 'rgb(0, 0, 255)' });

        // 2. ACT (Ejecutar)
        // Simulamos que el usuario hace clic en el botón usando fireEvent de RTL
        fireEvent.click(buttonElement);

        // 3. ASSERT (Validar)
        // Validamos el nuevo estado: verificamos que el color haya cambiado a verde
        expect(buttonElement).toHaveStyle({ backgroundColor: 'rgb(0, 128, 0)' });

    });

});
