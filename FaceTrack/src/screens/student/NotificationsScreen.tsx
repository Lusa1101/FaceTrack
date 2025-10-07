import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
  <Text style={styles.title}>Notifications</Text>
  <View style={styles.notification}><Text style={styles.notificationText}>Next class: Physics at 10:00 AM</Text></View>
  <View style={styles.notification}><Text style={styles.notificationText}>Warning: Attendance below 85%</Text></View>
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
  notification: {
    backgroundColor: '#eafaf1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    width: 260,
    alignItems: 'flex-start',
  },
  notificationText: {
    color: '#185a9d',
    fontSize: 16,
  },
});

export default NotificationsScreen;
