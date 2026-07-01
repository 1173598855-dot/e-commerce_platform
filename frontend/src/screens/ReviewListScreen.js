import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { reviewApi } from '../api';

export default function ReviewListScreen({ route }) {
  const { productId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState('0.0');
  const [totalReviews, setTotalReviews] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState(null);

  const loadReviews = useCallback(async () => {
    try {
      const params = { page: 1, pageSize: 50 };
      if (filterRating) params.rating = filterRating;
      const res = await reviewApi.getProductReviews(productId, params);
      setReviews(res.data?.list || []);
      setAverageRating(res.data?.averageRating || '0.0');
      setTotalReviews(res.data?.totalReviews || 0);
    } catch (err) {
      console.error('ʧ:', err);
    }
  }, [productId, filterRating]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const renderStars = (count) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < count ? 'star' : 'star-outline'}
        size={14}
        color={i < count ? '#ff6b35' : '#ddd'}
      />
    ));
  };

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.sender_name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.reviewerName}>{item.sender_name || 'û'}</Text>
        </View>
        <View style={styles.stars}>
          {renderStars(item.rating)}
        </View>
      </View>
      <Text style={styles.reviewContent}>{item.content}</Text>
      {/* ͼƬ */}
      {item.images && (() => {
        try {
          const imgs = JSON.parse(item.images);
          if (imgs.length > 0) {
            return (
              <View style={styles.reviewImages}>
                {imgs.map((img, i) => (
                  <View key={i} style={styles.reviewImg}><Text style={styles.imgPlaceholder}>??</Text></View>
                ))}
              </View>
            );
          }
        } catch (e) {}
        return null;
      })()}
      <Text style={styles.reviewTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ָ */}
      <View style={styles.overview}>
        <View style={styles.scoreCenter}>
          <Text style={styles.score}>{averageRating}</Text>
          <Text style={styles.scoreLabel}>ۺ</Text>
          <Text style={styles.scoreCount}>{totalReviews}</Text>
        </View>
      </View>

      {/* ɸѡ */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, !filterRating && styles.filterBtnActive]}
          onPress={() => setFilterRating(null)}
        >
          <Text style={[styles.filterText, !filterRating && styles.filterTextActive]}>ȫ</Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.filterBtn, filterRating === r && styles.filterBtnActive]}
            onPress={() => setFilterRating(r)}
          >
            <Text style={[styles.filterText, filterRating === r && styles.filterTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderReview}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}></Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  overview: { backgroundColor: '#fff', padding: 20, alignItems: 'center', marginBottom: 8 },
  scoreCenter: { alignItems: 'center' },
  score: { fontSize: 40, fontWeight: 'bold', color: '#ff6b35' },
  scoreLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  scoreCount: { fontSize: 13, color: '#999', marginTop: 4 },
  filterRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginHorizontal: 4 },
  filterBtnActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#ff6b35', fontWeight: '600' },
  reviewCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ff6b35', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  reviewerName: { fontSize: 14, color: '#333' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewContent: { fontSize: 14, color: '#333', lineHeight: 20 },
  reviewImages: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reviewImg: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center' },
  imgPlaceholder: { fontSize: 24 },
  reviewTime: { fontSize: 12, color: '#ccc', marginTop: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});

