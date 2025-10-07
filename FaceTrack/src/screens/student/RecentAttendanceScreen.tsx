import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RecentAttendanceScreen: React.FC = () => {
  return (
    <View style={styles.container}>
  <Text style={styles.title}>Recent Attendance</Text>
  <View style={styles.listItem}><Text style={styles.subject}>Mathematics</Text><Text style={styles.statusPresent}>Present</Text></View>
  <View style={styles.listItem}><Text style={styles.subject}>Physics</Text><Text style={styles.statusAbsent}>Absent</Text></View>
  <View style={styles.listItem}><Text style={styles.subject}>Chemistry</Text><Text style={styles.statusPresent}>Present</Text></View>
  <View style={styles.listItem}><Text style={styles.subject}>Biology</Text><Text style={styles.statusPresent}>Present</Text></View>
  <View style={styles.listItem}><Text style={styles.subject}>English</Text><Text style={styles.statusPresent}>Present</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
    paddingTop: 36,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#185a9d',
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    width: 260,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  subject: {
    fontSize: 16,
    color: '#185a9d',
    fontWeight: 'bold',
  },
  statusPresent: {
    color: '#43cea2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusAbsent: {
    color: '#e84118',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RecentAttendanceScreen;
