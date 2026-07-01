const fs = require('fs');
const p = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Alert.alert') && lines[i].includes('\u00a5')) {
    lines[i] = "      Alert.alert('\u4e0b\u5355\u6210\u529f', "订单金额: ${"amount"}`, [";
    break;
  }
}
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Fixed line:', lines[71]);