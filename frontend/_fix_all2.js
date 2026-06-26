const fs = require('fs');
const path = require('path');

const dir = 'C:\\GitHub\\E_commerce\\frontend\\src\\screens';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

let totalFixed = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Remove BOM
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    
    // Remove ALL replacement characters
    content = content.split('\uFFFD').join('');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + file);
        totalFixed++;
    }
}

console.log('Total files fixed: ' + totalFixed);
