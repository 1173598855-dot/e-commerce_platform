const fs = require('fs');
const p = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
const arr = fs.readFileSync(p, 'utf8').split('\n');
const fixed = arr[71].replace(/\$\('.*'\)/, '${
'
订单金额: ¥
'
}');
arr[71] = fixed;
fs.writeFileSync(p, arr.join('\n'), 'utf8');
console.log('Line 72:', arr[71]);
