#!/usr/bin/env python3
"""
Test script to verify the stress model deployment
Run this script to test your deployed API endpoints
"""

import requests
import json
import sys

def test_endpoint(base_url, endpoint, data=None):
    """Test a single endpoint"""
    url = f"{base_url}{endpoint}"
    print(f"Testing {endpoint}...")
    
    try:
        if data:
            response = requests.post(url, json=data, timeout=10)
        else:
            response = requests.get(url, timeout=10)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Success!")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print("❌ Failed!")
            print(f"Error: {response.text}")
        
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test_deployment.py <BASE_URL>")
        print("Example: python test_deployment.py https://your-app.onrender.com")
        sys.exit(1)
    
    base_url = sys.argv[1].rstrip('/')
    print(f"Testing deployment at: {base_url}")
    print("=" * 50)
    
    # Test get-questions endpoint
    success = test_endpoint(base_url, "/get-questions", {"role": "student"})
    
    if success:
        print("\n" + "=" * 50)
        # Test submit-answers endpoint
        test_data = {
            "role": "student",
            "answers": [1, 2, 3, 4, 5, 1, 2, 3]
        }
        test_endpoint(base_url, "/submit-answers", test_data)
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\nIf both tests passed, your deployment is working correctly!")
    print("Update your frontend stressService.js with this URL:")
    print(f"const STRESS_API_BASE_URL = '{base_url}';")

if __name__ == "__main__":
    main()


