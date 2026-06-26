var fs = require('fs');
var bq = String.fromCharCode(96);
var dl = String.fromCharCode(36);
var lb = String.fromCharCode(123);

function fixLine(path, idx, newLine) {
  var s = fs.readFileSync(path, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  var arr = s.split('\n');
  arr[idx] = newLine;
  fs.writeFileSync(path, arr.join('\n'), 'utf8');
  console.log('OK ' + path.split('/').pop() + ' L' + (idx+1) + ': ' + arr[idx]);
}

// CouponScreen L60 (index 59)
fixLine('C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js', 59,
  '        ? ' + bq + dl + lb + 'item.discount_amount}?' + bq);

// CouponCenterScreen L45 (index 44)
fixLine('C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js', 44,
  '        ? ' + bq + dl + lb + 'item.discount_amount}?' + bq);

// OrderCreateScreen - find and fix
var p3 = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
var s3 = fs.readFileSync(p3, 'utf8');
if (s3.charCodeAt(0) === 0xFEFF) s3 = s3.slice(1);
var a3 = s3.split('\n');
var yen = String.fromCharCode(165);
for (var i = 0; i < a3.length; i++) {
  if (a3[i].indexOf('Alert.alert') !== -1 && a3[i].indexOf(yen) !== -1) {
    var fixed = '      Alert.alert(' + String.fromCharCode(39) + '\u4e0b\u5355\u6210\u529f' + String.fromCharCode(39) + ', ';
    fixed += bq + '\u8ba2\u5355\u91d1\u989d: ' + yen + dl + lb + 'amount}' + bq;
    fixed += ', [';
    a3[i] = fixed;
    break;
  }
}
fs.writeFileSync(p3, a3.join('\n'), 'utf8');
for (var j = 0; j < a3.length; j++) {
  if (a3[j].indexOf('Alert.alert') !== -1 && a3[j].indexOf(yen) !== -1) {
    console.log('OK OrderCreateScreen L' + (j+1) + ': ' + a3[j]);
    break;
  }
}