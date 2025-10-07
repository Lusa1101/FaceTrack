import { createClient } from '@supabase/supabase-js';
import { User, Student, Class, Session } from './types';
import { Module } from 'react-native';
import { decode } from 'base64-arraybuffer';
// import { SUPABASE_URL, SUPABASE_API } from '@env';

const SUPABASE_URL = 'https://wbkosuecqbsgwrkdtlux.supabase.co'; //process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6India29zdWVjcWJzZ3dya2R0bHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzI4NjAsImV4cCI6MjA3MTcwODg2MH0.JlqIcdzme2EzFPEt7atojHb__NFZ1ODKYeF8FedbTwg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*  User  */ 
// Create a new user
export async function createUser(user: Partial<User>) {
  const { data, error } = await supabase.from('user').insert([user]).select().single();
  if (error) {
    console.log(`Failing to insert user: ${error?.message}`);
    throw error;
  }
  return data;
}

// Read all users
export async function getUsers() {
  const { data, error } = await supabase.from('user').select('*');
  if (error) throw error;
  return data;
}

export async function getUserByEmail(email: string) {
  console.log(`Getting user in function`);
  const { data, error } = await supabase.from('user').select('*').eq('email', email).single();
  if (error) {
    console.log(`Error getting users ${error?.message}`);

    if(error.message.includes('Cannot coerce the result to a single JSON object')){
      return [];
    }

    throw error;
  }
  return data;
}

// Update a user
export async function updateUser(userId: number, updates: Partial<User>) {
  const { data, error } = await supabase.from('user').update(updates).eq('user_id', userId);
  if (error) throw error;
  return data;
}

// Delete a user
export async function deleteUser(userId: number) {
  const { data, error } = await supabase.from('user').delete().eq('user_id', userId);
  if (error) throw error;
  return data;
}


/*  Lecturer  */ 
export async function createLecturer(lecturerId: number) {
  const { data, error } = await supabase.from('lecturer').insert([{ lecturer_id: lecturerId }]);
  if (error) throw error;
  return data;
}

export async function getLecturers() {
  const { data, error } = await supabase.from('lecturer').select('*');
  if (error) throw error;
  return data;
}

export async function deleteLecturer(lecturerId: number) {
  const { data, error } = await supabase.from('lecturer').delete().eq('lecturer_id', lecturerId);
  if (error) throw error;
  return data;
}


/*  Student  */  
export async function createStudent(student: { student_id: number; face_embedding?: string }) {
  const { data, error } = await supabase.from('student').insert([student]);
  if (error) throw error;
  return data;
}

export async function getStudents() {
  const { data, error } = await supabase.from('student').select('*');
  if (error) throw error;
  return data;
}

export async function updateStudent(studentId: number, updates: Partial<Student>) {
  const { data, error } = await supabase.from('student').update(updates).eq('student_id', studentId);
  if (error) throw error;
  return data;
}

export async function deleteStudent(studentId: number) {
  const { data, error } = await supabase.from('student').delete().eq('student_id', studentId);
  if (error) throw error;
  return data;
}


