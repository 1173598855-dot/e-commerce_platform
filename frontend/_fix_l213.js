var fs = require('fs');
var yen = String.fromCharCode(165);

// OrderCreateScreen line 213 (index 212)
var p = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
var s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
var arr = s.split('\n');
arr[212] = "            {submitting ? '\u63d0\u4ea4\u4e2d...' : '\u63d0\u4ea4\u8ba2\u5355 " + yen + "'}";
fs.writeFileSync(p, arr.join('\n'), 'utf8');
console.log('OK L213:', arr[212]);