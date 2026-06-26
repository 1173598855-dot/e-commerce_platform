const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const screensDir = 'C:\\GitHub\\E_commerce\\frontend\\src\\screens';
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

for (const file of files) {
    const filePath = path.join(screensDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Remove BOM
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    
    // Replace гд (fullwidth yen) that appear outside of strings
    // Inside single/double/template strings it's fine
    // Outside strings: it causes SyntaxError
    // Pattern: replace гд with Y when it appears as a bare character
    content = content.replace(/\u00a5/g, 'Y');
    content = content.replace(/\uffe5/g, 'Y'); // fullwidth yuan sign
    
    // Replace other problematic Unicode chars outside strings
    // Check for other common encoding artifacts
    content = content.replace(/\u2018|\u2019/g, "'"); // smart quotes -> regular
    content = content.replace(/\u201c|\u201d/g, '"'); // smart double quotes
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + file);
        totalFixed++;
    }
}

console.log('Total files fixed: ' + totalFixed);
