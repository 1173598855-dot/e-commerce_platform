import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productApi, cartApi, favoriteApi } from '../api';
import SkuSelector from '../components/SkuSelector';

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSku, setShowSku] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    loadDetail();
    checkFavorite();
  }, [id]);

  const loadDetail = async () => {
    try {
      const res = await productApi.getDetail(id);
      setProduct(res.data);
      setLoading(false);
    } catch (err) {
      Alert.alert('加载失败', err.message);
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
        Alert.alert('提示', '已取消收藏');
      } else {
        await favoriteApi.add({ product_id: id });
        setIsFavorite(true);
        Alert.alert('提示', '已收藏');
      }
    } catch (err) {
      Alert.alert('操作失败', err.message);
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
        image: product.image,
      };
      await cartApi.addToCart(data);
      Alert.alert('成功', '已加入购物车');
    } catch (err) {
      Alert.alert('失败', err.message);
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
        image: product.image,
      }],
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  if (!product) return null;

  const displayPrice = selectedSku ? selectedSku.price : product.price;
  const displayQty = selectedSku ? selectedQty : quantity;

  return (
    <ScrollView style={styles.container}>
      {/* 商品图片 */}
      <View style={styles.imageArea}>
        <Text style={styles.imagePlaceholder}>📷</Text>
      </View>

      {/* 基本信息 */}
      <View style={styles.infoArea}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>¥{displayPrice}</Text>
          {product.original_price && (
            <Text style={styles.originalPrice}>¥{product.original_price}</Text>
          )}
          <Text style={styles.sales}>已售 {product.sales || 0}</Text>
        </View>
        <Text style={styles.name}>{product.name}</Text>
        <View style={styles.tags}>
          <View style={styles.tag}><Text style={styles.tagText}>包邮</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>正品保障</Text></View>
          {product.brand && <View style={styles.tag}><Text style={styles.tagText}>{product.brand}</Text></View>}
        </View>
      </View>

      {/* SKU选择入口 */}
      {(product.spec_options || product.skus) && (
        <TouchableOpacity style={styles.skuCard} onPress={() => setShowSku(true)}>
          <Text style={styles.skuLabel}>规格</Text>
          <Text style={styles.skuValue}>
            {selectedSku ? JSON.stringify(selectedSku.spec || {}) : '请选择规格'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      )}

      {/* 规格参数 */}
      <View style={styles.specCard}>
        <Text style={styles.cardTitle}>规格参数</Text>
        {product.brand && <SpecRow label="品牌" value={product.brand} />}
        {product.category_name && <SpecRow label="分类" value={product.category_name} />}
        <SpecRow label="库存" value={${product.stock} 件} />
        {product.description && <SpecRow label="简介" value={product.description} />}
      </View>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomItem} onPress={toggleFavorite}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color="#ff6b35" />
          <Text style={styles.bottomItemText}>收藏</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('Reviews', { productId: id })}>
          <Ionicons name="chatbubble-outline" size={24} color="#ff6b35" />
          <Text style={styles.bottomItemText}>评价</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('Cart')}>
          <Ionicons name="cart-outline" size={24} color="#ff6b35" />
          <Text style={styles.bottomItemText}>购物车</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
          <Text style={styles.buyBtnText}>立即购买</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
          <Text style={styles.cartBtnText}>加入购物车</Text>
        </TouchableOpacity>
      </View>

      {/* SKU选择弹窗 */}
      <SkuSelector
        visible={showSku}
        productId={id}
        onClose={() => setShowSku(false)}
        onConfirm={handleSkuConfirm}
      />
    </ScrollView>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  imageArea: { width: '100%', height: 350, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { fontSize: 80 },
  infoArea: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 28, fontWeight: 'bold', color: '#ff6b35' },
  originalPrice: { fontSize: 15, color: '#999', textDecorationLine: 'line-through', marginLeft: 10 },
  sales: { fontSize: 13, color: '#999', marginLeft: 'auto' },
  name: { fontSize: 16, color: '#333', marginTop: 8, fontWeight: '500', lineHeight: 24 },
  tags: { flexDirection: 'row', marginTop: 10, gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#fff3ed', borderRadius: 4 },
  tagText: { fontSize: 12, color: '#ff6b35' },
  skuCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  skuLabel: { fontSize: 14, color: '#333', fontWeight: '500', width: 60 },
  skuValue: { flex: 1, fontSize: 14, color: '#666' },
  specCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  specRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  specLabel: { width: 60, fontSize: 14, color: '#999' },
  specValue: { flex: 1, fontSize: 14, color: '#333' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderTopWidth: 1, borderColor: '#eee' },
  bottomItem: { alignItems: 'center', paddingHorizontal: 12 },
  bottomItemText: { fontSize: 11, color: '#666', marginTop: 2 },
  buyBtn: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#ff6b35', borderRadius: 6, marginLeft: 4 },
  buyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cartBtn: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#ff9a6c', borderRadius: 6, marginLeft: 4 },
  cartBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
