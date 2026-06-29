import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function getSignalBars(level) {
  if (level >= -50) return 4;
  if (level >= -60) return 3;
  if (level >= -70) return 2;
  if (level >= -80) return 1;
  return 0;
}

function getSignalColor(level) {
  if (level >= -60) return '#4CAF50';
  if (level >= -75) return '#FF9800';
  return '#F44336';
}

function getSecurity(capabilities) {
  if (!capabilities) return 'Open';
  if (capabilities.includes('WPA3')) return 'WPA3';
  if (capabilities.includes('WPA2')) return 'WPA2';
  if (capabilities.includes('WPA')) return 'WPA';
  if (capabilities.includes('WEP')) return 'WEP';
  if (capabilities.includes('ESS')) return 'Open';
  return 'Unknown';
}

function needsPassword(capabilities) {
  if (!capabilities) return false;
  return capabilities.includes('WPA') || capabilities.includes('WEP');
}

function showToast(message) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

const MOCK_NETWORKS = [
  { SSID: 'Xiaomi_WiFi_5G', BSSID: '00:11:22:33:44:55', capabilities: 'WPA2-PSK', frequency: 5180, level: -45 },
  { SSID: 'TP-LINK_2.4G', BSSID: 'AA:BB:CC:DD:EE:FF', capabilities: 'WPA2-PSK', frequency: 2437, level: -60 },
  { SSID: 'Huawei-5G', BSSID: '11:22:33:44:55:66', capabilities: 'WPA3-PSK', frequency: 5500, level: -70 },
  { SSID: 'ChinaNet-Free', BSSID: '22:33:44:55:66:77', capabilities: 'ESS', frequency: 2412, level: -80 },
  { SSID: 'Office_WiFi', BSSID: '33:44:55:66:77:88', capabilities: 'WPA2-PSK', frequency: 2462, level: -55 },
  { SSID: 'Mi_WiFi_Guest', BSSID: '44:55:66:77:88:99', capabilities: 'WPA2-PSK', frequency: 5180, level: -65 },
];

