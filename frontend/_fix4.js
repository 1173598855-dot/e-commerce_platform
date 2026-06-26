const fs = require('fs');
const p = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
const arr = fs.readFileSync(p, 'utf8').split('\n');
arr[71] = "     Alert.alert('\u4e0b\u535d\u6210\u5221', `\u8ba2\u5165\u91de: \u00a5${amount}`, [\n";
fs.writeFileSync(p, arr.join('\n'), 'utf8');
console.log('Done');
