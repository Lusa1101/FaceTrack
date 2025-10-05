from app import app
from flask import request, jsonify
import cv2
import numpy as np
import json
from supabase import create_client, Client
import os
from face import MediaPipeFaceRecognizer

# Initialize Supabase client
url = "https://wbkosuecqbsgwrkdtlux.supabase.co"
api_key = os.getenv("SUPABASE_API")
supabase: Client = create_client(url, api_key)

# Import your MediaPipeFaceRecognizer (make sure this is in a separate file)
mpfr = MediaPipeFaceRecognizer()

# Max size
MAX_FILE_SIZE = 20 * 1024 * 1024

@app.route("/get_similarity", methods=["POST"])
def get_similarity():
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                "error": "No file provided", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400
            
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                "error": "No file selected", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Get JSON data from form
        known_faces_json = request.form.get('known_faces')
        student_no_json = request.form.get('student_no')
        
        if not known_faces_json or not student_no_json:
            print("Missing known_faces or student_no")
            return jsonify({
                "error": "Missing known_faces or student_no", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Check file size before processing
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        print(f"File size: {file_size} bytes")
        
        if file_size > app.config.get('MAX_CONTENT_LENGTH', MAX_FILE_SIZE):
            return jsonify({
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Read and decode image
        contents = file.read()
        if len(contents) == 0:
            return jsonify({
                "error": "Empty file", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({
                "error": "Invalid image format", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Parse JSON data
        print("known_faces raw:", known_faces_json)
        print("student_no raw:", student_no_json)

        try:
            known_faces_encoding = json.loads(known_faces_json)
            student_numbers = json.loads(student_no_json)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {str(e)}")
            return jsonify({
                "error": f"Invalid JSON format: {str(e)}", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Validate data
        if not known_faces_encoding or not student_numbers:
            print("Missing known_faces or student_no after parsing")
            return jsonify({
                "error": "Missing known_faces or student_no", 
                "name": "unknown", 
                "confidence": 0.0
            }), 400

        # Call your recognition logic
        name, confidence = mpfr._recognize_face_modified(
            image, known_faces_encoding, student_numbers
        )

        return jsonify({
            "error": "", 
            "name": name, 
            "confidence": confidence
        })

    except Exception as e:
        print(f"Error in get_similarity: {str(e)}")
        return jsonify({
            "error": str(e), 
            "name": "unknown", 
            "confidence": 0.0
        }), 500

@app.route("/get_encoding", methods=["POST"])
def transcribe():
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Get JSON data from form
        known_faces_json = request.form.get('known_faces')
        student_no_json = request.form.get('student_no')
        
        # Convert image to NumPy array
        print('Loading image...')
        try:
            content = file.read()
            image_array = np.frombuffer(content, np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({"error": "Error while image processing"}), 400
                
        except Exception as e:
            print(f"Error while image processing: {str(e)}")
            return jsonify({"error": "Error while image processing"}), 400

        # Parse the arguments
        print("Passing arguments")
        try:
            known_faces_encoding = json.loads(known_faces_json)  # List[List[float]]
            known_faces_id = json.loads(student_no_json)         # List[int]
            print('Known face encodings: ', known_faces_encoding)
            print('Student numbers: ', known_faces_id)
        except Exception as e:
            print(f"Error while parsing args: {str(e)}")
            return jsonify({"error": "Error while parsing args"}), 400

        print("Getting similarity")
        try:
            name, confidence = mpfr._recognize_face_modified(image, known_faces_encoding, known_faces_id)
        except Exception as e:
            print(f"Error while getting similarity: {str(e)}")
            return jsonify({"error": "Error while getting similarity"}), 400

        # Check error
        if name is None:
            return jsonify({"error": "No matches"}), 400

        # Print
        print(f"Name: {name} = {confidence}")
        return jsonify({"name": name, "confidence": confidence})

    except Exception as e:
        print(f"Error in transcribe: {str(e)}")
        return jsonify({"error": str(e)}), 500