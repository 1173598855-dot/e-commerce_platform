import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { authApi, userApi } from '../api';
import { authStore } from '../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/designSystem';
import { ContainerStyles } from '../theme/styles';

/**
 * 个人中心页 - 企业级实现
 * 遵循 UI 设计方案 v2.0.0
 * 特性：性能优化、可访问性、用户体验
 */
export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    coupons: 0,
    points: 0,
    favorites: 0,
    cartCount: 0,
  });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      global.userInfo = res.data;
    } catch (err) {
      console.error('加载用户信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // 并行加载统计数据
      const statsRes = await userApi.getStats();

      setStats(statsRes);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadStats()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          await authStore.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const orderTabs = [
    { name: '待付款', key: 'pending', icon: 'wallet-outline' },
    { name: '待发货', key: 'paid', icon: 'cube-outline' },
    { name: '待收货', key: 'shipped', icon: 'car-outline' },
    { name: '待评价', key: 'completed', icon: 'chatbox-outline' },
    { name: '退换货', key: 'cancelled', icon: 'return-up-back-outline' },
  ];

  const quickEntries = [
    { name: '优惠券', icon: 'pricetag-outline', screen: 'Coupons', count: stats.coupons },
    { name: '积分', icon: 'gift-outline', screen: 'Points', count: stats.points },
    { name: '收藏', icon: 'heart-outline', screen: 'Favorites', count: stats.favorites },
    { name: '足迹', icon: 'time-outline', screen: 'History', count: null },
  ];

  const menuItems = [
    { name: '我的订单', icon: 'document-text-outline', screen: 'OrderList', color: Colors.primary },
    { name: '收货地址', icon: 'location-outline', screen: 'Addresses', color: Colors.secondary },
    { name: 'AI 推荐', icon: 'sparkles-outline', screen: 'Recommend', color: Colors.info },
    { name: 'AI 客服', icon: 'chatbubble-ellipses-outline', screen: 'AiChat', color: Colors.success },
    { name: '消息通知', icon: 'notifications-outline', screen: 'Notifications', color: Colors.warning },
    { name: '数据看板', icon: 'bar-chart-outline', screen: 'DataDashboard', color: Colors.error },
    { name: '设置', icon: 'settings-outline', screen: 'Settings', color: Colors.gray600 },
  ];

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
      <FlatList
        data={menuItems}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            {/* 用户信息卡片 */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {user?.nickname?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.nickname || '未登录'}
                </Text>
                <Text style={styles.userPhone}>
                  {user?.phone || '点击登录'}
                </Text>
                {user?.member_level > 0 && (
                  <View style={styles.memberBadge}>
                    <Icon name="diamond" size={12} color={Colors.warning} />
                    <Text style={styles.memberText}>
                      {user.member_level === 1 ? '普通会员' : 
                       user.member_level === 2 ? '银卡会员' : '金卡会员'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('EditProfile')}
                accessibilityLabel="编辑个人资料"
              >
                <Icon name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>编辑</Text>
              </TouchableOpacity>
            </View>

            {/* 快捷入口 */}
            <View style={styles.quickCard}>
              {quickEntries.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickItem}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                  accessibilityLabel={item.name}
                >
                  <View style={styles.quickIconWrap}>
                    <Icon name={item.icon} size={24} color={Colors.primary} />
                    {item.count !== null && item.count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {item.count > 99 ? '99+' : item.count}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quickLabel}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 订单卡片 */}
            <View style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>我的订单</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('OrderList')}
                  accessibilityLabel="查看全部订单"
                >
                  <Text style={styles.seeMore}>查看全部 ›</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.orderTabList}>
                {orderTabs.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.orderTab}
                    onPress={() => navigation.navigate('OrderList', { status: item.key })}
                    accessibilityLabel={item.name}
                  >
                    <View style={styles.orderTabIcon}>
                      <Icon name={item.icon} size={24} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.orderTabText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 菜单列表 */}
            <View style={styles.menuCard}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.menuItemLast
                  ]}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                  accessibilityLabel={item.name}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                    <Icon name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.name}</Text>
                  <Icon name="chevron-forward" size={16} color={Colors.gray400} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        renderItem={() => null}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              accessibilityLabel="退出登录"
            >
              <Text style={styles.logoutText}>退出登录</Text>
            </TouchableOpacity>
            <Text style={styles.version}>版本 v1.0.0</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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

  // 列表内容
  listContent: {
    paddingBottom: Spacing[5],
  },

  // 用户信息卡片
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    backgroundColor: Colors.white,
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing[4],
  },
  userName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  userPhone: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[1],
    gap: Spacing[1],
  },
  memberText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning,
    fontWeight: Typography.fontWeight.medium,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },

  // 快捷入口
  quickCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickIconWrap: {
    position: 'relative',
    marginBottom: Spacing[2],
  },
  quickLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  badge: {
    position: 'absolute',
    top: -Spacing[2],
    right: -Spacing[2],
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing[1],
  },
  badgeText: {
    fontSize: Typography.fontSize.xs - 2,
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },

  // 订单卡片
  orderCard: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  seeMore: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textTertiary,
  },
  orderTabList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  orderTab: {
    alignItems: 'center',
    minWidth: 56,
  },
  orderTabIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  orderTabText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },

  // 菜单列表
  menuCard: {
    backgroundColor: Colors.white,
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  menuText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },

  // 底部
  footer: {
    padding: Spacing[4],
  },
  logoutBtn: {
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  logoutText: {
    color: Colors.error,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  version: {
    textAlign: 'center',
    fontSize: Typography.fontSize.xs,
    color: Colors.textTertiary,
  },
});
