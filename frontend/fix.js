const fs = require('fs');
const f = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
let c = fs.readFileSync(f, 'utf8');
const newLine = "      Alert.alert('\u4e0b\u5355\u6210\u529f', `\u8ba2\u5355\u91d1\u989d: \u00a5${amount}`, [\n";
c = c.replace(/.*\u8ba2\u5355\u91d1\u989d.*\n/m, newLine);
fs.writeFileSync(f, c, 'utf8');
const lines = fs.readFileSync(f, 'utf8').split('\n');
console.log('Line 72:', lines[71]);