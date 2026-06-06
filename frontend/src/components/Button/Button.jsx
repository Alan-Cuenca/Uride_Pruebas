// frontend/src/components/Button/Button.jsx
import { useState } from 'react';

export const Button = ({ label, initialColor = 'blue' }) => {
    const [color, setColor] = useState(initialColor);

    const handleClick = () => {
        setColor(color === 'blue' ? 'green' : 'blue');
    };

    return (
        <button
            onClick={handleClick}
            style={{ backgroundColor: color, color: 'white', padding: '10px 20px', borderRadius: '5px' }}

        >
            {label}
        </button>
    );
};
