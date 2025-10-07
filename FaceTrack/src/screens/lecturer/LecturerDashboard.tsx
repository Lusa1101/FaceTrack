import React, { useState } from 'react';

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Adjust the import above if you use a different navigation type

import { useAuth } from '../../context/AuthContext';

const lecturer = {
  name: 'Dr. Masebe',
  avatar: null,
};



export default function LecturerDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
 
  // GEt the email of the user
  const { email } = useAuth();
  const localPart = email?.split('@')[0];
  var names = localPart?.split('.')[0].toUpperCase();
  
  var surname = localPart?.split('.')[1].toUpperCase();

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { justifyContent: 'space-between', alignItems: 'center' }]}> 
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="school" size={32} color="#43cea2" />
          </View>
          <View style={{ marginLeft: 12, maxWidth: '70%' }}>
            <Text style={styles.welcome}>Welcome,</Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.name}>{names} {surname} <Text style={{ fontSize: 20 }}>👩‍🏫</Text></Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerLogout} onPress={() => navigation.navigate('AuthLanding' as never)}>
          <Ionicons name="log-out-outline" size={20} color="#e84118" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('MySubjects')}>
          <Text style={styles.menuBtnText}>Manage My Subjects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('CreateSession')}>
          <Text style={styles.menuBtnText}>Create Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('ScanAttendance')}>
          <Text style={styles.menuBtnText}>Scan Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('AttendanceRecords')}>
          <Text style={styles.menuBtnText}>Attendance Records</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('DownloadReports')}>
          <Text style={styles.menuBtnText}>Download Reports</Text>
        </TouchableOpacity>
      </View>
        
      {/* floating logout removed; logout moved into header */}
    </View>
  );
}

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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#185a9d',
    marginLeft: 8,
  },
  registerBtn: {
    backgroundColor: '#43cea2',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  registerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  updateBtn: {
    backgroundColor: '#eafaf1',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  updateBtnText: {
    color: '#185a9d',
    fontWeight: 'bold',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  subject: {
    fontSize: 15,
    color: '#185a9d',
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: '#636e72',
    width: 90,
    textAlign: 'center',
  },
  present: {
    color: '#43cea2',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLogout: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
logoutText: {
  marginLeft: 8,
  color: '#e84118',
  fontWeight: 'bold',
},
});
