/**
 * 应用导航配置
 * 底部标签导航 + 堆栈导航
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Platform, StatusBar } from 'react-native';

import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme';

// 屏幕组件 (延迟导入以实现代码分割)
const HomeScreen = React.lazy(() => import('../screens/HomeScreen'));
const CategoryScreen = React.lazy(() => import('../screens/CategoryScreen'));
const CartScreen = React.lazy(() => import('../screens/CartScreen'));
const OrderScreen = React.lazy(() => import('../screens/OrderScreen'));
const ProfileScreen = React.lazy(() => import('../screens/ProfileScreen'));
const LoginScreen = React.lazy(() => import('../screens/LoginScreen'));
const ProductDetailScreen = React.lazy(() => import('../screens/ProductDetailScreen'));
const SearchScreen = React.lazy(() => import('../screens/SearchScreen'));

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  ProductDetail: { productId: string };
  Search: { keyword?: string };
  // 其他页面
};

export type MainTabParamList = {
  Home: undefined;
  Category: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 底部标签导航
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Category':
              iconName = 'th-large';
              break;
            case 'Cart':
              iconName = 'shopping-cart';
              break;
            case 'Orders':
              iconName = 'file-invoice';
              break;
            case 'Profile':
              iconName = 'user';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          backgroundColor: theme.colors.white,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: '首页' }}
      />
      <Tab.Screen 
        name="Category" 
        component={CategoryScreen} 
        options={{ tabBarLabel: '分类' }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ tabBarLabel: '购物车' }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrderScreen} 
        options={{ tabBarLabel: '订单' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: '我的' }}
      />
    </Tab.Navigator>
  );
};

// 主应用导航
const AppNavigator: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  React.useEffect(() => {
    checkAuth();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.white}
      />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {isAuthenticated ? (
          // 已登录 - 主应用
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="ProductDetail" 
              component={ProductDetailScreen}
              options={{
                headerShown: true,
                headerTitle: '商品详情',
                headerBackTitle: '返回',
              }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                headerShown: true,
                headerTitle: '搜索',
              }}
            />
          </>
        ) : (
          // 未登录 - 登录页
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
