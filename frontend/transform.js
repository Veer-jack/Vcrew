const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const code = fs.readFileSync('src/data/personaConfig.jsx', 'utf8');
const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

// We want to transform the return statement of functions like FoPersonal, FoCompany, etc.
// But wait, the file is currently broken with parsing errors!
// Babel CANNOT parse it if there are syntax errors!
