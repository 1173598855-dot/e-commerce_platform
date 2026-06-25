import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "../api";
import { authStore } from "../store/authStore";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      global.userInfo = res.data;
    } catch (err) {
      console.error("加载用户信息失败:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出登录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: () => {
          global.token = null;
          global.userInfo = null;
          authStore.setState({ isLoggedIn: false, user: null, token: null });
          navigation.replace("Login");
        },
      },
    ]);
  };

  const orderTabs = [
    { name: "待付款", key: "pending", icon: "💰" },
    { name: "待发货", key: "paid", icon: "📦" },
    { name: "待收货", key: "shipped", icon: "🚚" },
    { name: "已完成", key: "completed", icon: "✅" },
    { name: "已取消", key: "cancelled", icon: "❌" },
  ];

  const myServices = [
    { name: "我的收藏", icon: "❤️", screen: "Favorites" },
    { name: "收货地址", icon: "📍", screen: "Addresses" },
    { name: "我的优惠券", icon: "🎫", screen: "MyCoupons" },
    { name: "积分中心", icon: "⭐", screen: "Points" },
    { name: "AI客服", icon: "🤖", screen: "AiChat" },
    { name: "消息通知", icon: "🔔", screen: "Notifications" },
    { name: "IM聊天", icon: "💬", screen: "ChatRoom" },
  ];

  const moreMenus = [
    { name: "数据看板", icon: "📊", screen: "DataDashboard" },
    { name: "关于我们", icon: "ℹ️", screen: null },
  ];

  return (
    <FlatList
      data={null}
      keyExtractor={(_, i) => String(i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={() => (
        <View>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.nickname?.charAt(0) || "👤"}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.nickname || "游客"}</Text>
              <Text style={styles.userPhone}>{user?.phone || "请登录"}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfile")}>
              <Ionicons name="pencil" size={14} color="#ff6b35" />
              <Text style={styles.editBtnText}>编辑</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickCard}>
            <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate("Coupons")}>
              <Text style={styles.quickIcon}>🎫</Text>
              <Text style={styles.quickLabel}>领券中心</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate("Points")}>
              <Text style={styles.quickIcon}>⭐</Text>
              <Text style={styles.quickLabel}>积分</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate("AiChat")}>
              <Text style={styles.quickIcon}>🤖</Text>
              <Text style={styles.quickLabel}>AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate("Recommend")}>
              <Text style={styles.quickIcon}>🎯</Text>
              <Text style={styles.quickLabel}>推荐</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.orderCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>我的订单</Text>
              <TouchableOpacity onPress={() => navigation.navigate("OrderList")}>
                <Text style={styles.seeMore}>全部订单 ›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.orderTabList}>
              {orderTabs.map((item) => (
                <TouchableOpacity key={item.key} style={styles.orderTab} onPress={() => navigation.navigate("OrderList", { status: item.key })}>
                  <Text style={styles.orderTabIcon}>{item.icon}</Text>
                  <Text style={styles.orderTabText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>我的服务</Text>
            {myServices.map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItem} onPress={() => { if (item.screen) navigation.navigate(item.screen); }}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>更多</Text>
            {moreMenus.map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItem} onPress={() => { if (item.screen) navigation.navigate(item.screen); }}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      renderItem={() => null}
      ListFooterComponent={() => (
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>退出登录</Text>
          </TouchableOpacity>
          <Text style={styles.version}>好物商城 v1.0.0</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: "#fff", marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ff6b35", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, color: "#fff", fontWeight: "bold" },
  userInfo: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 18, fontWeight: "600", color: "#333" },
  userPhone: { fontSize: 13, color: "#999", marginTop: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#ff6b35", borderRadius: 16 },
  editBtnText: { color: "#ff6b35", fontSize: 12 },
  quickCard: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 12, marginBottom: 8, justifyContent: "space-around" },
  quickItem: { alignItems: "center" },
  quickIcon: { fontSize: 24, marginBottom: 4 },
  quickLabel: { fontSize: 12, color: "#666" },
  orderCard: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  seeMore: { fontSize: 13, color: "#999" },
  orderTabList: { flexDirection: "row", justifyContent: "space-around" },
  orderTab: { alignItems: "center", minWidth: 56 },
  orderTabIcon: { fontSize: 24, marginBottom: 4 },
  orderTabText: { fontSize: 11, color: "#666" },
  menuCard: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuText: { flex: 1, fontSize: 15, color: "#333" },
  logoutSection: { backgroundColor: "#fff", padding: 16 },
  logoutBtn: { paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: "#ff4444", alignItems: "center" },
  logoutText: { color: "#ff4444", fontSize: 15 },
  version: { textAlign: "center", fontSize: 12, color: "#ccc", marginTop: 16 },
});

