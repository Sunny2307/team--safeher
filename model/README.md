# SafeHer Stress Model API

This is the Python Flask API for the SafeHer app's stress checking feature. It provides endpoints to get personalized stress assessment questions and analyze user responses.

## Features

- **Role-based Questions**: Different question sets for students, working women, and housewives
- **Randomized Quizzes**: Each quiz session gets random questions from different categories
- **Stress Analysis**: Comprehensive stress level assessment with personalized feedback
- **RESTful API**: Clean endpoints for easy integration with mobile apps

## API Endpoints

### GET Questions
```
POST /get-questions
Content-Type: application/json

{
  "role": "student" | "working_women" | "housewife"
}
```

**Response:**
```json
{
  "questions": [
    {
      "Category": "Emotional Well-being",
      "Question": "How often do you feel overwhelmed?",
      "Option1": "Not at all",
      "Option2": "Rarely",
      "Option3": "Sometimes",
      "Option4": "Often",
      "Option5": "Constantly"
    }
  ]
}
```

### Submit Answers
```
POST /submit-answers
Content-Type: application/json

{
  "role": "student" | "working_women" | "housewife",
  "answers": [1, 2, 3, 4, 5, 1, 2, 3]
}
```

**Response:**
```json
{
  "stress_level": "Medium Stress",
  "score": 20,
  "subcategory_analysis": ["emotional", "academic_pressure"],
  "tips": "⚠️ **Emotional Well-being**\nYou may be feeling overwhelmed...\n💡 _Tip_: Try journaling..."
}
```

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python app.py
   ```

3. **Test the API:**
   ```bash
   python test_deployment.py http://192.168.1.208:5000
   ```

### Deployment

1. **Choose a platform** (Render recommended for free tier)
2. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```
3. **Follow the platform-specific instructions**
4. **Test your deployment:**
   ```bash
   python test_deployment.py https://your-app-url.com
   ```

## File Structure

```
model/
├── app.py                 # Main Flask application
├── stress_backend.py      # Core stress analysis logic
├── config.py             # Configuration settings
├── requirements.txt      # Python dependencies
├── Procfile             # Deployment configuration
├── runtime.txt          # Python version specification
├── deploy.sh            # Deployment helper script
├── test_deployment.py   # API testing script
├── datasets/            # Question datasets
│   ├── emotional.csv
│   ├── safety.csv
│   ├── confidence.csv
│   ├── social_support.csv
│   ├── time_management.csv
│   ├── student.csv
│   ├── working_women.csv
│   └── housewife.csv
└── README.md            # This file
```

## Stress Categories

The API analyzes stress across multiple categories:

### Universal Categories (All Roles)
- **Emotional Well-being**: Overall emotional state
- **Safety**: Sense of security and comfort
- **Confidence**: Self-esteem and self-assurance
- **Social Support**: Relationships and community
- **Time Management**: Organization and planning

### Role-Specific Categories
- **Students**: Academic pressure, peer stress, parental expectations
- **Working Women**: Career growth, work-life balance, job workload
- **Housewives**: Domestic workload, recognition, financial dependency

## Stress Levels

- **Low Stress** (0-16 points): Minimal stress indicators
- **Medium Stress** (17-27 points): Moderate stress levels  
- **High Stress** (28-40 points): High stress indicators

## Integration with Frontend

After deployment, update your React Native app:

```javascript
// In frontend/src/services/stressService.js
const STRESS_API_BASE_URL = 'https://your-deployed-model-url.com';
```

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure all dependencies are installed
2. **File not found**: Ensure all CSV files are in the datasets folder
3. **CORS errors**: Flask-CORS is configured for common origins
4. **Deployment fails**: Check that all files are committed to Git

### Debug Steps

1. Test locally first: `python app.py`
2. Check logs in your deployment platform
3. Use the test script: `python test_deployment.py <URL>`
4. Verify all datasets are present

## Contributing

1. Test changes locally
2. Update tests if needed
3. Deploy to staging environment
4. Test with the mobile app
5. Deploy to production

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review deployment logs
3. Test endpoints individually
4. Contact the development team

---

**Note**: This API is designed to work with the SafeHer mobile application. Make sure to update the frontend configuration after deployment.
