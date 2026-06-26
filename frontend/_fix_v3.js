var fs = require('fs');
function rp(path, idx, line) {
  var s = fs.readFileSync(path, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  var arr = s.split('\n');
  arr[idx] = line;
  fs.writeFileSync(path, arr.join('\n'), 'utf8');
  console.log(path.split('/').pop() + ' L' + (idx+1) + ': ' + arr[idx].trim());
}
var dq = '$' + '{';  // ?' + bq);

// CouponCenterScreen.js line 45 (index 44)
rp('C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js', 44,
  '        ? ' + bq + dq + 'item.discount_amount}?' + bq);

// OrderCreateScreen.js - find and fix
var p3 = 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js';
var s3 = fs.readFileSync(p3, 'utf8');
if (s3.charCodeAt(0) === 0xFEFF) s3 = s3.slice(1);
var arr3 = s3.split('\n');
for (var i = 0; i < arr3.length; i++) {
  if (arr3[i].indexOf('Alert.alert') !== -1 && arr3[i].indexOf('\u00a5') !== -1) {
    arr3[i] = "      Alert.alert('\u4e0b\u5355\u6210\u529f', " + bq + "\u8ba2\u5355\u91d1\u989d: \u00a5" + dq + "amount}" + bq + ", [";
    break;
  }
}
fs.writeFileSync(p3, arr3.join('\n'), 'utf8');
for (var j = 0; j < arr3.length; j++) {
  if (arr3[j].indexOf('Alert.alert') !== -1 && arr3[j].indexOf('\u00a5') !== -1) {
    console.log('OrderCreateScreen L' + (j+1) + ': ' + arr3[j].trim());
    break;
  }
}