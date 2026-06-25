import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryApi, productApi } from '../api';

export default function CategoryScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.getList();
      setCategories(res.data || []);
      if (res.data?.length > 0) {
        setSelectedCat(res.data[0]);
        loadProducts(res.data[0].id);
      }
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  };

  const loadProducts = async (catId) => {
    try {
      const res = await productApi.getList({ categoryId: catId, pageSize: 50 });
      setProducts(res.data?.list || []);
    } catch (err) {
      console.error('加载商品失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* 左侧分类列表 */}
      <View style={styles.leftPanel}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catBtn, selectedCat?.id === item.id && styles.catBtnActive]}
              onPress={() => {
                setSelectedCat(item);
                loadProducts(item.id);
              }}
            >
              <Text style={[styles.catBtnText, selectedCat?.id === item.id && styles.catBtnTextActive]}>
                {item.icon} {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </View>

      {/* 右侧商品列表 */}
      <View style={styles.rightPanel}>
        <Text style={styles.panelTitle}>{selectedCat?.icon} {selectedCat?.name}</Text>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
            >
              <View style={styles.cardImage}>
                <Text style={styles.imgPlaceholder}>📷</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.cardPrice}>¥{item.price}</Text>
              <Text style={styles.cardSales}>已售 {item.sales || 0}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无商品</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  leftPanel: { width: '28%', backgroundColor: '#f8f8f8', borderRightWidth: 1, borderColor: '#eee' },
  rightPanel: { flex: 1 },
  catBtn: { paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' },
  catBtnActive: { backgroundColor: '#fff', borderLeftWidth: 3, borderColor: '#ff6b35' },
  catBtnText: { fontSize: 14, color: '#666' },
  catBtnTextActive: { color: '#ff6b35', fontWeight: '600' },
  panelTitle: { fontSize: 16, fontWeight: '600', color: '#333', padding: 12, backgroundColor: '#fff' },
  productRow: { justifyContent: 'space-between', paddingHorizontal: 8 },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  cardImage: { width: '100%', height: 120, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  imgPlaceholder: { fontSize: 30 },
  cardTitle: { fontSize: 12, color: '#333', padding: 8, lineHeight: 16 },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: '#ff6b35', paddingHorizontal: 8, paddingBottom: 4 },
  cardSales: { fontSize: 11, color: '#999', paddingHorizontal: 8, paddingBottom: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#999' },
});
