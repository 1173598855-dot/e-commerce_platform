import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from "react-native";
import { dataApi } from "../api";

const { width } = Dimensions.get("window");

export default function DataDashboardScreen() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ovRes, trRes, rkRes] = await Promise.all([
        dataApi.getOverview(),
        dataApi.getSalesTrend(7),
        dataApi.getProductRanking(5),
      ]);
      setOverview(ovRes.data);
      setTrend(trRes.data || []);
      setRanking(rkRes.data || []);
    } catch (err) {
      console.error("加载数据失败:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!overview) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const maxAmount = Math.max(...trend.map((t) => parseFloat(t.amount) || 0), 1);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* 概览卡片 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据概览</Text>
        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.users}</Text>
            <Text style={styles.statLabel}>总用户</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.products}</Text>
            <Text style={styles.statLabel}>商品数</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{overview.totalOrders}</Text>
            <Text style={styles.statLabel}>总订单</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Y{parseFloat(overview.todayAmount || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>今日销售额</Text>
          </View>
        </View>
      </View>

      {/* 今日数据 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今日数据</Text>
        <View style={styles.todayCard}>
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>今日订单</Text>
            <Text style={styles.todayValue}>{overview.todayOrders || 0}</Text>
          </View>
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>今日销售额</Text>
            <Text style={[styles.todayValue, { color: "#ff6b35" }]}>
              Y{parseFloat(overview.todayAmount || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* 销售趋势 */}
      {trend.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>近7日销售趋势</Text>
          <View style={styles.chart}>
            {trend.map((t, i) => (
              <View key={i} style={styles.barItem}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      { height: (parseFloat(t.amount) / maxAmount) * 100, backgroundColor: "#ff6b35" },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{t.date ? t.date.substring(5) : ""}</Text>
                <Text style={styles.barValue}>Y{parseFloat(t.amount || 0).toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 热销排行 */}
      {ranking.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>热销排行</Text>
          {ranking.map((item, index) => (
            <View key={item.id} style={styles.rankingItem}>
              <View style={[styles.rankNum, index < 3 ? styles.top3 : styles.otherRank]}>
                <Text style={styles.rankNumText}>{index + 1}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rankSales}>销量: {item.total_sold || 0}</Text>
              </View>
              <Text style={styles.rankAmount}>Y{parseFloat(item.total_amount || 0).toFixed(0)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: "#999" },
  section: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  statCard: { width: "50%", padding: 16, alignItems: "center", borderBottomWidth: 1, borderColor: "#f5f5f5" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#ff6b35" },
  statLabel: { fontSize: 12, color: "#999", marginTop: 4 },
  todayCard: { padding: 16, backgroundColor: "#fff8f5", borderRadius: 8 },
  todayRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  todayLabel: { fontSize: 14, color: "#666" },
  todayValue: { fontSize: 18, fontWeight: "bold", color: "#333" },
  chart: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 140, paddingHorizontal: 8 },
  barItem: { alignItems: "center", flex: 1 },
  barWrapper: { width: 24, height: 100, justifyContent: "flex-end", borderRadius: 4, backgroundColor: "#f5f5f5" },
  bar: { width: "100%", borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 10, color: "#999", marginTop: 4 },
  barValue: { fontSize: 9, color: "#ff6b35", marginTop: 2 },
  rankingItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  rankNum: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
  top3: { backgroundColor: "#ff6b35" },
  otherRank: { backgroundColor: "#eee" },
  rankNumText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, color: "#333" },
  rankSales: { fontSize: 12, color: "#999", marginTop: 2 },
  rankAmount: { fontSize: 14, fontWeight: "600", color: "#ff6b35" },
});
