import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Module, Class } from '../../types';
import { createClass, createModule, deleteModule, getClasses, getModules, getSessions } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function MySubjectsScreen({ navigation, route }: any) {
  // In a real app, this would come from context or backend
  var modules: Module [] = [];
  const [subjects, setSubjects] = useState<Module[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Module>();
  const [error, setError] = useState<string | null>(null);
  const { user_id } = useAuth();

  useEffect(() => {
    console.log('Getting modules');

    if (subjects.length === 0) {
      Promise.all([
        getClasses(user_id ?? 1),
        getModules()
      ]).then(([classData, moduleData]) => {
        if (classData.length > 0) {
          setClasses(classData);
        }

        const filtered = moduleData.filter(mod =>
          classData.some(cls => cls.module_id === mod.module_id)
        );

        setSubjects(filtered);
        console.log('Modules fetched and filtered.');
      });
    }
  }, []);


  const filterModules = (data: Module[]) => {
    classes.forEach(element => {
      setSubjects([...subjects, ...data.filter(x => x.module_id === element.module_id)]);
    });
  }

  const addSubject = async () => {
    if (!newSubject.trim()) {
      setError('Subject name cannot be empty.');
      return;
    }
    if (!newSubjectCode.trim()) {
      setError('Subject code cannot be empty.');
      return;
    }

    // Create a Module object
    var module: Module = {
      module_id: newSubjectCode,
      name: newSubject
    };

    if (subjects && subjects.includes(module)) {
      setError('Subject already exists.');
      return;
    }

    // Add the module in db
    try {
      var moduleTemp: Module;
      createModule(module).then(result => {
        if(result) {
          console.log(`Added module to db: ${result.module_id}`);
          moduleTemp = result;
          // Create class
          console.log(`Class creation...`)
          createClass({lecturer_id: user_id ?? 1, module_id: result.module_id, year: 2025});

          
          // Insert into the subjects list
          setSubjects([...subjects, result]);
          setNewSubject('');
          setNewSubjectCode('');
          setError(null);
        }
        else {
          console.log(`Result was empty: ${result}`);
        }        

      });

      
    } catch (error) {
      console.log(`Error while inserting module. ${error}`);
    }
  };

  const removeSubject = () => {
    if (!selectedSubject)
      return;

    // Delete after confirmation
    try {
      deleteModule(selectedSubject.module_id).then(result => {
        // Close modal
        setDeleteConfirmation(false);
      });
    } catch (error) {
      console.error(`Error while deleting ${selectedSubject.module_id}`);
    }

    setSubjects(subjects.filter(s => s.module_id !== selectedSubject.module_id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#185a9d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Subjects</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subjects You Teach</Text>
        
        <View>
          <TextInput
            style={styles.input}
            placeholder="Suject code"
            value={newSubjectCode}
            onChangeText={text => { setNewSubjectCode(text); setError(null); }}
          />
          <TextInput
            style={styles.input}
            placeholder="Subject name"
            value={newSubject}
            onChangeText={text => { setNewSubject(text); setError(null); }}
          />
          {error && <Text style={{ color: '#e84118', marginBottom: 6 }}>{error}</Text>}
          <TouchableOpacity style={styles.registerBtn} onPress={addSubject}>
            <Text style={styles.registerBtnText}>Add Subject</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={subjects}
          keyExtractor={item => item.module_id}
          renderItem={({ item }) => (
            <View style={styles.subjectRow}>
              <Text style={styles.subjectText}>[{item.module_id}] {item.name}</Text>
              <TouchableOpacity onPress={() => {
                setSelectedSubject(item);
                setDeleteConfirmation(true);
              }}>
                <Ionicons name="trash" size={20} color="#e84118" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
      {deleteConfirmation && (
      <Modal
      animationType="fade"
      transparent={true}
      visible={deleteConfirmation}
      onRequestClose={() => setDeleteConfirmation(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Delete Module {selectedSubject?.module_id}?</Text>
          <Text style={styles.message}>
            Are you sure you want to delete this module? This action cannot be undone.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirmation(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => removeSubject()}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16, paddingTop: 36 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12, backgroundColor: '#fff', borderRadius: 20, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#185a9d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#185a9d', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#d1d8e0', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#fff', fontSize: 15 },
  registerBtn: { backgroundColor: '#43cea2', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 8 },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  subjectText: { fontSize: 16, color: '#185a9d' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  cancelText: {
    color: '#888',
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: '#e84118',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