/*  Student images  */
export async function addStudentImage(image: { user_id: number; image_url: string; encoding: number[] }) {
  const { data, error } = await supabase.from('student_image')
    .insert([image])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentImages(userId?: number) {
  const query = supabase.from('student_image').select('*');
  if (userId) query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getStudentEncodingsByModule(module_id: string) {
  console.log('Student Image Encoding');

  const student_ids = await supabase.from('module_student')
    .select('user_id')
    .eq('module_id', module_id);

  if (student_ids.error)
    throw student_ids.error;
  
  const student_images = student_ids.data?.map(x => {
    getStudentImages(x.user_id);
  });

  console.log('Student encoding by module:', student_images);
  //return result.data;
}

export async function getStudentNoEncoding(student_id: number) {
  const result = await supabase
    .from('student_image')
    .select('student_id, module_id, student!inner(student_no)')
    .eq('student_id', student_id);

  if (result.error)
    throw result.error;

  return result.data;
}

export async function deleteStudentImage(imageUrl: number) {
  const { data, error } = await supabase
    .from('student_image')
    .delete()
    .eq('image_url', imageUrl);

  if (error) throw error;
  
  return data;
}

export async function deleteImage(image: string) {
  const { data, error } = await supabase
    .storage
    .from('student_images')
    .remove([image]); 

  if (error)
    throw error;

  return data;
}

export async function getImagesPubicUrl(images: string[]) {
  const { data, error } = await supabase.storage
    .from('student_images')
    .createSignedUrls(images, 60);

  if (error)
    throw error;

  return data;
}

export async function getImagePubicUrl(image: string) {
  const { data, error } = await supabase.storage
    .from('student_images')
    .createSignedUrl(image, 60);

  if (error)
    throw error;

  return data;
}

export async function getBucket() {
  const { data, error } = await supabase.storage.getBucket('student_images');

  if (error)
    throw error;

  return data;
}

export async function uploadStudentImage(image: string, image_path: string) {
  const { data, error } = await supabase.storage
    .from('student_images')
    .upload(image, decode(image_path), {
      contentType: 'image/png'
    });

  if (error)
    throw error;
  
  return data;
}

export async function updateStudentImage(image: string, image_path: string) {
  const { data, error } = await supabase.storage
    .from('student_images')
    .update(image, decode(image_path), {
      contentType: 'image/png'
    });

  if (error)
    throw error;
  
  return data;
}

export async function getImages(image: string, image_path: string) {
  const { data, error } = await supabase.storage
    .from('student_images')
    .list();

  if (error)
    throw error;
  
  return data;
}


/*  Module  */  
export async function createModule(module: Module) {
  const { data, error } = await supabase.from('module').insert([module]).select().single();
  if (error) throw error;
  return data;
}

export async function getModules() {
  const { data, error } = await supabase.from('module').select('*');
  if (error){ 
    console.log(`Error in fetching modules: ${error.message}`);
    throw error;
  }
  return data;
}

export async function updateModule(moduleId: string, updates: Partial<typeof module>) {
  const { data, error } = await supabase.from('module').update(updates).eq('module_id', moduleId);
  if (error) throw error;
  return data;
}

export async function deleteModule(moduleId: string) {
  const { data, error } = await supabase.from('module').delete().eq('module_id', moduleId);
  if (error) throw error;
  return data;
}


/*  Module Students  */  
export async function assignStudentToModule(studentId: number, moduleId: string) {
  const { data, error } = await supabase.from('module_student').insert([{ student_id: studentId, module_id: moduleId }]).select().single();
  if (error) throw error.message;
  return data;
}

export async function getStudentModules(studentId: number) {
  const { data, error } = await supabase.from('module_student').select('*').eq('student_id', studentId);
  if (error) throw error;
  return data;
}
export async function getModuleStudents(module_id: string) {
  const { data, error } = await supabase.from('module_student').select('*').eq('module_id', module_id);
  if (error) throw error;
  return data;
}

export async function removeStudentFromModule(studentId: number, moduleId: string) {
  const { data, error } = await supabase
    .from('module_student')
    .delete()
    .eq('student_id', studentId)
    .eq('module_id', moduleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


/*  Class  */ 
export async function createClass(cls: {
  lecturer_id: number;
  module_id: string;
  year: number;
}) {
  console.log(`In the class creation: Creating ${cls.module_id} by ${cls.lecturer_id}...`);
  const { data, error } = await supabase.from('class').insert([cls]).select().single();
  if (error) {
    console.log(`Error with class insertion: ${error.message}`)
    throw error
  }

  console.log(`In the class creation: Created ${data.class_id}`);
  
  return data;
}

export async function getClasses(lecturer_id: number) {
  const { data, error } = await supabase.from('class').select('*').eq('lecturer_id', lecturer_id);
  if (error) throw error;
  return data;
}

export async function updateClass(classId: number, updates: Partial<Class>) {
  const { data, error } = await supabase.from('class').update(updates).eq('class_id', classId);
  if (error) throw error;
  return data;
}

export async function deleteClass(classId: number) {
  const { data, error } = await supabase.from('class').delete().eq('class_id', classId);
  if (error) throw error;
  return data;
}


/*  Attendance logs  */  
export async function logAttendance(log: {
  session_id: number;
  student_id: number;
  status: 'present' | 'absent';
}) {
  const { data, error } = await supabase.from('attendance_logs').insert([log]);
  if (error) throw error;
  return data;
}

export async function getAttendanceLogs(sessionId?: number) {
  const query = supabase.from('attendance_logs').select('*');
  if (sessionId) query.eq('session_id', sessionId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteAttendanceLog(attendanceId: number) {
  const { data, error } = await supabase.from('attendance_logs').delete().eq('attendance_id', attendanceId);
  if (error) throw error;
  return data;
}


/*  Sessions  */  
export async function createSession(session: Partial<Session>) {
  const { data, error } = await supabase.from('session').insert([session]).select().single();
  if (error) {
    console.log(`Error while creating session: ${error.message}`);
    throw error;}
  return data;
}

export async function getSessions(classId?: number) {
  const query = supabase.from('session').select('*');
  if (classId) query.eq('class_id', classId);
  const { data, error } = await query;
  if (error) {
    console.log(`Error while fetching sessions`);
    throw error;
  }
  return data;
}

export async function deleteSession(sessionId: number) {
  const { data, error } = await supabase.from('session').delete().eq('session_id', sessionId);
  if (error) throw error;
  return data;
}