var fs = require('fs');
var bq = String.fromCharCode(96);
var dl = String.fromCharCode(36);
var lb = String.fromCharCode(123);
var zhe = '\u6298';

function fixLine(path, idx, newLine) {
  var s = fs.readFileSync(path, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  var arr = s.split('\n');
  arr[idx] = newLine;
  fs.writeFileSync(path, arr.join('\n'), 'utf8');
  console.log('OK ' + path.split('/').pop() + ' L' + (idx+1) + ': ' + arr[idx]);
}

fixLine('C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js', 59,
  '        ? ' + bq + dl + lb + 'item.discount_amount' + lb + zhe + bq);

fixLine('C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js', 44,
  '        ? ' + bq + dl + lb + 'item.discount_amount' + lb + zhe + bq);