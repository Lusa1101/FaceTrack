import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DownloadReportsScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#185a9d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download Reports</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="download" size={22} color="#185a9d" />
          <Text style={styles.cardTitle}>Download Attendance CSV</Text>
        </View>
        <TouchableOpacity style={styles.registerBtn}>
          <Text style={styles.registerBtnText}>Download CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16, paddingTop: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#185a9d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#185a9d', marginLeft: 8 },
  registerBtn: { backgroundColor: '#43cea2', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 8 },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
