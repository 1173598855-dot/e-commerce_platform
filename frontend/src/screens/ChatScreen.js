import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatApi } from "../api";

export default function ChatScreen({ route, navigation }) {
  const { otherUserId, otherUserName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showSessionList, setShowSessionList] = useState(!otherUserId);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (otherUserId) {
      loadMessages();
    } else {
      loadSessions();
    }
  }, [otherUserId]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadSessions = async () => {
    try {
      const res = await chatApi.getSessions();
      setSessions(res.data || []);
    } catch (err) {
      console.error("加载会话失败:", err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await chatApi.getMessages(otherUserId);
      setMessages(res.data || []);
    } catch (err) {
      console.error("加载消息失败:", err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), type: "user", content: inputText.trim(), from_me: true };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      await chatApi.sendMessage({ to_user_id: otherUserId, content: userMsg.content });
      loadMessages();
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.from_me || item.from_user_id === 1;
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.msgText, isUser ? styles.userText : styles.aiText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => {
        setShowSessionList(false);
        navigation.navigate("ChatRoom", { otherUserId: item.other_user_id, otherUserName: item.nickname });
      }}
    >
      <View style={styles.sessionAvatar}>
        <Text style={styles.sessionAvatarText}>{item.nickname?.charAt(0) || "?"}</Text>
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionName}>{item.nickname}</Text>
          <Text style={styles.sessionTime}>{new Date(item.last_message_time).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.sessionLastMsg} numberOfLines={1}>{item.last_content || "暂无消息"}</Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (showSessionList) {
    return (
      <View style={styles.container}>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.other_user_id.toString()}
          renderItem={renderSession}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>暂无聊天会话</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.msgList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>暂无消息</Text>
          </View>
        }
      />
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="输入消息..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!inputText.trim() || loading}>
          <Text style={styles.sendText}>{loading ? "..." : "发送"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  msgList: { padding: 16, flexGrow: 1 },
  msgRow: { flexDirection: "row", marginVertical: 4 },
  msgRowRight: { justifyContent: "flex-end" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgBubble: { maxWidth: "75%", padding: 12, borderRadius: 12 },
  userBubble: { backgroundColor: "#ff6b35" },
  aiBubble: { backgroundColor: "#fff" },
  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#fff" },
  aiText: { color: "#333" },
  inputArea: { flexDirection: "row", padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#eee" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, textAlignVertical: "top" },
  sendBtn: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "#ff6b35", borderRadius: 20, marginLeft: 8, justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#ccc" },
  sendText: { color: "#fff", fontWeight: "600" },
  sessionItem: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  sessionAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ff6b35", justifyContent: "center", alignItems: "center", marginRight: 12 },
  sessionAvatarText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
  sessionInfo: { flex: 1 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionName: { fontSize: 15, fontWeight: "600", color: "#333" },
  sessionTime: { fontSize: 11, color: "#ccc" },
  sessionLastMsg: { fontSize: 13, color: "#999", marginTop: 2 },
  badge: { backgroundColor: "#ff4444", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },
});
