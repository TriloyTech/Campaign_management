#!/usr/bin/env python3
"""
Login Authentication Test - Campaign Tracker
Tests the specific login issue reported: super@agency.com / admin123 not working
"""

import requests
import json

# Configuration
BASE_URL = "https://campaign-tracker-71.preview.emergentagent.com/api"

def test_login_authentication():
    """Test login authentication with various scenarios"""
    print("=" * 80)
    print("🔐 TESTING LOGIN AUTHENTICATION")
    print("=" * 80)
    print(f"Backend URL: {BASE_URL}")
    print()
    
    # First, ensure seed data exists
    print("📦 Step 0: Creating seed data...")
    try:
        response = requests.post(f"{BASE_URL}/seed", timeout=30)
        if response.status_code == 200:
            print("✅ Seed data created successfully")
            data = response.json()
            print(f"   Available credentials from seed:")
            if "credentials" in data:
                creds = data["credentials"]
                if "superAdmin" in creds:
                    print(f"   - Super Admin: {creds['superAdmin'].get('email')} / {creds['superAdmin'].get('password')}")
                if "admin" in creds:
                    print(f"   - Admin: {creds['admin'].get('email')} / {creds['admin'].get('password')}")
                if "teamMember" in creds:
                    print(f"   - Team Member: {creds['teamMember'].get('email')} / {creds['teamMember'].get('password')}")
        else:
            print(f"⚠️  Seed data response: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Seed data error: {str(e)}")
    
    print()
    print("-" * 80)
    
    # Test Case 1: Login with super@agency.com / admin123 (WRONG PASSWORD)
    print("\n📋 Test Case 1: Login with super@agency.com / admin123 (REPORTED ISSUE)")
    print("Expected: 401 Unauthorized (wrong password)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "super@agency.com", "password": "admin123"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            data = response.json()
            if "error" in data:
                print(f"✅ CORRECT: Login rejected with 401 - {data['error']}")
                print("   ℹ️  This is expected behavior - 'admin123' is NOT the correct password for super@agency.com")
            else:
                print(f"⚠️  Got 401 but missing error message")
        elif response.status_code == 200:
            print(f"❌ UNEXPECTED: Login succeeded when it should have failed")
            print(f"   This indicates a security issue - wrong password was accepted!")
        else:
            print(f"❌ UNEXPECTED STATUS: {response.status_code}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print()
    print("-" * 80)
    
    # Test Case 2: Login with super@agency.com / super123 (CORRECT PASSWORD)
    print("\n📋 Test Case 2: Login with super@agency.com / super123 (CORRECT PASSWORD)")
    print("Expected: 200 OK with token")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "super@agency.com", "password": "super123"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                user = data["user"]
                print(f"✅ PASSED: Login successful")
                print(f"   User: {user.get('name')} ({user.get('email')})")
                print(f"   Role: {user.get('role')}")
                print(f"   Token: {data['token'][:50]}...")
            else:
                print(f"❌ FAILED: Missing token or user in response")
                print(f"   Response: {response.text}")
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print()
    print("-" * 80)
    
    # Test Case 3: Login with admin@agency.com / admin123
    print("\n📋 Test Case 3: Login with admin@agency.com / admin123")
    print("Expected: 200 OK with token")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "admin@agency.com", "password": "admin123"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                user = data["user"]
                print(f"✅ PASSED: Login successful")
                print(f"   User: {user.get('name')} ({user.get('email')})")
                print(f"   Role: {user.get('role')}")
            else:
                print(f"❌ FAILED: Missing token or user in response")
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print()
    print("-" * 80)
    
    # Test Case 4: Login with wrong password for admin
    print("\n📋 Test Case 4: Login with admin@agency.com / wrongpassword")
    print("Expected: 401 Unauthorized")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "admin@agency.com", "password": "wrongpassword"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            data = response.json()
            print(f"✅ PASSED: Login correctly rejected - {data.get('error', 'No error message')}")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print()
    print("-" * 80)
    
    # Test Case 5: Login with non-existent user
    print("\n📋 Test Case 5: Login with nonexistent@test.com / admin123")
    print("Expected: 401 Unauthorized")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            headers={"Content-Type": "application/json"},
            json={"email": "nonexistent@test.com", "password": "admin123"},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            data = response.json()
            print(f"✅ PASSED: Non-existent user correctly rejected - {data.get('error', 'No error message')}")
        else:
            print(f"❌ FAILED: Expected 401, got {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    print()
    print("=" * 80)
    print("🏁 LOGIN AUTHENTICATION TEST COMPLETE")
    print("=" * 80)
    print()
    print("📊 SUMMARY:")
    print("   The correct credentials for super admin are:")
    print("   ✅ Email: super@agency.com")
    print("   ✅ Password: super123 (NOT admin123)")
    print()
    print("   If the user is trying to login with super@agency.com / admin123,")
    print("   they are using the WRONG PASSWORD. The correct password is 'super123'.")
    print()

if __name__ == "__main__":
    test_login_authentication()
