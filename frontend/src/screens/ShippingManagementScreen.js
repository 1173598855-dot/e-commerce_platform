import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { orderApi } from '../api';

const STATUS_FILTERS = [
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '已发货' },
  { key: 'completed', label: '已完成' },
];

function statusLabel(status) {
  const labels = { paid: '待发货', shipped: '已发货', completed: '已完成' };
  return labels[status] || status || '-';
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '--';
  return `￥${value}`;
}

export default function ShippingManagementScreen() {
  const [activeStatus, setActiveStatus] = useState('paid');
  const [keyword, setKeyword] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingCompany, setTrackingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [logistics, setLogistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const listParams = useMemo(() => {
    const params = { status: activeStatus, pageSize: 20 };
    if (keyword.trim()) params.keyword = keyword.trim();
    return params;
  }, [activeStatus, keyword]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.listFulfillmentOrders(listParams);
      const list = res.data?.list || [];
      setOrders(list);
      if (selectedOrder && !list.some((item) => item.id === selectedOrder.id)) {
        setSelectedOrder(null);
        setLogistics(null);
      }
    } catch (err) {
      Alert.alert('发货列表加载失败', err.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [listParams, selectedOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const openOrder = async (order) => {
    setSelectedOrder(order);
    setTrackingCompany(order.tracking_company || '');
    setTrackingNumber(order.tracking_number || '');
    setLogistics(null);
    if (order.status !== 'paid') {
      try {
        const res = await orderApi.getLogistics(order.id);
        setLogistics(res.data);
      } catch (err) {
        setLogistics({ traces: [], error: err.message || '暂无物流轨迹' });
      }
    }
  };

  const submitShipment = async () => {
    if (!selectedOrder) return;
    if (!trackingNumber.trim()) {
      Alert.alert('请填写物流单号', '发货需要物流单号');
      return;
    }
    setSubmitting(true);
    try {
      await orderApi.shipOrder(selectedOrder.id, {
        trackingCompany: trackingCompany.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      Alert.alert('发货已提交', '本地物流记录已更新');
      await loadOrders();
      setSelectedOrder(null);
      setLogistics(null);
    } catch (err) {
      Alert.alert('发货失败', err.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrder = ({ item }) => {
    const selected = selectedOrder?.id === item.id;
    return (
      <TouchableOpacity style={[styles.orderItem, selected && styles.orderItemSelected]} onPress={() => openOrder(item)}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNo}>{item.order_no}</Text>
          <Text style={styles.orderStatus}>{statusLabel(item.status)}</Text>
        </View>
        <Text style={styles.orderMeta}>{formatMoney(item.total_amount)} · {item.items?.length || 0} items</Text>
        <Text style={styles.orderMeta} numberOfLines={1}>{item.tracking_number || '未填写物流单号'}</Text>
      </TouchableOpacity>
    );
  };

  const renderDetail = () => {
    if (!selectedOrder) {
      return (
        <View style={styles.emptyDetail}>
          <Ionicons name="cube-outline" size={44} color="#ccc" />
          <Text style={styles.emptyText}>选择订单处理发货或查看物流</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.detailPanel} contentContainerStyle={styles.detailContent}>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleWrap}>
              <Text style={styles.detailTitle}>{selectedOrder.order_no}</Text>
              <Text style={styles.detailMeta}>{statusLabel(selectedOrder.status)} · {formatMoney(selectedOrder.total_amount)}</Text>
            </View>
            <Text style={styles.detailBadge}>{selectedOrder.status}</Text>
          </View>
          {(selectedOrder.items || []).map((item, index) => (
            <View key={`${item.product_name}-${index}`} style={styles.productLine}>
              <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.productQty}>x{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>物流信息</Text>
          <TextInput
            style={styles.input}
            value={trackingCompany}
            onChangeText={setTrackingCompany}
            placeholder="物流公司，如 SF / JD"
          />
          <TextInput
            style={styles.input}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="物流单号"
          />
          {selectedOrder.status === 'paid' && (
            <TouchableOpacity style={[styles.shipButton, submitting && styles.disabledButton]} disabled={submitting} onPress={submitShipment}>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.shipText}>{submitting ? '提交中...' : '提交发货'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>物流轨迹</Text>
          {logistics?.error ? <Text style={styles.traceText}>{logistics.error}</Text> : null}
          {(logistics?.traces || []).length ? logistics.traces.map((trace, index) => (
            <View key={`${trace.created_at}-${index}`} style={styles.traceItem}>
              <Text style={styles.traceText}>{trace.content || '-'}</Text>
              <Text style={styles.traceMeta}>{trace.location || '-'} · {trace.created_at || '-'}</Text>
            </View>
          )) : <Text style={styles.traceText}>本地暂无物流轨迹</Text>}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, activeStatus === filter.key && styles.filterChipActive]}
              onPress={() => setActiveStatus(filter.key)}
            >
              <Text style={[styles.filterText, activeStatus === filter.key && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="订单号或商品名"
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.listPanel}>
          <FlatList
            data={orders}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderOrder}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>{loading ? '加载中...' : '暂无订单'}</Text>
              </View>
            }
          />
        </View>
        {renderDetail()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterBar: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#ff6b35', fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 10, height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fafafa' },
  searchInput: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 0 },
  contentRow: { flex: 1 },
  listPanel: { maxHeight: 280, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  orderItem: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  orderItemSelected: { backgroundColor: '#fff8f5' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  orderNo: { flex: 1, fontSize: 14, color: '#333', fontWeight: '700' },
  orderStatus: { fontSize: 13, color: '#ff6b35', fontWeight: '700' },
  orderMeta: { marginTop: 5, fontSize: 12, color: '#777' },
  detailPanel: { flex: 1 },
  detailContent: { padding: 12, paddingBottom: 28 },
  detailCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  detailTitleWrap: { flex: 1 },
  detailTitle: { fontSize: 16, color: '#333', fontWeight: '700' },
  detailMeta: { marginTop: 4, fontSize: 12, color: '#777' },
  detailBadge: { fontSize: 12, color: '#ff6b35', backgroundColor: '#fff3ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  cardTitle: { fontSize: 15, color: '#333', fontWeight: '700', marginBottom: 10 },
  productLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  productName: { flex: 1, fontSize: 13, color: '#333' },
  productQty: { fontSize: 12, color: '#999' },
  input: { height: 42, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 6, paddingHorizontal: 10, marginBottom: 10, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },
  shipButton: { height: 42, borderRadius: 6, backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shipText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  traceItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  traceText: { fontSize: 13, color: '#666', lineHeight: 19 },
  traceMeta: { marginTop: 3, fontSize: 12, color: '#999' },
  emptyList: { padding: 24, alignItems: 'center' },
  emptyDetail: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#999', fontSize: 14, marginTop: 8 },
});
