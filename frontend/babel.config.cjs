module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        // El runtime 'automatic' te salva de tener que hacer "import React from 'react'" en cada archivo de test
        ['@babel/preset-react', { runtime: 'automatic' }],
    ],
};
