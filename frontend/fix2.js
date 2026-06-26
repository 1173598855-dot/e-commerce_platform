const fs = require('fs');
const f = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(
  "Alert.alert('\u4e0b\u5355\u6210\u529f', \, [",
  "Alert.alert('\u4e0b\u5355\u6210\u529f', \u8ba2\u5355\u91d1\u989d: \u00a5\, ["
);
fs.writeFileSync(f, c, 'utf8');
const lines = c.split('\n');
console.log('Line 72:', lines[71]);