const fs = require("fs");
const p = "C:/GitHub/E_commerce/frontend/src/screens/OrderCreateScreen.js";
let s = fs.readFileSync(p, "utf-8");
s = s.replace(/Alert.alert(.+闥律适数.++\.\n/, "      Alert.alert('\u4e0b\u535d\u6210\u5221', `\u8ba2\u5165\u91de: \u00a5${amount}`, [\n");
fs.writeFileSync(p, s, "utf-8");
console.log("Fixed");