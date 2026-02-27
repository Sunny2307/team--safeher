#!/bin/bash

# Simple deployment script for the stress model
# This script helps you deploy to various platforms

echo "🚀 SafeHer Stress Model Deployment Script"
echo "========================================"

# Check if we're in the model directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: Please run this script from the model directory"
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."
required_files=("app.py" "stress_backend.py" "requirements.txt" "Procfile" "runtime.txt")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Check if datasets directory exists
if [ -d "datasets" ]; then
    echo "✅ datasets directory exists"
else
    echo "❌ datasets directory is missing"
    exit 1
fi

echo ""
echo "🎯 Choose your deployment platform:"
echo "1) Render (Recommended - Free tier available)"
echo "2) Heroku"
echo "3) Railway"
echo "4) PythonAnywhere"
echo "5) Just prepare files (no deployment)"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "📝 Render Deployment Instructions:"
        echo "1. Go to https://render.com and sign up"
        echo "2. Click 'New +' → 'Web Service'"
        echo "3. Connect your GitHub repository"
        echo "4. Set Root Directory to 'model'"
        echo "5. Build Command: pip install -r requirements.txt"
        echo "6. Start Command: gunicorn app:app --bind 0.0.0.0:\$PORT"
        echo "7. Click 'Deploy Web Service'"
        echo ""
        echo "After deployment, update your frontend stressService.js with the new URL"
        ;;
    2)
        echo "📝 Heroku Deployment Instructions:"
        echo "1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
        echo "2. Run: heroku login"
        echo "3. Run: heroku create your-stress-model-app"
        echo "4. Run: git add . && git commit -m 'Deploy stress model'"
        echo "5. Run: git push heroku main"
        echo ""
        echo "After deployment, update your frontend stressService.js with the new URL"
        ;;
    3)
        echo "📝 Railway Deployment Instructions:"
        echo "1. Go to https://railway.app and sign up"
        echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "3. Select your repository"
        echo "4. Set Root Directory to 'model'"
        echo "5. Railway will auto-deploy"
        echo ""
        echo "After deployment, update your frontend stressService.js with the new URL"
        ;;
    4)
        echo "📝 PythonAnywhere Deployment Instructions:"
        echo "1. Go to https://pythonanywhere.com and sign up"
        echo "2. Create a new Web App"
        echo "3. Upload your files via the Files tab"
        echo "4. Configure the WSGI file"
        echo "5. Reload your web app"
        echo ""
        echo "After deployment, update your frontend stressService.js with the new URL"
        ;;
    5)
        echo "📁 Files are ready for deployment!"
        echo "All required files are present and configured."
        echo "You can now deploy to any platform of your choice."
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🔧 After deployment, don't forget to:"
echo "1. Test your endpoints with curl or Postman"
echo "2. Update frontend/src/services/stressService.js with the new URL"
echo "3. Test the complete flow in your app"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"


