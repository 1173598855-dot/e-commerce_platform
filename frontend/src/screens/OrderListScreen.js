import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { orderApi } from '../api';

const STATUS_MAP = {
  pending: { label: '待付款', color: '#ff9800' },
  paid: { label: '待发货', color: '#2196f3' },
  shipped: { label: '待收货', color: '#9c27b0' },
  completed: { label: '已完成', color: '#4caf50' },
  cancelled: { label: '已取消', color: '#999' },
};

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
];

export default function OrderListScreen({ route, navigation }) {
  const { status: initialStatus } = route.params || {};
  const [activeTab, setActiveTab] = useState(initialStatus || 'all');
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const params = { pageSize: 50 };
      if (activeTab !== 'all') params.status = activeTab;
      const res = await orderApi.getOrders(params);
      setOrders(res.data?.list || []);
    } catch (err) {
      Alert.alert('订单加载失败', err.message || '请稍后重试');
    }
  }, [activeTab]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleCancel = async (orderId) => {
    try {
      await orderApi.cancelOrder(orderId);
      loadOrders();
    } catch (err) {
      Alert.alert('取消失败', err.message || '请稍后重试');
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      await orderApi.confirmOrder(orderId);
      loadOrders();
    } catch (err) {
      Alert.alert('确认失败', err.message || '请稍后重试');
    }
  };

  const openRefundEvidence = (item) => {
    navigation.navigate('RefundEvidence', {
      orderId: item.id,
      orderNo: item.order_no,
      amount: item.total_amount,
    });
  };

  const renderActions = (item) => (
    <View style={styles.actionRow}>
      {item.status === 'pending' && (
        <>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Text style={styles.cancelText}>取消订单</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('Payment', { orderId: item.id, amount: item.total_amount })}>
            <Text style={styles.payText}>去支付</Text>
          </TouchableOpacity>
        </>
      )}
      {item.status === 'shipped' && (
        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item.id)}>
          <Text style={styles.confirmText}>确认收货</Text>
        </TouchableOpacity>
      )}
      {item.status === 'completed' && item.items?.[0] && (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => navigation.navigate('Review', { orderId: item.id, product: item.items[0] })}
        >
          <Text style={styles.reviewText}>写评价</Text>
        </TouchableOpacity>
      )}
      {['paid', 'shipped', 'completed'].includes(item.status) && (
        <TouchableOpacity style={styles.refundBtn} onPress={() => openRefundEvidence(item)}>
          <Text style={styles.refundText}>申请售后</Text>
        </TouchableOpacity>
      )}
      {item.status === 'cancelled' && <Text style={styles.doneText}>已取消</Text>}
    </View>
  );

  const renderOrder = ({ item }) => {
    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
    const itemCount = item.items?.reduce((sum, orderItem) => sum + Number(orderItem.quantity || 0), 0) || 0;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNo}>{item.order_no}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {item.items?.map((orderItem, index) => (
          <TouchableOpacity
            key={`${orderItem.product_id}-${index}`}
            style={styles.orderItem}
            onPress={() => navigation.navigate('ProductDetail', { id: orderItem.product_id })}
          >
            <View style={styles.orderItemImg}>
              <Ionicons name="cube-outline" size={24} color="#bbb" />
            </View>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemName} numberOfLines={2}>{orderItem.product_name}</Text>
              <Text style={styles.orderItemPrice}>￥{orderItem.price} x {orderItem.quantity}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.orderFooter}>
          <Text style={styles.totalText}>共 {itemCount} 件商品</Text>
          <Text style={styles.totalAmount}>合计 <Text style={styles.amount}>￥{item.total_amount}</Text></Text>
          {renderActions(item)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderOrder}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>暂无订单</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ff6b35' },
  tabText: { fontSize: 13, color: '#666' },
  tabTextActive: { color: '#ff6b35', fontWeight: '600' },
  orderCard: { backgroundColor: '#fff', marginBottom: 8 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  orderNo: { fontSize: 13, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '500' },
  orderItem: { flexDirection: 'row', padding: 12 },
  orderItemImg: { width: 70, height: 70, borderRadius: 4, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  orderItemInfo: { flex: 1, justifyContent: 'center' },
  orderItemName: { fontSize: 14, color: '#333', lineHeight: 20 },
  orderItemPrice: { fontSize: 13, color: '#666', marginTop: 4 },
  orderFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  totalText: { fontSize: 13, color: '#666', marginBottom: 4 },
  totalAmount: { fontSize: 14, color: '#333', textAlign: 'right' },
  amount: { color: '#ff6b35', fontWeight: 'bold', fontSize: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#ff4444', borderRadius: 4 },
  cancelText: { color: '#ff4444', fontSize: 13 },
  payBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 4 },
  payText: { color: '#fff', fontSize: 13 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 4 },
  confirmText: { color: '#fff', fontSize: 13 },
  reviewBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#2196f3', borderRadius: 4 },
  reviewText: { color: '#fff', fontSize: 13 },
  refundBtn: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#ff6b35', borderRadius: 4 },
  refundText: { color: '#ff6b35', fontSize: 13 },
  doneText: { fontSize: 13, color: '#999' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 16 },
});
