import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pointsApi } from '../api';

export default function PointsScreen() {
  const [points, setPoints] = useState(0);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ptsRes, logsRes] = await Promise.all([
        pointsApi.getPoints(),
        pointsApi.getLogs({ page: 1, pageSize: 50 }),
      ]);
      setPoints(ptsRes.data.points || 0);
      setLogs(logsRes.data?.list || []);
    } catch (err) {
      console.error('加载积分失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderLog = ({ item }) => {
    const isGain = item.points > 0;
    return (
      <View style={styles.logItem}>
        <View style={[styles.logIcon, { backgroundColor: isGain ? '#fff3ed' : '#f0f0f0' }]}>
          <Ionicons
            name={isGain ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={isGain ? '#ff6b35' : '#666'}
          />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logDesc}>{item.description || (isGain ? '获得积分' : '消耗积分')}</Text>
          <Text style={styles.logTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.logPoints, { color: isGain ? '#ff6b35' : '#666' }]}>
          {isGain ? '+' : ''}{item.points}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 积分卡片 */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>我的积分</Text>
        <Text style={styles.pointsValue}>{points}</Text>
        <Text style={styles.pointsHint}>积分可兑换商品和优惠券</Text>
        <View style={styles.pointsActions}>
          <TouchableOpacity style={styles.pointsActionBtn}>
            <Ionicons name="gift-outline" size={20} color="#ff6b35" />
            <Text style={styles.pointsActionText}>积分兑换</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pointsActionBtn}>
            <Ionicons name="information-circle-outline" size={20} color="#ff6b35" />
            <Text style={styles.pointsActionText}>积分规则</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 积分明细 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>积分明细</Text>
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderLog}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>暂无积分记录</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  pointsCard: { backgroundColor: 'linear-gradient(135deg, #ff6b35, #ff8f65)', padding: 24, marginBottom: 8 },
  pointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  pointsValue: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  pointsHint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  pointsActions: { flexDirection: 'row', marginTop: 20, gap: 32 },
  pointsActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsActionText: { fontSize: 14, color: '#fff' },
  section: { flex: 1, backgroundColor: '#fff', borderTopWidth: 8, borderTopColor: '#f5f5f5' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', padding: 16 },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  logIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logInfo: { flex: 1 },
  logDesc: { fontSize: 14, color: '#333' },
  logTime: { fontSize: 12, color: '#ccc', marginTop: 2 },
  logPoints: { fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});
