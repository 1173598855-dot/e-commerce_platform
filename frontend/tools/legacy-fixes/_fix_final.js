var fs = require('fs');
function readFile(path) {
  var s = fs.readFileSync(path, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  return s;
}
function writeFile(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

// CouponScreen.js - replace the broken line
var p1 = 'C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js';
var s1 = readFile(p1);
var lines1 = s1.split('\n');
// Line 60 (index 59)
var bq = String.fromCharCode(96);  // backtick
lines1[59] = '        ? ' + bq + '?' + bq;
writeFile(p1, lines1.join('\n'));
console.log('CouponScreen L60:', lines1[59].trim());

// CouponCenterScreen.js
var p2 = 'C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js';
var s2 = readFile(p2);
var lines2 = s2.split('\n');
lines2[44] = '        ? ' + bq + '?' + bq;
writeFile(p2, lines2.join('\n'));
console.log('CouponCenterScreen L45:', lines2[44].trim());

// OrderCreateScreen.js
var p3 = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
var s3 = readFile(p3);
var lines3 = s3.split('\n');
// Find the Alert.alert line with yen symbol
for (var i = 0; i < lines3.length; i++) {
  if (lines3[i].indexOf('Alert.alert') !== -1 && lines3[i].indexOf('\u00a5') !== -1) {
    lines3[i] = "      Alert.alert('\u4e0b\u5355\u6210\u529f', " + bq + "\u8ba2\u5355\u91d1\u989d: \u00a5" + bq + ", [";
    break;
  }
}
writeFile(p3, lines3.join('\n'));
// verify
for (var j = 0; j < lines3.length; j++) {
  if (lines3[j].indexOf('Alert.alert') !== -1 && lines3[j].indexOf('\u00a5') !== -1) {
    console.log('OrderCreateScreen L' + (j+1) + ':', lines3[j].trim());
    break;
  }
}