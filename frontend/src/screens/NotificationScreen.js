import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from "react-native";
import { Ionicons } from "react-native-vector-icons";
import { notificationApi } from "../api";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationApi.getList({ page: 1, pageSize: 50 });
      setNotifications(res.data?.list || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error("֪ͨʧ:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      loadNotifications();
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "order": return "receipt";
      case "system": return "information-circle";
      case "promotion": return "megaphone";
      case "message": return "chatbubbles";
      default: return "notifications";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "order": return "#2196f3";
      case "system": return "#9c27b0";
      case "promotion": return "#ff6b35";
      case "message": return "#4caf50";
      default: return "#666";
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.is_read && styles.unreadCard]}
      onPress={() => !item.is_read && handleMarkRead(item.id)}
    >
      <View style={[styles.notifIcon, { backgroundColor: getTypeColor(item.type) + "20" }]}>
        <Ionicons name={getTypeIcon(item.type)} size={20} color={getTypeColor(item.type)} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifText} numberOfLines={2}>{item.content}</Text>
        <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ϣ֪ͨ</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllRead}>ȫΪѶ ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderNotification}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>֪ͨ</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  markAllRead: { fontSize: 13, color: "#ff6b35" },
  notifCard: { flexDirection: "row", backgroundColor: "#fff", padding: 14, marginBottom: 1, alignItems: "center" },
  unreadCard: { backgroundColor: "#fffaf7" },
  notifIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff6b35" },
  notifText: { fontSize: 13, color: "#666", marginTop: 4, lineHeight: 18 },
  notifTime: { fontSize: 11, color: "#ccc", marginTop: 6 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },
});

