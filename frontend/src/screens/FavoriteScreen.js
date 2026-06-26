import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { favoriteApi } from '../api';

export default function FavoriteScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await favoriteApi.getList({ page: 1, pageSize: 100 });
      setFavorites(res.data?.list || []);
    } catch (err) {
      console.error('ղʧ:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemove = async (item) => {
    try {
      await favoriteApi.remove({ product_id: item.product_id });
      loadFavorites();
    } catch (err) {
      Alert.alert('ȡʧ', err.message);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.favoriteItem}
      onPress={() => navigation.navigate('ProductDetail', { id: item.product_id })}
      onLongPress={() => handleRemove(item)}
    >
      <View style={styles.itemImage}>
        <Text style={styles.imgPlaceholder}>??</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>{item.price}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.salesText}> {item.sales || 0}</Text>
          {item.category_name && <Text style={styles.catText}>{item.category_name}</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={styles.unfavBtn}
        onPress={(e) => { e.stopPropagation(); handleRemove(item); }}
      >
        <Ionicons name="heart" size={20} color="#ff6b35" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>ûղƷ</Text>
            <TouchableOpacity
              style={styles.goShopBtn}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.goShopText}>ȥ</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  favoriteItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, marginBottom: 8, alignItems: 'center' },
  itemImage: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imgPlaceholder: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#333', marginBottom: 6, flex: 1 },
  itemPrice: { fontSize: 17, fontWeight: 'bold', color: '#ff6b35', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', gap: 12 },
  salesText: { fontSize: 12, color: '#999' },
  catText: { fontSize: 12, color: '#bbb' },
  unfavBtn: { padding: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 16, marginBottom: 24 },
  goShopBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: '#ff6b35', borderRadius: 20 },
  goShopText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});

