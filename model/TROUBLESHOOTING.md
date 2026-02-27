# Stress Checker Troubleshooting Guide

## 🚨 Common Issues & Solutions

### **Issue 1: Working Women Questions Not Loading**

**Symptoms:**
- Working women quiz shows loading but never loads questions
- Error: "Network Error" or "Failed to fetch questions"

**Solutions:**

1. **Check Flask Server Status:**
   ```bash
   # In Command Prompt/PowerShell
   cd "E:\React Native\SafeHer\model"
   python app.py
   ```
   
   You should see:
   ```
   * Running on all addresses (0.0.0.0)
   * Running on http://127.0.0.1:5000
   * Running on http://10.92.112.87:5000
   ```

2. **Test Server Connection:**
   - Open browser and go to: `http://10.92.112.87:5000`
   - Should see Flask error page (means server is working)

3. **Check Windows Firewall:**
   - Go to Windows Defender Firewall
   - Allow Python through firewall for both Private and Public networks

4. **Verify IP Address:**
   ```bash
   # Run this to get your current IP
   python get_ip.py
   ```

### **Issue 2: Student Quiz Only Runs Once**

**Symptoms:**
- First quiz works fine
- Second time clicking "Start Quiz" doesn't work
- App seems stuck or doesn't respond

**Solutions:**

1. **Restart React Native App:**
   - Stop Metro bundler (Ctrl+C)
   - Run `npm start` again
   - Reload the app

2. **Clear App Cache:**
   ```bash
   # In React Native project directory
   npx react-native start --reset-cache
   ```

3. **Check Console Logs:**
   - Open React Native debugger
   - Look for error messages in console
   - Check if API calls are being made

### **Issue 3: Network Connection Errors**

**Symptoms:**
- "Network Error" in React Native
- "Connection refused" errors

**Solutions:**

1. **Verify Network:**
   - Phone/emulator and computer must be on same WiFi
   - Check if both can access internet

2. **Update IP Address:**
   - Run `python get_ip.py` to get current IP
   - Update `STRESS_API_BASE_URL` in `stressService.js`

3. **Test API Directly:**
   ```bash
   # Test if server responds
   curl -X POST http://10.92.112.87:5000/get-questions -H "Content-Type: application/json" -d "{\"role\":\"working_women\"}"
   ```

### **Issue 4: Same Questions Every Time**

**Symptoms:**
- Getting identical questions on each quiz
- No randomization

**Solutions:**

1. **Check Backend Code:**
   - Ensure `random.seed()` is called
   - Verify `questions.sample(frac=1)` is used

2. **Restart Flask Server:**
   - Stop server (Ctrl+C)
   - Start again with `python app.py`

## 🔧 **Step-by-Step Debugging**

### **Step 1: Verify Flask Server**
```bash
cd "E:\React Native\SafeHer\model"
python app.py
```

### **Step 2: Test API Endpoints**
```bash
# Test working women
python -c "import requests; r = requests.post('http://10.92.112.87:5000/get-questions', json={'role':'working_women'}); print(r.status_code, len(r.json()['questions']))"

# Test student  
python -c "import requests; r = requests.post('http://10.92.112.87:5000/get-questions', json={'role':'student'}); print(r.status_code, len(r.json()['questions']))"
```

### **Step 3: Check React Native Logs**
- Open React Native debugger
- Look for console.log messages from stressService
- Check for network errors

### **Step 4: Verify IP Address**
```bash
python get_ip.py
```

## 📱 **React Native App Testing**

1. **Start Flask Server First:**
   ```bash
   cd model
   python app.py
   ```

2. **Start React Native:**
   ```bash
   cd frontend
   npm start
   ```

3. **Test Flow:**
   - HomeScreen → Stress Checker → Role Selection
   - Select "Working Women" → Should load questions
   - Complete quiz → Should show results
   - Try "Retake Quiz" → Should work again

## 🆘 **If Nothing Works**

1. **Restart Everything:**
   - Close all terminals
   - Stop Metro bundler
   - Kill Python processes
   - Restart computer if needed

2. **Check Dependencies:**
   ```bash
   pip install flask flask-cors pandas requests
   ```

3. **Verify File Paths:**
   - Ensure all CSV files are in `model/datasets/`
   - Check that `stress_backend.py` and `app.py` are in `model/`

4. **Test with Simple Server:**
   ```python
   from flask import Flask
   app = Flask(__name__)
   @app.route('/')
   def hello():
       return 'Hello World!'
   app.run(host='0.0.0.0', port=5000)
   ```

## 📞 **Getting Help**

If issues persist:
1. Check console logs in React Native debugger
2. Check Flask server terminal for error messages
3. Verify network connectivity between devices
4. Test API endpoints with Postman or curl
