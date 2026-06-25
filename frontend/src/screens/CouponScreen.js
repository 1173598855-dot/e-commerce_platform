import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couponApi } from '../api';

export default function CouponScreen({ navigation }) {
  const [coupons, setCoupons] = useState([]);
  const [filter, setFilter] = useState('all'); // all, available, used, expired
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, [filter]);

  const loadCoupons = async () => {
    try {
      const res = await couponApi.getMy({ status: filter });
      setCoupons(res.data || []);
    } catch (err) {
      console.error('加载优惠券失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoupons();
    setRefreshing(false);
  };

  const handleReceive = async (coupon) => {
    try {
      await couponApi.receive({ coupon_id: coupon.id });
      Alert.alert('领取成功', coupon.name);
      loadCoupons();
    } catch (err) {
      Alert.alert('领取失败', err.message);
    }
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'available', label: '可用' },
    { key: 'used', label: '已用' },
    { key: 'expired', label: '过期' },
  ];

  const getStatusText = (item) => {
    if (item.status === 2) return { text: '已使用', color: '#999' };
    if (item.status === 3 || new Date(item.expires_at) < new Date()) return { text: '已过期', color: '#ccc' };
    return { text: '可用', color: '#ff6b35' };
  };

  const renderCoupon = ({ item }) => {
    const status = getStatusText(item);
    const displayText = item.type === 1
      ? 满减
      : item.type === 2
        ? ${item.discount_amount}折
        : 立减元;

    return (
      <View style={[styles.couponCard, status.text === '已过期' && styles.expiredCard]}>
        <View style={styles.couponLeft}>
          <Text style={styles.couponAmount}>
            {item.type === 2 ? '' : '¥'}
            {item.discount_amount}
            {item.type === 2 ? '折' : ''}
          </Text>
          <Text style={styles.couponCondition}>{displayText}</Text>
        </View>
        <View style={styles.couponRight}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          <Text style={styles.couponName}>{item.name}</Text>
          <Text style={styles.couponDate}>
            {new Date(item.valid_start).toLocaleDateString()} ~ {new Date(item.valid_end).toLocaleDateString()}
          </Text>
          {item.status === 1 && (
            <TouchableOpacity
              style={styles.useBtn}
              onPress={() => navigation.navigate('OrderCreate', { coupon_id: item.id })}
            >
              <Text style={styles.useBtnText}>去用</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab切换 */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, filter === tab.key && styles.tabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderCoupon}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>暂无优惠券</Text>
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
  couponCard: { flexDirection: 'row', backgroundColor: '#fff', margin: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ffe0cc' },
  expiredCard: { opacity: 0.5 },
  couponLeft: { width: 90, backgroundColor: '#fff3ed', justifyContent: 'center', alignItems: 'center', padding: 12 },
  couponAmount: { fontSize: 28, fontWeight: 'bold', color: '#ff6b35' },
  couponCondition: { fontSize: 11, color: '#ff6b35', marginTop: 4 },
  couponRight: { flex: 1, padding: 12, justifyContent: 'space-between' },
  statusText: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  couponName: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 4 },
  couponDate: { fontSize: 11, color: '#ccc', marginTop: 4 },
  useBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 16, marginTop: 4 },
  useBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});
