import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { couponApi } from '../api';

export default function CouponCenterScreen() {
  const [coupons, setCoupons] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    try {
      const res = await couponApi.getList();
      setCoupons(res.data || []);
    } catch (err) {
      console.error('load coupons error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoupons();
    setRefreshing(false);
  };

  const handleReceive = async (item) => {
    try {
      await couponApi.receive({ coupon_id: item.id });
      Alert.alert('Success', item.name);
      loadCoupons();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const renderCoupon = ({ item }) => {
    const displayText = item.type === 1
      ? 'Full reduction'
      : item.type === 2
        ? String(item.discount_amount) + '% off'
        : String(item.discount_amount) + ' off';
    return (
      <View style={styles.couponCard}>
        <View style={styles.couponLeft}>
          <Text style={styles.couponAmount}>{item.discount_amount}</Text>
          <Text style={styles.couponCondition}>{displayText}</Text>
        </View>
        <View style={styles.couponRight}>
          <Text style={styles.couponName}>{item.name}</Text>
          <Text style={styles.couponDesc}>Min {item.min_order_amount} yuan</Text>
          <Text style={styles.couponDate}>
            {new Date(item.valid_start).toLocaleDateString()} ~ {new Date(item.valid_end).toLocaleDateString()}
          </Text>
          <TouchableOpacity style={styles.receiveBtn} onPress={() => handleReceive(item)}>
            <Text style={styles.receiveBtnText}>Receive</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderCoupon}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name='card-outline' size={48} color='#ddd' />
            <Text style={styles.emptyText}>No coupons</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  couponCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#ffe0cc' },
  couponLeft: { width: 90, backgroundColor: '#fff3ed', justifyContent: 'center', alignItems: 'center', padding: 12 },
  couponAmount: { fontSize: 28, fontWeight: 'bold', color: '#ff6b35' },
  couponCondition: { fontSize: 11, color: '#ff6b35', marginTop: 4 },
  couponRight: { flex: 1, padding: 12, justifyContent: 'space-between' },
  couponName: { fontSize: 15, fontWeight: '600', color: '#333' },
  couponDesc: { fontSize: 12, color: '#999', marginTop: 4 },
  couponDate: { fontSize: 11, color: '#ccc', marginTop: 2 },
  receiveBtn: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: '#ff6b35', borderRadius: 16, marginTop: 4 },
  receiveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});