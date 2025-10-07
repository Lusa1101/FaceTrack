#!/usr/bin/env python3
"""
attendance_recognizer.py

Simple desktop attendance recognizer that:
 - downloads student pictures from Supabase storage / student_pictures table
 - organizes them into known-face folders (one folder per student id / number)
 - runs a webcam loop using MediaPipe + OpenCV to detect and recognize faces
 - inserts attendance records into the `attendance_logs` table for a given session

Usage:
  python scripts/attendance_recognizer.py --session-id <SESSION_ID>

Environment variables expected (use .env):
  SUPABASE_URL - your Supabase project url
  SUPABASE_SERVICE_KEY - a service_role key (required to write attendance logs). If you only have anon key, you may be limited by policies.

Notes:
 - The script expects a public URL saved in student_pictures.image_url so it can download images directly.
 - Adjust DB column names if your schema differs.
 - This is a simple, local prototype for faculty use on a laptop with a camera.
"""

import os
import sys
import argparse
import time
import shutil
from pathlib import Path
import requests
import cv2
import numpy as np
import mediapipe as mp
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

try:
    from supabase import create_client
except Exception:
    create_client = None


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


class MediaPipeFaceRecognizer:
    def __init__(self, known_faces_folder=None, min_detection_confidence=0.5):
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0, min_detection_confidence=min_detection_confidence
        )

        self.known_face_encodings = []
        self.known_face_names = []

        if known_faces_folder:
            self._load_known_faces_from_folder(known_faces_folder)

        self.prev_time = time.time()
        self.fps = 0

    def _load_known_faces_from_folder(self, folder_path):
        print(f"Loading known faces from {folder_path}...")
        if not os.path.exists(folder_path):
            print("No known faces folder found")
            return

        for person_folder in os.listdir(folder_path):
            person_path = os.path.join(folder_path, person_folder)
            if not os.path.isdir(person_path):
                continue
            person_name = person_folder
            encodings = []
            for fname in os.listdir(person_path):
                if not fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue
                fpath = os.path.join(person_path, fname)
                img = cv2.imread(fpath)
                if img is None:
                    print(f"  ✗ Could not read {fpath}")
                    continue
                enc = self._extract_single_encoding(img)
                if enc is not None:
                    encodings.append(enc)
                    print(f"  ✓ Loaded {fpath}")
                else:
                    print(f"  ✗ No face found in {fpath}")

            if encodings:
                self.known_face_encodings.extend(encodings)
                self.known_face_names.extend([person_name] * len(encodings))

        print(f"Loaded {len(self.known_face_names)} encodings for {len(set(self.known_face_names))} people")

    def _extract_single_encoding(self, image):
        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.face_detection.process(rgb)
            if not results.detections:
                return None
            det = results.detections[0]
            bbox = det.location_data.relative_bounding_box
            h, w = image.shape[:2]
            x = max(0, int(bbox.xmin * w))
            y = max(0, int(bbox.ymin * h))
            width = max(1, int(bbox.width * w))
            height = max(1, int(bbox.height * h))
            face = image[y:y+height, x:x+width]
            if face.size == 0:
                return None
            face_resized = cv2.resize(face, (200, 200))
            face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
            encoding = face_gray.astype(np.float32) / 255.0
            return encoding.flatten()
        except Exception as e:
            print(f"Error extracting encoding: {e}")
            return None

    def recognize(self, frame, threshold=0.6):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb)
        detections = []
        if results.detections:
            for det in results.detections:
                bbox = det.location_data.relative_bounding_box
                h, w = frame.shape[:2]
                x = max(0, int(bbox.xmin * w))
                y = max(0, int(bbox.ymin * h))
                width = max(1, int(bbox.width * w))
                height = max(1, int(bbox.height * h))
                face = frame[y:y+height, x:x+width]
                if face.size == 0:
                    continue
                name = 'Unknown'
                conf = 0.0
                if self.known_face_encodings:
                    enc = self._extract_single_encoding(face)
                    if enc is not None:
                        sims = []
                        for i, known in enumerate(self.known_face_encodings):
                            min_len = min(len(enc), len(known))
                            if min_len == 0:
                                continue
                            sim = cosine_similarity(enc[:min_len].reshape(1, -1), known[:min_len].reshape(1, -1))[0][0]
                            sims.append((sim, self.known_face_names[i]))
                        if sims:
                            best_sim, best_name = max(sims, key=lambda x: x[0])
                            if best_sim >= threshold:
                                name = best_name
                                conf = float(best_sim)
                detections.append((x, y, width, height, name, conf))

        # update fps
        now = time.time()
        self.fps = 1.0 / (now - self.prev_time) if now != self.prev_time else 0
        self.prev_time = now
        return detections


