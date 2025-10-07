import React, { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Class, Module, Session } from '../../types';
import { createSession, getClasses, getModules, getSessions } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function CreateSessionScreen({ navigation }: any) {
  // Mock: subjects the lecturer teaches
  const [subjects, setSubjects] = useState<Module[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setClass] = useState<Class | null>(null);
  const [subject, setSubject] = useState<Module | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => {
    const now = time;
    now.setHours(now.getHours() + 1.2);
    return now;
  });
  const [showEndTime, setShowEndTime] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const { user_id } = useAuth();

  // Initializer
  useEffect(() => {
  const fetchData = async () => {
    try {
      // Run these in parallel
      const [modulesResult, classesResult] = await Promise.all([
        getModules(),
        getClasses(user_id ?? 1)
      ]);

      setSubjects(modulesResult);
      setClasses(classesResult);

      // Only fetch sessions if we have classes
      if (classesResult.length > 0) {
        // Use a bulk endpoint if available, or optimize individual calls
        const sessionPromises = classesResult.map(cls => 
          getSessions(cls.class_id)
        );
        
        const sessionArrays = await Promise.all(sessionPromises);
        const allSessions = sessionArrays.flat();
        setSessions(allSessions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  fetchData();
}, [user_id]); // Only run when user_id changes

  const renderItem = ({ item }: { item: Session }) => (
    <View style={styles.card}>
      <Text style={styles.subject}>{classes.find(x => x.class_id === item.class_id)?.module_id}</Text>
      <Text style={styles.details}>📅 {item.date} ⏰ {item.start_time}</Text>
    </View>
  );

  const handleCreateSession = () => {
    if (!subject || !date || !time) {
      setSessionError('All fields are required.');
      return;
    }
    // Date must be today or in the future
    const inputDate = new Date(date.toDateString());
    const today = new Date();
    today.setHours(0,0,0,0);
    if (date < today) {
      setSessionError('Date cannot be in the past.');
      return;
    }

    // Send to db
    const formatTime = (date: Date) =>
      date.toTimeString().split(' ')[0];
    var session: Partial<Session> = {
      class_id: selectedClass?.class_id,
      start_time: formatTime(time),
      end_time: formatTime(endTime),
      date: date.toLocaleDateString()
    } 

    createSession(session).then(result => {
      if(result) {
        console.log(`Added ${result.session_id} - Class [${result.class_id}]`);
        setSessions([...sessions, result]);

        // TODO: Save session logic (context, API, etc.)
        setSubject(null); 
        setClass(null);
        setDate(new Date()); 
        setTime(new Date()); 
        setEndTime(new Date());
        setSessionError(null);
      }
    });

    
    // navigation.goBack();
  };

  const onChange = (event: DateTimePickerEvent, selectedDate: Date) => {
    const currentDate = selectedDate || date;
    setShowDate(Platform.OS === 'ios'); // Keep picker open on iOS
    setDate(currentDate);
    };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#185a9d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Session</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="calendar-plus" size={24} color="#185a9d" />
          <Text style={styles.cardTitle}>Session Details</Text>
        </View>
        <Text style={{ marginBottom: 4, color: '#636e72' }}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Select subject code you teach"
          value={selectedClass?.module_id}
          onChangeText={text => {
            setSubject({module_id: text, name:''});
            setClass({module_id: text, lecturer_id: 1, year: 2025, class_id: 1});
            setSessionError(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          autoCorrect={false}
        />
        {showSuggestions && subject && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, marginBottom: 8 }}>
            {classes.filter(s => s.module_id.toLowerCase().includes(subject.module_id.toLowerCase())).map(s => (
              <TouchableOpacity key={s.module_id} onPress={() => { setClass(s); setShowSuggestions(false); }} style={{ padding: 10 }}>
                <Text>{s.module_id}</Text>
              </TouchableOpacity>
            ))}
            {classes.filter(s => s.module_id.toLowerCase().includes(subject.module_id.toLowerCase())).length === 0 && (
              <Text style={{ padding: 10, color: '#e84118' }}>No match found</Text>
            )}
          </View>
        )}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, marginBottom: 8 }}>
          <Button title={date.toLocaleDateString()} onPress={() => setShowDate(prev => !prev)}/>
          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                if (event.type === 'set' && selectedDate)
                  setDate(selectedDate);
                
                if(Platform.OS === 'android')
                  setShowDate(false);
              }}
              />
          )}
        </View>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, marginBottom: 8 }}>
          <Button title={'Start Time   ' + time.toLocaleTimeString()} onPress={() => {
            setShowTime(prev => !prev);
          }}/>
          {showTime  && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                if(event.type === 'set' && selectedDate)
                  setTime(selectedDate);
                
                if(Platform.OS === 'android')
                  setShowTime(false);
              }}
              />
          )}
        </View>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, marginBottom: 8 }}>
          <Button title={'End Time   ' + endTime.toLocaleTimeString()} onPress={() => setShowEndTime(prev => !prev)}/>
          {showEndTime && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={(event, selectedDate) => {
                if (selectedDate && event.type === 'set')
                  setEndTime(selectedDate);
                
                if(Platform.OS === 'android')
                  setShowEndTime(false);
              }}
              />
          )}
        </View>
        
        {sessionError && <Text style={{ color: '#e84118', marginBottom: 6 }}>{sessionError}</Text>}
        <TouchableOpacity style={styles.registerBtn} onPress={handleCreateSession}>
          <Text style={styles.registerBtnText}>Create</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.title}>Your Sessions</Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No sessions found.</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

    </View>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16, paddingTop: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#185a9d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#185a9d', marginLeft: 8 },
  input: { borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#fff', fontSize: 15 },
  registerBtn: { backgroundColor: '#43cea2', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 8 },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  // container: { flex: 1, padding: 16, backgroundColor: '#f5f6fa' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  // card: {
  //   backgroundColor: '#fff',
  //   padding: 16,
  //   borderRadius: 10,
  //   marginBottom: 12,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  //   elevation: 2,
  // },
  subject: { fontSize: 18, fontWeight: '600' },
  details: { fontSize: 14, color: '#636e72', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
});
