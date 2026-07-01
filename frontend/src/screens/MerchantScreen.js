import React, { useEffect, useState } from 'react';
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
import { merchantApi, productApi } from '../api';

export default function MerchantScreen({ navigation }) {
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [license, setLicense] = useState('');
  const [desc, setDesc] = useState('');

  const loadData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        merchantApi.getInfo(),
        productApi.getList({ page: 1, pageSize: 20 }),
      ]);
      setMerchant(mRes.data);
      setProducts(pRes.data?.list || []);
    } catch (err) {
      setMerchant(null);
      setProducts([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async () => {
    if (!shopName || !contactName || !contactPhone) {
      Alert.alert('资料不完整', '请填写店铺名称、联系人和联系电话');
      return;
    }
    setLoading(true);
    try {
      await merchantApi.apply({
        name: shopName,
        contact_name: contactName,
        contact_phone: contactPhone,
        business_license: license,
        description: desc,
      });
      Alert.alert('已提交', '入驻申请已提交，等待审核');
      setShowApplyForm(false);
    } catch (err) {
      Alert.alert('提交失败', err.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: '商品', value: products.length, icon: 'cube-outline' },
    { label: '待审核', value: '-', icon: 'time-outline' },
    { label: '售后', value: '-', icon: 'shield-checkmark-outline' },
    { label: '评分', value: '4.8', icon: 'star-outline' },
  ];

  if (showApplyForm) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formCard}>
        <Text style={styles.formTitle}>商家入驻</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>店铺名称 *</Text>
          <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="请输入店铺名称" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>联系人 *</Text>
          <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="请输入联系人" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>联系电话 *</Text>
          <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="请输入手机号" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>营业执照</Text>
          <TextInput style={styles.input} value={license} onChangeText={setLicense} placeholder="请输入营业执照编号" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>店铺说明</Text>
          <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} multiline numberOfLines={3} placeholder="介绍经营范围" />
        </View>
        <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={loading}>
          <Text style={styles.submitText}>{loading ? '提交中...' : '提交申请'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApplyForm(false)}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{merchant?.name || '商家后台'}</Text>
        <Text style={styles.headerDesc}>处理商品、发货和售后审核等日常运营工作</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Ionicons name={item.icon} size={22} color="#ff6b35" />
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>运营工具</Text>
        <TouchableOpacity style={styles.toolItem} onPress={() => navigation.navigate("MerchantRefundReview")}>
          <View style={styles.toolIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#ff6b35" />
          </View>
          <View style={styles.toolBody}>
            <Text style={styles.toolTitle}>售后审核</Text>
            <Text style={styles.toolDesc}>查看退款申请、凭证扫描状态、审核时间线并处理通过或拒绝</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolItem} onPress={() => navigation.navigate("ShippingManagement")}>
          <View style={styles.toolIcon}>
            <Ionicons name="cube-outline" size={22} color="#ff6b35" />
          </View>
          <View style={styles.toolBody}>
            <Text style={styles.toolTitle}>Shipping Management</Text>
            <Text style={styles.toolDesc}>Process paid orders, submit local tracking numbers, and review local logistics traces.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolItem} onPress={() => navigation.navigate("OperationsCenter")}>
          <View style={styles.toolIcon}>
            <Ionicons name="document-text-outline" size={22} color="#ff6b35" />
          </View>
          <View style={styles.toolBody}>
            <Text style={styles.toolTitle}>Operations Center</Text>
            <Text style={styles.toolDesc}>Create local export placeholders and review operation log records.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolItem} onPress={() => navigation.navigate("PermissionManagement")}>
          <View style={styles.toolIcon}>
            <Ionicons name="key-outline" size={22} color="#ff6b35" />
          </View>
          <View style={styles.toolBody}>
            <Text style={styles.toolTitle}>Permission Management</Text>
            <Text style={styles.toolDesc}>Review and update role permission points for local operations workflows.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>商品概览</Text>
        </View>
        {products.slice(0, 5).map((product) => (
          <View key={product.id} style={styles.productItem}>
            <View style={styles.productImg}>
              <Ionicons name="cube-outline" size={22} color="#bbb" />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.productPrice}>￥{product.price}</Text>
              <Text style={styles.productMeta}>销量 {product.sales || 0} · 库存 {product.stock || 0}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.applyCard} onPress={() => setShowApplyForm(true)}>
        <Text style={styles.applyTitle}>申请或更新商家资料</Text>
        <Text style={styles.applyDesc}>提交店铺主体信息，等待平台审核</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerCard: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  headerDesc: { marginTop: 5, fontSize: 13, color: '#777', lineHeight: 18 },
  statsGrid: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, marginBottom: 8 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 17, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 11, color: '#999' },
  section: { backgroundColor: '#fff', marginBottom: 8, padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  toolItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  toolIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff3ed', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toolBody: { flex: 1 },
  toolTitle: { fontSize: 15, color: '#333', fontWeight: '600' },
  toolDesc: { fontSize: 12, color: '#777', lineHeight: 18, marginTop: 3 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  productImg: { width: 54, height: 54, borderRadius: 6, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, color: '#333', fontWeight: '500' },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#ff6b35', marginTop: 2 },
  productMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  applyCard: { margin: 12, padding: 18, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ffe0cc' },
  applyTitle: { fontSize: 16, fontWeight: '700', color: '#ff6b35' },
  applyDesc: { fontSize: 13, color: '#777', marginTop: 5 },
  formCard: { padding: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#333' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#ff6b35', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#999', fontSize: 15 },
});