def download_student_images(supabase, bucket: str, out_folder: Path):
    """Download images listed in student_pictures table and save them under out_folder/<student_identifier>/"""
    ensure_dir(out_folder)
    print("Querying student_pictures rows from DB...")
    res = supabase.table('student_pictures').select('image_id,image_url,user_id').execute()
    if res.status_code != 200 and res.status_code != 201:
        print('Failed to query student_pictures:', res.text)
        return []
    rows = res.data
    print(f"Found {len(rows)} pictures")

    # Try to map user_id -> student_number via `student` table
    user_to_number = {}
    try:
        r2 = supabase.table('student').select('user_id,student_number').execute()
        if r2.status_code in (200, 201):
            for r in r2.data:
                user_to_number[r['user_id']] = r.get('student_number') or r.get('student_no') or r['user_id']
    except Exception:
        pass

    downloaded = []
    for row in rows:
        uid = row.get('user_id') or 'unknown'
        identifier = user_to_number.get(uid, uid)
        person_folder = out_folder / str(identifier)
        ensure_dir(person_folder)
        url = row.get('image_url')
        if not url:
            continue
        fname = f"{row.get('image_id')}.jpg"
        dest = person_folder / fname
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                with open(dest, 'wb') as f:
                    f.write(r.content)
                downloaded.append({'path': str(dest), 'user_id': uid, 'identifier': identifier})
                print(f"Downloaded {url} -> {dest}")
            else:
                print(f"Failed to download {url}: status {r.status_code}")
        except Exception as e:
            print(f"Error downloading {url}: {e}")

    return downloaded


def draw_detections(frame, detections):
    for (x, y, w, h, name, conf) in detections:
        color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)
        label = f"{name} {conf:.2f}" if name != 'Unknown' else 'Unknown'
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
        cv2.rectangle(frame, (x, y - 20), (x + w, y), color, -1)
        cv2.putText(frame, label, (x + 4, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    return frame


def insert_attendance(supabase, session_id, recognized_identifier, user_id, confidence):
    try:
        payload = {
            'session_id': session_id,
            'student_user_id': user_id,
            'student_identifier': recognized_identifier,
            'confidence': float(confidence)
        }
        res = supabase.table('attendance_logs').insert(payload).execute()
        if res.status_code in (200, 201):
            return True
        print('Insert attendance failed:', res.status_code, res.text)
    except Exception as e:
        print('Error inserting attendance:', e)
    return False


def list_cameras(max_tests=5):
    # Try to detect available camera indices by attempting to open them briefly
    available = []
    for i in range(max_tests):
        cap = cv2.VideoCapture(i)
        opened = cap.isOpened()
        if opened:
            available.append(i)
            cap.release()
        else:
            cap.release()
    return available


def try_open_camera(preferred_index=None, backends=None):
    # backends not used for now, left as placeholder if specific OpenCV backends are needed
    indices_to_try = [preferred_index] if preferred_index is not None else []
    # add likely defaults
    indices_to_try.extend([0, 1, 2, 3])
    tried = []
    for idx in indices_to_try:
        if idx is None:
            continue
        tried.append(idx)
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            print(f'Opened camera at index {idx}')
            return cap, idx, tried
        cap.release()
    return None, None, tried


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--session-id', required=True, help='Session ID to attach attendance records to')
    parser.add_argument('--bucket', default='student-pictures', help='Supabase storage bucket name')
    parser.add_argument('--workdir', default='known_faces', help='Local folder to store downloaded face images')
    parser.add_argument('--threshold', type=float, default=0.6, help='Cosine similarity threshold')
    parser.add_argument('--camera-index', type=int, help='Preferred camera index to use')
    parser.add_argument('--list-cameras', action='store_true', help='List available camera indices and exit')
    args = parser.parse_args()

    load_dotenv()
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment or .env file')
        sys.exit(1)

    if create_client is None:
        print('supabase client not installed. Please pip install supabase')
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    workdir = Path(args.workdir)
    if workdir.exists():
        print('Cleaning local workdir...')
        shutil.rmtree(workdir)
    ensure_dir(workdir)

    # Download images
    downloaded = download_student_images(supabase, args.bucket, workdir)

    # Build recognizer
    recognizer = MediaPipeFaceRecognizer(str(workdir))

    # Start webcam
    if args.list_cameras:
        found = list_cameras(max_tests=8)
        print('Detected camera indices:', found)
        sys.exit(0)

    cap, used_idx, tried = try_open_camera(preferred_index=args.camera_index)
    if cap is None:
        found = list_cameras(max_tests=8)
        print('Could not open any camera from indices tried:', tried)
        print('Detected camera indices on this machine:', found)
        print('If no cameras are detected, ensure your camera drivers are installed or try running as Administrator.')
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print('Starting recognition. Press q to quit.')

    seen = set()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        detections = recognizer.recognize(frame, threshold=args.threshold)
        frame = draw_detections(frame, detections)

        # For each recognized face, attempt to insert attendance
        for (x, y, w, h, name, conf) in detections:
            if name != 'Unknown' and conf > args.threshold:
                # name is the identifier folder name we created earlier
                # We try to map back to user_id by querying student table
                # To avoid duplicates, key on (session_id, name)
                key = (args.session_id, name)
                if key in seen:
                    continue
                # Try to find a user_id for this identifier
                user_id = None
                try:
                    # lookup student by student_number or user_id
                    r = supabase.table('student').select('user_id').eq('student_number', name).execute()
                    if r.status_code in (200, 201) and r.data:
                        user_id = r.data[0].get('user_id')
                except Exception:
                    pass

                # fallback: assume name is user_id
                if not user_id:
                    user_id = name

                success = insert_attendance(supabase, args.session_id, name, user_id, conf)
                if success:
                    print(f"Marked attendance for {name} (user {user_id}) conf={conf:.2f}")
                    seen.add(key)

        # Show FPS and counts
        cv2.putText(frame, f"FPS: {recognizer.fps:.1f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imshow('Attendance Recognizer', frame)

        k = cv2.waitKey(1) & 0xFF
        if k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
