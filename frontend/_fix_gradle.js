var fs = require('fs');
var p = 'C:/GitHub/E_commerce/frontend/android/app/build.gradle';
var s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
var old = '../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle';
var nw = '../../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle';
s = s.split(old).join(nw);
fs.writeFileSync(p, s, 'utf8');
console.log('Fixed app/build.gradle');
var lines = s.split('\n');
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('native_modules') !== -1) console.log('  L' + (i+1) + ': ' + lines[i].trim());
}