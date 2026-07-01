import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { orderApi } from '../api';

const EXPORT_TYPES = [
  { key: 'refunds', label: 'Refunds' },
  { key: 'orders', label: 'Orders' },
  { key: 'permission_audits', label: 'Permissions' },
  { key: 'operation_logs', label: 'Operations' },
];

export default function OperationsCenterScreen() {
  const [activeTab, setActiveTab] = useState('exports');
  const [activeExportType, setActiveExportType] = useState('refunds');
  const [exportJobs, setExportJobs] = useState([]);
  const [operationLogs, setOperationLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadExports = useCallback(async () => {
    const res = await orderApi.listExportJobs({ exportType: activeExportType });
    setExportJobs(res.data?.list || []);
  }, [activeExportType]);

  const loadLogs = useCallback(async () => {
    const res = await orderApi.listOperationLogs({ pageSize: 20 });
    setOperationLogs(res.data?.list || []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'exports') await loadExports();
      else await loadLogs();
    } catch (err) {
      Alert.alert('加载失败', err.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadExports, loadLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createExportJob = async () => {
    setCreating(true);
    try {
      await orderApi.createExportJob({ exportType: activeExportType, filters: { source: 'operations-center' } });
      Alert.alert('导出任务已记录', '本地占位任务已创建，暂不生成文件');
      await loadExports();
    } catch (err) {
      Alert.alert('创建失败', err.message || '请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  const renderExportJob = ({ item }) => (
    <View style={styles.rowItem}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>#{item.id} {item.export_type}</Text>
        <Text style={styles.statusBadge}>{item.status}</Text>
      </View>
      <Text style={styles.rowMeta}>{item.message || 'File generation is disabled locally.'}</Text>
      <Text style={styles.rowMeta}>{item.created_at || '-'}</Text>
    </View>
  );

  const renderOperationLog = ({ item }) => (
    <View style={styles.rowItem}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>{item.action}</Text>
        <Text style={styles.statusBadge}>{item.operator_role || '-'}</Text>
      </View>
      <Text style={styles.rowMeta}>{item.target_type || '-'} · {item.target_id || '-'}</Text>
      <Text style={styles.rowMeta}>{item.created_at || '-'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'exports' && styles.tabButtonActive]} onPress={() => setActiveTab('exports')}>
          <Ionicons name="download-outline" size={18} color={activeTab === 'exports' ? '#ff6b35' : '#777'} />
          <Text style={[styles.tabText, activeTab === 'exports' && styles.tabTextActive]}>Export Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'logs' && styles.tabButtonActive]} onPress={() => setActiveTab('logs')}>
          <Ionicons name="list-outline" size={18} color={activeTab === 'logs' ? '#ff6b35' : '#777'} />
          <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>Operation Logs</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'exports' ? (
        <View style={styles.content}>
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {EXPORT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.filterChip, activeExportType === type.key && styles.filterChipActive]}
                  onPress={() => setActiveExportType(type.key)}
                >
                  <Text style={[styles.filterText, activeExportType === type.key && styles.filterTextActive]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.createButton, creating && styles.disabledButton]} disabled={creating} onPress={createExportJob}>
              <Ionicons name="add-outline" size={18} color="#fff" />
              <Text style={styles.createText}>{creating ? 'Creating...' : 'Create Placeholder'}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={exportJobs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderExportJob}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Loading...' : 'No export jobs'}</Text>}
          />
        </View>
      ) : (
        <FlatList
          style={styles.content}
          data={operationLogs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOperationLog}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{loading ? 'Loading...' : 'No operation logs'}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  tabButtonActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  tabText: { fontSize: 13, color: '#777', fontWeight: '600' },
  tabTextActive: { color: '#ff6b35' },
  content: { flex: 1 },
  filterBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#ff6b35' },
  createButton: { marginTop: 10, height: 40, borderRadius: 6, backgroundColor: '#ff6b35', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  rowItem: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  rowTitle: { flex: 1, fontSize: 14, color: '#333', fontWeight: '700' },
  statusBadge: { fontSize: 12, color: '#ff6b35', backgroundColor: '#fff3ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  rowMeta: { marginTop: 5, fontSize: 12, color: '#777', lineHeight: 17 },
  emptyText: { padding: 28, textAlign: 'center', color: '#999', fontSize: 14 },
});
