import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '..//../supabaseClient';

const LoginWithOTPScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const handleSendOTP = async () => {
    // basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setDebugMsg(null);
    try {
      const response = await supabase.auth.signInWithOtp({ email });
      console.log('signInWithOtp response:', response);
      setDebugMsg(JSON.stringify(response, null, 2));
      setLoading(false);
      if (response.error) {
        Alert.alert('Error', response.error.message);
      } else {
        setOtpSent(true);
        Alert.alert('OTP Sent', 'Check your email (and spam) for the OTP code.');
      }
    } catch (err: any) {
      console.error('signInWithOtp exception:', err);
      setDebugMsg(String(err?.message ?? err));
      setLoading(false);
      Alert.alert('Error', err?.message ? String(err.message) : 'Unknown error');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.trim().length === 0) {
      Alert.alert('Invalid OTP', 'Please enter the OTP you received via email.');
      return;
    }
    setLoading(true);
    setDebugMsg(null);
    try {
      const response = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      console.log('verifyOtp response:', response);
      setDebugMsg(JSON.stringify(response, null, 2));
      setLoading(false);
      if (response.error) {
        Alert.alert('Error', response.error.message);
      } else {
        Alert.alert('Success', 'Logged in!');
        // TODO: Navigate to dashboard or save session
      }
    } catch (err: any) {
      console.error('verifyOtp exception:', err);
      setDebugMsg(String(err?.message ?? err));
      setLoading(false);
      Alert.alert('Error', err?.message ? String(err.message) : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with OTP</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {!otpSent ? (
        <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
        </>
      )}
      {debugMsg ? (
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Debug</Text>
          <Text style={styles.debugText}>{debugMsg}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#185a9d',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#d1d8e0',
  },
  button: {
    backgroundColor: '#43cea2',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
    width: 200,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  debugBox: {
    marginTop: 18,
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e6ee',
  },
  debugTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: '#333',
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#111',
  },
});

export default LoginWithOTPScreen;
