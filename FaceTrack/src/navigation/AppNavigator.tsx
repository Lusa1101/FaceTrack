import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthLandingScreen from '../screens/auth/AuthLandingScreen';
import HomeScreen from '../screens/HomeScreen';
import StudentDashboard from '../screens/student/StudentDashboard';
import FaceRegistrationCamera from '../screens/student/FaceRegistrationCamera';
import LecturerDashboard from '../screens/lecturer/LecturerDashboard';
import CreateSessionScreen from '../screens/lecturer/CreateSessionScreen';
import ScanAttendanceScreen from '../screens/lecturer/ScanAttendanceScreen';
import AttendanceRecordsScreen from '../screens/lecturer/AttendanceRecordsScreen';
import DownloadReportsScreen from '../screens/lecturer/DownloadReportsScreen';
import LecturerMySubjectsScreen from '../screens/lecturer/MySubjectsScreen';
import FaceDataManagementScreen from '../screens/student/FaceDataManagementScreen';
import AttendanceSummaryScreen from '../screens/student/AttendanceSummaryScreen';
import RecentAttendanceScreen from '../screens/student/RecentAttendanceScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import { useAuth } from '../context/AuthContext';
import mySubjectsScreen from '../screens/student/mySubjectsScreen';
import LoginWithOTPScreen from '../screens/auth/LoginWithOTPScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { role } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="AuthLanding"
          component={AuthLandingScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTransparent: true,
            headerTitle: '',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Home');
                  }
                }}
                style={{ marginLeft: 16, marginTop: 30, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
              >
                <Ionicons name="arrow-back" size={24} color="#185a9d" />
              </TouchableOpacity>
            ),
            headerStyle: {
              backgroundColor: 'transparent',
              elevation: 0,
              shadowOpacity: 0,
              height: 90,
            },
          })}
        />
        <Stack.Screen name="StudentDashboard" component={StudentDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="FaceRegistrationCamera" component={FaceRegistrationCamera} options={{ headerShown: false }} />
        <Stack.Screen name="LecturerDashboard" component={LecturerDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ScanAttendance" component={ScanAttendanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DownloadReports" component={DownloadReportsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MySubjects" component={LecturerMySubjectsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="mySubjects" component={mySubjectsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FaceDataManagement" component={FaceDataManagementScreen} options={{ headerShown: true, title: 'Face Data Management' }} />
        <Stack.Screen name="AttendanceSummary" component={AttendanceSummaryScreen} options={{ headerShown: true, title: 'Attendance Summary' }} />
        <Stack.Screen name="RecentAttendance" component={RecentAttendanceScreen} options={{ headerShown: true, title: 'Recent Attendance' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="LoginWithOTP" component={LoginWithOTPScreen} options={{ headerShown: true, title: 'Login with OTP' }} />
        {role === 'student' && <Stack.Screen name="StudentApp" component={DummyScreen} />}
        {role === 'lecturer' && <Stack.Screen name="LecturerApp" component={DummyScreen} />}
        {role === 'admin' && <Stack.Screen name="AdminApp" component={DummyScreen} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Temporary screen just to show role was selected
const DummyScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>You selected a role. Coming soon...</Text>
    </View>
  );
};