export default function WifiScreen() {
  const [networks, setNetworks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [connectedSSID, setConnectedSSID] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    const permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
      permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return permissions.some((permission) => granted[permission] === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.warn('[WiFi] Permission request failed:', err);
      return false;
    }
  }, []);

  const scanWifi = useCallback(async () => {
    setScanning(true);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Location or nearby WiFi permission is required to scan networks.');
      setScanning(false);
      setRefreshing(false);
      return;
    }

    setTimeout(() => {
      setNetworks(MOCK_NETWORKS.map((item) => ({ ...item, timestamp: Date.now() })));
      setScanning(false);
      setRefreshing(false);
    }, 500);
  }, [requestPermissions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    scanWifi();
  }, [scanWifi]);

  const connectToWifi = useCallback((network) => {
    const security = getSecurity(network.capabilities);
    const message = needsPassword(network.capabilities)
      ? `${network.SSID} uses ${security}. Native password entry is not enabled yet.`
      : `Connect to open network ${network.SSID}?`;

    Alert.alert('Connect WiFi', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: () => {
          setConnectedSSID(network.SSID);
          showToast(`Connected to ${network.SSID}`);
        },
      },
    ]);
  }, []);

  const toggleWifi = useCallback((value) => {
    setWifiEnabled(value);
    if (value) {
      scanWifi();
      return;
    }
    setNetworks([]);
    setConnectedSSID('');
    showToast('WiFi disabled');
  }, [scanWifi]);

  useEffect(() => {
    scanWifi();
    setConnectedSSID('Xiaomi_WiFi_5G');
  }, [scanWifi]);

  const renderItem = useCallback(({ item }) => {
    const bars = getSignalBars(item.level);
    const color = getSignalColor(item.level);
    const security = getSecurity(item.capabilities);
    const isConnected = connectedSSID === item.SSID;

    return (
      <TouchableOpacity
        style={[styles.wifiItem, isConnected && styles.wifiItemConnected]}
        onPress={() => connectToWifi(item)}
        activeOpacity={0.7}
      >
        <View style={styles.signalIcon}>
          <Icon
            name={bars >= 3 ? 'wifi' : bars >= 1 ? 'wifi-tethering' : 'signal-wifi-off'}
            size={28}
            color={isConnected ? '#FFFFFF' : color}
          />
        </View>

        <View style={styles.wifiInfo}>
          <View style={styles.wifiNameRow}>
            <Text style={[styles.wifiName, isConnected && styles.wifiNameConnected]}>{item.SSID}</Text>
            {isConnected && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedBadgeText}>Connected</Text>
              </View>
            )}
          </View>
          <Text style={[styles.wifiDetail, isConnected && styles.wifiDetailConnected]}>
            {security} - {item.frequency >= 5000 ? '5GHz' : '2.4GHz'} - {item.level}dBm
          </Text>
        </View>

        {needsPassword(item.capabilities) && (
          <Icon name="lock" size={18} color={isConnected ? '#FFFFFF' : '#9E9E9E'} style={styles.lockIcon} />
        )}
      </TouchableOpacity>
    );
  }, [connectedSSID, connectToWifi]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="wifi" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>WiFi</Text>
        </View>
        <Switch
          value={wifiEnabled}
          onValueChange={toggleWifi}
          trackColor={{ false: '#555555', true: '#4CAF50' }}
          thumbColor={wifiEnabled ? '#FFFFFF' : '#CCCCCC'}
        />
      </View>

      <View style={styles.currentWifiCard}>
        <Icon name={connectedSSID ? 'check-circle' : 'info'} size={20} color={connectedSSID ? '#4CAF50' : '#FF9800'} />
        <Text style={styles.currentWifiText}>
          {connectedSSID ? `Connected to ${connectedSSID}` : 'Not connected'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.scanButton, (scanning || !wifiEnabled) && styles.scanButtonDisabled]}
        onPress={scanWifi}
        disabled={scanning || !wifiEnabled}
        activeOpacity={0.8}
      >
        {scanning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="refresh" size={20} color="#FFFFFF" />}
        <Text style={styles.scanButtonText}>{scanning ? 'Scanning...' : 'Scan WiFi'}</Text>
      </TouchableOpacity>

      {!wifiEnabled ? (
        <View style={styles.emptyState}>
          <Icon name="wifi-off" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>WiFi disabled</Text>
          <Text style={styles.emptySubtext}>Turn on WiFi to scan available networks.</Text>
        </View>
      ) : (
        <FlatList
          data={networks}
          renderItem={renderItem}
          keyExtractor={(item) => item.BSSID}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />}
          ListEmptyComponent={
            scanning ? null : (
              <View style={styles.emptyState}>
                <Icon name="wifi-find" size={64} color="#CCCCCC" />
                <Text style={styles.emptyText}>No WiFi networks found</Text>
                <Text style={styles.emptySubtext}>Tap Scan WiFi to try again.</Text>
              </View>
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.hotspotButton}
        onPress={() => Alert.alert('Hotspot', 'Open hotspot settings from the Android system settings page.')}
        activeOpacity={0.8}
      >
        <Icon name="router" size={22} color="#FF6B35" />
        <Text style={styles.hotspotButtonText}>Personal hotspot</Text>
        <Icon name="chevron-right" size={20} color="#9E9E9E" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    backgroundColor: '#1A1A2E',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  currentWifiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    gap: 10,
    elevation: 2,
  },
  currentWifiText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    gap: 8,
    elevation: 3,
  },
  scanButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 90,
  },
  wifiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  wifiItemConnected: {
    backgroundColor: '#FF6B35',
    elevation: 3,
  },
  signalIcon: {
    marginRight: 14,
  },
  wifiInfo: {
    flex: 1,
  },
  wifiNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  wifiName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  wifiNameConnected: {
    color: '#FFFFFF',
  },
  connectedBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  connectedBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  wifiDetail: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  wifiDetailConnected: {
    color: '#FFFFFF',
  },
  lockIcon: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#BDBDBD',
    marginTop: 8,
    textAlign: 'center',
  },
  hotspotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: 24,
  },
  hotspotButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
});
