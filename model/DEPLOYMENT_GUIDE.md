# Model Deployment Guide

This guide will help you deploy your stress checker model to a cloud platform so it can be accessed from your SafeHer app.

## Prerequisites

1. **Git Repository**: Your model folder should be in a Git repository
2. **Cloud Platform Account**: Choose one of the platforms below
3. **Domain/URL**: You'll get a public URL for your deployed model

## Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

1. **Sign up** at [render.com](https://render.com)
2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Select the `model` folder as the root directory
   - Choose "Web Service"
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`

3. **Deploy**: Click "Deploy Web Service"
4. **Get your URL**: You'll get a URL like `https://your-app-name.onrender.com`

### Option 2: Heroku

1. **Install Heroku CLI** from [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)
2. **Login**: `heroku login`
3. **Create app**: `heroku create your-stress-model-app`
4. **Deploy**: 
   ```bash
   cd model
   git add .
   git commit -m "Deploy stress model"
   git push heroku main
   ```
5. **Get your URL**: `https://your-stress-model-app.herokuapp.com`

### Option 3: Railway

1. **Sign up** at [railway.app](https://railway.app)
2. **Create new project** from GitHub
3. **Select your repository** and `model` folder
4. **Deploy automatically**
5. **Get your URL**: `https://your-app-name.railway.app`

### Option 4: PythonAnywhere

1. **Sign up** at [pythonanywhere.com](https://pythonanywhere.com)
2. **Create a new Web App**
3. **Upload your files** via Files tab
4. **Configure WSGI** file
5. **Reload** your web app

## Testing Your Deployment

Once deployed, test your endpoints:

### Test Get Questions
```bash
curl -X POST https://your-app-url.com/get-questions \
  -H "Content-Type: application/json" \
  -d '{"role": "student"}'
```

### Test Submit Answers
```bash
curl -X POST https://your-app-url.com/submit-answers \
  -H "Content-Type: application/json" \
  -d '{"role": "student", "answers": [1,2,3,4,5,1,2,3]}'
```

## Update Your Frontend

After deployment, update your frontend to use the new URL:

1. **Find your stress service file** (likely `frontend/src/services/stressService.js`)
2. **Update the base URL**:
   ```javascript
   const STRESS_API_BASE_URL = 'https://your-app-url.com';
   ```

## Environment Variables (Optional)

For production, you might want to set environment variables:

- `FLASK_ENV=production`
- `PORT=5000` (usually set automatically by the platform)

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are in `requirements.txt`
2. **App crashes**: Check logs in your platform's dashboard
3. **CORS errors**: Flask-CORS is already configured in your app
4. **File not found**: Ensure all CSV files are committed to Git

### Debug Steps:

1. Check platform logs for error messages
2. Test endpoints with curl or Postman
3. Verify all files are uploaded correctly
4. Check that Python version matches `runtime.txt`

## Cost Considerations

- **Render**: Free tier available, $7/month for paid
- **Heroku**: No free tier anymore, starts at $5/month
- **Railway**: Free tier available, $5/month for paid
- **PythonAnywhere**: Free tier available, $5/month for paid

## Security Notes

- Your deployed app will be publicly accessible
- Consider adding authentication if needed
- Monitor usage and costs
- Keep your dependencies updated

## Next Steps

1. Deploy using one of the options above
2. Test your deployed endpoints
3. Update your frontend with the new URL
4. Test the complete flow in your app
5. Monitor the deployment for any issues


