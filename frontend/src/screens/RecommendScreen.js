import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from "react-native";
import { Ionicons } from "react-native-vector-icons";
import { aiApi } from "../api";

export default function RecommendScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const res = await aiApi.getRecommendations({ limit: 20 });
      setProducts(res.data || []);
    } catch (err) {
      console.error("Ƽʧ:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const handleProductClick = async (product) => {
    try {
      await aiApi.recordBehavior({
        action: "view",
        target_type: "product",
        target_id: product.id,
        duration: 30,
      });
    } catch (err) {
      // ignore
    }
    navigation.navigate("ProductDetail", { id: product.id });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={40} color="#ff6b35" />
        <Text style={styles.loadingText}>AIΪƼ...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id.toString()}
      numColumns={2}
      columnWrapperStyle={styles.row}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleProductClick(item)}>
          <View style={styles.image}>
            <Text style={styles.imgPlaceholder}>??</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.sales}> {item.sales}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>ƼƷ</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRecommendations}>
            <Text style={styles.refreshText}>ˢƼ</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loadingText: { fontSize: 14, color: "#999", marginTop: 12 },
  row: { justifyContent: "space-around", paddingHorizontal: 8 },
  card: { width: "48%", backgroundColor: "#fff", borderRadius: 8, overflow: "hidden", marginBottom: 10 },
  image: { width: "100%", height: 150, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  imgPlaceholder: { fontSize: 40 },
  name: { fontSize: 13, padding: 8, color: "#333" },
  price: { fontSize: 16, fontWeight: "bold", color: "#ff6b35", paddingHorizontal: 8 },
  sales: { fontSize: 12, color: "#999", paddingHorizontal: 8, paddingBottom: 8 },
  refreshBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#ff6b35", borderRadius: 20, marginTop: 10 },
  refreshText: { color: "#fff", fontSize: 14 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },
});

