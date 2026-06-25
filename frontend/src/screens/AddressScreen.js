import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addressApi } from '../api';

// 中国省份数据
const PROVINCES = ['北京', '上海', '广州', '深圳', '浙江', '江苏', '四川', '湖北', '湖南', '福建', '安徽', '山东', '河南', '河北', '辽宁', '陕西', '江西', '云南', '广西', '海南'];
const CITIES = {
  '北京': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'],
  '上海': ['黄浦区', '浦东新区', '静安区', '徐汇区', '长宁区'],
  '广州': ['天河区', '越秀区', '海珠区', '荔湾区', '白云区'],
  '深圳': ['福田区', '南山区', '罗湖区', '宝安区', '龙岗区'],
  '浙江': ['杭州', '宁波', '温州', '嘉兴', '湖州'],
  '江苏': ['南京', '苏州', '无锡', '常州', '徐州'],
  '四川': ['成都', '绵阳', '德阳', '南充', '宜宾'],
  '湖北': ['武汉', '宜昌', '襄阳', '荆州', '黄石'],
  '湖南': ['长沙', '株洲', '湘潭', '衡阳', '岳阳'],
  '福建': ['福州', '厦门', '泉州', '漳州', '莆田'],
  '安徽': ['合肥', '芜湖', '蚌埠', '阜阳', '安庆'],
  '山东': ['济南', '青岛', '烟台', '潍坊', '临沂'],
  '河南': ['郑州', '洛阳', '开封', '南阳', '安阳'],
  '河北': ['石家庄', '唐山', '秦皇岛', '邯郸', '保定'],
  '辽宁': ['沈阳', '大连', '鞍山', '抚顺', '营口'],
  '陕西': ['西安', '咸阳', '宝鸡', '榆林', '渭南'],
  '江西': ['南昌', '九江', '赣州', '上饶', '宜春'],
  '云南': ['昆明', '大理', '丽江', '曲靖', '玉溪'],
  '广西': ['南宁', '柳州', '桂林', '梧州', '北海'],
  '海南': ['海口', '三亚', '儋州', '文昌', '琼海'],
};

export default function AddressScreen({ navigation, route }) {
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 表单字段
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
      console.error('加载地址失败:', err);
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
      Alert.alert('提示', '请填写完整信息');
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
      Alert.alert('成功', editingId ? '地址已更新' : '地址已添加');
      setShowForm(false);
      loadAddresses();
    } catch (err) {
      Alert.alert('失败', err.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('确认删除', '确定要删除该地址吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressApi.remove(id);
            loadAddresses();
          } catch (err) {
            Alert.alert('删除失败', err.message);
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
    return ['默认区域'];
  };

  // 表单视图
  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>{editingId ? '编辑地址' : '新增地址'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.formSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>收货人</Text>
            <TextInput
              style={styles.input}
              value={receiverName}
              onChangeText={setReceiverName}
              placeholder="姓名"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              value={receiverPhone}
              onChangeText={setReceiverPhone}
              keyboardType="phone-pad"
              placeholder="11位手机号"
              maxLength={11}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.label}>省份</Text>
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
              <Text style={styles.label}>城市</Text>
              <View style={styles.pickerRow}>
                <FlatList
                  data={CITIES[province] || ['默认城市']}
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
              <Text style={styles.label}>区县</Text>
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
            <Text style={styles.label}>详细地址</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={detailAddress}
              onChangeText={setDetailAddress}
              placeholder="街道、门牌号等"
              multiline
            />
          </View>
          <TouchableOpacity style={styles.defaultRow} onPress={() => setIsDefault(!isDefault)}>
            <Ionicons name={isDefault ? 'checkmark-circle' : 'ellipse-outline'} size={22} color="#ff6b35" />
            <Text style={styles.defaultText}>设为默认地址</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 列表视图
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
              {item.is_default && <Text style={styles.defaultTag}>默认</Text>}
            </View>
            <Text style={styles.fullAddress}>
              {item.province}{item.city}{item.district} {item.detail_address}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                <Ionicons name="pencil" size={16} color="#ff6b35" />
                <Text style={styles.actionText}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={16} color="#ff4444" />
                <Text style={[styles.actionText, { color: '#ff4444' }]}>删除</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>暂无收货地址</Text>
          </View>
        }
        ListFooterComponent={() => (
          <TouchableOpacity style={styles.addBtn} onPress={startAdd}>
            <Ionicons name="add-circle" size={20} color="#ff6b35" />
            <Text style={styles.addBtnText}>添加新地址</Text>
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
