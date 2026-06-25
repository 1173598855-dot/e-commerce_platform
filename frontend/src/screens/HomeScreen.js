import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productApi, categoryApi } from '../api';

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [hotProducts, setHotProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hotRes, catRes] = await Promise.all([
        productApi.getHot(),
        categoryApi.getList(),
      ]);
      setHotProducts(hotRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('加载首页数据失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      navigation.navigate('Search', { keyword: searchKeyword.trim() });
    }
  };

  const quickNav = [
    { name: '秒杀', icon: '⚡', screen: null },
    { name: '优惠券', icon: '🎫', screen: null },
    { name: '新品', icon: '✨', screen: null },
    { name: '品牌', icon: '🏷️', screen: null },
    { name: 'AI推荐', icon: '🤖', screen: 'Recommend' },
    { name: 'AI客服', icon: '💬', screen: 'AiChat' }, { name: '领券', icon: '🎫', screen: 'Coupons' },
  ];

  return (
    <View style={styles.container}>
      {/* 顶部搜索栏 */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索商品、品牌"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={styles.scanBtn}>
          <Ionicons name="scan" size={22} color="#ff6b35" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={hotProducts}
        keyExtractor={(item) => item?.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <View>
            {/* 金刚区 */}
            <View style={styles.quickNav}>
              {quickNav.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.navItem}
                  onPress={() => {
                    if (item.screen) navigation.navigate(item.screen);
                  }}
                >
                  <View style={styles.navIcon}>
                    <Text style={styles.navIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.navText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 分类入口 */}
            {categories.length > 0 && (
              <View style={styles.catSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>商品分类</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Category')}>
                    <Text style={styles.seeMore}>更多 ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.catGrid}>
                  {categories.slice(0, 8).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.catItem}
                      onPress={() => navigation.navigate('Category')}
                    >
                      <Text style={styles.catIcon}>{cat.icon || '📦'}</Text>
                      <Text style={styles.catName}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
        )}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
      />
    </View>
  );
}

function ProductCard({ product, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardImage}>
        <Text style={styles.imgPlaceholder}>📷</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{product.name}</Text>
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>¥{product.price}</Text>
          {product.original_price && (
            <Text style={styles.cardOriginal}>¥{product.original_price}</Text>
          )}
        </View>
        <View style={styles.cardSales}>
          <Text style={styles.salesText}>已售 {product.sales || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff' },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  scanBtn: { padding: 8 },
  quickNav: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', paddingVertical: 8 },
  navItem: { width: '16.66%', alignItems: 'center', paddingVertical: 6 },
  navIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff3ed', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  navIconText: { fontSize: 24 },
  navText: { fontSize: 11, color: '#666' },
  catSection: { backgroundColor: '#fff', marginBottom: 8, padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  seeMore: { fontSize: 13, color: '#999' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catItem: { width: '25%', alignItems: 'center', paddingVertical: 8 },
  catIcon: { fontSize: 28, marginBottom: 4 },
  catName: { fontSize: 12, color: '#666' },
  productRow: { justifyContent: 'space-between', paddingHorizontal: 8 },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  cardImage: { width: '100%', height: 160, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  imgPlaceholder: { fontSize: 40 },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 6 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  cardPrice: { fontSize: 17, fontWeight: 'bold', color: '#ff6b35' },
  cardOriginal: { fontSize: 12, color: '#999', textDecorationLine: 'line-through', marginLeft: 6 },
  cardSales: { marginTop: 4 },
  salesText: { fontSize: 11, color: '#999' },
});
