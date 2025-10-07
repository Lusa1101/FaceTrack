import React, { use, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { sendOtp, verifyOTP } from '../../auth';
import { useAuth } from '../../context/AuthContext';
import { Role, User } from '../../types';
import { createUser, getUserByEmail } from '../../supabaseClient';

type RootStackParamList = {
  AuthLanding: undefined;
  StudentDashboard: undefined;
  LecturerDashboard: undefined;
};

export default function AuthLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  var user!: Partial<User>;

  // For the user info
  const { setGlobalEmail, setGlobalRole, setUserId } = useAuth();

  // Email validation for students and lecturers
  const studentRegex = /^\d{9}@myturf\.ul\.ac\.za$/;
  const lecturerRegex = /^[a-zA-Z]+\.[a-zA-Z]+@ul\.ac\.za$/;

  const validateEmail = (email: string) => {
    return studentRegex.test(email) || lecturerRegex.test(email);
  };

  const handleSendOtp = () => {
    const trimmed = email.trim();
    if (!validateEmail(trimmed)) {
      if (trimmed.endsWith('@myturf.ul.ac.za')) {
        const localPart = trimmed.split('@')[0];
        if (!/^[0-9]{9}$/.test(localPart)) {
          setError('Student email must start with a 9-digit student number (numbers only) before @myturf.ul.ac.za');
        } else if (localPart.length !== 9) {
          setError('Student number must be exactly 9 digits.');
        } else {
          setError('Invalid student email format.');
        }
      } else if (trimmed.endsWith('@ul.ac.za')) {
        if (!/^[a-zA-Z]+\.[a-zA-Z]+@ul\.ac\.za$/.test(trimmed)) {
          setError('Lecturer email must be in the format name.surname@ul.ac.za');
        } else {
          setError('Invalid lecturer email format.');
        }
      } else {
        setError('Email must end with @myturf.ul.ac.za (students) or @ul.ac.za (lecturers)');
      }
      return;
    }
    setError('');

    sendEmailOtp(trimmed);
  };

  const sendEmailOtp = (email: string) => {
    try {
      // Send the email for OTP
      console.log(`Sending OTP ...`);
      sendOtp(email);

      setStep('otp');
    } catch (error) {
      // setError(error);
      console.log(`Failed to send the OTP. ${error}`);
    } finally {

    }
  }

  const getUser = (role: Role) => {
        getUserByEmail(email.trim()).then(data => {
    console.log(`Getting user`);
          if (data.length === 0) {
            console.log(`User not registered in users`);
            user = {
              role: role,
              email: email.trim(),
              names: ''
            }
            createUser(user).then(result => {
              if(result){
                user = result;
                if(user.user_id)
                  setUserId(user.user_id);
                console.log(`User id: `, user.user_id);
              }
            });
          } else{
            user = data;
            console.log(`User is registered in users`);
            if(user.user_id)
              setUserId(user.user_id);
              console.log(`User id: `, user.user_id);
          }
        });
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('OTP must be 6 digits.');
      return;
    }

    // Testing
    if (lecturerRegex.test(email.trim())) {
      setGlobalRole('lecturer');
      setGlobalEmail(email.trim());
      getUser('lecturer');
          
      navigation.navigate('LecturerDashboard');
    }

    // Verify the OTP
    try {
      console.log(`Verifying entered OTP ${otp}`);
      verifyOTP(email, otp).then(result => {
        console.log(`User: ${result.user}`)
        
        if (result.user?.aud !== 'authenticated') {
          // Set error and request for resend
          setError('Wrong or Expired OTP. Please click resend.');
          return;
        }

        setError('');
        // UI only: if student, go to StudentDashboard
        
        if (studentRegex.test(email.trim())) {
          setGlobalRole('student');
          setGlobalEmail(email.trim());
          getUser('student');

          navigation.navigate('StudentDashboard');
        } else if (lecturerRegex.test(email.trim())) {
          setGlobalRole('lecturer');
          setGlobalEmail(email.trim());
          getUser('lecturer');
          
          navigation.navigate('LecturerDashboard');
        }          
      });

    } catch (error) {
      setError("Error while authenticating. Wrong or expired OTP.")
      if (error)
        Alert.alert('Error while authenticating. Wrong or expired OTP.')
    }
  };

  return (
    <LinearGradient
      colors={["#43cea2", "#185a9d"]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Ionicons name="person-circle-outline" size={60} color="#43cea2" style={{ marginBottom: 16 }} />
          <Text style={styles.title}>Sign In</Text>
          {step === 'email' && (
            <>
              <Text style={styles.subtitle}>Enter your email to receive an OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#b2bec3"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.button} onPress={handleSendOtp}>
                <Text style={styles.buttonText}>Send OTP</Text>
              </TouchableOpacity>
            </>
          )}
          {step === 'otp' && (
            <>
              <Text style={styles.subtitle}>Enter your OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#b2bec3"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                <Text style={styles.buttonText}>Verify OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSendOtp}>
                <Text style={styles.buttonText}>Resend OTP</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    maxWidth: 370,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#185a9d',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#43cea2',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    width: 240,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f1f2f6',
    paddingHorizontal: 18,
    fontSize: 16,
    marginBottom: 12,
    color: '#222f3e',
    borderWidth: 1,
    borderColor: '#43cea2',
  },
  button: {
    backgroundColor: '#43cea2',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#43cea2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: 200,
    alignItems: 'center',
  },
  error: {
    color: '#e84118',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#43cea2',
  },
  secondaryButtonText: {
    color: '#43cea2',
  },
});
