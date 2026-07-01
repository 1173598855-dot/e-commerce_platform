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
import RefundEvidenceScreen from "../screens/RefundEvidenceScreen";
import MerchantRefundReviewScreen from "../screens/MerchantRefundReviewScreen";
import PermissionManagementScreen from "../screens/PermissionManagementScreen";
import ShippingManagementScreen from "../screens/ShippingManagementScreen";
import OperationsCenterScreen from "../screens/OperationsCenterScreen";
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "首页" }} />
      <Tab.Screen name="Category" component={CategoryScreen} options={{ tabBarLabel: "分类" }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: "购物车" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "我的" }} />
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
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "商品详情" }} />
          <Stack.Screen name="OrderCreate" component={OrderCreateScreen} options={{ title: "确认订单" }} />
          <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: "我的订单" }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "模拟支付" }} />
          <Stack.Screen name="RefundEvidence" component={RefundEvidenceScreen} options={{ title: "售后举证" }} />
          <Stack.Screen name="MerchantRefundReview" component={MerchantRefundReviewScreen} options={{ title: "售后审核" }} />
          <Stack.Screen name="PermissionManagement" component={PermissionManagementScreen} options={{ title: "Permission Management" }} />
          <Stack.Screen name="ShippingManagement" component={ShippingManagementScreen} options={{ title: "Shipping Management" }} />
          <Stack.Screen name="OperationsCenter" component={OperationsCenterScreen} options={{ title: "Operations Center" }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: "搜索" }} />
          <Stack.Screen name="Recommend" component={RecommendScreen} options={{ title: "猜你喜欢" }} />
          <Stack.Screen name="AiChat" component={AiChatScreen} options={{ title: "AI客服" }} />
          <Stack.Screen name="DataDashboard" component={DataDashboardScreen} options={{ title: "数据看板" }} />
          <Stack.Screen name="Reviews" component={ReviewListScreen} options={{ title: "商品评价" }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "写评价" }} />
          <Stack.Screen name="Favorites" component={FavoriteScreen} options={{ title: "我的收藏" }} />
          <Stack.Screen name="Addresses" component={AddressScreen} options={{ title: "收货地址" }} />
          <Stack.Screen name="Coupons" component={CouponCenterScreen} options={{ title: "领券中心" }} />
          <Stack.Screen name="MyCoupons" component={CouponScreen} options={{ title: "我的优惠券" }} />
          <Stack.Screen name="Points" component={PointsScreen} options={{ title: "积分中心" }} />
          <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: "消息通知" }} />
          <Stack.Screen name="ChatRoom" component={ChatScreen} options={{ title: "聊天" }} />
          <Stack.Screen name="Merchant" component={MerchantScreen} options={{ title: "商家后台" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
