import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mocks necesarios para aislar la prueba de navegación y API
const mockNavigation = { navigate: jest.fn() };

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

jest.mock('../../services/api', () => ({
    post: jest.fn(() => Promise.resolve({ data: { token: 'mock-token', usuario: {} } })),
}));

jest.mock('../../store/userStore', () => ({
    useAuthStore: () => jest.fn(),
}));

describe('Pruebas de Componente: LoginScreen', () => {
    test('Verifica renderizado e interacción básica usando Arrange-Act-Assert', async () => {
        // 1. ARRANGE: Renderizar el componente (asíncrono en RNTL v14+)
        const { getByPlaceholderText, getByText } = await render(<LoginScreen navigation={mockNavigation} />);

        const inputEmail = getByPlaceholderText('correo@uta.edu.ec');
        const inputPassword = getByPlaceholderText('Contraseña');
        const btnSubmit = getByText('Iniciar Sesión');

        // ASSERT inicial: Verificar que los elementos se muestran en pantalla
        expect(inputEmail).toBeTruthy();
        expect(inputPassword).toBeTruthy();
        expect(btnSubmit).toBeTruthy();

        // 2. ACT & ASSERT (Interacciones secuenciales para evitar act overlapping)
        fireEvent.changeText(inputEmail, 'estudiante@uta.edu.ec');
        await waitFor(() => {
            expect(inputEmail.props.value).toBe('estudiante@uta.edu.ec');
        });

        fireEvent.changeText(inputPassword, 'claveSegura123');
        await waitFor(() => {
            expect(inputPassword.props.value).toBe('claveSegura123');
        });

        fireEvent.press(btnSubmit);
    });
});
