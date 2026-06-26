var fs = require('fs');

// settings.gradle: 改回 ../node_modules (相对于 android/)
var p1 = 'C:/GitHub/E_commerce/frontend/android/settings.gradle';
var s1 = fs.readFileSync(p1, 'utf8');
if (s1.charCodeAt(0) === 0xFEFF) s1 = s1.slice(1);
s1 = s1.split('../../node_modules').join('../node_modules');
fs.writeFileSync(p1, s1, 'utf8');

// app/build.gradle: 改回 ../node_modules (相对于 android/app/ -> android/ -> 但 native_modules.gradle 需要从项目根找)
// 实际上 RN 的标准结构是 android/ 作为子目录，node_modules 在 android 的上一级
// 从 android/app/ 出发 ../../node_modules = frontend/node_modules - 正确
// 但从 android/ settings.gradle 出发 ../node_modules = frontend/node_modules - 也正确
// 错误说找不到 android/node_modules，说明 gradlew 实际运行目录不是 android/ 而是更上层
console.log('Reverted settings.gradle');
var lines = s1.split('\n');
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('node_modules') !== -1) console.log('  settings L' + (i+1) + ': ' + lines[i].trim());
}

// 也检查 app/build.gradle
var p2 = 'C:/GitHub/E_commerce/frontend/android/app/build.gradle';
var s2 = fs.readFileSync(p2, 'utf8');
if (s2.charCodeAt(0) === 0xFEFF) s2 = s2.slice(1);
var lines2 = s2.split('\n');
for (var i = 0; i < lines2.length; i++) {
  if (lines2[i].indexOf('node_modules') !== -1) console.log('  app L' + (i+1) + ': ' + lines2[i].trim());
}