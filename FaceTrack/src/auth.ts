// auth.ts
import { supabase } from './supabaseClient';

export async function sendOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Automatically create user if not exists
      // emailRedirectTo: 'https://your-app.com/verify', // Replace with your redirect URL
    },
  });

  if (error) throw error;
  return data;
}

export async function verifyOTP(email: string, enteredOtp: string) {
    const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: enteredOtp,
        type: 'email', // or 'sms' if using phone
    });

    if(error)
        throw error;
    
    return data;
}