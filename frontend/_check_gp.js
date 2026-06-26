var fs = require('fs');
var gp = 'C:/GitHub/E_commerce/frontend/android/gradle.properties';
var s = fs.readFileSync(gp, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
console.log('gradle.properties:');
console.log(s);