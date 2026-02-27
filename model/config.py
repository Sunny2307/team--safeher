# Configuration file for the stress model API
import os

class Config:
    # Flask configuration
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    PORT = int(os.environ.get('PORT', 5000))
    
    # CORS configuration
    CORS_ORIGINS = [
        "http://192.168.1.208:3000",
        "http://192.168.1.208:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        # Add your frontend URLs here
        "https://safeher-backend-nj32.onrender.com",
        # Add your deployed frontend URL when available
    ]
    
    # API configuration
    API_VERSION = "v1"
    
    # Dataset configuration
    DATASETS_PATH = "datasets"
    
    # Supported roles
    SUPPORTED_ROLES = ["student", "working_women", "housewife"]
    
    # Stress level thresholds
    LOW_STRESS_THRESHOLD = 16
    MEDIUM_STRESS_THRESHOLD = 27
    HIGH_STRESS_THRESHOLD = 40


