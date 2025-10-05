import os
from fastapi import FastAPI, File, UploadFile, Form
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from tempfile import NamedTemporaryFile
from pydantic import BaseModel
import requests
import cv2
import mediapipe as mp
import numpy as np
from typing import List, Optional
from sklearn.metrics.pairwise import cosine_similarity
import os
import json
from supabase import create_client, Client, acreate_client, AsyncClient
# Import the class from the face.py
from face import MediaPipeFaceRecognizer
from dotenv import load_dotenv
import requests
from contextlib import asynccontextmanager


# Load the .env
load_dotenv()

# Set the max size
size = 2 * 1024 * 1024

# Setup the supabase
url = "https://wbkosuecqbsgwrkdtlux.supabase.co"# os.getenv("SUPABASE_URL")
api = os.getenv("SUPABASE_API")
supabase: Client = create_client(url, api)

# Run function
mpfr = MediaPipeFaceRecognizer()


# For preloads
encodings = []
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     try:
#         # run the fetch method
#         encodings = get_similarity()
#         yield
#     except Exception as e:
#         print(e)
#     finally:
#         encodings = []
#         print('Encodings cleaned')

        


app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# Preload encoding
def getEncodings():
    # Get the encodings
    try:
        response = (
            supabase
            .table('student_image')
            .select('user_id, encoding, student(student_no)')
            # .eq('student(student_id)', 'user_id')
            .execute()
        )
        app.state.encodings = response.data
        encodings = app.state.encodings
        print('List: ', len(encodings))
        
        # await getModuleStudents(std_ids=std_ids)
    except Exception as e:
        print('Encoding preloads exception: ',e)

def getPayload(paylaod):
    # Subscription
    if not paylaod:
        print('Payload from subscription: Nothing to show')
        
    record = paylaod['data']['record']
    print('Payload from subscription: ', record)

    # Fetch new data
    getEncodings()

    # get the student number
    # try:
    #     data: str = supabase.table('student').select('student_no').eq('student_id', record['user_id']).single().execute()
    #     student_no = extract_student_no(data)
    #     print('STudent number: ', student_no)
    # except Exception as e:
    #     print('Exception from student no [new image]: ', e)


import ast
import re

def extract_student_no(raw_str):
    # Find the part that looks like a dict
    match = re.search(r"data=({.*?})", raw_str)
    if match:
        try:
            data_dict = ast.literal_eval(match.group(1))
            return data_dict.get('student_no')
        except (ValueError, SyntaxError):
            return None
    return None



@app.on_event('startup')
async def preload_and_subscribe():
    supabase_async: AsyncClient = await acreate_client(url, api)
    if not supabase_async:
        print('Supabase is not initialized')
        # return {"":"", "":"", "":""}

    # Get the encodings
    getEncodings()

    # Subscribe to table insert
    try:
        response = (
            await supabase_async.channel('student_image')
            .on_postgres_changes("INSERT", schema="public", table="student_image", callback=getPayload)
            .subscribe()
        )

    except Exception as e:
        print('Exception for subscription: ', e)

class ImageURL(BaseModel):
    url: str

class SimilarityData(BaseModel):
    known_faces: List[List[float]]
    student_no: List[str]

class SimilarityResponse(BaseModel):
    name: str
    confidence: float
    error: Optional[str]=None


