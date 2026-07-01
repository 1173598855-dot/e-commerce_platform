import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Image, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { productApi, categoryApi } from '../api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/designSystem';
import { ContainerStyles } from '../theme/styles';

/**
 * 首页组件 - 企业级实现
 * 遵循 UI 设计方案 v2.0.0
 * 特性：性能优化、可访问性、用户体验
 */
export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [hotProducts, setHotProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hotRes, catRes] = await Promise.all([
        productApi.getHot(),
        categoryApi.getList(),
      ]);
      setHotProducts(hotRes.data.list || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
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
    { name: '限时抢购', icon: 'flash', screen: 'FlashSale', color: '#ff6b35' },
    { name: '优惠券', icon: 'pricetag', screen: 'Coupons', color: '#ff6b35' },
    { name: '积分商城', icon: 'gift', screen: 'Points', color: '#ff6b35' },
    { name: '新品首发', icon: 'rocket', screen: null, color: '#ff6b35' },
    { name: 'AI推荐', icon: 'sparkles', screen: 'Recommend', color: '#0984e3' },
    { name: 'AI客服', icon: 'chatbubble-ellipses', screen: 'AiChat', color: '#0984e3' },
    { name: '商家入驻', icon: 'business', screen: 'Merchant', color: '#00b894' },
    { name: '更多服务', icon: 'grid', screen: null, color: '#636e72' },
  ];

  const renderHeader = () => (
    <View>
      {/* 搜索栏 - 使用设计系统样式 */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Icon name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索商品、品牌"
            placeholderTextColor={Colors.textTertiary}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="搜索商品"
            accessibilityHint="输入关键词搜索商品"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <Icon name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.scanBtn}
          accessibilityLabel="扫码"
          accessibilityHint="扫描商品条形码"
        >
          <Icon name="scan" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 快速导航 - 使用设计系统样式 */}
      <View style={styles.quickNav}>
        {quickNav.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.navItem}
            onPress={() => {
              if (item.screen) navigation.navigate(item.screen);
            }}
            activeOpacity={0.7}
            accessibilityLabel={item.name}
            accessibilityRole="button"
          >
            <View style={[styles.navIcon, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.navText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 分类区域 - 使用设计系统样式 */}
      {categories.length > 0 && (
        <View style={styles.catSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>商品分类</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Category')}
              accessibilityLabel="查看全部分类"
            >
              <Text style={styles.seeMore}>查看更多 ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.catGrid}>
            {categories.slice(0, 8).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catItem}
                onPress={() => navigation.navigate('Category')}
                activeOpacity={0.7}
                accessibilityLabel={cat.name}
                accessibilityRole="button"
              >
                <View style={styles.catIconWrap}>
                  {cat.icon ? (
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                  ) : (
                    <Icon name="grid" size={28} color={Colors.primary} />
                  )}
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 热门商品标题 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>热门推荐</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Search')}
          accessibilityLabel="查看更多热门商品"
        >
          <Text style={styles.seeMore}>更多 ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProduct = ({ item }) => (
    <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  return (
    <View style={ContainerStyles.main}>
      <FlatList
        data={hotProducts}
        keyExtractor={(item) => item?.id?.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={renderHeader}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={10}
      />
    </View>
  );
}

/**
 * 商品卡片组件 - 企业级实现
 * 遵循 UI 设计方案 v2.0.0
 */
function ProductCard({ product, onPress }) {
  const [imageError, setImageError] = useState(false);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress} 
      activeOpacity={0.8}
      accessibilityLabel={product.name}
      accessibilityHint={`价格 ${product.price}元，销量 ${product.sales || 0}`}
      accessibilityRole="button"
    >
      {/* 商品图片 */}
      <View style={styles.cardImage}>
        {product.images && product.images.length > 0 && !imageError ? (
          <Image
            source={{ uri: product.images[0] }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Icon name="image" size={40} color={Colors.gray400} />
            <Text style={styles.imgPlaceholderText}>暂无图片</Text>
          </View>
        )}
        
        {/* 促销标签 */}
        {product.is_promotion && (
          <View style={styles.promotionTag}>
            <Text style={styles.promotionText}>促销</Text>
          </View>
        )}
      </View>

      {/* 商品信息 */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {product.name}
        </Text>
        
        {/* 价格行 */}
        <View style={styles.cardPriceRow}>
          <Text style={styles.cardPrice}>¥{product.price}</Text>
          {product.original_price && (
            <Text style={styles.cardOriginal}>¥{product.original_price}</Text>
          )}
        </View>

        {/* 销量和评分 */}
        <View style={styles.cardMeta}>
          <Text style={styles.salesText}>已售 {product.sales || 0}</Text>
          {product.avg_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={12} color="#ffc107" />
              <Text style={styles.ratingText}>{product.avg_rating}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 主容器
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },

  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  // 搜索栏
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    padding: 0,
  },
  scanBtn: {
    padding: Spacing[2],
    marginLeft: Spacing[2],
  },

  // 快速导航
  quickNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.white,
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  navItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  navIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  navText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // 分类区域
  catSection: {
    backgroundColor: Colors.white,
    marginTop: Spacing[2],
    padding: Spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[1],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  seeMore: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  catItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  catIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
  catIcon: {
    fontSize: 28,
  },
  catName: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // 商品列表
  listContent: {
    paddingBottom: Spacing[4],
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[2],
  },

  // 商品卡片
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.gray50,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imgPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgPlaceholderText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing[1],
  },
  promotionTag: {
    position: 'absolute',
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing[1],
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  promotionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  cardBody: {
    padding: Spacing[2],
  },
  cardTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing[1],
    minHeight: 36,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing[1],
  },
  cardPrice: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  cardOriginal: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    marginLeft: Spacing[1],
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});
