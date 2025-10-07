import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AttendanceSummaryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Summary</Text>
      <Text style={styles.percent}>Attendance: 80%</Text>
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>Present: 18</Text>
        <Text style={styles.summaryText}>Absent: 2</Text>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#185a9d',
    marginBottom: 20,
  },
  percent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#43cea2',
    marginBottom: 18,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryText: {
    fontSize: 18,
    color: '#185a9d',
    marginVertical: 4,
  },
});

export default AttendanceSummaryScreen;
