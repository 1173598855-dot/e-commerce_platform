var fs = require('fs');
// settings.gradle: ../node_modules -> 应该也对，因为相对于 android/
// 但如果 gradlew 从 android/ 运行，../node_modules/ 就是 frontend/node_modules/ - 正确
// 看看错误具体路径
// 错误说的是 android/node_modules/，说明 settings.gradle 的 ../ 被解析为 android/
// 实际上 settings.gradle 的 file() 是相对于 settings.gradle 所在目录即 android/
// 所以 ../node_modules/ 应该是 frontend/node_modules/ - 正确
// 但 app/build.gradle 的 file() 是相对于 app/build.gradle 即 android/app/
// 所以 ../../node_modules/ 才是 frontend/node_modules/ - 刚刚已修复
// 再检查 gradle plugin 路径
var p1 = 'C:/GitHub/E_commerce/frontend/android/settings.gradle';
var s1 = fs.readFileSync(p1, 'utf8');
if (s1.charCodeAt(0) === 0xFEFF) s1 = s1.slice(1);
var old = '../node_modules/@react-native/gradle-plugin';
var nw = '../../node_modules/@react-native/gradle-plugin';
s1 = s1.split(old).join(nw);
fs.writeFileSync(p1, s1, 'utf8');
console.log('Fixed settings.gradle');
var lines = s1.split('\n');
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('node_modules') !== -1 || lines[i].indexOf('gradle-plugin') !== -1) {
    console.log('  L' + (i+1) + ': ' + lines[i].trim());
  }
}