const fs = require('fs');
const files = fs.readdirSync('./cypress/e2e').filter(f => f.endsWith('.js'));
files.forEach(file => {
  let content = fs.readFileSync('./cypress/e2e/'+file, 'utf8');
  if (!content.includes('cy.screenshot')) {
    content = content.replace(/(\s*)(}\);?\s*\}\);\s*)$/, '$1  cy.screenshot("' + file.replace('.cy.js', '-success') + '");$1$2');
    fs.writeFileSync('./cypress/e2e/'+file, content);
  }
});
