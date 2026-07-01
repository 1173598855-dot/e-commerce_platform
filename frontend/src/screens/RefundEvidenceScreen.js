import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { orderApi } from '../api';

const SAMPLE_FILES = [
  { key: 'image', label: '商品破损照片', fileName: 'refund-proof.jpg', contentType: 'image/jpeg', fileSize: 512 * 1024, evidenceType: 'image' },
  { key: 'video', label: '开箱问题视频', fileName: 'unboxing-proof.mp4', contentType: 'video/mp4', fileSize: 3 * 1024 * 1024, evidenceType: 'video' },
  { key: 'document', label: '检测报告 PDF', fileName: 'quality-report.pdf', contentType: 'application/pdf', fileSize: 768 * 1024, evidenceType: 'document' },
];

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

function buildChecksum(file) {
  return `mock:${file.contentType}:${file.fileSize}:${file.fileName}`;
}

export default function RefundEvidenceScreen({ route, navigation }) {
  const { orderId, orderNo, amount } = route.params || {};
  const [reason, setReason] = useState('商品与描述不符，需要售后处理');
  const [description, setDescription] = useState('已上传凭证，请审核');
  const [selectedFileKey, setSelectedFileKey] = useState(SAMPLE_FILES[0].key);
  const [refundId, setRefundId] = useState(null);
  const [uploadIntent, setUploadIntent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedFile = useMemo(
    () => SAMPLE_FILES.find((file) => file.key === selectedFileKey) || SAMPLE_FILES[0],
    [selectedFileKey]
  );

  const submitEvidenceFlow = async () => {
    if (!orderId) {
      Alert.alert('无法申请售后', '缺少订单编号，请返回订单列表重试');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('请填写退款原因', '原因会进入售后审核记录');
      return;
    }

    setSubmitting(true);
    try {
      const refundRes = await orderApi.requestRefund({
        orderId,
        refundType: 'full',
        reason: reason.trim(),
      });
      const createdRefundId = refundRes.data?.refundId || refundRes.data?.id;
      if (!createdRefundId) throw new Error('退款申请创建失败');
      setRefundId(createdRefundId);

      const intentRes = await orderApi.createRefundEvidenceUploadIntent(createdRefundId, {
        fileName: selectedFile.fileName,
        contentType: selectedFile.contentType,
        fileSize: selectedFile.fileSize,
      });
      const intent = intentRes.data;
      if (!intent?.objectKey || !intent?.publicUrl) throw new Error('上传凭证合同无效');
      setUploadIntent(intent);

      await orderApi.addRefundEvidence(createdRefundId, {
        url: intent.publicUrl,
        type: selectedFile.evidenceType,
        description: description.trim(),
        objectKey: intent.objectKey,
        contentType: selectedFile.contentType,
        fileSize: selectedFile.fileSize,
        checksum: buildChecksum(selectedFile),
      });

      Alert.alert('凭证已提交', '售后申请和 mock 上传凭证已记录，等待审核扫描结果', [
        { text: '返回订单', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('提交失败', err.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons name="receipt-outline" size={22} color="#ff6b35" />
        </View>
        <View style={styles.summaryBody}>
          <Text style={styles.summaryTitle}>{orderNo || `订单 ${orderId || '-'}`}</Text>
          <Text style={styles.summaryMeta}>退款金额：￥{amount || '--'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>退款原因</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={120}
          placeholder="请描述售后原因"
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>选择 mock 凭证</Text>
        {SAMPLE_FILES.map((file) => {
          const selected = file.key === selectedFileKey;
          return (
            <TouchableOpacity
              key={file.key}
              style={[styles.fileOption, selected && styles.fileOptionSelected]}
              onPress={() => setSelectedFileKey(file.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? '#ff6b35' : '#999'} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileLabel}>{file.label}</Text>
                <Text style={styles.fileMeta}>{file.fileName} · {file.contentType} · {formatSize(file.fileSize)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>凭证说明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={120}
          placeholder="补充凭证说明"
          textAlignVertical="top"
        />
      </View>

      {(refundId || uploadIntent) && (
        <View style={styles.statusPanel}>
          <Text style={styles.statusTitle}>提交状态</Text>
          {refundId && <Text style={styles.statusText}>退款单：#{refundId}</Text>}
          {uploadIntent && <Text style={styles.statusText}>对象：{uploadIntent.objectKey}</Text>}
          {uploadIntent && <Text style={styles.statusText}>方式：{uploadIntent.provider} {uploadIntent.method}</Text>}
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submitEvidenceFlow}
        disabled={submitting}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        <Text style={styles.submitText}>{submitting ? '提交中...' : '申请售后并上传凭证'}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>真实文件选择器接入前，当前仅演示 mock 上传流程，不会读取本机相册或文档；接入 OSS/COS/S3 后可复用同一提交链路。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 12, paddingBottom: 28 },
  summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff3ed', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  summaryBody: { flex: 1 },
  summaryTitle: { fontSize: 15, color: '#333', fontWeight: '600' },
  summaryMeta: { marginTop: 4, fontSize: 13, color: '#666' },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10 },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 6, backgroundColor: '#fafafa', color: '#333', fontSize: 14, paddingHorizontal: 10, paddingVertical: 9 },
  textArea: { minHeight: 74 },
  fileOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 8, backgroundColor: '#fff' },
  fileOptionSelected: { borderColor: '#ff6b35', backgroundColor: '#fff8f5' },
  fileInfo: { flex: 1, marginLeft: 10 },
  fileLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  fileMeta: { marginTop: 3, fontSize: 12, color: '#777', lineHeight: 17 },
  statusPanel: { backgroundColor: '#eef7ff', borderRadius: 8, padding: 12, marginBottom: 10 },
  statusTitle: { fontSize: 14, color: '#0b6fb3', fontWeight: '600', marginBottom: 6 },
  statusText: { fontSize: 12, color: '#31556f', lineHeight: 18 },
  submitButton: { minHeight: 48, borderRadius: 8, backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { marginTop: 12, fontSize: 12, color: '#888', lineHeight: 18 },
});
