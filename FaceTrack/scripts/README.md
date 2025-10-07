# Attendance Recognizer (desktop)

This is a simple desktop script that downloads student pictures from Supabase, builds a known-face dataset, runs webcam recognition using MediaPipe/OpenCV, and inserts attendance records into Supabase.

Prerequisites
- Python 3.8+
- A Supabase project with:
  - `student_pictures` table (image_id, user_id, image_url)
  - `student` table mapping user_id to student_number (or similar)
  - `attendance_logs` table to receive attendance rows
- A SUPABASE_SERVICE_KEY (service role) for writing attendance logs or appropriate DB policies allowing writes from this script.

Setup

1. Create a virtualenv and install requirements:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r scripts\requirements.txt
```

2. Create a `.env` in the project root with:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

3. Run the script (replace SESSION_ID with an existing session identifier):

```powershell
python scripts\attendance_recognizer.py --session-id 123
```

Notes & limitations
- This is a prototype. The recognition uses a basic grayscale flattened encoding with MediaPipe detection and cosine similarity. It's not as robust as neural-face-embedding approaches.
- The script uses public image URLs (image_url) to download student pictures. If your bucket is private, either make it public or generate signed URLs when inserting them into `student_pictures`.
- The script maps recognized folder names to `student.student_number`. If your schema stores different column names, adjust the script accordingly.

Security
- Keep your SUPABASE_SERVICE_KEY secret; do not commit it to version control.
