import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { cartApi } from '../api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/designSystem';
import { ContainerStyles, TextStyles, ButtonStyles } from '../theme/styles';

/**
 * 购物车页 - 企业级实现
 * 遵循 UI 设计方案 v2.0.0
 * 特性：性能优化、可访问性、用户体验
 */
export default function CartScreen({ navigation }) {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState('0.00');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const res = await cartApi.getCart();
      const items = res.data?.items || [];
      setCartItems(items);
      setTotal(res.data?.total || '0.00');
      // 重置选择状态
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error('加载购物车失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  };

  const handleRemove = async (id) => {
    Alert.alert(
      '确认删除',
      '确定要从购物车中删除此商品吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await cartApi.removeItem(id);
              loadCart();
            } catch (err) {
              Alert.alert('错误', err.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleUpdateQty = async (id, qty) => {
    if (qty < 1) return;
    try {
      await cartApi.updateQuantity(id, qty);
      loadCart();
    } catch (err) {
      Alert.alert('错误', err.message || '更新失败');
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = [...selectedIds];
    const index = newSelected.indexOf(id);
    if (index > -1) {
      newSelected.splice(index, 1);
    } else {
      newSelected.push(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.length === cartItems.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  const getSelectedTotal = () => {
    const selectedItems = cartItems.filter(item => selectedIds.includes(item.id));
    const total = selectedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    return total.toFixed(2);
  };

  const handleCheckout = () => {
    if (selectedIds.length === 0) {
      Alert.alert('提示', '请选择要结算的商品');
      return;
    }
    const selectedItems = cartItems.filter(item => selectedIds.includes(item.id));
    navigation.navigate('OrderCreate', { items: selectedItems });
  };

  const renderItem = ({ item }) => (
    <CartItemCard
      item={item}
      selected={selectedIds.includes(item.id)}
      onSelect={() => handleSelectItem(item.id)}
      onUpdateQty={(qty) => handleUpdateQty(item.id, qty)}
      onRemove={() => handleRemove(item.id)}
    />
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>正在加载...</Text>
      </View>
    );
  }

  return (
    <View style={ContainerStyles.main}>
      {/* 购物车列表 */}
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>购物车 ({cartItems.length})</Text>
            {cartItems.length > 0 && (
              <TouchableOpacity onPress={loadCart}>
                <Icon name="refresh-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="cart-outline" size={64} color={Colors.gray400} />
            <Text style={styles.emptyText}>购物车是空的</Text>
            <Text style={styles.emptyHint}>快去挑选心仪的商品吧</Text>
            <TouchableOpacity
              style={styles.goShopBtn}
              onPress={() => navigation.navigate('Home')}
              accessibilityLabel="去逛逛"
            >
              <Text style={styles.goShopText}>去逛逛</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={cartItems.length === 0 ? styles.emptyContainer : null}
        showsVerticalScrollIndicator={false}
      />

      {/* 底部结算栏 */}
      {cartItems.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.selectAllBtn}
            onPress={handleSelectAll}
            accessibilityLabel={selectAll ? '取消全选' : '全选'}
          >
            <View style={[styles.checkbox, selectAll && styles.checkboxChecked]}>
              {selectAll && <Icon name="checkmark" size={16} color={Colors.white} />}
            </View>
            <Text style={styles.selectAllText}>全选</Text>
          </TouchableOpacity>

          <View style={styles.totalArea}>
            <Text style={styles.totalText}>合计：</Text>
            <Text style={styles.totalAmount}>¥{selectedIds.length > 0 ? getSelectedTotal() : '0.00'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, selectedIds.length === 0 && styles.checkoutBtnDisabled]}
            onPress={handleCheckout}
            disabled={selectedIds.length === 0}
            accessibilityLabel={`结算 ${selectedIds.length} 件商品`}
          >
            <Text style={styles.checkoutText}>
              结算 ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * 购物车商品卡片组件
 */
function CartItemCard({ item, selected, onSelect, onUpdateQty, onRemove }) {
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.cartItem}>
      {/* 选择框 */}
      <TouchableOpacity
        style={styles.checkboxWrap}
        onPress={onSelect}
        accessibilityLabel={selected ? '取消选择' : '选择'}
      >
        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
          {selected && <Icon name="checkmark" size={16} color={Colors.white} />}
        </View>
      </TouchableOpacity>

      {/* 商品图片 */}
      <View style={styles.itemImage}>
        {item.image && !imageError ? (
          <Image
            source={{ uri: item.image }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="image-outline" size={28} color={Colors.gray400} />
          </View>
        )}
      </View>

      {/* 商品信息 */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemSpec}>{item.spec || '默认规格'}</Text>
        <View style={styles.itemBottom}>
          <Text style={styles.itemPrice}>¥{item.price}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQty(item.quantity - 1)}
              disabled={item.quantity <= 1}
              accessibilityLabel="减少数量"
            >
              <Text style={[styles.qtyBtnText, item.quantity <= 1 && styles.qtyBtnDisabled]}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQty(item.quantity + 1)}
              accessibilityLabel="增加数量"
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 删除按钮 */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onRemove}
        accessibilityLabel="删除商品"
      >
        <Icon name="trash-outline" size={20} color={Colors.gray500} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // 主容器
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },

  // 加载状态
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  // 头部
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },

  // 空状态
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textTertiary,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  emptyHint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing[5],
  },
  goShopBtn: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  goShopText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // 购物车商品卡片
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    alignItems: 'center',
  },
  checkboxWrap: {
    padding: Spacing[2],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // 商品图片
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.gray50,
    marginHorizontal: Spacing[2],
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 商品信息
  itemInfo: {
    flex: 1,
    marginLeft: Spacing[2],
  },
  itemName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing[1],
  },
  itemSpec: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing[2],
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },

  // 数量选择器
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  qtyBtnDisabled: {
    color: Colors.gray400,
  },
  qtyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    paddingHorizontal: Spacing[2],
  },

  // 删除按钮
  deleteBtn: {
    padding: Spacing[2],
  },

  // 底部结算栏
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[3],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingBottom: Spacing[4], // 为 iPhone 底部留出空间
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  selectAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  totalArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    marginRight: Spacing[3],
    gap: Spacing[1],
  },
  totalText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.base,
    ...Shadows.sm,
  },
  checkoutBtnDisabled: {
    backgroundColor: Colors.gray400,
  },
  checkoutText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