@app.post("/get_encoding")
async def transcribe(data: ImageURL):
    # Download image from URL
    response = requests.get(data.url)
    if response.status_code != 200:
        return "Failed to fetch image"
    
    # Convert to NumPy array
    image_array = np.frombuffer(response.content, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    # Run functon
    result = mpfr._extract_single_encoding(image)

    # Check error
    if result is None:
        return {"error": "No face detected"}

    # Print
    print("Encoding", result)
    print("Type of result:", type(result))

    return {"encoding": result.tolist()}


# Increase the maximum file size limit (e.g., 10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes


def getKnonwFaces(student_numbers):
    if not supabase:
        print("Supabase not initialized")    

    # Check the type 
    arr = np.array(student_numbers)
    std_no = arr.astype(int) # [int(x) for x in student_numbers]
    print("Out", std_no)

    # Get the know faces for these std numbers
    known_faces = []
    try:
        for x in student_numbers:
            encoding = supabase.table("student_image").select("encoding").eq("user_id", x).execute()
            encodings = [row["encoding"] for row in encoding.data if "encoding" in row]
            # for y in encodings:
            #     known_faces.insert(np.array(y))
            #     with open ("encodings.txt", "a") as file:
            #         print(f"\n{y}\n", file=file)
            
            known_faces.extend(encodings)
            # with open ("encodings.txt", "a") as file:
            #     print(f"\n{known_faces}\n", file=file)
            print(f"Length from supabase: {len(known_faces)}")

        return known_faces
    except Exception as error:
        print("Error while fetching table contents: ", str(error))


async def getModuleStudents(std_ids):
    # Check encoding first
    encodings = app.state.encodings
    print('Get module students: ', len(encodings))
    if len(encodings) == 0:
        print('No encodings')
        raise 'Encodings list is empty'

    # Filter the preloaded encodings
    filtered = [
        entry
        for entry in encodings
        if entry["user_id"] in std_ids
    ]
    students = [
        entry['student']['student_no']
        for entry in filtered
    ]
    images = [
        entry['encoding'] 
        for entry in filtered
    ]

    print('Students list: ', len(students))
    print('Images list: ', len(images))

    return students, images

def getFaces():
    url = os.getenv("SUPABASE_URL")
    api_key = os.getenv("SUPABASE_API")

    headers = {
        "apikey": api_key,
    }

    response = requests.get(f"https://wbkosuecqbsgwrkdtlux.supabase.co/rest/v1/student_image", headers=headers)

    print("Status Code:", response.status_code)
    print("Response:", response.text)


@app.post("/get_similarity")
async def get_similarity(
    file: UploadFile = File(...),
    student_no: str = Form(...),
    student_ids: str = Form(...),
):
    try:
        # Check file size before processing
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)  # Reset file pointer
        
        print(f"File size: {file_size} bytes")
        
        if file_size > MAX_FILE_SIZE:
            return {
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB", 
                "name": "Unknown", 
                "confidence": 0.0
            }

        # Validate file
        if not file.filename:
            return {"error": "No file provided", "name": "Unknown", "confidence": 0.0}

        # Read and decode image
        contents = await file.read()
        if len(contents) == 0:
            return {"error": "Empty file", "name": "Unknown", "confidence": 0.0}

        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Invalid image format", "name": "Unknown", "confidence": 0.0}

        # check encoding
        # encoding = mpfr._extract_single_encoding_modified(image)
        # print("Image encoding b4 passing: ", encoding)

        # Parse JSON strings with validation
        if not student_no or not student_ids:
            return {"error": "Missing student_no or student_ids", "name": "Unknown", "confidence": 0.0}
        student_no = json.loads(student_no)
        student_ids = json.loads(student_ids)

        # Known faces]
        known_faces = getKnonwFaces(student_ids)
        if not known_faces:
            return {"error": "Missing known_faces", "name": "Unknown", "confidence": 0.0}

        try:
            known_faces_encoding = [known_faces] # json.loads(known_faces)
            student_numbers = (student_no) # json.loads(student_no)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON format: {str(e)}", "name": "Unknown", "confidence": 0.0}

        # Validate data types and convert
        if not isinstance(known_faces_encoding, list) or not isinstance(student_numbers, list):
            return {"error": "known_faces and student_no must be arrays", "name": "Unknown", "confidence": 0.0}

        if len(known_faces_encoding) == 0 or len(student_numbers) == 0:
            return {"error": "Empty arrays provided", "name": "Unknown", "confidence": 0.0}

        # Convert to appropriate types
        try:
            known_faces_encoding = np.array(known_faces)  # [list(map(float, encoding)) for encoding in known_faces_encoding]
            student_numbers = np.array(student_no).flatten() # [int(num) for num in student_numbers]
        except (ValueError, TypeError) as e:
            return {"error": f"Invalid data types in arrays: {str(e)}", "name": "Unknown", "confidence": 0.0}
        
        # Call your recognition logic
        print("Std no: ", student_numbers.shape)
        print("Encodings: ", (known_faces_encoding.shape))
        name, confidence = mpfr._recognize_face_modified(
            image, known_faces_encoding, student_numbers
        )
        name = str(name)
        print ({"name": name, "confidence": confidence})

        return {"name": name, "confidence": confidence}

    except Exception as e:
        return {"error": f"Processing error: {str(e)}", "name": "Unknown", "confidence": 0.0}


