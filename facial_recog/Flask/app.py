from flask import Flask
import os

app = Flask(__name__)

# Increase the maximum file size limit
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

# CORS configuration
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Import routes AFTER creating app to avoid circular imports
from routes import *

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)