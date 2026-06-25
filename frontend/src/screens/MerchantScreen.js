import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { merchantApi, productApi } from "../api";

export default function MerchantScreen({ navigation }) {
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 申请表单
  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [license, setLicense] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        merchantApi.getInfo(),
        productApi.getList({ page: 1, pageSize: 20 }),
      ]);
      setMerchant(mRes.data);
      setProducts(pRes.data?.list || []);
    } catch (err) {
      console.error("加载商家数据失败:", err);
    }
  };

  const handleApply = async () => {
    if (!shopName || !contactName || !contactPhone) {
      Alert.alert("提示", "请填写必填信息");
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
      Alert.alert("成功", "入驻申请已提交，等待审核");
      setShowApplyForm(false);
    } catch (err) {
      Alert.alert("失败", err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    // 这里调用后端API更新商品状态
    Alert.alert("提示", newStatus === 1 ? "商品已上架" : "商品已下架");
  };

  const stats = [
    { label: "商品总数", value: products.length, icon: "📦" },
    { label: "今日订单", value: "0", icon: "📋" },
    { label: "今日收入", value: "¥0", icon: "💰" },
    { label: "店铺评分", value: "4.8", icon: "⭐" },
  ];

  if (showApplyForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>商家入驻申请</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>店铺名称 *</Text>
            <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="请输入店铺名称" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>联系人 *</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="请输入联系人姓名" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>联系电话 *</Text>
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="请输入联系电话" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>营业执照号</Text>
            <TextInput style={styles.input} value={license} onChangeText={setLicense} placeholder="选填" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>店铺介绍</Text>
            <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} multiline numberOfLines={3} placeholder="介绍一下您的店铺" />
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={loading}>
            <Text style={styles.submitText}>{loading ? "提交中..." : "提交申请"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApplyForm(false)}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 统计卡片 */}
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 商品管理 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>商品管理</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#ff6b35" />
            <Text style={styles.addBtnText}>发布商品</Text>
          </TouchableOpacity>
        </View>
        {products.slice(0, 5).map((p) => (
          <View key={p.id} style={styles.productItem}>
            <View style={styles.productImg}>
              <Text style={styles.imgPlaceholder}>📷</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productPrice}>¥{p.price}</Text>
              <Text style={styles.productMeta}>已售 {p.sales} | 库存 {p.stock}</Text>
            </View>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleProductStatus(p)}>
              <Text style={[styles.toggleText, p.status === 1 ? { color: "#4caf50" } : { color: "#ff9800" }]}>
                {p.status === 1 ? "已上架" : "已下架"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 入驻入口 */}
      <TouchableOpacity style={styles.applyCard} onPress={() => setShowApplyForm(true)}>
        <Text style={styles.applyTitle}>🏪 我要开店</Text>
        <Text style={styles.applyDesc}>成为商家，开启您的电商之旅</Text>
        <Text style={styles.applyHint}>点击立即申请 ›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#fff", padding: 12 },
  statCard: { width: "25%", alignItems: "center", paddingVertical: 12 },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#ff6b35" },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  section: { backgroundColor: "#fff", marginTop: 8, padding: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 13, color: "#ff6b35" },
  productItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  productImg: { width: 60, height: 60, borderRadius: 6, backgroundColor: "#f9f9f9", justifyContent: "center", alignItems: "center", marginRight: 10 },
  imgPlaceholder: { fontSize: 20 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, color: "#333", fontWeight: "500" },
  productPrice: { fontSize: 14, fontWeight: "bold", color: "#ff6b35", marginTop: 2 },
  productMeta: { fontSize: 11, color: "#999", marginTop: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  toggleText: { fontSize: 12, fontWeight: "600" },
  applyCard: { margin: 12, padding: 20, backgroundColor: "#fff", borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#ffe0cc" },
  applyTitle: { fontSize: 18, fontWeight: "600", color: "#ff6b35" },
  applyDesc: { fontSize: 13, color: "#999", marginTop: 4 },
  applyHint: { fontSize: 13, color: "#ff6b35", marginTop: 12 },
  formCard: { padding: 16 },
  formTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 20, textAlign: "center" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: "#333", fontWeight: "500", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, backgroundColor: "#fafafa" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  submitBtn: { backgroundColor: "#ff6b35", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  cancelText: { color: "#999", fontSize: 15 },
});
