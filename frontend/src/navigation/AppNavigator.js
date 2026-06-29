import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";

// Tab Screens
import HomeScreen from "../screens/HomeScreen";
import CategoryScreen from "../screens/CategoryScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Stack Screens
import LoginScreen from "../screens/LoginScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import OrderCreateScreen from "../screens/OrderCreateScreen";
import OrderListScreen from "../screens/OrderListScreen";
import PaymentScreen from "../screens/PaymentScreen";
import SearchScreen from "../screens/SearchScreen";
import RecommendScreen from "../screens/RecommendScreen";
import AiChatScreen from "../screens/AiChatScreen";
import DataDashboardScreen from "../screens/DataDashboardScreen";
import ReviewScreen from "../screens/ReviewScreen";
import ReviewListScreen from "../screens/ReviewListScreen";
import FavoriteScreen from "../screens/FavoriteScreen";
import AddressScreen from "../screens/AddressScreen";
import CouponCenterScreen from "../screens/CouponCenterScreen";
import CouponScreen from "../screens/CouponScreen";
import PointsScreen from "../screens/PointsScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ChatScreen from "../screens/ChatScreen";
import MerchantScreen from "../screens/MerchantScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Category") iconName = focused ? "grid" : "grid-outline";
          else if (route.name === "Cart") iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#ff6b35",
        tabBarInactiveTintColor: "#999",
        headerShown: false,
        tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 56 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "\u9996\u9875" }} />
      <Tab.Screen name="Category" component={CategoryScreen} options={{ tabBarLabel: "\u5206\u7c7b" }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: "\u8d2d\u7269\u8f66" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "\u6211\u7684" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRoute }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#ff6b35" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      {initialRoute === "Login" ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "\u5546\u54c1\u8be6\u60c5" }} />
          <Stack.Screen name="OrderCreate" component={OrderCreateScreen} options={{ title: "\u786e\u8ba4\u8ba2\u5355" }} />
          <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: "\u6211\u7684\u8ba2\u5355" }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "\u6a21\u62df\u652f\u4ed8" }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: "\u641c\u7d22" }} />
          <Stack.Screen name="Recommend" component={RecommendScreen} options={{ title: "\u731c\u4f60\u559c\u6b22" }} />
          <Stack.Screen name="AiChat" component={AiChatScreen} options={{ title: "AI\u5ba2\u670d" }} />
          <Stack.Screen name="DataDashboard" component={DataDashboardScreen} options={{ title: "\u6570\u636e\u770b\u677f" }} />
          <Stack.Screen name="Reviews" component={ReviewListScreen} options={{ title: "\u5546\u54c1\u8bc4\u4ef7" }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "\u5199\u8bc4\u4ef7" }} />
          <Stack.Screen name="Favorites" component={FavoriteScreen} options={{ title: "\u6211\u7684\u6536\u85cf" }} />
          <Stack.Screen name="Addresses" component={AddressScreen} options={{ title: "\u6536\u8d27\u5730\u5740" }} />
          <Stack.Screen name="Coupons" component={CouponCenterScreen} options={{ title: "\u9886\u5238\u4e2d\u5fc3" }} />
          <Stack.Screen name="MyCoupons" component={CouponScreen} options={{ title: "\u6211\u7684\u4f18\u60e0\u5238" }} />
          <Stack.Screen name="Points" component={PointsScreen} options={{ title: "\u79ef\u5206\u4e2d\u5fc3" }} />
          <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: "\u6d88\u606f\u901a\u77e5" }} />
          <Stack.Screen name="ChatRoom" component={ChatScreen} options={{ title: "\u804a\u5929" }} />
          <Stack.Screen name="Merchant" component={MerchantScreen} options={{ title: "\u5546\u5bb6\u540e\u53f0" }} />
        </>
      )}
    </Stack.Navigator>
  );
}