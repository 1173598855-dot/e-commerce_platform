import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput
} from "react-native";
import { Ionicons } from "react-native-vector-icons";
import { merchantApi, productApi } from "../api";

export default function MerchantScreen({ navigation }) {
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 
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
      console.error("̼ʧ:", err);
    }
  };

  const handleApply = async () => {
    if (!shopName || !contactName || !contactPhone) {
      Alert.alert("ʾ", "дϢ");
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
      Alert.alert("ɹ", "פύȴ");
      setShowApplyForm(false);
    } catch (err) {
      Alert.alert("ʧ", err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (product) => {
    const newStatus = product.status === 1 ? 0 : 1;
    // úAPIƷ״̬
    Alert.alert("ʾ", newStatus === 1 ? "Ʒϼ" : "Ʒ¼");
  };

  const stats = [
    { label: "Ʒ", value: products.length, icon: "??" },
    { label: "ն", value: "0", icon: "??" },
    { label: "", value: "0", icon: "??" },
    { label: "", value: "4.8", icon: "?" },
  ];

  if (showApplyForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>̼פ</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}> *</Text>
            <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ϵ *</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="ϵ" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ϵ绰 *</Text>
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="ϵ绰" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ӫҵִպ</Text>
            <TextInput style={styles.input} value={license} onChangeText={setLicense} placeholder="ѡ" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>̽</Text>
            <TextInput style={[styles.input, styles.textArea]} value={desc} onChangeText={setDesc} multiline numberOfLines={3} placeholder="һĵ" />
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={loading}>
            <Text style={styles.submitText}>{loading ? "ύ..." : "ύ"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApplyForm(false)}>
            <Text style={styles.cancelText}>ȡ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ͳƿƬ */}
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Ʒ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ʒ</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#ff6b35" />
            <Text style={styles.addBtnText}>Ʒ</Text>
          </TouchableOpacity>
        </View>
        {products.slice(0, 5).map((p) => (
          <View key={p.id} style={styles.productItem}>
            <View style={styles.productImg}>
              <Text style={styles.imgPlaceholder}>??</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productPrice}>{p.price}</Text>
              <Text style={styles.productMeta}> {p.sales} |  {p.stock}</Text>
            </View>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleProductStatus(p)}>
              <Text style={[styles.toggleText, p.status === 1 ? { color: "#4caf50" } : { color: "#ff9800" }]}>
                {p.status === 1 ? "ϼ" : "¼"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* פ */}
      <TouchableOpacity style={styles.applyCard} onPress={() => setShowApplyForm(true)}>
        <Text style={styles.applyTitle}>?? Ҫ</Text>
        <Text style={styles.applyDesc}>Ϊ̼ңĵ֮</Text>
        <Text style={styles.applyHint}> ?</Text>
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

