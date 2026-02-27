#!/usr/bin/env python3
"""
Simple script to get your computer's IP address for React Native connection
"""
import socket

def get_local_ip():
    try:
        # Connect to a remote server to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    print(f"Your computer's IP address: {ip}")
    print(f"Update stressService.js with: http://{ip}:5000")
    print(f"Flask server should be accessible at: http://{ip}:5000")
