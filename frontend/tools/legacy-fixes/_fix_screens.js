const fs = require('fs');
const path = require('path');

const screensDir = 'C:\\GitHub\\E_commerce\\frontend\\src\\screens';
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.js'));

let totalChanges = 0;

for (const file of files) {
    const filePath = path.join(screensDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Skip LoginScreen (we'll handle separately)
    if (file === 'LoginScreen.js') continue;
    
    // Fix common patterns:
    // res.data.list -> res.list
    // res.data?.list -> res?.list
    // res.data.pagination -> res.pagination
    // res.data -> res (but be careful not to double-replace)
    // hotRes.data -> hotRes
    // catRes.data -> catRes
    
    // Fix res.data.list / res.data.pagination etc. first (more specific)
    content = content.replace(/res\.data\.list/g, 'res.list');
    content = content.replace(/res\.data\.pagination/g, 'res.pagination');
    content = content.replace(/res\.data\?\./g, 'res?.');
    
    // Fix hotRes.data and catRes.data  
    content = content.replace(/hotRes\.data/g, 'hotRes');
    content = content.replace(/catRes\.data/g, 'catRes');
    
    // Fix res.data as a standalone (res.data || [], res.data.length, etc.)
    // Be careful: don't replace res.data inside strings or comments
    content = content.replace(/res\.data(\s*\|\|)/g, 'res$1');
    content = content.replace(/res\.data(\.length)/g, 'res$1');
    content = content.replace(/res\.data(\[)/g, 'res$1');
    content = content.replace(/res\.data(\))/g, 'res$1');
    content = content.replace(/res\.data(\s*;)/g, 'res$1');
    content = content.replace(/res\.data(\s*\n)/g, 'res$1');
    content = content.replace(/res\.data(\s*$)/gm, 'res$1');
    
    // Fix the destructured pattern: const { data } = await -> works fine since we return data.data
    // But check: setData(data) patterns are fine now
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + file);
        totalChanges++;
    }
}

console.log('Total files fixed: ' + totalChanges);
