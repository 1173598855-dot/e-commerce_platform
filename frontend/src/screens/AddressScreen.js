import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput
} from 'react-native';
import { Ionicons } from 'react-native-vector-icons';
import { addressApi } from '../api';

// йʡ
const PROVINCES = ['', 'Ϻ', '', '', '㽭', '', 'Ĵ', '', '', '', '', 'ɽ', '', 'ӱ', '', '', '', '', '', ''];
const CITIES = {
  '': ['', '', '', '', '̨'],
  'Ϻ': ['', 'ֶ', '', '', ''],
  '': ['', 'Խ', '', '', ''],
  '': ['', 'ɽ', '޺', '', ''],
  '㽭': ['', '', '', '', ''],
  '': ['Ͼ', '', '', '', ''],
  'Ĵ': ['ɶ', '', '', 'ϳ', '˱'],
  '': ['人', '˲', '', '', 'ʯ'],
  '': ['ɳ', '', '̶', '', ''],
  '': ['', '', 'Ȫ', '', ''],
  '': ['Ϸ', 'ߺ', '', '', ''],
  'ɽ': ['', 'ൺ', '̨', 'Ϋ', ''],
  '': ['֣', '', '', '', ''],
  'ӱ': ['ʯׯ', 'ɽ', 'ػʵ', '', ''],
  '': ['', '', 'ɽ', '˳', 'Ӫ'],
  '': ['', '', '', '', 'μ'],
  '': ['ϲ', 'Ž', '', '', '˴'],
  '': ['', '', '', '', 'Ϫ'],
  '': ['', '', '', '', ''],
  '': ['', '', '', 'Ĳ', ''],
};

