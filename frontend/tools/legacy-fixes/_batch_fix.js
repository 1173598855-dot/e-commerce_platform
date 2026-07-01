// Fix CouponScreen.js line 60
var fs = require('fs');
function fixFile(path, oldStr, newStr) {
  var s = fs.readFileSync(path, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.split(oldStr).join(newStr);
  fs.writeFileSync(path, s, 'utf8');
  console.log('Fixed: ' + path.split('/').pop());
}
// CouponScreen.js
fixFile('C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js',
  '? ?',
  '? ' + String.fromCharCode(96) + '?' + String.fromCharCode(96));
// CouponCenterScreen.js
fixFile('C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js',
  '? ?',
  '? ' + String.fromCharCode(96) + '?' + String.fromCharCode(96));
// Also fix the trailing backtick issue
fixFile('C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js',
  String.fromCharCode(96) + String.fromCharCode(96),
  String.fromCharCode(96));
fixFile('C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js',
  String.fromCharCode(96) + String.fromCharCode(96),
  String.fromCharCode(96));
// OrderCreateScreen.js
var p = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
var s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
var lines = s.split('\n');
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('Alert.alert') !== -1 && lines[i].indexOf('\u00a5') !== -1) {
    var bq = String.fromCharCode(96);
    lines[i] = "      Alert.alert('\u4e0b\u5355\u6210\u529f', " + bq + "\u8ba2\u5355\u91d1\u989d: \u00a5" + bq + ", [";
    break;
  }
}
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Fixed: OrderCreateScreen.js');