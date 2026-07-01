import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { authApi } from '../api';

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'customer', label: 'Customer' },
];

const PERMISSION_LABELS = {
  'permission:manage': 'Permission management',
  'refund:list': 'Refund list',
  'refund:detail': 'Refund detail',
  'refund:review': 'Refund review',
  'refund:submit': 'Refund submit',
  'order:ship': 'Order shipping',
  'product:manage': 'Product management',
};

function normalizePermissions(data) {
  const rolePermissions = data?.rolePermissions || data?.permissions || [];
  const availablePermissions = data?.availablePermissions || data?.allPermissions || rolePermissions;
  return {
    selected: rolePermissions.map(String),
    available: [...new Set(availablePermissions.map(String))].sort(),
  };
}

export default function PermissionManagementScreen() {
  const [activeRole, setActiveRole] = useState('merchant');
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
  const permissionDiff = useMemo(() => {
    const before = new Set(originalPermissions);
    const after = new Set(selectedPermissions);
    return {
      added: selectedPermissions.filter((permission) => !before.has(permission)),
      removed: originalPermissions.filter((permission) => !after.has(permission)),
    };
  }, [originalPermissions, selectedPermissions]);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listRolePermissions(activeRole);
      const normalized = normalizePermissions(res.data || {});
      setAvailablePermissions(normalized.available);
      setSelectedPermissions(normalized.selected);
      setOriginalPermissions(normalized.selected);
      setConfirming(false);
    } catch (err) {
      Alert.alert('Permission load failed', err.message || 'Please try again later');
    } finally {
      setLoading(false);
    }
  }, [activeRole]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await authApi.listPermissionAuditLogs({ role: activeRole, pageSize: 5 });
      setAuditLogs(res.data?.list || []);
    } catch (err) {
      setAuditLogs([]);
    }
  }, [activeRole]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const togglePermission = (permission) => {
    setSelectedPermissions((current) => {
      if (current.includes(permission)) return current.filter((item) => item !== permission);
      return [...current, permission].sort();
    });
  };

  const savePermissions = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    try {
      await authApi.updateRolePermissions(activeRole, selectedPermissions);
      Alert.alert('Permissions saved', `${activeRole} permissions were updated`);
      await loadPermissions();
      await loadAuditLogs();
      setConfirming(false);
    } catch (err) {
      Alert.alert('Permission save failed', err.message || 'Please try again later');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.roleBar}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={[styles.roleChip, activeRole === role.key && styles.roleChipActive]}
            onPress={() => setActiveRole(role.key)}
          >
            <Text style={[styles.roleText, activeRole === role.key && styles.roleTextActive]}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPermissions} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Role permissions</Text>
          <Text style={styles.summaryText}>{activeRole} has {selectedPermissions.length} selected permission points.</Text>
        </View>

        {confirming && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Confirm Changes</Text>
            <Text style={styles.summaryText}>Added: {permissionDiff.added.length ? permissionDiff.added.join(', ') : 'none'}</Text>
            <Text style={styles.summaryText}>Removed: {permissionDiff.removed.length ? permissionDiff.removed.join(', ') : 'none'}</Text>
          </View>
        )}

        <View style={styles.permissionList}>
          {availablePermissions.map((permission) => {
            const checked = selectedSet.has(permission);
            return (
              <TouchableOpacity key={permission} style={styles.permissionItem} onPress={() => togglePermission(permission)}>
                <Ionicons name={checked ? 'checkbox-outline' : 'square-outline'} size={22} color={checked ? '#ff6b35' : '#999'} />
                <View style={styles.permissionBody}>
                  <Text style={styles.permissionTitle}>{PERMISSION_LABELS[permission] || permission}</Text>
                  <Text style={styles.permissionCode}>{permission}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {!availablePermissions.length && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{loading ? 'Loading permissions...' : 'No permissions available'}</Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Recent Audit Logs</Text>
          {auditLogs.length ? auditLogs.map((log) => (
            <View key={log.id} style={styles.auditItem}>
              <Text style={styles.permissionTitle}>{log.action} · {log.target_key}</Text>
              <Text style={styles.permissionCode}>{log.created_at || '-'}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No audit logs</Text>}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} disabled={saving} onPress={savePermissions}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>{saving ? 'Saving...' : confirming ? 'Confirm Save' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  roleBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  roleChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#ff6b35', backgroundColor: '#fff3ed' },
  roleText: { fontSize: 13, color: '#666', fontWeight: '600' },
  roleTextActive: { color: '#ff6b35' },
  content: { flex: 1 },
  summaryCard: { margin: 12, padding: 14, backgroundColor: '#fff', borderRadius: 8 },
  summaryTitle: { fontSize: 16, color: '#333', fontWeight: '700' },
  summaryText: { marginTop: 5, fontSize: 13, color: '#777', lineHeight: 18 },
  permissionList: { backgroundColor: '#fff' },
  permissionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  permissionBody: { flex: 1 },
  permissionTitle: { fontSize: 14, color: '#333', fontWeight: '600' },
  permissionCode: { marginTop: 3, fontSize: 12, color: '#999' },
  auditItem: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  emptyState: { padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  footer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { height: 44, borderRadius: 6, backgroundColor: '#ff6b35', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});
