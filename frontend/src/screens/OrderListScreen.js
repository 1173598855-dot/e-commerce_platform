import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { orderApi } from '../api';

const STATUS_MAP = {
  pending: { label: '', color: '#ff9800', icon: 'time-outline' },
  paid: { label: '', color: '#2196f3', icon: 'cube-outline' },
  shipped: { label: 'ջ', color: '#9c27b0', icon: 'truck-outline' },
  completed: { label: '', color: '#4caf50', icon: 'checkmark-circle' },
  cancelled: { label: 'ȡ', color: '#999', icon: 'close-circle' },
};

export default function OrderListScreen({ route, navigation }) {
  const { status: initialStatus } = route.params || {};
  const [activeTab, setActiveTab] = useState(initialStatus || 'all');
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { key: 'all', label: 'ȫ' },
    { key: 'pending', label: '' },
    { key: 'paid', label: '' },
    { key: 'shipped', label: 'ջ' },
    { key: 'completed', label: '' },
  ];

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      const params = { pageSize: 50 };
      if (activeTab !== 'all') params.status = activeTab;
      const res = await orderApi.getOrders(params);
      setOrders(res.data?.list || []);
    } catch (err) {
      console.error('ضʧ:', err);
    }
  };

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
      alert(err.message);
    }
  };

  const handleConfirm = async (orderId) => {
    try {
      await orderApi.confirmOrder(orderId);
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabл */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.pending;
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNo}>{item.order_no}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>

              {item.items?.map((orderItem, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.orderItem}
                  onPress={() => navigation.navigate('ProductDetail', { id: orderItem.product_id })}
                >
                  <View style={styles.orderItemImg}>
                    <Text style={styles.imgPlaceholder}>??</Text>
                  </View>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName} numberOfLines={2}>{orderItem.product_name}</Text>
                    <Text style={styles.orderItemPrice}>{orderItem.price}  {orderItem.quantity}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.orderFooter}>
                <Text style={styles.totalText}>
                   {item.items?.reduce((s, it) => s + it.quantity, 0) || 0} Ʒ
                </Text>
                <Text style={styles.totalAmount}>
                  ϼƣ<Text style={styles.amount}>{item.total_amount}</Text>
                </Text>
                <View style={styles.actionRow}>
                  {item.status === 'pending' && (
                    <>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                        <Text style={styles.cancelText}>ȡ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('Payment', { orderId: item.id, amount: item.total_amount })}>
                        <Text style={styles.payText}>ȥ֧</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {item.status === 'shipped' && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item.id)}>
                      <Text style={styles.confirmText}>ȷջ</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'completed' && item.items?.[0] && (
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => navigation.navigate('Review', { orderId: item.id, product: item.items[0] })}
                    >
                      <Text style={styles.reviewText}>д</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'cancelled' && (
                    <Text style={styles.doneText}>ȡ</Text>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>޶</Text>
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
  tabText: { fontSize: 14, color: '#666' },
  tabTextActive: { color: '#ff6b35', fontWeight: '600' },
  orderCard: { backgroundColor: '#fff', marginBottom: 8 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  orderNo: { fontSize: 13, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '500' },
  orderItem: { flexDirection: 'row', padding: 12 },
  orderItemImg: { width: 70, height: 70, borderRadius: 4, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imgPlaceholder: { fontSize: 24 },
  orderItemInfo: { flex: 1, justifyContent: 'center' },
  orderItemName: { fontSize: 14, color: '#333', lineHeight: 20 },
  orderItemPrice: { fontSize: 13, color: '#666', marginTop: 4 },
  orderFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  totalText: { fontSize: 13, color: '#666', marginBottom: 4 },
  totalAmount: { fontSize: 14, color: '#333', textAlign: 'right' },
  amount: { color: '#ff6b35', fontWeight: 'bold', fontSize: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10, alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#ff4444', borderRadius: 4 },
  cancelText: { color: '#ff4444', fontSize: 13 },
  payBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 4 },
  payText: { color: '#fff', fontSize: 13 },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 4 },
  confirmText: { color: '#fff', fontSize: 13 },
  reviewBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#2196f3', borderRadius: 4 },
  reviewText: { color: '#fff', fontSize: 13 },
  doneText: { fontSize: 13, color: '#999' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 16 },
});

