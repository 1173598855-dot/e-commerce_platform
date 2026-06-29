/**
 * 首页
 * 包含：轮播图、热门商品、分类入口、推荐商品
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { theme } from '../theme';
import { Product } from '../types';

const { width } = Dimensions.get('window');

// 轮播图数据
const banners = [
  { id: '1', image: 'https://via.placeholder.com/750x300' },
  { id: '2', image: 'https://via.placeholder.com/750x300' },
  { id: '3', image: 'https://via.placeholder.com/750x300' },
];

// 分类数据
const categories = [
  { id: '1', name: '手机数码', icon: 'mobile-alt' },
  { id: '2', name: '电脑办公', icon: 'laptop' },
  { id: '3', name: '家用电器', icon: 'tv' },
  { id: '4', name: '服装鞋包', icon: 'tshirt' },
  { id: '5', name: '食品生鲜', icon: 'utensils' },
  { id: '6', name: '美妆护肤', icon: 'spa' },
  { id: '7', name: '母婴玩具', icon: 'baby' },
  { id: '8', name: '更多', icon: 'ellipsis-h' },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载商品数据
  const loadProducts = async (pageNum: number, isRefresh = false) => {
    if (!hasMore && !isRefresh) return;

    try {
      const data = await api.get<{ list: Product[]; total: number }>('/api/products', {
        params: { page: pageNum, pageSize: 20 },
      });

      if (isRefresh) {
        setProducts(data.list);
      } else {
        setProducts((prev) => [...prev, ...data.list]);
      }

      setHasMore(data.list.length > 0);
      setPage(pageNum + 1);
    } catch (error) {
      console.error('加载商品失败', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts(1, true);
  }, []);

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadProducts(1, true);
  };

  // 上拉加载更多
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadProducts(page);
    }
  };

  // 轮播图
  const renderBanner = () => (
    <View style={styles.bannerContainer}>
      <FlatList
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.image }} style={styles.bannerImage} />
        )}
      />
    </View>
  );

  // 分类入口
  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <FlatList
        data={categories}
        numColumns={4}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => navigation.navigate('Category', { categoryId: item.id })}
          >
            <View style={styles.categoryIcon}>
              <Icon name={item.icon} size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  // 商品卡片
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>¥{item.price}</Text>
          {item.originalPrice && (
            <Text style={styles.productOriginalPrice}>¥{item.originalPrice}</Text>
          )}
        </View>
        <View style={styles.productMeta}>
          <Text style={styles.productSales}>{item.sales || 0}人付款</Text>
          <Text style={styles.productLocation}>{item.location || '未知'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.productRow}
      ListHeaderComponent={
        <>
          {renderBanner()}
          {renderCategories()}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>推荐商品</Text>
          </View>
        </>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loading ? <ActivityIndicator style={styles.footerLoading} /> : null
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    marginBottom: 12,
  },
  bannerImage: {
    width: width,
    height: 200,
    resizeMode: 'cover',
  },
  categoriesContainer: {
    backgroundColor: theme.colors.white,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 16,
    width: width / 4,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: theme.colors.text,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  productCard: {
    width: (width - 24) / 2,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: (width - 24) / 2,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    height: 40,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginRight: 8,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: theme.colors.gray,
    textDecorationLine: 'line-through',
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  productSales: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  productLocation: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  footerLoading: {
    paddingVertical: 16,
  },
});

export default HomeScreen;
