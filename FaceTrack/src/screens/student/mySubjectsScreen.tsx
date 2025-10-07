import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList , Modal, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { assignStudentToModule, createModule, getModules, getStudentModules, removeStudentFromModule } from '../../supabaseClient';// Adjust path as needed
import { Module } from '../../types'; 
import { useAuth } from '../../context/AuthContext';

export default function mySubjectsScreen({ navigation }: any) {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Module>();
  const [inputText, setInputText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisibility] = useState(false);
  const [isDelete, setIsDelete] = useState(false);
  const deleteMessage = "Are you sure you want to delete this module? This action cannot be undone.";
  const deleteHeader = 'Delete Module';
  const addHeader = 'Add Module'
  const addMessage = "Please confirm that you want to add this module to your module list.";

  // Get the currently logged in user
  const { user_id } = useAuth();

  useEffect(() => {
    const fetchModules = async () => {
      // Available modules
      const modules = await getModules();
      setAvailableModules(modules);

      // Students modules
      if (user_id) {
        const studentModules = await getStudentModules(user_id);
        setSubjects(studentModules.map(x => x.module_id));
        studentModules.forEach(element => {
          console.log(element.module_id);
        });
      }
      
    };

    fetchModules();
  }, []);

  const addSubject = (moduleId: string) => {
    if (!moduleId.trim()) {
      setError('Subject name cannot be empty.');
      return;
    }
    if (subjects.includes(moduleId.trim())) {
      setError('Subject already exists.');
      return;
    }
    
    // Set the selected module/subject
    setSelectedSubject(availableModules.find(x => x.module_id == moduleId));

    // Show modal
    setIsDelete(false);       // Ensure it is ready for add module
    setModalVisibility(true);
  };

  const addSubjectConfirmed = () => {
    // Add module to db
    if (selectedSubject && user_id) {
      try {
        assignStudentToModule(user_id, selectedSubject.module_id).then(result => {
          if (result.module_id) {
            setSubjects([...subjects, result.module_id.trim()]);
            setInputText('');
            setShowSuggestions(false);
            setError(null);
            setModalVisibility(false);
          }
        });
      } catch (error) {
        console.error(`Error while assigning student a module:`, error);
        setError('Error while assigning student a module.');
        // Alert.alert(error);
      }
      
    }
  };

  const removeSubject = (subject: string) => {
    // Set selected subject
    setSelectedSubject(availableModules.find(x => x.module_id === subject));

    // Set modal to open
    setIsDelete(true);      // Ensure its delete modal
    setModalVisibility(true);
    // setSubjects(subjects.filter(s => s !== subject));
  };

  const removeSubjectConfirmed = () => {
    try {
      if (user_id && selectedSubject)
        removeStudentFromModule(user_id, selectedSubject?.module_id).then(result => {
          if (result) {
            // Remove from the subjects
            setSubjects(subjects.filter(x => x !== result.module_id));

            // Set the defaults
            setError(null);
            setModalVisibility(false);
          }
        });
    } catch (error) {
      console.log(`Error while deleting student module.`, error);
    }
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
        <Text style={styles.cardTitle}>Subjects I'm Taking</Text>
        <FlatList
          data={subjects}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <View style={styles.subjectRow}>
              <Text style={styles.subjectText}>{item}</Text>
              <TouchableOpacity onPress={() => removeSubject(item)}>
                <Ionicons name="trash" size={20} color="#e84118" />
              </TouchableOpacity>
            </View>
          )}
        />

        <TextInput
          style={styles.input}
          placeholder="Type subject code"
          value={inputText}
          onChangeText={text => {
            setInputText(text);
            setShowSuggestions(true);
            setError(null);
          }}
          onFocus={() => setShowSuggestions(true)}
          autoCorrect={false}
        />

        {error && <Text style={{ color: '#e84118', marginBottom: 6 }}>{error}</Text>}

        {showSuggestions && inputText.length > 0 && (
          <View style={styles.suggestionBox}>
            {availableModules.filter(mod =>
              mod.module_id.toLowerCase().includes(inputText.toLowerCase())
            ).map(mod => (
              <TouchableOpacity
                key={mod.module_id}
                onPress={() => addSubject(mod.module_id)}
                style={{ padding: 10 }}
              >
                <Text>{mod.module_id}</Text>
              </TouchableOpacity>
            ))}
            {availableModules.filter(mod =>
              mod.module_id.toLowerCase().includes(inputText.toLowerCase())
            ).length === 0 && (
              <Text style={{ padding: 10, color: '#e84118' }}>No match found</Text>
            )}
          </View>
        )}
      </View>
      {modalVisible && (
            <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisibility(false)}
          >
            <View style={styles.backdrop}>
              <View style={styles.modal}>
                <Text style={styles.title}>{isDelete ? deleteHeader : addHeader} {selectedSubject?.module_id}?</Text>
                <Text style={styles.message}>
                  {isDelete ? deleteMessage : addMessage}
                </Text>
      
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisibility(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
      
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                      isDelete ?
                      removeSubjectConfirmed() :
                      addSubjectConfirmed();
                    }}>
                    <Text style={styles.deleteText}>{isDelete ? deleteHeader : addHeader}</Text>
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
  suggestionBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d8e0',
    borderRadius: 10,
    marginBottom: 8,
  },
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
