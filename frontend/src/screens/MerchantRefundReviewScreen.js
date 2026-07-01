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

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'requested', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'refunding', label: '退款中' },
];

const STATUS_LABELS = {
  requested: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  refunding: '退款中',
  refunded: '已退款',
  failed: '失败',
};

const SCAN_LABELS = {
  pending: '待扫描',
  passed: '通过',
  failed: '未通过',
  quarantined: '已隔离',
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '-';
}

function scanLabel(status) {
  return SCAN_LABELS[status] || status || '-';
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '--';
  return `￥${value}`;
}

function evidenceReady(evidence = []) {
  if (!evidence.length) return true;
  return evidence.every((item) => item.scan_status === 'passed');
}

export default function MerchantRefundReviewScreen() {
  const [activeFilter, setActiveFilter] = useState('requested');
  const [refunds, setRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [bypassScan, setBypassScan] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const listParams = useMemo(() => {
    const params = { pageSize: 20 };
    if (activeFilter !== 'all') params.status = activeFilter;
    if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
    return params;
  }, [activeFilter, searchKeyword]);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.listRefunds(listParams);
      const list = res.data?.list || [];
      setRefunds(list);
      if (selectedRefund && !list.some((item) => item.id === selectedRefund.id)) {
        setSelectedRefund(null);
      }
    } catch (err) {
      Alert.alert('退款列表加载失败', err.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [listParams, selectedRefund]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRefunds();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const res = await orderApi.exportRefunds(listParams);
      const data = res.data || {};
      Alert.alert('Export placeholder', `${data.total || 0} refund records matched. File generation is not enabled locally yet.`);
    } catch (err) {
      Alert.alert('Export failed', err.message || 'Please try again later');
    }
  };

  const openDetail = async (refund) => {
    setReviewNote('');
    setBypassScan(false);
    try {
      const res = await orderApi.getRefundDetail(refund.id);
      setSelectedRefund(res.data);
    } catch (err) {
      Alert.alert('退款详情加载失败', err.message || '请稍后重试');
    }
  };

  const submitReview = async (nextStatus) => {
    if (!selectedRefund) return;
    if (nextStatus === 'rejected' && !reviewNote.trim()) {
      Alert.alert('请填写审核备注', '拒绝退款需要说明原因');
      return;
    }
    if (bypassScan && !reviewNote.trim()) {
      Alert.alert('请填写审核备注', '绕过扫描必须留下人工审核说明');
      return;
    }

    setSubmitting(true);
    try {
      await orderApi.reviewRefund(selectedRefund.id, {
        status: nextStatus,
        note: reviewNote.trim(),
        evidenceScanBypass: bypassScan,
      });
      Alert.alert('审核已提交', nextStatus === 'approved' ? '退款已通过审核' : '退款已拒绝');
      await loadRefunds();
      await openDetail(selectedRefund);
    } catch (err) {
      Alert.alert('审核失败', err.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRefundItem = ({ item }) => {
    const selected = selectedRefund?.id === item.id;
    return (
      <TouchableOpacity style={[styles.refundItem, selected && styles.refundItemSelected]} onPress={() => openDetail(item)}>
        <View style={styles.refundItemHeader}>
          <Text style={styles.refundId}>#{item.id} {item.order_no}</Text>
          <Text style={styles.refundStatus}>{statusLabel(item.status)}</Text>
        </View>
        <Text style={styles.refundReason} numberOfLines={1}>{item.reason || '未填写原因'}</Text>
        <View style={styles.refundMetaRow}>
          <Text style={styles.refundMeta}>{formatMoney(item.amount)}</Text>
          <Text style={styles.refundMeta}>{item.order_status || '-'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEvidence = (item) => (
    <View key={item.id} style={styles.evidenceItem}>
      <View style={styles.evidenceHeader}>
        <Text style={styles.evidenceType}>{item.evidence_type || 'evidence'} #{item.id}</Text>
        <Text style={[styles.scanBadge, item.scan_status === 'passed' && styles.scanBadgePassed]}>{scanLabel(item.scan_status)}</Text>
      </View>
      <Text style={styles.evidenceText}>{item.description || '无说明'}</Text>
      <Text style={styles.evidenceText}>{item.content_type || '-'} · {item.file_size || 0} bytes</Text>
      <Text style={styles.evidenceText}>对象：{item.object_key || '-'}</Text>
      <Text style={styles.evidenceText}>保留：{item.retention_policy || 'standard'} / {item.retention_days || '-'} 天</Text>
      <Text style={styles.evidenceText}>到期：{item.retention_expires_at || '-'}</Text>
      {item.scan_result ? <Text style={styles.evidenceText}>扫描结果：{item.scan_result}</Text> : null}
    </View>
  );

  const renderDetail = () => {
    if (!selectedRefund) {
      return (
        <View style={styles.emptyDetail}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyDetailText}>选择一条退款单查看审核详情</Text>
        </View>
      );
    }

    const canReview = selectedRefund.status === 'requested';
    const evidence = selectedRefund.evidence || [];
    const allEvidenceReady = evidenceReady(evidence);

    return (
      <ScrollView style={styles.detailPanel} contentContainerStyle={styles.detailContent}>
        <View style={styles.detailHeader}>
          <View>
            <Text style={styles.detailTitle}>退款单 #{selectedRefund.id}</Text>
            <Text style={styles.detailSubTitle}>{selectedRefund.order_no}</Text>
          </View>
          <Text style={styles.detailStatus}>{statusLabel(selectedRefund.status)}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>退款金额</Text>
            <Text style={styles.infoValue}>{formatMoney(selectedRefund.amount)}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>订单状态</Text>
            <Text style={styles.infoValue}>{selectedRefund.order_status || '-'}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>证据状态</Text>
            <Text style={styles.infoValue}>{allEvidenceReady ? '可审核' : '待处理'}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>退款原因</Text>
          <Text style={styles.bodyText}>{selectedRefund.reason || '未填写原因'}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>商品</Text>
          {(selectedRefund.items || []).map((item) => (
            <View key={`${item.product_id}-${item.product_name}`} style={styles.productLine}>
              <Text style={styles.productName} numberOfLines={2}>{item.product_name}</Text>
              <Text style={styles.productMeta}>x{item.quantity} · {formatMoney(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>凭证与扫描</Text>
          {evidence.length ? evidence.map(renderEvidence) : <Text style={styles.bodyText}>暂无凭证</Text>}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>审核时间线</Text>
          {(selectedRefund.events || []).length ? selectedRefund.events.map((event, index) => (
            <View key={`${event.to_status}-${index}`} style={styles.timelineItem}>
              <Text style={styles.timelineTitle}>{event.from_status} -> {event.to_status}</Text>
              <Text style={styles.timelineText}>{event.note || '无备注'}</Text>
            </View>
          )) : <Text style={styles.bodyText}>暂无事件</Text>}
        </View>

        {canReview && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>审核处理</Text>
            {!allEvidenceReady && (
              <TouchableOpacity style={styles.bypassRow} onPress={() => setBypassScan(!bypassScan)}>
                <Ionicons name={bypassScan ? 'checkbox-outline' : 'square-outline'} size={22} color="#ff6b35" />
                <Text style={styles.bypassText}>管理员人工绕过证据扫描阻断</Text>
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.noteInput}
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="填写审核备注，拒绝或绕过扫描时必填"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.reviewActions}>
              <TouchableOpacity style={[styles.rejectButton, submitting && styles.disabledButton]} disabled={submitting} onPress={() => submitReview('rejected')}>
                <Text style={styles.rejectText}>拒绝</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.approveButton, submitting && styles.disabledButton]} disabled={submitting} onPress={() => submitReview('approved')}>
                <Text style={styles.approveText}>通过</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.filterText, activeFilter === filter.key && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="Order no or reason"
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#ff6b35" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.listPanel}>
          <FlatList
            data={refunds}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderRefundItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>{loading ? '加载中...' : '暂无退款单'}</Text>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 10, height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fafafa' },
  searchInput: { flex: 1, fontSize: 13, color: '#333', paddingVertical: 0 },
  exportButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fff' },
  filterChipActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#ff6b35', fontWeight: '600' },
  contentRow: { flex: 1 },
  listPanel: { maxHeight: 260, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  refundItem: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  refundItemSelected: { backgroundColor: '#fff8f5' },
  refundItemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  refundId: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  refundStatus: { fontSize: 13, color: '#ff6b35', fontWeight: '600' },
  refundReason: { marginTop: 5, fontSize: 13, color: '#666' },
  refundMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  refundMeta: { fontSize: 12, color: '#999' },
  detailPanel: { flex: 1 },
  detailContent: { padding: 12, paddingBottom: 28 },
  emptyList: { padding: 24, alignItems: 'center' },
  emptyListText: { color: '#999', fontSize: 14 },
  emptyDetail: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyDetailText: { color: '#999', fontSize: 14, marginTop: 10 },
  detailHeader: { backgroundColor: '#fff', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: 17, color: '#333', fontWeight: '700' },
  detailSubTitle: { fontSize: 12, color: '#999', marginTop: 4 },
  detailStatus: { fontSize: 14, color: '#ff6b35', fontWeight: '700' },
  infoGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  infoCell: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  infoLabel: { fontSize: 12, color: '#999' },
  infoValue: { marginTop: 5, fontSize: 14, color: '#333', fontWeight: '600' },
  block: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginTop: 10 },
  blockTitle: { fontSize: 15, color: '#333', fontWeight: '700', marginBottom: 8 },
  bodyText: { fontSize: 13, color: '#666', lineHeight: 20 },
  productLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  productName: { flex: 1, fontSize: 13, color: '#333' },
  productMeta: { fontSize: 12, color: '#999' },
  evidenceItem: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 8 },
  evidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  evidenceType: { flex: 1, fontSize: 13, color: '#333', fontWeight: '600' },
  scanBadge: { fontSize: 12, color: '#d63031', backgroundColor: '#fff0f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  scanBadgePassed: { color: '#008060', backgroundColor: '#e8f8f2' },
  evidenceText: { marginTop: 5, fontSize: 12, color: '#666', lineHeight: 17 },
  timelineItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  timelineTitle: { fontSize: 13, color: '#333', fontWeight: '600' },
  timelineText: { marginTop: 3, fontSize: 12, color: '#777' },
  bypassRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bypassText: { flex: 1, fontSize: 13, color: '#333' },
  noteInput: { minHeight: 76, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, padding: 10, fontSize: 14, color: '#333', backgroundColor: '#fafafa' },
  reviewActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  rejectButton: { paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#d63031', borderRadius: 6 },
  rejectText: { color: '#d63031', fontSize: 14, fontWeight: '600' },
  approveButton: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#ff6b35', borderRadius: 6 },
  approveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
});
