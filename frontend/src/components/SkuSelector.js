import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { skuApi, favoriteApi } from '../api';

// SKU规格选择弹窗
export default function SkuSelector({ visible, productId, onClose, onConfirm }) {
  const [specOptions, setSpecOptions] = useState({});
  const [skus, setSkus] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState({});
  const [selectedSku, setSelectedSku] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && productId) {
      loadSkuData();
    }
  }, [visible, productId]);

  const loadSkuData = async () => {
    setLoading(true);
    try {
      const [optionsRes, skusRes] = await Promise.all([
        skuApi.getOptions(productId),
        skuApi.getList(productId),
      ]);
      setSpecOptions(optionsRes.data || {});
      setSkus(skusRes.data || []);
      
      // 重置选择
      setSelectedSpecs({});
      setSelectedSku(null);
      setQuantity(1);
    } catch (err) {
      console.error('加载SKU失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecSelect = (specName, value) => {
    const newSpecs = { ...selectedSpecs, [specName]: value };
    setSelectedSpecs(newSpecs);

    // 自动匹配SKU
    if (skus.length > 0) {
      const matched = skus.find(sku => {
        const specArr = typeof sku.spec === 'string' ? JSON.parse(sku.spec) : sku.spec;
        return Object.entries(newSpecs).every(([key, val]) => 
          specArr[key] === val
        );
      });
      setSelectedSku(matched || null);
    }
  };

  const handleConfirm = () => {
    if (!selectedSku && Object.keys(specOptions).length > 0) {
      Alert.alert('提示', '请选择规格');
      return;
    }
    onConfirm({
      sku: selectedSku || skus[0],
      quantity,
      specs: selectedSpecs,
    });
  };

  const specNames = Object.keys(specOptions);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>选择规格</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmBtn}>确定</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* 规格选择 */}
            {specNames.length > 0 && (
              <View style={styles.specSection}>
                {specNames.map(name => (
                  <View key={name} style={styles.specGroup}>
                    <Text style={styles.specName}>{name}</Text>
                    <View style={styles.specValues}>
                      {specOptions[name].map(val => {
                        const isSelected = selectedSpecs[name] === val;
                        return (
                          <TouchableOpacity
                            key={val}
                            style={[styles.specValue, isSelected && styles.specValueSelected]}
                            onPress={() => handleSpecSelect(name, val)}
                          >
                            <Text style={[styles.specValueText, isSelected && styles.specValueTextSelected]}>
                              {val}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 数量选择 */}
            <View style={styles.specGroup}>
              <Text style={styles.specName}>数量</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 选中的SKU信息 */}
            {selectedSku && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedPrice}>
                  ¥{typeof selectedSku.price === 'number' ? selectedSku.price.toFixed(2) : selectedSku.price}
                </Text>
                <Text style={styles.selectedStock}>库存：{selectedSku.stock || 0}件</Text>
                {selectedSku.sku_code && (
                  <Text style={styles.selectedCode}>编码：{selectedSku.sku_code}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 17, fontWeight: '600', color: '#333' },
  confirmBtn: { fontSize: 16, color: '#ff6b35', fontWeight: '600' },
  body: { padding: 16 },
  specSection: { marginBottom: 16 },
  specGroup: { marginBottom: 16 },
  specName: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 10 },
  specValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specValue: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 20 },
  specValueSelected: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  specValueText: { fontSize: 13, color: '#333' },
  specValueTextSelected: { color: '#ff6b35', fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 40, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { fontSize: 20, color: '#333' },
  qtyValue: { paddingHorizontal: 24, fontSize: 16, color: '#333' },
  selectedInfo: { marginTop: 12, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 },
  selectedPrice: { fontSize: 20, fontWeight: 'bold', color: '#ff6b35' },
  selectedStock: { fontSize: 13, color: '#999', marginTop: 4 },
  selectedCode: { fontSize: 12, color: '#bbb', marginTop: 2 },
});

