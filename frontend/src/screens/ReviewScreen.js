import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, FlatList, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewApi, orderApi } from '../api';

export default function ReviewScreen({ route, navigation }) {
  const { orderId, product, fromOrder } = route.params || {};
  const [productInfo, setProductInfo] = useState(product || null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fromOrder && orderId) {
      loadOrderProduct();
    }
  }, []);

  const loadOrderProduct = async () => {
    try {
      const res = await orderApi.getOrders({ orderId });
      if (res.data?.list?.[0]) {
        const orderItems = res.data.list[0].items || [];
        if (orderItems.length > 0) {
          setProductInfo(orderItems[0]);
        }
      }
    } catch (err) {
      console.error('加载订单商品失败:', err);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请至少输入一些评价内容');
      return;
    }

    setLoading(true);
    try {
      await reviewApi.createReview({
        product_id: productInfo?.id || productInfo?.product_id,
        order_id: orderId,
        rating,
        content,
        images: [],
      });
      Alert.alert('成功', '评价提交成功！积分+10', [
        { text: '好的', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          style={styles.starBtn}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={32}
            color={star <= value ? '#ff6b35' : '#ddd'}
          />
        </TouchableOpacity>
      ))}
      <Text style={styles.starText}>
        {['很差', '较差', '一般', '不错', '很棒'][value - 1]}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* 商品信息 */}
      <View style={styles.productCard}>
        <View style={styles.productImage}>
          <Text style={styles.imgPlaceholder}>📷</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productInfo?.name || '商品'}</Text>
          <Text style={styles.productPrice}>
            ¥{productInfo?.price || '0.00'}
          </Text>
        </View>
      </View>

      {/* 评分 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>商品评分</Text>
        <StarRating value={rating} onChange={setRating} />
      </View>

      {/* 评价内容 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>评价内容</Text>
        <View style={styles.textareaWrap}>
          <Text
            style={styles.textarea}
            multiline
            numberOfLines={8}
            value={content}
            onChangeText={setContent}
            placeholder="分享你的购物体验，帮助其他买家..."
          />
        </View>
        <Text style={styles.charCount}>{content.length}/500</Text>
      </View>

      {/* 匿名评价 */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.checkboxRow}>
          <Ionicons name="checkbox" size={22} color="#ff6b35" />
          <Text style={styles.checkboxText}>匿名评价</Text>
        </TouchableOpacity>
      </View>

      {/* 提交按钮 */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnLoading]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? '提交中...' : '提交评价'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, marginBottom: 12, alignItems: 'center' },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imgPlaceholder: { fontSize: 32 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 6 },
  productPrice: { fontSize: 17, fontWeight: 'bold', color: '#ff6b35' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 },
  starRow: { flexDirection: 'row', alignItems: 'center' },
  starBtn: { padding: 4 },
  starText: { fontSize: 14, color: '#666', marginLeft: 12 },
  textareaWrap: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, backgroundColor: '#fafafa' },
  textarea: { fontSize: 15, color: '#333', padding: 12, minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#ccc', textAlign: 'right', marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxText: { fontSize: 14, color: '#666' },
  submitSection: { padding: 16 },
  submitBtn: { backgroundColor: '#ff6b35', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnLoading: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
