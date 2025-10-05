from flask import Flask, request, jsonify
import requests
import cv2
import numpy as np
import os
import json
from supabase import create_client, Client
from typing import List, Optional
from face import MediaPipeFaceRecognizer
from dotenv import load_dotenv
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16 MB limit

@app.errorhandler(413)
def request_entity_too_large(error):
    return f'File Too Large: {error}', 413

# Load env
load_dotenv()

# Initialize Supabase client
url = "https://wbkosuecqbsgwrkdtlux.supabase.co"
api_key: str = os.getenv("SUPABASE_API")
supabase: Client = create_client(url, api_key)

# Run function
mpfr = MediaPipeFaceRecognizer()

app = Flask(__name__)

# Increase the maximum file size limit
MAX_FILE_SIZE = 1100 * 1024 * 1024  # 10MB in bytes

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
print("MAX_CONTENT_LENGTH:", app.config.get('MAX_CONTENT_LENGTH'))


# CORS configuration
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response



@app.route("/get_similarity", methods=["POST"])
def get_similarity():
    try:
        # Check if file is present
        print('We are in: ', request.files)
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
        print(f'Form : {request.form}')
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
        
        if file_size > MAX_FILE_SIZE:
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

        # Run face recognition
        result = mpfr._extract_single_encoding(image)
        
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
        print(f'We are in')
        if "url" not in request.json:
            return jsonify({"error": "No file provided"}), 400
            
        file: str = request.json['url']
        # print("file: ", file)
        
        # Check if file is selected
        if file is None:
            return jsonify({"error": "No file selected"}), 400

        # Download image from URL
        response = requests.get(file)
        if response.status_code != 200:
            return "Failed to fetch image"
        
        # Convert image to NumPy array
        print('Loading image...')
        try:
            image_array = np.frombuffer(response.content, np.uint8)
            image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({"error": "Error while image processing"}), 400
                
        except Exception as e:
            print(f"Error while image processing: {str(e)}")
            return jsonify({"error": "Error while image processing"}), 400
        
        # Parse the arguments
        print("Passing image")
        try:
            result = mpfr._extract_single_encoding(image)
            # Check error
            if result is None:
                return {"error": "No face detected"}

            # Print
            print("Encoding", result)
            print("Type of result:", type(result))

            return {"encoding": result.tolist()}
        except Exception as e:
            print(f"Error while parsing args: {str(e)}")
            return jsonify({"error": "Error while parsing args"}), 400
        
    except Exception as e:
        print(f"Error in transcribe: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)