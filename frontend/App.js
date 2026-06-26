import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { authStore } from "./src/store/authStore";

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState("Login");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // 监听 token 过期，跳转登录页
    global.onTokenExpired = () => {
      authStore.logout();
      setInitialRoute("Login");
    };

    // 启动时恢复登录态
    authStore.hydrate().then(() => {
      const { isLoggedIn } = authStore.getState();
      setInitialRoute(isLoggedIn ? "Main" : "Login");
      setReady(true);
    });

    return () => { global.onTokenExpired = null; };
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <AppNavigator initialRoute={initialRoute} />
    </NavigationContainer>
  );
}
