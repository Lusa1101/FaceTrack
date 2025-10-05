import cv2
import mediapipe as mp
import numpy as np
import time
from sklearn.metrics.pairwise import cosine_similarity
import os
import shutil


class MediaPipeFaceRecognizer:
    def __init__(self, known_faces_folder=None):
        """
        Initialize MediaPipe Face Recognition with proper face encoding
        """
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=0.7
        )

        # Known faces database
        self.known_face_encodings = []
        self.known_face_names = []

        if known_faces_folder:
            self._load_known_faces_from_folder(known_faces_folder)

        # Performance tracking
        self.fps = 0
        self.prev_time = time.time()
        self.frame_count = 0

    def _load_known_faces_from_folder(self, folder_path):
        """Load multiple images for each person from folder structure"""
        print("Loading known faces from folder...")

        if not os.path.exists(folder_path):
            print(f"Folder not found: {folder_path}")
            return

        for person_folder in os.listdir(folder_path):
            person_path = os.path.join(folder_path, person_folder)
            if os.path.isdir(person_path):
                person_name = person_folder.replace('_', ' ')
                person_encodings = []

                print(f"Loading images for {person_name}...")

                # Load all images in the person's folder
                image_count = 0
                for image_file in os.listdir(person_path):
                    if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        image_path = os.path.join(person_path, image_file)
                        try:
                            image = cv2.imread(image_path)
                            if image is not None:
                                # Extract encoding from the image
                                encoding = self._extract_single_encoding(image)
                                if encoding is not None:
                                    person_encodings.append(encoding)
                                    image_count += 1
                                    print(f"  ✓ Loaded {image_file}")
                                    with open ("output.txt", "a") as file:
                                        print("In _load_known_face_from_folder\n", file=file)
                                        print(f"Personal Encoding {image_path} [{person_encodings.shape}]: {person_encodings}\n", file=file)
                                else:
                                    print(f"  ✗ No face found in {image_file}")
                            else:
                                print(f"  ✗ Could not read {image_file}")
                        except Exception as e:
                            print(f"  ✗ Error processing {image_file}: {e}")

                if person_encodings:
                    # Store all encodings for this person
                    self.known_face_encodings.extend(person_encodings)
                    self.known_face_names.extend([person_name] * len(person_encodings))
                    print(f"✓ Loaded {image_count} images for {person_name}")
                    with open ("output.txt", "a") as file:
                        print("In _load_known_faces_from_folder\n")
                        print(f"Known Face embedding {image_path}: {self.known_face_encodings}\n", file=file)
                        print(f"Known face names {image_path}: {self.known_face_names}\n", file=file)
                else:
                    print(f"✗ No valid faces found for {person_name}")

        print(f"Total loaded: {len(self.known_face_names)} encodings for {len(set(self.known_face_names))} people")

    def _extract_single_encoding(self, image):
        """Extract encoding from a single face image"""
        try:
            # Use face detection to find face
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            with self.mp_face_detection.FaceDetection(
                    model_selection=0, min_detection_confidence=0.5
            ) as face_detection:

                results = face_detection.process(rgb_image)

                if results.detections:
                    # Get the first face detected
                    detection = results.detections[0]
                    bbox = detection.location_data.relative_bounding_box
                    h, w = image.shape[:2]

                    # Extract face region
                    x = int(bbox.xmin * w)
                    y = int(bbox.ymin * h)
                    width = int(bbox.width * w)
                    height = int(bbox.height * h)

                    # Ensure coordinates are valid
                    x = max(0, x)
                    y = max(0, y)
                    width = min(w - x, width)
                    height = min(h - y, height)

                    if width > 0 and height > 0:
                        face_region = image[y:y + height, x:x + width]

                        # Resize face region for consistent encoding
                        face_resized = cv2.resize(face_region, (200, 200))

                        # Convert to grayscale for simpler encoding
                        face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)

                        # Normalize and flatten as encoding
                        encoding = face_gray.astype(np.float32) / 255.0
                        with open ("output.txt", "a") as file: 
                            print("\n\nIn _extract_single_encoding\n", file=file)
                            print(f"Extracting encodings [{encoding.shape}]: {encoding}\n", file=file)
                            print(f"Extracting encodings flattened [{encoding.flatten().shape}]: {encoding.flatten()}\n", file=file)
                        return encoding.flatten()

            return None

        except Exception as e:
            print(f"Error extracting encoding: {e}")
            return None

    def _recognize_face(self, face_image):
        """Recognize face using proper similarity comparison"""
        if len(self.known_face_encodings) == 0:
            return "Unknown", 0.0

        # Extract encoding from current face
        current_encoding = self._extract_single_encoding(face_image)
        with open ("output.txt", "a") as file: 
            print(f"\n\nIn _recognize face\n Image => {type(face_image)} \n {type(current_encoding)}", file=file)
        if current_encoding is None:
            return "Unknown", 0.0

        best_similarity = -1
        best_name = "Unknown"

        # Compare with all known encodings
        similarities = []
        with open ("output.txt", "a") as file: 
            print(f"\n\nIn _recognize face\n Encoding => {type(self.known_face_encodings)}", file=file)
        for i, known_encoding in enumerate(self.known_face_encodings):
            try:
                # Ensure same length
                min_len = min(len(current_encoding), len(known_encoding))
                if min_len == 0:
                    continue

                with open ("output.txt", "a") as file: 
                    print(f"\n\nIn _recognize face\n Known Encoding shape => {(known_encoding.shape)}", file=file)
                    print(f"\n\nIn _recognize face\n Current Encoding shape => {(current_encoding.shape)}", file=file)

                # Calculate cosine similarity
                similarity = cosine_similarity(
                    current_encoding[:min_len].reshape(1, -1),
                    known_encoding[:min_len].reshape(1, -1)
                )[0][0]

                similarities.append((similarity, self.known_face_names[i]))

            except Exception as e:
                continue

        if similarities:
            # Find the best match
            best_similarity, best_name = max(similarities, key=lambda x: x[0])

            # Apply threshold
            if best_similarity < 0.6:  # Adjust this threshold as needed
                best_name = "Unknown"

        return best_name, best_similarity
    
    def _extract_single_encoding_modified(self, face_image):
        """Extract encoding from a cropped face image"""
        try:
            if face_image is None or face_image.shape[0] == 0 or face_image.shape[1] == 0:
                print("Invalid face image")
                return None

            # Resize for consistency
            face_resized = cv2.resize(face_image, (200, 200))

            # Convert to grayscale
            face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)

            # Normalize and flatten
            encoding = face_gray.astype(np.float32) / 255.0

            with open("output.txt", "a") as file:
                print("\n\nIn _extract_single_encoding\n", file=file)
                print(f"Encoding shape: {encoding.shape}\n", file=file)
                print(f"Flattened shape: {encoding.flatten().shape}\n", file=file)

            return encoding.flatten()

        except Exception as e:
            print("Encoding error:", str(e))
            return None

    
    def _recognize_face_modified(self, face_image, known_faces_encoding, known_faces_id):
        """Recognize face using proper similarity comparison"""
        if len(known_faces_encoding) == 0:
            return "Unknown", 0.0

        # Extract encoding from current face
        if face_image is None or face_image.shape[0] == 0 or face_image.shape[1] == 0:
            print("Invalid face image")
            return "Unknown", 0.0

        print("Extract image encoding ...")
        face_image_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        current_encoding = self._extract_single_encoding_modified(face_image)
        if current_encoding is None:
            print("\nReached\n")
            return "Unknown", 0.0

        best_similarity = -1
        best_name = "Unknown"

        # Compare with all known encodings
        print("Comparing image encodings ...")
        # known_faces_encoding = np.array(known_faces_encoding)
        current_encoding = np.array(current_encoding)
        similarities = []
        print("Known Face Encoding type: ", type(known_faces_encoding))
        for i, known_encoding in enumerate(known_faces_encoding):
            try:
                # Ensure same length
                min_len = min(len(current_encoding), len(known_encoding))
                if min_len == 0:
                    print("min_len == 0")
                    continue
                
                # known_encoding_np = np.array(known_encoding)
                # print("Type of known_encoding:", type(known_encoding))
                # print("Type of current_encoding:", (current_encoding.shape))
                # print("Type of known_faces_id:", type(known_faces_id))
                # print("Sample known_encoding:", known_encoding[:5][0])


                # Calculate cosine similarity
                similarity = cosine_similarity(
                    current_encoding[:min_len].reshape(1, -1),
                    known_encoding[:min_len].reshape(1, -1)
                )[0][0]

                similarities.append((similarity, known_faces_id[i]))

            except Exception as e:
                print('Excpetion: ', e)
                continue

        print("Similarity computing ...")
        if similarities:
            print("In similarities...")
            # Find the best match
            best_similarity, best_name = max(similarities, key=lambda x: x[0])

            # Apply threshold
            if best_similarity < 0.6:  # Adjust this threshold as needed
                best_name = "Unknown"

        return best_name, best_similarity

    def process_frame(self, frame):
        """Process a single frame for face detection and recognition"""
        self.frame_count += 1

        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Perform face detection
        results = self.face_detection.process(rgb_frame)

        detections = []

        if results.detections:
            for detection in results.detections:
                # Get bounding box
                bbox = detection.location_data.relative_bounding_box
                h, w, _ = frame.shape

                # Convert relative coordinates to absolute
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)

                # Ensure coordinates are within frame bounds
                x = max(0, x)
                y = max(0, y)
                width = min(w - x, width)
                height = min(h - y, height)

                # Extract face region for recognition
                face_region = frame[y:y + height, x:x + width]

                # Recognize face if we have known faces
                name = "Detected"
                confidence = 0.0

                if len(self.known_face_encodings) > 0 and face_region.size > 0:
                    name, confidence = self._recognize_face(face_region)

                detections.append((x, y, width, height, name, confidence))

        # Calculate FPS
        current_time = time.time()
        self.fps = 1 / (current_time - self.prev_time)
        self.prev_time = current_time

        return frame, detections

    def draw_detections(self, frame, detections):
        """Draw face detections and recognition results on frame"""
        display_frame = frame.copy()

        for (x, y, w, h, name, confidence) in detections:
            # Choose color based on recognition result
            if name == "Unknown" or name == "Detected":
                color = (0, 0, 255)  # Red
                display_name = "Unknown"
            else:
                color = (0, 255, 0)  # Green
                display_name = f"{name} ({confidence:.2f})"

            # Draw bounding box
            cv2.rectangle(display_frame, (x, y), (x + w, y + h), color, 2)

            # Draw label background
            label_bg_height = 30
            cv2.rectangle(display_frame, (x, y - label_bg_height),
                          (x + w, y), color, -1)

            # Draw name
            cv2.putText(display_frame, display_name, (x + 5, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Display performance info
        cv2.putText(display_frame, f"FPS: {self.fps:.1f}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(display_frame, f"Faces: {len(detections)}", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        if self.known_face_encodings:
            unique_people = len(set(self.known_face_names))
            cv2.putText(display_frame, f"Known: {unique_people} people", (10, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            cv2.putText(display_frame, "Mode: Detection Only", (10, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        return display_frame


def setup_simple_version():
    """Automatically set up the folder structure and copy existing images"""
    KNOWN_FACES_FOLDER = "known_faces"

    # Create main folder
    os.makedirs(KNOWN_FACES_FOLDER, exist_ok=True)

    # Define person folders and their images
    person_images = {
        "Lerapela_Sebola": [
            "Images/WhatsApp Image 2025-04-11 at 08.08.55.jpeg",
            "Images/WIN_20250926_23_32_49_Pro.jpg"
        ],
        "202244400": [
            "facial_recog/known_faces/202244400/omphu_1.jpeg",
            "facial_recog/known_faces/202244400/omphu_2.jpeg"
        ]
    }

    print("Setting up known faces folder structure...")

    # Create folders and copy images
    for person, image_paths in person_images.items():
        person_folder = os.path.join(KNOWN_FACES_FOLDER, person)
        os.makedirs(person_folder, exist_ok=True)

        print(f"Created folder for: {person}")

        for i, image_path in enumerate(image_paths):
            if os.path.exists(image_path):
                # Copy the image to the person's folder
                image_name = f"image_{i + 1}.jpg"
                destination_path = os.path.join(person_folder, image_name)

                shutil.copy2(image_path, destination_path)
                print(f"  ✓ Copied: {image_path} -> {destination_path}")
            else:
                print(f"  ✗ Image not found: {image_path}")

    print("Folder setup completed!")
    return KNOWN_FACES_FOLDER


def main():
    """Main function to run the simple version"""

    # Automatically set up the folder structure
    KNOWN_FACES_FOLDER = setup_simple_version()

    # Initialize face recognizer
    print("\nInitializing MediaPipe Face Recognition...")
    recognizer = MediaPipeFaceRecognizer(KNOWN_FACES_FOLDER)

    # Initialize video capture
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        print("Error: Could not open camera")
        return

    print("Simple Face Recognition Started!")
    print("Controls:")
    print("- Press 'q' to quit")
    print("- Press 'r' to reload known faces")
    print("- Press 'd' for detection only mode")
    print("- Press 'c' for recognition mode")

    recognition_enabled = True

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Process frame
        if recognition_enabled:
            processed_frame, detections = recognizer.process_frame(frame)
        else:
            # Detection only mode
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = recognizer.face_detection.process(rgb_frame)
            detections = []

            if results.detections:
                for detection in results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    h, w, _ = frame.shape
                    x = int(bbox.xmin * w)
                    y = int(bbox.ymin * h)
                    width = int(bbox.width * w)
                    height = int(bbox.height * h)
                    detections.append((x, y, width, height, "Detected", 0.0))

            processed_frame = frame

        # Draw results
        display_frame = recognizer.draw_detections(processed_frame, detections)

        # Display
        cv2.imshow('Simple Face Recognition', display_frame)

        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            # Reload known faces
            recognizer = MediaPipeFaceRecognizer(KNOWN_FACES_FOLDER)
            recognition_enabled = True
            print("Reloaded known faces - Recognition mode")
        elif key == ord('d'):
            # Detection only mode
            recognition_enabled = False
            print("Switched to Detection Only mode")
        elif key == ord('c'):
            # Recognition mode
            recognition_enabled = True
            print("Switched to Recognition mode")

    cap.release()
    cv2.destroyAllWindows()
    print("Face recognition stopped.")


if __name__ == "__main__":
    main()