@app.post("/get_similarity_2")
async def get_similarity_2(
    file: UploadFile = File(...),
    student_ids: str = Form(...),
):
    try:
        # Check file size before processing
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)  # Reset file pointer
        
        print(f"File size: {file_size} bytes")
        
        if file_size > MAX_FILE_SIZE:
            return {
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB", 
                "name": "Unknown", 
                "confidence": 0.0
            }

        # Validate file
        if not file.filename:
            return {"error": "No file provided", "name": "Unknown", "confidence": 0.0}

        # Read and decode image
        contents = await file.read()
        if len(contents) == 0:
            return {"error": "Empty file", "name": "Unknown", "confidence": 0.0}

        image_array = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Invalid image format", "name": "Unknown", "confidence": 0.0}

        # Parse JSON strings with validation
        if not student_ids:
            return {"error": "Missing student_ids", "name": "Unknown", "confidence": 0.0}
        student_ids = json.loads(student_ids)

        # Known faces]
        student_no, known_faces = await getModuleStudents(student_ids)
        if not known_faces:
            return {"error": "Missing known_faces", "name": "Unknown", "confidence": 0.0}

        try:
            known_faces_encoding = [known_faces] # json.loads(known_faces)
            student_numbers = (student_no) # json.loads(student_no)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON format: {str(e)}", "name": "Unknown", "confidence": 0.0}

        # Validate data types and convert
        if not isinstance(known_faces_encoding, list) or not isinstance(student_numbers, list):
            return {"error": "known_faces and student_no must be arrays", "name": "Unknown", "confidence": 0.0}

        if len(known_faces_encoding) == 0 or len(student_numbers) == 0:
            return {"error": "Empty arrays provided", "name": "Unknown", "confidence": 0.0}

        # Convert to appropriate types
        try:
            known_faces_encoding = np.array(known_faces)  # [list(map(float, encoding)) for encoding in known_faces_encoding]
            student_numbers = np.array(student_no).flatten() # [int(num) for num in student_numbers]
        except (ValueError, TypeError) as e:
            return {"error": f"Invalid data types in arrays: {str(e)}", "name": "Unknown", "confidence": 0.0}
        
        # Call your recognition logic
        print("Std no: ", student_numbers.shape)
        print("Encodings: ", (known_faces_encoding.shape))
        name, confidence = mpfr._recognize_face_modified(
            image, known_faces_encoding, student_numbers
        )
        name = str(name)
        print ({"name": name, "confidence": confidence})

        return {"name": name, "confidence": confidence}

    except Exception as e:
        return {"error": f"Processing error: {str(e)}", "name": "Unknown", "confidence": 0.0}


# @app.post("/get_similarity", response_model=SimilarityResponse)
# async def get_similarity(
#     data: SimilarityData,
#     file: UploadFile = File(...),
# ):
#     try:
#         # Read and decode image
#         contents = await file.read()
#         image_array = np.frombuffer(contents, np.uint8)
#         image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

#         # Parse JSON strings
#         if not data.known_faces or not data.student_no:
#             print("Missing known_faces or student_no")
#             return {"error": "Missing known_faces or student_no", "name": "unknown", "confidence": 0.0}

#         known_faces_encoding = json.loads(data.known_faces)
#         student_numbers = json.loads(data.student_no)
#         print("known_faces raw:", data.known_faces)
#         print("student_no raw:", data.student_no)


#         # Run functon
#         mpfr = MediaPipeFaceRecognizer()
#         result = mpfr._extract_single_encoding(image)

#         # Call your recognition logic
#         name, confidence = mpfr._recognize_face_modified(
#             image, known_faces_encoding, student_numbers
#         )

#         return {"error": "", "name": name, "confidence": confidence}

#     except Exception as e:
#         print(str(e))
#         return {"error": str(e), "name": "unknown", "confidence": 0.0}
 
# async def transcribe(data: SimilarityData, file: UploadFile = File(...)):
#     # Convert image to NumPy array
#     print('Loading image...')
#     try:
#         content = await file.read()
#         image_array = np.frombuffer(content, np.uint8)
#         image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
#     except:
#         print("Error while image processing")
#         return {"error": "Error while image processing"}

#     #  Initialize class
#     mpfr = MediaPipeFaceRecognizer()
    
#     # Pass the arguments
#     print("Paasing arguments")
#     try:
#         known_faces_encoding = json.loads(data.known_faces) # List[List[float]]
#         known_faces_id = json.loads(data.student_no)         # List[int]
#         print('Known face encodings: ', known_faces_encoding)
#         print('Student numbers: ', known_faces_id)
#     except:
#         print("Error while parsing args")
#         return {"error": "Error while parsing args"}

#     print("Getting similarity")
#     try:
#         name, confidence = mpfr._recognize_face_modified(image, known_faces_encoding, known_faces_id)
#     except:
#         print("Error while getting similarity")
#         return {"error": "Error while getting similarity"}

#     # Check error
#     if name is None:
#         return {"error": "No matches"}

#     # Print
#     print(f"Name: {name} = {confidence}")
#     return {"name": name, "confidence": confidence}

# "C:\Users\omphu\OneDrive\Desktop\nchlt_nso_202f_0003.wav"