export default function AddressScreen({ navigation, route }) {
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ֶ
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const res = await addressApi.getList();
      setAddresses(res.data || []);
    } catch (err) {
      console.error('صַʧ:', err);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const startEdit = (addr) => {
    setEditingId(addr.id);
    setReceiverName(addr.receiver_name);
    setReceiverPhone(addr.receiver_phone);
    setProvince(addr.province);
    setCity(addr.city);
    setDistrict(addr.district || '');
    setDetailAddress(addr.detail_address);
    setIsDefault(!!addr.is_default);
    setShowForm(true);
  };

  const resetForm = () => {
    setReceiverName('');
    setReceiverPhone('');
    setProvince('');
    setCity('');
    setDistrict('');
    setDetailAddress('');
    setIsDefault(false);
  };

  const handleSave = async () => {
    if (!receiverName || !receiverPhone || !province || !city || !detailAddress) {
      Alert.alert('ʾ', 'дϢ');
      return;
    }

    try {
      const data = {
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        province,
        city,
        district,
        detail_address: detailAddress,
        is_default: isDefault ? 1 : 0,
      };

      if (editingId) {
        await addressApi.update(editingId, data);
      } else {
        await addressApi.add(data);
      }
      Alert.alert('ɹ', editingId ? 'ַѸ' : 'ַ');
      setShowForm(false);
      loadAddresses();
    } catch (err) {
      Alert.alert('ʧ', err.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('ȷɾ', 'ȷҪɾõַ', [
      { text: 'ȡ', style: 'cancel' },
      {
        text: 'ɾ',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressApi.remove(id);
            loadAddresses();
          } catch (err) {
            Alert.alert('ɾʧ', err.message);
          }
        },
      },
    ]);
  };

  const handleSelectAddress = (addr) => {
    if (route.params?.onSelect) {
      route.params.onSelect(addr);
    }
    navigation.goBack();
  };

  const getDistricts = () => {
    if (!city && CITIES[province]) {
      return CITIES[province];
    }
    return ['Ĭ'];
  };

  // ͼ
  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>{editingId ? '༭ַ' : 'ַ'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.formSave}></Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>ջ</Text>
            <TextInput
              style={styles.input}
              value={receiverName}
              onChangeText={setReceiverName}
              placeholder=""
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>ֻ</Text>
            <TextInput
              style={styles.input}
              value={receiverPhone}
              onChangeText={setReceiverPhone}
              keyboardType="phone-pad"
              placeholder="11λֻ"
              maxLength={11}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>ʡ</Text>
            <View style={styles.pickerRow}>
              <FlatList
                data={PROVINCES}
                horizontal
                keyExtractor={item => item}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, province === item && styles.pickerItemSelected]}
                    onPress={() => { setProvince(item); setCity(''); setDistrict(''); }}
                  >
                    <Text style={[styles.pickerText, province === item && styles.pickerTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
          {province && (
            <View style={styles.inputRow}>
              <Text style={styles.label}></Text>
              <View style={styles.pickerRow}>
                <FlatList
                  data={CITIES[province] || ['Ĭϳ']}
                  horizontal
                  keyExtractor={item => item}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, city === item && styles.pickerItemSelected]}
                      onPress={() => setCity(item)}
                    >
                      <Text style={[styles.pickerText, city === item && styles.pickerTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}
          {city && (
            <View style={styles.inputRow}>
              <Text style={styles.label}></Text>
              <View style={styles.pickerRow}>
                <FlatList
                  data={getDistricts()}
                  horizontal
                  keyExtractor={item => item}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, district === item && styles.pickerItemSelected]}
                      onPress={() => setDistrict(item)}
                    >
                      <Text style={[styles.pickerText, district === item && styles.pickerTextSelected]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          )}
          <View style={styles.inputRow}>
            <Text style={styles.label}>ϸַ</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={detailAddress}
              onChangeText={setDetailAddress}
              placeholder="ֵƺŵ"
              multiline
            />
          </View>
          <TouchableOpacity style={styles.defaultRow} onPress={() => setIsDefault(!isDefault)}>
            <Ionicons name={isDefault ? 'checkmark-circle' : 'ellipse-outline'} size={22} color="#ff6b35" />
            <Text style={styles.defaultText}>ΪĬϵַ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // бͼ
  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.addressCard, item.is_default && styles.defaultBorder]}
            onPress={() => handleSelectAddress(item)}
          >
            <View style={styles.addressHeader}>
              <Text style={styles.receiver}>{item.receiver_name} {item.receiver_phone}</Text>
              {item.is_default && <Text style={styles.defaultTag}>Ĭ</Text>}
            </View>
            <Text style={styles.fullAddress}>
              {item.province}{item.city}{item.district} {item.detail_address}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                <Ionicons name="pencil" size={16} color="#ff6b35" />
                <Text style={styles.actionText}>༭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={16} color="#ff4444" />
                <Text style={[styles.actionText, { color: '#ff4444' }]}>ɾ</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>ջַ</Text>
          </View>
        }
        ListFooterComponent={() => (
          <TouchableOpacity style={styles.addBtn} onPress={startAdd}>
            <Ionicons name="add-circle" size={20} color="#ff6b35" />
            <Text style={styles.addBtnText}>µַ</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  formTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  formSave: { fontSize: 16, color: '#ff6b35', fontWeight: '600' },
  formBody: { padding: 16 },
  inputRow: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, backgroundColor: '#fafafa' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerRow: { flexDirection: 'row' },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 16, marginRight: 8, backgroundColor: '#fff' },
  pickerItemSelected: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  pickerText: { fontSize: 13, color: '#333' },
  pickerTextSelected: { color: '#ff6b35', fontWeight: '600' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  defaultText: { fontSize: 14, color: '#666' },
  addressCard: { backgroundColor: '#fff', padding: 16, marginBottom: 10, borderRadius: 8 },
  defaultBorder: { borderLeftWidth: 4, borderLeftColor: '#ff6b35' },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiver: { fontSize: 15, fontWeight: '600', color: '#333' },
  defaultTag: { fontSize: 12, color: '#ff6b35', backgroundColor: '#fff3ed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  fullAddress: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: '#ff6b35' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#fff', borderRadius: 8, marginHorizontal: 16, marginBottom: 20 },
  addBtnText: { fontSize: 15, color: '#ff6b35', fontWeight: '500' },
});

