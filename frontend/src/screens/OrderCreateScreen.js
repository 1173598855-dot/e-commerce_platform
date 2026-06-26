import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { orderApi, couponApi } from '../api';

export default function OrderCreateScreen({ route, navigation }) {
  const { items } = route.params || { items: [] };
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (address) loadCoupons();
  }, [address]);

  const totalAmount = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const finalAmount = Math.max(0, totalAmount - discount);

  const handleSelectAddress = (addr) => {
    setAddress(addr);
    navigation.goBack();
  };

  const loadCoupons = async () => {
    try {
      const res = await couponApi.getMy({ status: 'available' });
      const usable = (res.data || []).filter(c => {
        if (c.type === 1) return totalAmount >= c.condition_amount;
        if (c.type === 2) return totalAmount >= (c.min_order_amount || 0);
        return true;
      });
      setAvailableCoupons(usable);
    } catch (err) {
      // ignore
    }
  };

  const handleCreate = async () => {
    if (items.length === 0) {
      Alert.alert('ʾ', 'ûƷ');
      return;
    }
    if (!address) {
      Alert.alert('ʾ', 'ѡջַ');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        items: items.map((item) => ({
          product_id: item.product_id,
          sku_id: item.sku_id || null,
          quantity: item.quantity || 1,
        })),
        address_id: address.id,
        remark,
      };
      if (selectedCoupon) {
        data.user_coupon_id = selectedCoupon.id;
      }

      const res = await orderApi.createOrder(data);
      const orderId = res.data.orderId;
      const amount = selectedCoupon ? finalAmount : res.data.totalAmount;

      Alert.alert('µɹ', ': ' + amount, [
        {
          text: 'ȥ֧',
          onPress: () => navigation.navigate('Payment', { orderId, amount }),
        },
        { text: '', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err) {
      Alert.alert('µʧ', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToAddress = () => {
    navigation.navigate('Addresses', { onSelect: handleSelectAddress });
  };

  return (
    <ScrollView style={styles.container}>
      {/* ջַ */}
      <TouchableOpacity style={styles.addressCard} onPress={goToAddress}>
        {address ? (
          <View>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={20} color="#ff6b35" />
              <View style={styles.addressInfo}>
                <Text style={styles.addressText}>{address.receiver_name}  {address.receiver_phone}</Text>
                <Text style={styles.addressDetail}>
                  {address.province}{address.city}{address.district} {address.detail_address}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={20} color="#999" />
            <Text style={styles.noAddress}>ѡջַ</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      {/* ƷϢ */}
      <View style={styles.goodsCard}>
        <Text style={styles.cardTitle}>ƷϢ</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.goodsItem}>
            <View style={styles.goodsImg}>
              <Text style={styles.imgPlaceholder}>??</Text>
            </View>
            <View style={styles.goodsInfo}>
              <Text style={styles.goodsName} numberOfLines={2}>{item.name || item.product_name || 'Ʒ'}</Text>
              <Text style={styles.goodsSpec}>{item.spec || 'ĬϹ'}</Text>
              <View style={styles.goodsPriceRow}>
                <Text style={styles.goodsPrice}>{item.price}</Text>
                <Text style={styles.goodsQty}>{item.quantity || 1}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Żȯ */}
      {availableCoupons.length > 0 && (
        <View style={styles.couponCard}>
          <Text style={styles.cardTitle}>Żȯ</Text>
          <TouchableOpacity
            style={styles.couponItem}
            onPress={() => {
              if (selectedCoupon?.id === availableCoupons[0].id) {
                setSelectedCoupon(null);
                setDiscount(0);
              } else {
                setSelectedCoupon(availableCoupons[0]);
                calcDiscount(availableCoupons[0]);
              }
            }}
          >
            <View style={styles.couponLeft}>
              <Text style={styles.couponAmt}>
                {availableCoupons[0].type === 2 ? '' : ''}{availableCoupons[0].discount_amount}
                {availableCoupons[0].type === 2 ? '' : ''}
              </Text>
              <Text style={styles.couponName}>{availableCoupons[0].name}</Text>
            </View>
            <View style={styles.couponRight}>
              <Text style={[styles.couponStatus, selectedCoupon && { color: '#ff6b35' }]}>
                {selectedCoupon ? 'ѡ' : ''}
              </Text>
              <Ionicons name={selectedCoupon ? "checkmark-circle" : "ellipse-outline"} size={22} color="#ff6b35" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ע */}
      <View style={styles.noteCard}>
        <Text style={styles.cardTitle}>ע</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="ѡ̼ҵ"
          value={remark}
          onChangeText={setRemark}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* ϸ */}
      <View style={styles.feeCard}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Ʒϼ</Text>
          <Text style={styles.feeValue}>{totalAmount.toFixed(2)}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Żȯֿ</Text>
            <Text style={[styles.feeValue, { color: '#ff6b35' }]}>-{discount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>˷</Text>
          <Text style={styles.feeValue}>˷</Text>
        </View>
        <View style={[styles.feeRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Ӧܶ</Text>
          <Text style={styles.totalAmount}>{finalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* ύť */}
      <View style={styles.submitArea}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnLoading]}
          onPress={handleCreate}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'ύ...' : ύ }
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  function calcDiscount(coupon) {
    if (!coupon) return;
    if (coupon.type === 1) {
      setDiscount(Math.min(coupon.discount_amount, totalAmount));
    } else if (coupon.type === 2) {
      setDiscount(totalAmount * (1 - coupon.discount_amount / 10));
    } else {
      setDiscount(coupon.discount_amount);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  addressCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressInfo: { flex: 1, marginLeft: 12 },
  addressText: { fontSize: 15, color: '#333', fontWeight: '500' },
  addressDetail: { fontSize: 13, color: '#666', marginTop: 4 },
  noAddress: { fontSize: 14, color: '#999', flex: 1, marginLeft: 12 },
  goodsCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  goodsItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  goodsImg: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imgPlaceholder: { fontSize: 28 },
  goodsInfo: { flex: 1 },
  goodsName: { fontSize: 14, color: '#333', lineHeight: 20 },
  goodsSpec: { fontSize: 12, color: '#999', marginTop: 4 },
  goodsPriceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  goodsPrice: { fontSize: 15, fontWeight: 'bold', color: '#ff6b35' },
  goodsQty: { fontSize: 14, color: '#666' },
  couponCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  couponItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  couponLeft: { flex: 1 },
  couponAmt: { fontSize: 18, fontWeight: 'bold', color: '#ff6b35' },
  couponName: { fontSize: 12, color: '#666', marginTop: 2 },
  couponRight: { alignItems: 'flex-end' },
  couponStatus: { fontSize: 13, color: '#ff6b35' },
  noteCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  noteInput: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', minHeight: 80, backgroundColor: '#fafafa' },
  feeCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  feeLabel: { fontSize: 14, color: '#666' },
  feeValue: { fontSize: 14, color: '#333' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#ff6b35' },
  submitArea: { padding: 16, paddingBottom: 32 },
  submitBtn: { backgroundColor: '#ff6b35', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnLoading: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});


