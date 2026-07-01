import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from "react-native";
import { Ionicons } from "react-native-vector-icons";
import { api } from "../api";

export default function VideoFeedScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const res = await api.get("/videos");
      setVideos(res.data?.list || []);
    } catch (err) {
      console.error("ضƵʧ:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const handleLike = async (videoId) => {
    try {
      await api.post("/videos/like", { videoId });
      loadVideos();
    } catch (err) {
      // ignore
    }
  };

  const renderVideo = ({ item }) => (
    <View style={styles.videoCard}>
      {/* Ƶ */}
      <View style={styles.videoCover}>
        <Text style={styles.videoPlaceholder}>??</Text>
      </View>

      {/* Ҳť */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
          <Ionicons name="heart" size={28} color="#ff4444" />
          <Text style={styles.actionText}>{item.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{item.comments_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{item.shares_count || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* ײϢ */}
      <View style={styles.videoInfo}>
        <Text style={styles.authorName}>@{item.author_name || ""}</Text>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        {item.product_name && (
          <TouchableOpacity style={styles.productLink} onPress={() => navigation.navigate("ProductDetail", { id: item.product_id })}>
            <Ionicons name="shopping-bag" size={14} color="#ff6b35" />
            <Text style={styles.productName}>{item.product_name} {item.price}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderVideo}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="videocam-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>޶Ƶ</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoCard: { height: 500, backgroundColor: "#111", borderRadius: 12, marginVertical: 8, overflow: "hidden", position: "relative" },
  videoCover: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#222" },
  videoPlaceholder: { fontSize: 60 },
  actionBar: { position: "absolute", right: 12, bottom: 100, alignItems: "center" },
  actionBtn: { alignItems: "center", marginBottom: 20 },
  actionText: { color: "#fff", fontSize: 12, marginTop: 4 },
  videoInfo: { position: "absolute", bottom: 0, left: 0, right: 60, padding: 16, backgroundColor: "rgba(0,0,0,0.3)" },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  videoTitle: { color: "#fff", fontSize: 14, marginTop: 6, lineHeight: 20 },
  productLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  productName: { color: "#ff6b35", fontSize: 13 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },
});

