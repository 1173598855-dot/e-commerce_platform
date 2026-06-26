var fs = require('fs');
var data = {
  couponScreen: { path: 'C:/GitHub/E_commerce/frontend/src/screens/CouponScreen.js', idx: 59 },
  couponCenter: { path: 'C:/GitHub/E_commerce/frontend/src/screens/CouponCenterScreen.js', idx: 44 },
  orderCreate: { path: 'C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js' }
};
fs.writeFileSync('C:/GitHub/E_commerce/frontend/_data.json', JSON.stringify(data), 'utf8');
console.log('JSON created');