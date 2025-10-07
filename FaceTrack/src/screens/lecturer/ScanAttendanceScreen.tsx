import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { getModuleStudents, getStudentEncodingsByModule, getStudentImages, getStudentNoEncoding, getStudents } from '../../supabaseClient';
import { getSimilarity, getSimilarity1, getSimilarity2 } from '../../facial_recog_lib';

const { width } = Dimensions.get('window');
const FACE_BOX_SIZE = width * 0.7;

export default function ScanAttendanceScreen({ navigation }: any) {
  const [scanning, setScanning] = useState(false);
  const recognized = ['202345678', '202345679']; // TODO: Replace with real scan logic
  const [knownFaces, setKnownFaces] = useState<{student_no: number, encoding: number[]}[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<any>(null);
  const [openCamera, setOpenCamera] = useState(false);
  
  // To handle session
  const module_id = 'SCSB082';

  React.useEffect(() => {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }, []);

  useEffect(() => {
    // Get the students
    console.log(`Hi from attendance:`) 
    try {
      //getStudentEncodingsByModule(module_id);
      getModuleStudents(module_id).then(result => {
        
        // Set the ids
        const list = result.map(x => x.student_id);
        setIds([...new Set(list)])

        result.map(x => {
          getStudents().then(x => {    
            // Set the student numbers        
            const std_no = x.map(y => {
              return {student_no: y.student_no, student_id:y.student_id};
            });

            std_no.map(std => {
              getStudentImages(std.student_id).then(y => {
                //console.log(`getStudentImages [${std.student_no}]: `, y[0])
                const list = y.map(z => {
                  return {student_no: std.student_no, encoding: z.encoding};
                });
                setKnownFaces([...list]);
              })
            });            
          })
        })
      });
      
    }
    catch (error) {
      console.log(`Error while fetching: ${error}`)
    }
  }, [])

  // Capturing images
  const handleCapture = async () => {
      try {
        if (cameraRef.current && isCameraReady) {
          // capture a photo for future processing
          // @ts-ignore
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
          console.log('Captured photo', photo.uri);
          // Send the image to api
          if (knownFaces.length > 0 && photo.uri) {
              // await getSimilarity(photo.uri, knownFaces, ids).then(result => {
              //   console.log('Similarity in handleCapture response:', result.name, result.confidence);
              // });
              // await getSimilarity1(photo.uri, knownFaces).then(result => {
              //   console.log('Similarity in handleCapture response:', result.name, result.confidence);
              // });
              await getSimilarity2(photo.uri, ids).then(result => {
                console.log('Similarity in handleCapture response:', result.name, result.confidence);
              });
          }
          else
            console.log('Known faces empty');
        }
      } catch (err) {
        console.warn('Capture error', err);
      }
    };
  
    // Auto-capture state and debouncing
    const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
    const lastAutoCaptureRef = useRef<number>(0);
    const AUTO_CAPTURE_COOLDOWN = 3000; // ms between auto captures
  
    const handleFacesDetected = async (event: any) => {
      try {
        const faces = event?.faces ?? [];
        if (!autoCaptureEnabled) return;
        if (!faces || faces.length === 0) return;
        const now = Date.now();
        if (now - lastAutoCaptureRef.current < AUTO_CAPTURE_COOLDOWN) return; // debounce
        lastAutoCaptureRef.current = now;
        console.log('Auto-capture triggered; faces detected:', faces.length);
        // perform capture
        if (cameraRef.current && isCameraReady) {
          // @ts-ignore
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
          console.log('Auto-captured photo', photo.uri);
          // TODO: process or upload the photo
          navigation.goBack();
        }
      } catch (err) {
        console.warn('onFacesDetected error', err);
      }
    };
  
    if (hasPermission === null) {
      return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
      return <View style={styles.center}><Text>No access to camera</Text></View>;
    }
  
    // prefer CameraType enum; fall back to Camera.Type if needed
    // Resolve Camera component robustly in case it's exported as default or named export.
    // Use runtime require so we inspect actual module shape at runtime (helps when bundler/export shape differs).
    let CameraComp: any = null;
    let preferredType: any = 'back';
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cameraModule: any = require('expo-camera');
      const maybeCamera = cameraModule?.Camera;
      const maybeCameraView = cameraModule?.CameraView;
      console.log('expo-camera module keys:', Object.keys(cameraModule || {}));
      console.log('cameraModule.Camera typeof:', typeof maybeCamera);
      console.log('cameraModule.CameraView typeof:', typeof maybeCameraView);
      try {
        console.log('cameraModule.Camera $$typeof:', (maybeCamera as any)?.$$typeof);
        console.log('cameraModule.Camera displayName:', (maybeCamera as any)?.displayName);
      } catch (err) {
        // ignore
      }
  
      // Prefer Camera if it's a function (React component), otherwise try CameraView
      if (typeof maybeCamera === 'function') {
        CameraComp = maybeCamera;
      } else if (maybeCameraView) {
        CameraComp = maybeCameraView;
      } else {
        CameraComp = cameraModule?.default ?? cameraModule;
      }
  
      preferredType = (maybeCamera?.Constants?.Type?.back) ?? (cameraModule?.default?.Constants?.Type?.back) ?? (maybeCameraView?.Constants?.Type?.back) ?? cameraModule?.Type?.back ?? 'back';
      console.log('Resolved CameraComp type:', typeof CameraComp);
  
      // If the resolved Camera export is an object (native host component), wrap it
      // in a function component so React sees a valid composite component.
      if (CameraComp && typeof CameraComp === 'object') {
        const HostComp = CameraComp;
        CameraComp = function WrappedCamera(props: any) {
          return React.createElement(HostComp as any, props);
        };
        console.log('Wrapped native Camera host component in function component to avoid React element-type errors.');
      }
    } catch (e) {
      console.warn('Failed to require expo-camera at runtime, falling back to static import', e);
      const RawCamera: any = (Camera as any)?.default ?? Camera;
      CameraComp = RawCamera;
      preferredType = RawCamera?.Constants?.Type?.back ?? RawCamera?.Type?.back ?? 'back';
    }
  
    // If CameraComp is not renderable, return a helpful fallback so the redbox is clearer and we can see module shape in logs.
    if (!CameraComp || (typeof CameraComp !== 'function' && typeof CameraComp !== 'object')) {
      console.warn('CameraComp is not a renderable component:', CameraComp);
      return (
        <View style={styles.center}>
          <Text style={{ color: '#fff' }}>Camera component not available or invalid. Check expo-camera install and imports.</Text>
        </View>
      );
    }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#185a9d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Attendance</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="camera" size={22} color="#185a9d" />
          <Text style={styles.cardTitle}>Camera Attendance</Text>
        </View>
        <TouchableOpacity style={styles.registerBtn} onPress={() => setOpenCamera(!openCamera)}>
          <Text style={styles.registerBtnText}>Open Camera to Take Attendance</Text>
        </TouchableOpacity>
        {scanning && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#43cea2', fontWeight: 'bold' }}>Recognized Students:</Text>
            {recognized.map(item => (
              <View key={item} style={styles.attendanceRow}>
                <Text style={styles.subject}>{item}</Text>
                <Text style={styles.present}>✔️</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.updateBtn, { marginTop: 8 }]} onPress={() => setScanning(false)}>
              <Text style={styles.updateBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {openCamera && knownFaces.length > 0 && (
        <View style={styles.container}>
              <CameraComp
                ref={(ref: any) => (cameraRef.current = ref)}
                style={styles.camera}
                type={preferredType}
                onCameraReady={() => setIsCameraReady(true)}
                ratio={"16:9"}
                // if the Camera component supports face detection props, attach handler
                onFacesDetected={handleFacesDetected}
                faceDetectorSettings={{
                  mode: 'fast',
                  detectLandmarks: 'none',
                  runClassifications: 'none',
                  minDetectionInterval: 100,
                  tracking: true,
                }}
              >
                <View style={styles.overlay}>
                  <View style={styles.faceBox} />
                </View>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <Ionicons name="camera" size={36} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.autoToggle} onPress={() => setAutoCaptureEnabled((s) => !s)}>
                  <Text style={{ color: '#fff' }}>{autoCaptureEnabled ? 'Auto: ON' : 'Auto: OFF'}</Text>
                </TouchableOpacity>
          </CameraComp>
              <Text style={styles.instruction}>Align your face within the box and tap the camera to register.</Text>
            </View>
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
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#185a9d', marginLeft: 8 },
  registerBtn: { backgroundColor: '#43cea2', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 24, alignSelf: 'flex-start', marginTop: 8 },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  updateBtn: { backgroundColor: '#eafaf1', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16 },
  updateBtnText: { color: '#185a9d', fontWeight: 'bold' },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  subject: { fontSize: 15, color: '#185a9d', flex: 1 },
  present: { color: '#43cea2', fontWeight: 'bold', fontSize: 18 },
   camera: {
     flex: 1,
     width: '100%',
     justifyContent: 'flex-end',
     alignItems: 'center',
   },
   overlay: {
     ...StyleSheet.absoluteFillObject,
     justifyContent: 'center',
     alignItems: 'center',
   },
   faceBox: {
     width: FACE_BOX_SIZE,
     height: FACE_BOX_SIZE,
     borderRadius: FACE_BOX_SIZE / 2,
     borderWidth: 4,
     borderColor: '#43cea2',
     backgroundColor: 'rgba(67,206,162,0.08)',
   },
   captureBtn: {
     position: 'absolute',
     bottom: 40,
     alignSelf: 'center',
     backgroundColor: '#43cea2',
     borderRadius: 32,
     padding: 16,
     elevation: 4,
   },
   autoToggle: {
     position: 'absolute',
     bottom: 100,
     alignSelf: 'center',
     backgroundColor: 'rgba(0,0,0,0.4)',
     borderRadius: 12,
     paddingVertical: 8,
     paddingHorizontal: 12,
   },
   instruction: {
     color: '#fff',
     fontSize: 16,
     textAlign: 'center',
     marginVertical: 16,
     backgroundColor: 'rgba(24,90,157,0.7)',
     padding: 8,
     borderRadius: 12,
     position: 'absolute',
     bottom: 0,
     width: '100%',
   },
   center: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: '#000',
   },
});

/**
 * 
 * import React, { useRef, useState } from 'react';
 import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
 import { Camera, CameraType } from 'expo-camera';
 import { Ionicons } from '@expo/vector-icons';
 import { useNavigation } from '@react-navigation/native';
 
 const { width } = Dimensions.get('window');
 const FACE_BOX_SIZE = width * 0.7;
 
 export default function FaceRegistrationCamera() {
   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
   const [isCameraReady, setIsCameraReady] = useState(false);
   const cameraRef = useRef<any>(null);
   const navigation = useNavigation();
 
   React.useEffect(() => {
     (async () => {
       const { status } = await Camera.requestCameraPermissionsAsync();
       setHasPermission(status === 'granted');
     })();
   }, []);
 
   const handleCapture = async () => {
     try {
       if (cameraRef.current && isCameraReady) {
         // capture a photo for future processing
         // @ts-ignore
         const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
         console.log('Captured photo', photo.uri);
         // TODO: upload photo or process
         navigation.goBack();
       }
     } catch (err) {
       console.warn('Capture error', err);
     }
   };
 
   // Auto-capture state and debouncing
   const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
   const lastAutoCaptureRef = useRef<number>(0);
   const AUTO_CAPTURE_COOLDOWN = 3000; // ms between auto captures
 
   const handleFacesDetected = async (event: any) => {
     try {
       const faces = event?.faces ?? [];
       if (!autoCaptureEnabled) return;
       if (!faces || faces.length === 0) return;
       const now = Date.now();
       if (now - lastAutoCaptureRef.current < AUTO_CAPTURE_COOLDOWN) return; // debounce
       lastAutoCaptureRef.current = now;
       console.log('Auto-capture triggered; faces detected:', faces.length);
       // perform capture
       if (cameraRef.current && isCameraReady) {
         // @ts-ignore
         const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
         console.log('Auto-captured photo', photo.uri);
         // TODO: process or upload the photo
         navigation.goBack();
       }
     } catch (err) {
       console.warn('onFacesDetected error', err);
     }
   };
 
   if (hasPermission === null) {
     return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
   }
   if (hasPermission === false) {
     return <View style={styles.center}><Text>No access to camera</Text></View>;
   }
 
   // prefer CameraType enum; fall back to Camera.Type if needed
   // Resolve Camera component robustly in case it's exported as default or named export.
   // Use runtime require so we inspect actual module shape at runtime (helps when bundler/export shape differs).
   let CameraComp: any = null;
   let preferredType: any = 'back';
   try {
     // eslint-disable-next-line @typescript-eslint/no-var-requires
     const cameraModule: any = require('expo-camera');
     const maybeCamera = cameraModule?.Camera;
     const maybeCameraView = cameraModule?.CameraView;
     console.log('expo-camera module keys:', Object.keys(cameraModule || {}));
     console.log('cameraModule.Camera typeof:', typeof maybeCamera);
     console.log('cameraModule.CameraView typeof:', typeof maybeCameraView);
     try {
       console.log('cameraModule.Camera $$typeof:', (maybeCamera as any)?.$$typeof);
       console.log('cameraModule.Camera displayName:', (maybeCamera as any)?.displayName);
     } catch (err) {
       // ignore
     }
 
     // Prefer Camera if it's a function (React component), otherwise try CameraView
     if (typeof maybeCamera === 'function') {
       CameraComp = maybeCamera;
     } else if (maybeCameraView) {
       CameraComp = maybeCameraView;
     } else {
       CameraComp = cameraModule?.default ?? cameraModule;
     }
 
     preferredType = (maybeCamera?.Constants?.Type?.back) ?? (cameraModule?.default?.Constants?.Type?.back) ?? (maybeCameraView?.Constants?.Type?.back) ?? cameraModule?.Type?.back ?? 'back';
     console.log('Resolved CameraComp type:', typeof CameraComp);
 
     // If the resolved Camera export is an object (native host component), wrap it
     // in a function component so React sees a valid composite component.
     if (CameraComp && typeof CameraComp === 'object') {
       const HostComp = CameraComp;
       CameraComp = function WrappedCamera(props: any) {
         return React.createElement(HostComp as any, props);
       };
       console.log('Wrapped native Camera host component in function component to avoid React element-type errors.');
     }
   } catch (e) {
     console.warn('Failed to require expo-camera at runtime, falling back to static import', e);
     const RawCamera: any = (Camera as any)?.default ?? Camera;
     CameraComp = RawCamera;
     preferredType = RawCamera?.Constants?.Type?.back ?? RawCamera?.Type?.back ?? 'back';
   }
 
   // If CameraComp is not renderable, return a helpful fallback so the redbox is clearer and we can see module shape in logs.
   if (!CameraComp || (typeof CameraComp !== 'function' && typeof CameraComp !== 'object')) {
     console.warn('CameraComp is not a renderable component:', CameraComp);
     return (
       <View style={styles.center}>
         <Text style={{ color: '#fff' }}>Camera component not available or invalid. Check expo-camera install and imports.</Text>
       </View>
     );
   }
   return (
     <View style={styles.container}>
       <CameraComp
         ref={(ref: any) => (cameraRef.current = ref)}
         style={styles.camera}
         type={preferredType}
         onCameraReady={() => setIsCameraReady(true)}
         ratio={"16:9"}
         // if the Camera component supports face detection props, attach handler
         onFacesDetected={handleFacesDetected}
         faceDetectorSettings={{
           mode: 'fast',
           detectLandmarks: 'none',
           runClassifications: 'none',
           minDetectionInterval: 100,
           tracking: true,
         }}
       >
         <View style={styles.overlay}>
           <View style={styles.faceBox} />
         </View>
         <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
           <Ionicons name="camera" size={36} color="#fff" />
         </TouchableOpacity>
         <TouchableOpacity style={styles.autoToggle} onPress={() => setAutoCaptureEnabled((s) => !s)}>
           <Text style={{ color: '#fff' }}>{autoCaptureEnabled ? 'Auto: ON' : 'Auto: OFF'}</Text>
         </TouchableOpacity>
   </CameraComp>
       <Text style={styles.instruction}>Align your face within the box and tap the camera to register.</Text>
     </View>
   );
 }
 
 const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: '#000',
     justifyContent: 'center',
     alignItems: 'center',
   },
   camera: {
     flex: 1,
     width: '100%',
     justifyContent: 'flex-end',
     alignItems: 'center',
   },
   overlay: {
     ...StyleSheet.absoluteFillObject,
     justifyContent: 'center',
     alignItems: 'center',
   },
   faceBox: {
     width: FACE_BOX_SIZE,
     height: FACE_BOX_SIZE,
     borderRadius: FACE_BOX_SIZE / 2,
     borderWidth: 4,
     borderColor: '#43cea2',
     backgroundColor: 'rgba(67,206,162,0.08)',
   },
   captureBtn: {
     position: 'absolute',
     bottom: 40,
     alignSelf: 'center',
     backgroundColor: '#43cea2',
     borderRadius: 32,
     padding: 16,
     elevation: 4,
   },
   autoToggle: {
     position: 'absolute',
     bottom: 100,
     alignSelf: 'center',
     backgroundColor: 'rgba(0,0,0,0.4)',
     borderRadius: 12,
     paddingVertical: 8,
     paddingHorizontal: 12,
   },
   instruction: {
     color: '#fff',
     fontSize: 16,
     textAlign: 'center',
     marginVertical: 16,
     backgroundColor: 'rgba(24,90,157,0.7)',
     padding: 8,
     borderRadius: 12,
     position: 'absolute',
     bottom: 0,
     width: '100%',
   },
   center: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: '#000',
   },
 });
 
 */