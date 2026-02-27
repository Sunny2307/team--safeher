# Stress Checker Feature

This document explains how to set up and run the stress checker feature in the SafeHer app.

## Backend Setup (Python Flask)

### Prerequisites
- Python 3.7+
- Required packages: `flask`, `flask-cors`, `pandas`

### Installation
1. Navigate to the model directory:
   ```bash
   cd model
   ```

2. Install required packages:
   ```bash
   pip install flask flask-cors pandas
   ```

### Running the Backend
1. Start the Flask server:
   ```bash
   python app.py
   ```

2. The server will run on `http://0.0.0.0:5000` (accessible from any device on your network)
3. Note your computer's IP address (e.g., `10.92.112.87`) for React Native connection

### API Endpoints
- `POST /get-questions` - Get quiz questions for a specific role
  - Body: `{"role": "student" | "working_women" | "housewife"}`
  - Returns: `{"questions": [...]}`

- `POST /submit-answers` - Submit answers and get stress analysis
  - Body: `{"role": "student" | "working_women" | "housewife", "answers": [1,2,3,4,5,1,2,3]}`
  - Returns: `{"stress_level": "Low Stress", "score": 15, "subcategory_analysis": [...], "tips": "..."}`

## Frontend Integration

### New Screens Added
1. **RoleSelectionScreen** - Choose between Student, Working Women, or Housewife
2. **QuizScreen** - Display questions and collect answers
3. **ResultScreen** - Show stress analysis results and recommendations

### Navigation Flow
```
HomeScreen → RoleSelectionScreen → QuizScreen → ResultScreen
```

### API Service
- `stressService.js` - Handles communication with Python backend
- Base URL: `http://10.92.112.87:5000` (update with your computer's IP)

## Features

### Role-Based Questions
- **Student**: Academic pressure, peer stress, parental expectations
- **Working Women**: Career growth, work-life balance, job workload
- **Housewife**: Domestic workload, recognition, financial dependency

### Randomization
- Questions are randomly selected from each category for every quiz
- No sequential progress tracking - each quiz is unique
- Questions are shuffled to randomize order

### Stress Analysis
- **Low Stress** (0-16 points): Minimal stress indicators
- **Medium Stress** (17-27 points): Moderate stress levels
- **High Stress** (28-40 points): High stress indicators

### Personalized Recommendations
- Category-specific feedback
- Actionable tips and suggestions
- Progress tracking across quiz sessions

## Testing

### Backend Testing
```bash
# Test the backend
python -c "import stress_backend; print('Backend working')"
python -c "from app import app; print('Flask app ready')"
```

### Frontend Testing
1. Start the React Native app
2. Navigate to HomeScreen
3. Tap "Start Quiz" button
4. Select a role
5. Complete the quiz
6. View results

## Data Structure

### Questions Format
Each question has:
- Category (e.g., "Academic Pressure", "Emotional Well-being")
- Question text
- 5 options (1-5 scale: Not at all → Constantly)

### Results Format
```json
{
  "stress_level": "Low Stress",
  "score": 15,
  "subcategory_analysis": ["emotional", "academic_pressure"],
  "tips": "⚠️ **Emotional Well-being**\nYou may be feeling overwhelmed...\n💡 _Tip_: Try journaling..."
}
```

## Troubleshooting

### Common Issues
1. **Backend not running**: Make sure Flask server is running on port 5000
2. **CORS errors**: Ensure flask-cors is installed and configured
3. **Network errors**: 
   - React Native can't connect to 192.168.1.208 - use your computer's IP address instead
   - Update `STRESS_API_BASE_URL` in `stressService.js` with your computer's IP
   - Make sure both devices are on the same network
   - Check Windows Firewall settings
4. **Missing datasets**: Ensure all CSV files are in the datasets folder
5. **Same questions every time**: Fixed in latest version - questions are now randomized
6. **Working women questions not loading**: Fixed in latest version - all roles now work properly

### Debug Steps
1. Check Python backend logs
2. Verify React Native Metro bundler logs
3. Test API endpoints with Postman or curl
4. Check network connectivity between frontend and backend
5. **Windows Firewall**: Allow Python through Windows Firewall
   - Go to Windows Defender Firewall → Allow an app through firewall
   - Add Python.exe and allow both Private and Public networks
6. **Test connection**: Open browser and go to `http://YOUR_IP:5000` (should show Flask error page)
