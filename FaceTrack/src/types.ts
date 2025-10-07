import { Float } from "react-native/Libraries/Types/CodegenTypes";

// types.ts
export type Role = 'student' | 'lecturer' | 'admin';

export interface User {
  user_id: number;
  email: string;
  cell?: string;
  names: string;
  role: 'student' | 'lecturer' | 'admin';
}

export interface Lecturer {
  lecturer_id: number; // FK to User.user_id
  school?: string;
  department?: string;
  faculty?: string;
}

export interface Student {
  student_id: number; // FK to User.user_id
  student_no: number;
  face_embedding?: string; // Encoded facial vector
}

export interface StudentImage {
  image_id?: number;
  user_id: number; // FK to User.user_id
  image_url: string;
  encoding: number[];
}

export interface Module {
  module_id: string; // CHAR(7)
  name: string;
}

export interface Class {
  class_id: number;
  lecturer_id: number; // FK to Lecturer.lecturer_id
  module_id: string;   // FK to Module.module_id
  year: number;
}

export interface Session {
  session_id: number;
  class_id: number; // FK to Class.class_id
  date: string;     // ISO date string
  start_time?: string; // HH:MM format
  end_time?: string;
}

export interface AttendanceLog {
  attendance_id: number;
  session_id: number; // FK to Session.session_id
  student_id: number; // FK to Student.student_id
  status: 'present' | 'absent';
  timestamp?: string; // ISO datetime
}

export interface ModuleStudent {
  student_id: number;
  module_id: string;
}

export interface ImageFormat {
  uri: string;
  base64: string;
}