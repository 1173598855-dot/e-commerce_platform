import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { couponApi } from '../api';

export default function CouponScreen() {
  const [coupons, setCoupons] = useState([]);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    try {
      const res = await couponApi.getMy();
      setCoupons(res.data || []);
    } catch (err) {
      console.error('load coupons error:', err);
    }
  };

  const getStatusText = (item) => {
    if (item.status === 1) return { text: 'Unused', color: '#ff6b35' };
    if (item.status === 2) return { text: 'Used', color: '#999' };
    return { text: 'Expired', color: '#ccc' };
  };

  const renderItem = ({ item }) => {
    const status = getStatusText(item);
    return (
      <View style={[styles.couponCard, status.text === 'Expired' && styles.expiredCard]}>
        <View style={styles.couponLeft}>
          <Text style={[styles.couponAmount, { color: status.color }]}>{item.discount_amount}</Text>
        </View>
        <View style={styles.couponRight}>
          <Text style={styles.couponName}>{item.name}</Text>
          <Text style={styles.couponDesc}>Min {item.min_order_amount} yuan</Text>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No coupons</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  couponCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ffe0cc', overflow: 'hidden' },
  expiredCard: { borderColor: '#eee', opacity: 0.6 },
  couponLeft: { width: 80, backgroundColor: '#fff3ed', justifyContent: 'center', alignItems: 'center', padding: 12 },
  couponAmount: { fontSize: 24, fontWeight: 'bold' },
  couponRight: { flex: 1, padding: 12, justifyContent: 'space-between' },
  couponName: { fontSize: 15, fontWeight: '600', color: '#333' },
  couponDesc: { fontSize: 12, color: '#999', marginTop: 4 },
  statusText: { fontSize: 12, marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});
