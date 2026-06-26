import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator
} from "react-native";
import { Ionicons } from "react-native-vector-icons";
import { productApi, searchApi } from "../api";

export default function SearchScreen({ route, navigation }) {
  const initialKeyword = route.params?.keyword || "";
  const [keyword, setKeyword] = useState(initialKeyword);
  const [results, setResults] = useState([]);
  const [hotKeywords, setHotKeywords] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialKeyword);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadHotKeywords();
  }, []);

  useEffect(() => {
    if (initialKeyword) {
      doSearch(initialKeyword);
    }
  }, [initialKeyword]);

  const loadHotKeywords = async () => {
    try {
      const res = await searchApi.getHot();
      setHotKeywords(res.data || []);
    } catch (err) {
      // ignore
    }
  };

  const doSearch = async (kw) => {
    if (!kw.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setShowSuggestions(false);
    try {
      const res = await productApi.search(kw.trim());
      setResults(res.data?.list || []);
      // ʷ
      searchApi.saveHistory({ keyword: kw.trim() }).catch(() => {});
    } catch (err) {
      console.error("ʧ:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text) => {
    setKeyword(text);
    if (text.trim().length > 0) {
      searchApi.getSuggestions(text.trim())
        .then((res) => {
          setSuggestions(res.data || []);
          setShowSuggestions(true);
        })
        .catch(() => {});
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSearch = () => {
    doSearch(keyword);
  };

  return (
    <View style={styles.container}>
      {/*  */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="ƷƷ"
            value={keyword}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSearch}
            autoFocus={!initialKeyword}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}></Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#ff6b35" /></View>
      ) : showSuggestions && suggestions.length > 0 ? (
        /*  */
        <View style={styles.suggestionCard}>
          {suggestions.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionItem}
              onPress={() => { setKeyword(item.text); doSearch(item.text); }}
            >
              <Ionicons name="swap-horizontal" size={16} color="#999" />
              <Text style={styles.suggestionText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : hasSearched ? (
        /*  */
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => navigation.navigate("ProductDetail", { id: item.id })}>
              <View style={styles.resultImg}>
                <Text style={styles.imgPlaceholder}>??</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultPrice}>{item.price}</Text>
                  <Text style={styles.resultSales}> {item.sales || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>ûҵƷ</Text>
            </View>
          }
        />
      ) : (
        /* Ѱ */
        <View style={styles.hotSection}>
          <Text style={styles.sectionTitle}>?? </Text>
          <View style={styles.hotGrid}>
            {hotKeywords.map((kw, i) => (
              <TouchableOpacity
                key={i}
                style={styles.hotTag}
                onPress={() => { setKeyword(kw); doSearch(kw); }}
              >
                <Text style={styles.hotTagText}>{kw}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  searchBar: { flexDirection: "row", padding: 12, backgroundColor: "#fff", gap: 8, alignItems: "center" },
  searchInputWrap: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#ff6b35", borderRadius: 20 },
  searchBtnText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  suggestionCard: { backgroundColor: "#fff", margin: 12, borderRadius: 8, overflow: "hidden" },
  suggestionItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  suggestionText: { fontSize: 14, color: "#333" },
  hotSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  hotGrid: { flexDirection: "flex-wrap", gap: 8 },
  hotTag: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#ffe0cc" },
  hotTagText: { fontSize: 13, color: "#ff6b35" },
  resultItem: { flexDirection: "row", backgroundColor: "#fff", padding: 12, marginBottom: 1, alignItems: "center" },
  resultImg: { width: 80, height: 80, borderRadius: 6, backgroundColor: "#f9f9f9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  imgPlaceholder: { fontSize: 28 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, color: "#333", lineHeight: 20 },
  resultDesc: { fontSize: 12, color: "#999", marginTop: 4 },
  resultMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  resultPrice: { fontSize: 16, fontWeight: "bold", color: "#ff6b35" },
  resultSales: { fontSize: 12, color: "#999" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 16 },
});

