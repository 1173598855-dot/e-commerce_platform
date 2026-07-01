var fs = require('fs');
// Fix settings.gradle
var p1 = 'C:/GitHub/E_commerce/frontend/android/settings.gradle';
var s1 = fs.readFileSync(p1, 'utf8');
if (s1.charCodeAt(0) === 0xFEFF) s1 = s1.slice(1);
console.log('settings.gradle:');
console.log(s1);
console.log('---');
// Fix build.gradle (root)
var p2 = 'C:/GitHub/E_commerce/frontend/android/build.gradle';
var s2 = fs.readFileSync(p2, 'utf8');
if (s2.charCodeAt(0) === 0xFEFF) s2 = s2.slice(1);
console.log('build.gradle:');
var lines2 = s2.split('\n');
for (var i = 0; i < lines2.length; i++) {
  if (lines2[i].indexOf('node_modules') !== -1 || lines2[i].indexOf('react-native') !== -1) {
    console.log('  L' + (i+1) + ': ' + lines2[i].trim());
  }
}