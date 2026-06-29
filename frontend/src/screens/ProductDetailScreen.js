import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { productApi, cartApi, favoriteApi } from '../api';
import SkuSelector from '../components/SkuSelector';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/designSystem';
import { ContainerStyles, TextStyles, ButtonStyles, CardStyles, TagStyles } from '../theme/styles';

/**
 * 商品详情页 - 企业级实现
 * 遵循 UI 设计方案 v2.0.0
 * 特性：性能优化、可访问性、用户体验
 */
export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSku, setShowSku] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadDetail();
    checkFavorite();
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const [productRes, reviewsRes] = await Promise.all([
        productApi.getDetail(id),
        productApi.getReviews(id, { page: 1, pageSize: 5 }),
      ]);
      setProduct(productRes.data);
      setReviews(reviewsRes.data.list || []);
    } catch (err) {
      Alert.alert('错误', err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const res = await favoriteApi.check(id);
      setIsFavorite(res.data?.isFavorite || false);
    } catch (err) {
      // ignore
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await favoriteApi.remove({ product_id: id });
        setIsFavorite(false);
        Alert.alert('成功', '已取消收藏');
      } else {
        await favoriteApi.add({ product_id: id });
        setIsFavorite(true);
        Alert.alert('成功', '已添加收藏');
      }
    } catch (err) {
      Alert.alert('错误', err.message || '操作失败');
    }
  };

  const handleSkuConfirm = (result) => {
    setSelectedSku(result.sku);
    setSelectedQty(result.quantity);
    setShowSku(false);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const sku = selectedSku || { id: null, price: product.price, stock: product.stock };
      const data = {
        product_id: product.id,
        sku_id: sku.id || null,
        quantity: selectedQty,
        name: product.name,
        price: sku.price || product.price,
        image: product.images?.[0] || product.image,
      };
      await cartApi.addToCart(data);
      Alert.alert('成功', '已添加到购物车');
    } catch (err) {
      Alert.alert('错误', err.message || '添加失败');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const sku = selectedSku || { price: product.price };
    navigation.navigate('OrderCreate', {
      items: [{
        product_id: product.id,
        sku_id: selectedSku?.id || null,
        quantity: selectedQty,
        name: product.name,
        price: sku.price || product.price,
        image: product.images?.[0] || product.image,
      }],
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  if (!product) return null;

  const displayPrice = selectedSku ? selectedSku.price : product.price;
  const displayQty = selectedSku ? selectedQty : quantity;

  return (
    <View style={ContainerStyles.main}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="商品详情页"
      >
        {/* 图片区域 - 使用设计系统 */}
        <View style={styles.imageArea}>
          {product.images && product.images.length > 0 ? (
            <>
              <FlatList
                data={product.images}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                  setCurrentImageIndex(index);
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
              />
              {/* 图片指示器 */}
              <View style={styles.imageIndicator}>
                {product.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.indicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={80} color={Colors.gray400} />
              <Text style={styles.imagePlaceholderText}>暂无图片</Text>
            </View>
          )}
        </View>

        {/* 信息区域 - 使用设计系统 */}
        <View style={styles.infoArea}>
          {/* 价格行 */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>¥{displayPrice}</Text>
            {product.original_price && (
              <Text style={styles.originalPrice}>¥{product.original_price}</Text>
            )}
            <View style={styles.salesBadge}>
              <Text style={styles.salesText}>已售 {product.sales || 0}</Text>
            </View>
          </View>

          {/* 商品名称 */}
          <Text style={styles.name}>{product.name}</Text>

          {/* 标签 */}
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>正品保证</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>闪电发货</Text>
            </View>
            {product.brand && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{product.brand}</Text>
              </View>
            )}
          </View>

          {/* 评分 */}
          {product.avg_rating > 0 && (
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= Math.round(product.avg_rating) ? 'star' : 'star-outline'}
                    size={16}
                    color="#ffc107"
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>{product.avg_rating} 分</Text>
              <Text style={styles.reviewCount}>({product.review_count || 0}条评价)</Text>
            </View>
          )}
        </View>

        {/* SKU 选择器 */}
        {(product.spec_options || product.skus) && (
          <TouchableOpacity 
            style={styles.skuCard} 
            onPress={() => setShowSku(true)}
            accessibilityLabel="选择规格"
            accessibilityHint={selectedSku ? `已选择 ${JSON.stringify(selectedSku.spec || {})}` : '请选择规格'}
          >
            <Text style={styles.skuLabel}>规格</Text>
            <Text style={styles.skuValue}>
              {selectedSku ? JSON.stringify(selectedSku.spec || {}) : '请选择规格'}
            </Text>
            <Icon name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* 商品详情 */}
        <View style={styles.specCard}>
          <Text style={styles.cardTitle}>商品详情</Text>
          {product.brand && <SpecRow label="品牌" value={product.brand} />}
          {product.category_name && <SpecRow label="分类" value={product.category_name} />}
          <SpecRow label="库存" value={`${product.stock} 件`} />
          {product.description && <SpecRow label="描述" value={product.description} />}
        </View>

        {/* 评价列表 */}
        {reviews.length > 0 && (
          <View style={styles.reviewsCard}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.cardTitle}>用户评价 ({product.review_count || 0})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reviews', { productId: id })}>
                <Text style={styles.seeMore}>查看全部 ›</Text>
              </TouchableOpacity>
            </View>
            {reviews.map((review, index) => (
              <View key={review.id || index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{review.nickname || '匿名用户'}</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={12}
                        color="#ffc107"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewContent}>{review.content}</Text>
                <Text style={styles.reviewTime}>{review.created_at}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏 - 使用设计系统 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.bottomItem} 
          onPress={toggleFavorite}
          accessibilityLabel={isFavorite ? '取消收藏' : '收藏'}
        >
          <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={Colors.primary} />
          <Text style={styles.bottomItemText}>{isFavorite ? '已收藏' : '收藏'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomItem} 
          onPress={() => navigation.navigate('Reviews', { productId: id })}
          accessibilityLabel="查看评价"
        >
          <Icon name="chatbubble-outline" size={24} color={Colors.primary} />
          <Text style={styles.bottomItemText}>评价</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottomItem} 
          onPress={() => navigation.navigate('Cart')}
          accessibilityLabel="购物车"
        >
          <Icon name="cart-outline" size={24} color={Colors.primary} />
          <Text style={styles.bottomItemText}>购物车</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cartBtn} 
          onPress={handleAddToCart}
          accessibilityLabel="加入购物车"
        >
          <Text style={styles.cartBtnText}>加入购物车</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buyBtn} 
          onPress={handleBuyNow}
          accessibilityLabel="立即购买"
        >
          <Text style={styles.buyBtnText}>立即购买</Text>
        </TouchableOpacity>
      </View>

      {/* SKU 选择器弹窗 */}
      <SkuSelector
        visible={showSku}
        productId={id}
        onClose={() => setShowSku(false)}
        onConfirm={handleSkuConfirm}
      />
    </View>
  );
}

function SpecRow({ label, value }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 主容器
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },

  // 加载状态
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  // 图片区域
  imageArea: {
    width: '100%',
    height: 350,
    backgroundColor: Colors.gray50,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing[2],
  },
  imageIndicator: {
    position: 'absolute',
    bottom: Spacing[3],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[1],
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white + '80',
  },
  indicatorDotActive: {
    backgroundColor: Colors.white,
    width: 12,
  },

  // 信息区域
  infoArea: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing[2],
  },
  price: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: Typography.fontSize.base,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
    marginLeft: Spacing[3],
  },
  salesBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.primaryBackground,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  salesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  name: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing[2],
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed,
  },
  tags: {
    flexDirection: 'row',
    marginTop: Spacing[3],
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    backgroundColor: Colors.primaryBackground,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[3],
    gap: Spacing[2],
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  reviewCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },

  // SKU 卡片
  skuCard: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  skuLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    width: 60,
  },
  skuValue: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  // 商品详情卡片
  specCard: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  specLabel: {
    width: 80,
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  specValue: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },

  // 评价卡片
  reviewsCard: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  seeMore: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  reviewItem: {
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[2],
    gap: Spacing[2],
  },
  reviewUser: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    marginBottom: Spacing[2],
  },
  reviewTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },

  // 底部操作栏
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingBottom: Spacing[4], // 为 iPhone 底部留出空间
  },
  bottomItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  bottomItemText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing[1],
  },
  cartBtn: {
    flex: 1,
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.base,
    marginLeft: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: BorderRadius.base,
    marginLeft: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});
