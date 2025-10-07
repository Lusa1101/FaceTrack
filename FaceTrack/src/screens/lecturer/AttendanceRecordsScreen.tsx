import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const mockSessions = [
  { id: 1, subject: 'Mathematics', date: '2025-09-20', time: '10:00', present: 22, students: ['202345678', '202345679'] },
  { id: 2, subject: 'Physics', date: '2025-09-18', time: '12:00', present: 18, students: ['202345678'] },
];

export default function AttendanceRecordsScreen({ navigation }: any) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#185a9d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Records</Text>
      </View>
      <FlatList
        data={mockSessions}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedSession(item)}>
            <View style={styles.card}>
              <View style={styles.attendanceRow}>
                <Text style={styles.subject}>{item.subject}</Text>
                <Text style={styles.date}>{item.date} {item.time}</Text>
                <Text style={styles.present}>{item.present} Present</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      {selectedSession && (
        <View style={{ marginTop: 10, backgroundColor: '#eafaf1', borderRadius: 10, padding: 10 }}>
          <Text style={{ color: '#185a9d', fontWeight: 'bold' }}>Session: {selectedSession.subject}</Text>
          <Text>Date: {selectedSession.date} {selectedSession.time}</Text>
          <Text>Students Present:</Text>
          {selectedSession.students.map((item: string) => (
            <Text key={item} style={{ color: '#43cea2', fontWeight: 'bold' }}>{item}</Text>
          ))}
          <TouchableOpacity style={[styles.updateBtn, { marginTop: 8 }]} onPress={() => setSelectedSession(null)}>
            <Text style={styles.updateBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16, paddingTop: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#185a9d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, marginBottom: 10 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  subject: { fontSize: 15, color: '#185a9d', flex: 1 },
  date: { fontSize: 14, color: '#636e72', width: 90, textAlign: 'center' },
  present: { color: '#43cea2', fontWeight: 'bold', fontSize: 18 },
  updateBtn: { backgroundColor: '#eafaf1', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16 },
  updateBtnText: { color: '#185a9d', fontWeight: 'bold' },
});
