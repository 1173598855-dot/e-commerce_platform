import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { cartApi } from '../api';

export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState('0.00');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const res = await cartApi.getCart();
      setCartItems(res.data?.items || []);
      setTotal(res.data?.total || '0.00');
    } catch (err) {
      console.error('عﳵʧ:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  };

  const handleRemove = async (id) => {
    try {
      await cartApi.removeItem(id);
      Alert.alert('ʾ', 'Ƴ');
      loadCart();
    } catch (err) {
      Alert.alert('Ƴʧ', err.message);
    }
  };

  const handleUpdateQty = async (id, qty) => {
    if (qty < 1) return;
    try {
      await cartApi.updateQuantity(id, qty);
      loadCart();
    } catch (err) {
      Alert.alert('ʧ', err.message);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('ʾ', 'ﳵǿյ');
      return;
    }
    navigation.navigate('OrderCreate', { items: cartItems });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ﳵ ({cartItems.length})</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={loadCart}>
                <Ionicons name="refresh-outline" size={20} color="#ff6b35" />
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemImage}>
              <Text style={styles.imgPlaceholder}>??</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleUpdateQty(item.id, item.quantity - 1)}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleUpdateQty(item.id, item.quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>ﳵտҲ</Text>
            <TouchableOpacity style={styles.goShopBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.goShopText}>ȥ</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>ϼƣ</Text>
              <Text style={styles.totalAmount}>{total}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, cartItems.length === 0 && styles.checkoutBtnDisabled]}
              onPress={handleCheckout}
              disabled={cartItems.length === 0}
            >
              <Text style={styles.checkoutText}>ȥ ({cartItems.length})</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 8, alignItems: 'center' },
  itemImage: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imgPlaceholder: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#333', marginBottom: 6, flex: 1 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#ff6b35', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 32, height: 32, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, color: '#333' },
  qtyText: { paddingHorizontal: 16, fontSize: 14, color: '#333' },
  deleteBtn: { padding: 8 },
  footer: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', marginBottom: 12 },
  totalText: { fontSize: 14, color: '#666' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#ff6b35', marginLeft: 8 },
  checkoutBtn: { backgroundColor: '#ff6b35', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  checkoutBtnDisabled: { backgroundColor: '#ccc' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 16, marginBottom: 24 },
  goShopBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: '#ff6b35', borderRadius: 20 },
  goShopText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});

