import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [initialRoute, setInitialRoute] = React.useState("Login");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const token = global.token;
    if (token) {
      // Try to validate token
      setInitialRoute("Main");
    } else {
      setInitialRoute("Login");
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer>
      <AppNavigator initialRoute={initialRoute} />
    </NavigationContainer>
  );
}
