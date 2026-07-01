const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const screensDir = 'C:\\GitHub\\E_commerce\\frontend\\src\\screens';

function tryBundle() {
    try {
        execSync('node node_modules/react-native/local-cli/cli.js bundle --platform android --dev false --entry-file index.js --bundle-output /dev/null --assets-dest /dev/null', 
            { cwd: 'C:\\GitHub\\E_commerce\\frontend', encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
        return null;
    } catch (e) {
        const match = e.stderr.match(/SyntaxError: (.*?): Unexpected/);
        if (match) return match[1];
        return null;
    }
}

let file;
let attempts = 0;
while ((file = tryBundle()) && attempts < 30) {
    attempts++;
    console.log(`Fix #${attempts}: ${file}`);
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Fix common issues:
    // 1. гд symbol outside strings - replace with regular char
    // 2. Missing backticks in template literals
    // 3. Unicode BOM
    
    // Remove BOM
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    
    // Fix template literal issues: {${var} text} should be {`${var} text`}
    content = content.replace(/\{(\$\{[^}]+\}[^}]*)\}/g, (match, inner) => {
        if (inner.includes('`')) return match;
        return '{`' + inner + '`}';
    });
    
    // Fix гд signs that appear outside of string context
    // These are likely encoding artifacts - replace with Y
    content = content.replace(/гд/g, '\\u00a5');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
    } else {
        console.log(`Cannot auto-fix: ${file}`);
        break;
    }
}
console.log(`Done. Fixed ${attempts} files.`);
