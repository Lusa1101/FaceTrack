import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';

const student = {
  faceRegistered: false,
  attendancePercent: 80,
  recentAttendance: [
    { subject: 'Mathematics', date: '2025-09-18', status: 'present' },
    { subject: 'Physics', date: '2025-09-17', status: 'absent' },
    { subject: 'Chemistry', date: '2025-09-16', status: 'present' },
    { subject: 'Biology', date: '2025-09-15', status: 'present' },
    { subject: 'English', date: '2025-09-14', status: 'present' },
  ],
  notifications: [
    { id: 1, text: 'Next class: Physics at 10:00 AM' },
    { id: 2, text: 'Warning: Attendance below 85%' },
  ],
};

type RootStackParamList = {
  AuthLanding: undefined;
  StudentDashboard: undefined;
  FaceRegistrationCamera: undefined;
  FaceDataManagement: undefined;
  AttendanceSummary: undefined;
  RecentAttendance: undefined;
  Notifications: undefined;
  mySubjects: undefined;
};

const StudentDashboard: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Get the student number
  const { email } = useAuth();
  const student_no = email?.trim().split('@')[0];

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={36} color="#43cea2" />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text style={styles.name}>{student_no} <Text style={{ fontSize: 20 }}>👋</Text></Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('AuthLanding')}>
          <Ionicons name="log-out-outline" size={20} color="#e84118" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </View>

      <View style={styles.card}>

        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('mySubjects')}>
          <Text style={styles.menuBtnText}>Manage My Subjects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('FaceDataManagement')}>
          <Text style={styles.menuBtnText}>Face Data Management</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('AttendanceSummary')}>
          <Text style={styles.menuBtnText}>Attendance Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
    paddingTop: 36,
  },
  menuBtn: {
    backgroundColor: '#43cea2',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  menuBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#eafaf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    fontSize: 16,
    color: '#636e72',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#185a9d',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: '#e84118',
    marginLeft: 6,
    fontWeight: 'bold',
  },
});

export default StudentDashboard;
