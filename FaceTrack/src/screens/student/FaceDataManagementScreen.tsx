import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addStudentImage, deleteImage, deleteStudentImage, getImagePubicUrl, getImagesPubicUrl, getStudentImages, supabase, uploadStudentImage } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ImageFormat, StudentImage } from '../../types';
import { getEncoding } from '../../facial_recog_lib';

const FaceDataManagementScreen: React.FC = () => {
  const [images, setImages] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const { user_id } = useAuth();

  useEffect(() => {
    fetchUserImages();
  }, []);

  const getUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const fetchUserImages = async () => {
    try {
      setLoading(true);
      
      if (!user_id) {
        setImages([]);
        setLoading(false);
        return;
      }
      
      getStudentImages(user_id).then(data => {
        if (data) {
          // Get all images as a list
          const images = data.map(x => x.image_url);

          // Get the image urls
          getImagesPubicUrl(images).then(data => {
            setImages(data);

            // Check urls
            console.log(`Image urls: ${data}`)
          })
        }
      });     
      
    } catch (err: any) {
      Alert.alert('Error', String(err.message ?? err));
      console.log(`Error while getting student images.`, err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photos.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return null;

    // Return values
    var imageFormat: ImageFormat;
    const uri = result.assets[0].uri;
    const base64 = result.assets[0].base64;
    
    return { uri, base64 };
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow camera access.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.8,
      base64: true, 
    });
    if (result.canceled) return null;

    const uri = result.assets[0].uri;
    const base64 = result.assets[0].base64;

    return { uri, base64 };
  };

  // Helper function to get file extension and determine content type
  const getContentType = (uri: string): string => {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  };

  const uploadImage = async (uri: { uri: string, base64: string }) => {
    try {
      setLoading(true);
      const user = await getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare file
      const fileName = uri.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      const path = `students/${user.id}/${Date.now()}_${fileName}`;

      // const response = await fetch(uri);
      // const blob = await response.blob();
      // const contentType = getContentType(uri);

      // First upload image and then insert record
      uploadStudentImage(fileName, uri.base64).then(result => {
        if(result && user_id){
          // Add record
          const fileName = result.path;

          // Get the image url
          getImagePubicUrl(fileName).then(img => {
            // Get the encoding
            if (!img)
              console.log('No image url')

            getEncoding(img.signedUrl).then(encoding => {
              //console.log('Encoding from the image: ', encoding);
              const student_image: StudentImage = {
                user_id: user_id,
                image_url: fileName,
                encoding: Array.isArray(encoding.encoding) ? encoding.encoding.map(Number) : []
              }
              addStudentImage(student_image).then(data => {
                // Let user know
                Alert.alert(`Your image has been uploaded.`);

                // Get public url and add it to the list
                if (data)
                  getImagePubicUrl(data.image_url).then(publicUrl => {
                  setImages([...images, publicUrl]);
                })

                fetchUserImages();
                setLoading(false);
                Alert.alert('Success', 'Image uploaded successfully');
              })
            });
          });
        }
      })
    } catch (err: any) {
      setLoading(false);
      console.error('uploadImage error', err.message);
      Alert.alert('Upload error', String(err.message ?? err));
    } finally {
      // setLoading(false);
    }
  };

  const handleRegister = async () => {
    Alert.alert('Register Face', 'Choose an option', [
      { 
        text: 'Take Photo', 
        onPress: async () => { 
          const uri = await takePhoto(); 
          if (uri && uri.base64) await uploadImage({uri: uri.uri, base64: uri.base64}); 
          else console.log('Could not get base64 of the taken image.');
        } 
      },
      { 
        text: 'Choose from Photos', 
        onPress: async () => { 
          const uri = await pickImage(); 
          if (uri && uri.base64) await uploadImage({uri: uri.uri, base64: uri.base64}); 
        } 
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getStoragePathFromPublicUrl = (url: string) => {
    try {
      const marker = '/storage/v1/object/public/';
      const idx = url.indexOf(marker);
      if (idx === -1) return null;
      const after = url.substring(idx + marker.length);
      const parts = after.split('/');
      parts.shift(); // remove bucket name
      return parts.join('/');
    } catch (e) {
      return null;
    }
  };

  const handleRemove = async (item: any) => {
    Alert.alert('Remove Image', `Are you sure you want to remove this image?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: async () => {
          try {
            setLoading(true);
            
            // Delete from storage if possible
            deleteImage(item.path).then(result => {
              // Remove from the records
              const path = item.path;
              deleteStudentImage(item.path).then(data => {
                setImages(images.filter(x => x.path !== path));

              // await fetchUserImages();
              Alert.alert('Success', 'Image removed successfully');
              })
            })
          } catch (err: any) {
            Alert.alert('Error', String(err.message ?? err));
          } finally {
            setLoading(false);
          }
        } 
      }
    ]);
  };

  const handleUpdate = async (item: any) => {
    Alert.alert('Update Face', 'Choose an option', [
      { 
        text: 'Take Photo', 
        onPress: async () => { 
          const uri = await takePhoto(); 
          //if (uri) await replaceImage(item, uri); 
        } 
      },
      { 
        text: 'Choose from Photos', 
        onPress: async () => { 
          const uri = await pickImage(); 
          //if (uri) await replaceImage(item, uri); 
        } 
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const replaceImage = async (item: any, uri: string) => {
    try {
      setLoading(true);
      const user = await getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload new image
      const fileName = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      const path = `students/${user.id}/${Date.now()}_${fileName}`;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      const contentType = getContentType(uri);
      
      const { error: uploadError } = await supabase.storage
        .from('student-pictures')
        .upload(path, blob, { contentType });
      
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('student-pictures')
        .getPublicUrl(path);
      
      const publicUrl = publicData.publicUrl;

      // Update DB record
      const { error: updateErr } = await supabase
        .from('student_pictures')
        .update({ image_url: publicUrl })
        .eq('image_id', item.image_id);
      
      if (updateErr) throw updateErr;

      // Attempt to delete old storage object
      const oldPath = getStoragePathFromPublicUrl(item.image_url);
      if (oldPath) {
        const { error: storageErr } = await supabase.storage
          .from('student-pictures')
          .remove([oldPath]);
        
        if (storageErr) console.warn('Storage remove error', storageErr.message);
      }

      await fetchUserImages();
      Alert.alert('Success', 'Image updated successfully');
    } catch (err: any) {
      Alert.alert('Error', String(err.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={{ marginBottom: 12, alignItems: 'center' }}>
        {item ? (
          <Image 
            source={{ uri: item.signedUrl }} 
            style={{ width: 220, height: 220, borderRadius: 12 }} 
          />
        ) : (
          <Text>No image available</Text>
        )}

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity 
            style={[styles.actionBtnSecondary, { marginRight: 8 }]} 
            onPress={() => handleUpdate(item)}
          >
            <Text style={styles.actionBtnText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtnDanger} 
            onPress={() => handleRemove(item)}
          >
            <Text style={styles.actionBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face Data Management</Text>
      <Text style={styles.section}>
        {images.length ? 'Your registered pictures' : 'Your face is not registered.'}
      </Text>
      <Text style={styles.info}>
        Register your face to enable attendance with facial recognition.
      </Text>
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleRegister}>
          <Text style={styles.actionBtnText}>Register Face</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#185a9d" />}

      {images.length > 0 && (
        <FlatList 
          data={images} 
          keyExtractor={(i) => String(i.path)} 
          renderItem={renderItem} 
          contentContainerStyle={{ paddingTop: 20 }} 
        />
      )}
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
  section: {
    fontSize: 18,
    fontWeight: '600',
    color: '#185a9d',
    marginBottom: 10,
  },
  info: {
    fontSize: 15,
    color: '#636e72',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonGroup: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: '#43cea2',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginVertical: 8,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnSecondary: {
    backgroundColor: '#185a9d',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginVertical: 8,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnDanger: {
    backgroundColor: '#e84118',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginVertical: 8,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});

export default FaceDataManagementScreen;