import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { paymentApi } from '../api';

export default function PaymentScreen({ route, navigation }) {
  const { orderId, amount } = route.params;
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('alipay');

  const methods = [
    { id: 'alipay', name: '支付宝', icon: '💳', desc: '推荐使用' },
    { id: 'wechat', name: '微信支付', icon: '💚', desc: '快捷支付' },
    { id: 'card', name: '银行卡', icon: '🏦', desc: '储蓄卡/信用卡' },
  ];

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await paymentApi.mockPayment({ orderId, paymentMethod: selectedMethod });
      Alert.alert(
        '支付成功',
        `交易号: ${res.data.transactionId}\n金额: Y${res.data.amount}`,
        [{ text: '完成', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('支付失败', err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>支付金额</Text>
        <Text style={styles.amountValue}>Y{amount}</Text>
      </View>

      <View style={styles.methodCard}>
        <Text style={styles.cardTitle}>选择支付方式</Text>
        {methods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodItem, selectedMethod === method.id && styles.methodItemSelected]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={styles.methodLeft}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDesc}>{method.desc}</Text>
              </View>
            </View>
            <View style={styles.radio}>
              {selectedMethod === method.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>💡 这是模拟支付，不会产生真实扣款</Text>
      </View>

      <View style={styles.submitArea}>
        <TouchableOpacity
          style={[styles.payBtn, paying && styles.payBtnLoading]}
          onPress={handlePay}
          disabled={paying}
        >
          <Text style={styles.payText}>
            {paying ? '支付处理中...' : `确认支付 Y${amount}`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  amountCard: { backgroundColor: '#fff', padding: 24, alignItems: 'center', marginBottom: 8 },
  amountLabel: { fontSize: 14, color: '#999' },
  amountValue: { fontSize: 36, fontWeight: 'bold', color: '#ff6b35', marginTop: 8 },
  methodCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  methodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  methodItemSelected: { backgroundColor: '#fff8f5', paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 4 },
  methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { fontSize: 24 },
  methodName: { fontSize: 15, color: '#333', fontWeight: '500' },
  methodDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff6b35' },
  noteCard: { padding: 16, marginBottom: 8 },
  noteText: { fontSize: 13, color: '#999' },
  submitArea: { padding: 16, paddingBottom: 32 },
  payBtn: { backgroundColor: '#ff6b35', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  payBtnLoading: { opacity: 0.7 },
  payText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
