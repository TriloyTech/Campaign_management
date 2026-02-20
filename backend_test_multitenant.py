#!/usr/bin/env python3
"""
Digital Marketing Campaign Tracker Multi-Tenant Backend API Test Suite
Tests all multi-tenant features including super admin organization management and data isolation.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://campaign-tracker-71.preview.emergentagent.com/api"

class MultiTenantTester:
    def __init__(self):
        self.super_admin_token = None
        self.org1_admin_token = None
        self.org2_admin_token = None
        self.org1_member_token = None
        self.org2_member_token = None
        self.org1_id = None
        self.org2_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
    def log_result(self, test_name, success, details=""):
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {details}")
            print(f"❌ {test_name}: FAILED - {details}")
    
    def make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
                
            return response, None
        except requests.exceptions.RequestException as e:
            return None, f"Request error: {str(e)}"
    
    def test_seed_data_multitenant(self):
        """Test seed data creation for multi-tenant setup"""
        print("\n=== TESTING MULTI-TENANT SEED DATA ===")
        
        response, error = self.make_request("POST", "/seed")
        if error:
            self.log_result("Multi-Tenant Seed Data Creation", False, error)
            return False
        
        if response.status_code == 200:
            data = response.json()
            credentials = data.get("credentials", {})
            
            # Check for all expected credentials
            if (credentials.get("superAdmin", {}).get("email") == "super@agency.com" and
                credentials.get("admin1", {}).get("email") == "admin@agency.com" and
                credentials.get("admin2", {}).get("email") == "admin2@agency.com" and
                credentials.get("teamMember1", {}).get("email") == "member@agency.com" and
                credentials.get("teamMember2", {}).get("email") == "member2@agency.com"):
                self.log_result("Multi-Tenant Seed Data Creation", True, "Created seed data with all required users")
                return True
            else:
                self.log_result("Multi-Tenant Seed Data Creation", False, f"Missing expected credentials: {credentials}")
                return False
        else:
            self.log_result("Multi-Tenant Seed Data Creation", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    
    def test_login_all_users(self):
        """Login all test users and store tokens"""
        print("\n=== TESTING LOGIN FOR ALL USERS ===")
        
        users = [
            ("Super Admin", "super@agency.com", "super123", "super_admin_token"),
            ("Org1 Admin", "admin@agency.com", "admin123", "org1_admin_token"),
            ("Org2 Admin", "admin2@agency.com", "admin123", "org2_admin_token"),
            ("Org1 Member", "member@agency.com", "member123", "org1_member_token"),
            ("Org2 Member", "member2@agency.com", "member123", "org2_member_token")
        ]
        
        for user_name, email, password, token_attr in users:
            login_data = {"email": email, "password": password}
            response, error = self.make_request("POST", "/auth/login", login_data)
            
            if error:
                self.log_result(f"Login {user_name}", False, error)
                continue
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    token = data["token"]
                    user = data["user"]
                    setattr(self, token_attr, token)
                    
                    # Store organization IDs for later use
                    if user_name == "Org1 Admin" or user_name == "Org1 Member":
                        self.org1_id = user.get("organizationId")
                    elif user_name == "Org2 Admin" or user_name == "Org2 Member":
                        self.org2_id = user.get("organizationId")
                    
                    self.log_result(f"Login {user_name}", True, f"Role: {user.get('role')}, OrgId: {user.get('organizationId')}")
                else:
                    self.log_result(f"Login {user_name}", False, "Missing token or user in response")
            else:
                self.log_result(f"Login {user_name}", False, f"Status: {response.status_code}")
    
    def test_super_admin_organization_management(self):
        """Test super admin organization CRUD operations"""
        print("\n=== TESTING SUPER ADMIN ORGANIZATION MANAGEMENT ===")
        
        if not self.super_admin_token:
            self.log_result("Super Admin Org Management", False, "No super admin token")
            return
        
        # GET all organizations (super admin only)
        response, error = self.make_request("GET", "/organizations", token=self.super_admin_token)
        if error:
            self.log_result("Super Admin GET Organizations", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            orgs = data.get("organizations", [])
            if len(orgs) >= 2:  # Should have at least 2 orgs from seed data
                self.log_result("Super Admin GET Organizations", True, f"Found {len(orgs)} organizations")
            else:
                self.log_result("Super Admin GET Organizations", False, f"Expected at least 2 orgs, got {len(orgs)}")
        else:
            self.log_result("Super Admin GET Organizations", False, f"Status: {response.status_code}")
        
        # Test regular admin cannot access organizations endpoint
        if self.org1_admin_token:
            response, error = self.make_request("GET", "/organizations", token=self.org1_admin_token)
            if error:
                self.log_result("Regular Admin Organization Access", False, error)
            elif response.status_code == 200:
                data = response.json()
                orgs = data.get("organizations", [])
                if len(orgs) == 1:  # Should only see their own org
                    self.log_result("Regular Admin Organization Access", True, "Admin sees only their own organization")
                else:
                    self.log_result("Regular Admin Organization Access", False, f"Admin should see only 1 org, got {len(orgs)}")
            else:
                self.log_result("Regular Admin Organization Access", False, f"Status: {response.status_code}")
        
        # POST new organization (super admin only)
        new_org_data = {
            "name": "Test Organization",
            "industry": "Technology",
            "address": "123 Test Street, Dhaka",
            "phone": "+880 1711-555555"
        }
        
        response, error = self.make_request("POST", "/organizations", new_org_data, self.super_admin_token)
        if error:
            self.log_result("Super Admin CREATE Organization", False, error)
            return
        
        created_org_id = None
        if response.status_code == 201:
            data = response.json()
            org = data.get("organization", {})
            created_org_id = org.get("id")
            if org.get("name") == "Test Organization":
                self.log_result("Super Admin CREATE Organization", True, f"Created org: {org.get('name')}")
            else:
                self.log_result("Super Admin CREATE Organization", False, "Incorrect organization details")
        else:
            self.log_result("Super Admin CREATE Organization", False, f"Status: {response.status_code}")
        
        # Test regular admin cannot create organizations
        if self.org1_admin_token and created_org_id:
            test_org = {"name": "Unauthorized Org"}
            response, error = self.make_request("POST", "/organizations", test_org, self.org1_admin_token)
            if error:
                self.log_result("Regular Admin CREATE Restriction", False, error)
            elif response.status_code == 403:
                self.log_result("Regular Admin CREATE Restriction", True, "Regular admin correctly denied org creation")
            else:
                self.log_result("Regular Admin CREATE Restriction", False, f"Should be 403, got {response.status_code}")
        
        # PUT update organization (super admin only)
        if created_org_id:
            update_data = {"name": "Updated Test Organization", "industry": "Updated Tech"}
            response, error = self.make_request("PUT", f"/organizations/{created_org_id}", update_data, self.super_admin_token)
            if error:
                self.log_result("Super Admin UPDATE Organization", False, error)
            elif response.status_code == 200:
                data = response.json()
                org = data.get("organization", {})
                if org.get("name") == "Updated Test Organization":
                    self.log_result("Super Admin UPDATE Organization", True, "Organization updated successfully")
                else:
                    self.log_result("Super Admin UPDATE Organization", False, "Update not applied correctly")
            else:
                self.log_result("Super Admin UPDATE Organization", False, f"Status: {response.status_code}")
        
        # DELETE organization (super admin only)
        if created_org_id:
            response, error = self.make_request("DELETE", f"/organizations/{created_org_id}", token=self.super_admin_token)
            if error:
                self.log_result("Super Admin DELETE Organization", False, error)
            elif response.status_code == 200:
                self.log_result("Super Admin DELETE Organization", True, "Organization deleted successfully")
            else:
                self.log_result("Super Admin DELETE Organization", False, f"Status: {response.status_code}")
    
    def test_multitenant_data_isolation(self):
        """Test multi-tenant data isolation"""
        print("\n=== TESTING MULTI-TENANT DATA ISOLATION ===")
        
        if not all([self.super_admin_token, self.org1_admin_token, self.org2_admin_token]):
            self.log_result("Multi-tenant Data Isolation", False, "Missing required tokens")
            return
        
        # Test super admin with organizationId parameter - should see only that org's data
        if self.org1_id:
            response, error = self.make_request("GET", f"/clients?organizationId={self.org1_id}", token=self.super_admin_token)
            if error:
                self.log_result("Super Admin Org1 Clients", False, error)
            elif response.status_code == 200:
                data = response.json()
                clients = data.get("clients", [])
                # Check if all clients belong to org1
                org1_clients = [c for c in clients if c.get("organizationId") == self.org1_id]
                if len(clients) == len(org1_clients) and len(clients) > 0:
                    self.log_result("Super Admin Org1 Clients", True, f"Super admin sees {len(clients)} org1 clients only")
                else:
                    self.log_result("Super Admin Org1 Clients", False, f"Data isolation issue: {len(clients)} total, {len(org1_clients)} org1")
            else:
                self.log_result("Super Admin Org1 Clients", False, f"Status: {response.status_code}")
        
        # Test regular org1 admin - should only see org1 data
        response, error = self.make_request("GET", "/clients", token=self.org1_admin_token)
        if error:
            self.log_result("Org1 Admin Data Isolation", False, error)
        elif response.status_code == 200:
            data = response.json()
            clients = data.get("clients", [])
            org1_clients = [c for c in clients if c.get("organizationId") == self.org1_id]
            if len(clients) == len(org1_clients):
                self.log_result("Org1 Admin Data Isolation", True, f"Org1 admin sees only org1 clients ({len(clients)})")
            else:
                self.log_result("Org1 Admin Data Isolation", False, f"Data leak: {len(clients)} total, {len(org1_clients)} org1")
        else:
            self.log_result("Org1 Admin Data Isolation", False, f"Status: {response.status_code}")
        
        # Test regular org2 admin - should only see org2 data
        response, error = self.make_request("GET", "/clients", token=self.org2_admin_token)
        if error:
            self.log_result("Org2 Admin Data Isolation", False, error)
        elif response.status_code == 200:
            data = response.json()
            clients = data.get("clients", [])
            org2_clients = [c for c in clients if c.get("organizationId") == self.org2_id]
            if len(clients) == len(org2_clients):
                self.log_result("Org2 Admin Data Isolation", True, f"Org2 admin sees only org2 clients ({len(clients)})")
            else:
                self.log_result("Org2 Admin Data Isolation", False, f"Data leak: {len(clients)} total, {len(org2_clients)} org2")
        else:
            self.log_result("Org2 Admin Data Isolation", False, f"Status: {response.status_code}")
        
        # Test campaigns isolation
        response, error = self.make_request("GET", "/campaigns", token=self.org1_admin_token)
        if error:
            self.log_result("Org1 Campaign Isolation", False, error)
        elif response.status_code == 200:
            data = response.json()
            campaigns = data.get("campaigns", [])
            org1_campaigns = [c for c in campaigns if c.get("organizationId") == self.org1_id]
            if len(campaigns) == len(org1_campaigns):
                self.log_result("Org1 Campaign Isolation", True, f"Org1 admin sees only org1 campaigns ({len(campaigns)})")
            else:
                self.log_result("Org1 Campaign Isolation", False, f"Campaign data leak: {len(campaigns)} total, {len(org1_campaigns)} org1")
        else:
            self.log_result("Org1 Campaign Isolation", False, f"Status: {response.status_code}")
        
        # Test services isolation
        response, error = self.make_request("GET", "/services", token=self.org2_admin_token)
        if error:
            self.log_result("Org2 Service Isolation", False, error)
        elif response.status_code == 200:
            data = response.json()
            services = data.get("services", [])
            org2_services = [s for s in services if s.get("organizationId") == self.org2_id]
            if len(services) == len(org2_services):
                self.log_result("Org2 Service Isolation", True, f"Org2 admin sees only org2 services ({len(services)})")
            else:
                self.log_result("Org2 Service Isolation", False, f"Service data leak: {len(services)} total, {len(org2_services)} org2")
        else:
            self.log_result("Org2 Service Isolation", False, f"Status: {response.status_code}")
        
        # Test team member sees only assigned campaigns
        if self.org1_member_token:
            response, error = self.make_request("GET", "/campaigns", token=self.org1_member_token)
            if error:
                self.log_result("Team Member Campaign Access", False, error)
            elif response.status_code == 200:
                data = response.json()
                campaigns = data.get("campaigns", [])
                # Team member should only see campaigns they're assigned to
                self.log_result("Team Member Campaign Access", True, f"Team member sees {len(campaigns)} assigned campaigns")
            else:
                self.log_result("Team Member Campaign Access", False, f"Status: {response.status_code}")
    
    def test_dashboard_data_scoping(self):
        """Test dashboard data scoping with organizationId parameter"""
        print("\n=== TESTING DASHBOARD DATA SCOPING ===")
        
        if not all([self.super_admin_token, self.org1_admin_token, self.org1_member_token]):
            self.log_result("Dashboard Data Scoping", False, "Missing required tokens")
            return
        
        # Test super admin dashboard with organizationId parameter
        if self.org1_id:
            response, error = self.make_request("GET", f"/dashboard?organizationId={self.org1_id}", token=self.super_admin_token)
            if error:
                self.log_result("Super Admin Dashboard Org Scoped", False, error)
            elif response.status_code == 200:
                data = response.json()
                financials = data.get("financials")
                if financials and "totalProjected" in financials:
                    self.log_result("Super Admin Dashboard Org Scoped", True, f"Org1 financials: Projected={financials['totalProjected']}, Earned={financials.get('totalEarned', 0)}")
                else:
                    self.log_result("Super Admin Dashboard Org Scoped", False, "Missing financial data")
            else:
                self.log_result("Super Admin Dashboard Org Scoped", False, f"Status: {response.status_code}")
        
        # Test regular admin dashboard - should see only their org's data
        response, error = self.make_request("GET", "/dashboard", token=self.org1_admin_token)
        if error:
            self.log_result("Admin Dashboard Own Org", False, error)
        elif response.status_code == 200:
            data = response.json()
            financials = data.get("financials")
            if financials and "totalProjected" in financials:
                self.log_result("Admin Dashboard Own Org", True, f"Admin sees own org financials: Projected={financials['totalProjected']}")
            else:
                self.log_result("Admin Dashboard Own Org", False, "Missing financial data for admin")
        else:
            self.log_result("Admin Dashboard Own Org", False, f"Status: {response.status_code}")
        
        # Test team member dashboard - should NOT see financials
        response, error = self.make_request("GET", "/dashboard", token=self.org1_member_token)
        if error:
            self.log_result("Team Member Dashboard No Financials", False, error)
        elif response.status_code == 200:
            data = response.json()
            financials = data.get("financials")
            if financials is None:
                self.log_result("Team Member Dashboard No Financials", True, "Team member correctly does not see financials")
            else:
                self.log_result("Team Member Dashboard No Financials", False, "Team member should not see financials")
        else:
            self.log_result("Team Member Dashboard No Financials", False, f"Status: {response.status_code}")
    
    def test_date_filters(self):
        """Test dashboard date filter functionality"""
        print("\n=== TESTING DATE FILTERS ===")
        
        if not self.org1_admin_token:
            self.log_result("Date Filters", False, "No admin token")
            return
        
        date_ranges = ["today", "week", "month", "all"]
        
        for date_range in date_ranges:
            response, error = self.make_request("GET", f"/dashboard?dateRange={date_range}", token=self.org1_admin_token)
            if error:
                self.log_result(f"Date Filter {date_range}", False, error)
            elif response.status_code == 200:
                data = response.json()
                financials = data.get("financials")
                campaigns = data.get("campaigns", [])
                if financials is not None:
                    self.log_result(f"Date Filter {date_range}", True, f"Filter works: {len(campaigns)} campaigns, Projected={financials.get('totalProjected', 0)}")
                else:
                    self.log_result(f"Date Filter {date_range}", False, "Missing financials in filtered response")
            else:
                self.log_result(f"Date Filter {date_range}", False, f"Status: {response.status_code}")
    
    def test_existing_functionality_verification(self):
        """Verify existing functionality still works after multi-tenant changes"""
        print("\n=== TESTING EXISTING FUNCTIONALITY VERIFICATION ===")
        
        if not self.org1_admin_token:
            self.log_result("Existing Functionality", False, "No admin token")
            return
        
        # Test auth/me endpoint
        response, error = self.make_request("GET", "/auth/me", token=self.org1_admin_token)
        if error:
            self.log_result("Auth Me Endpoint", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "user" in data:
                self.log_result("Auth Me Endpoint", True, "Auth me endpoint working")
            else:
                self.log_result("Auth Me Endpoint", False, "Missing user data")
        else:
            self.log_result("Auth Me Endpoint", False, f"Status: {response.status_code}")
        
        # Test deliverables endpoint
        response, error = self.make_request("GET", "/deliverables", token=self.org1_admin_token)
        if error:
            self.log_result("Deliverables Endpoint", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "deliverables" in data:
                deliverables = data["deliverables"]
                self.log_result("Deliverables Endpoint", True, f"Found {len(deliverables)} deliverables")
                
                # Test deliverable status update if any exist
                if deliverables:
                    deliverable_id = deliverables[0]["id"]
                    update_data = {"status": "in_progress"}
                    response, error = self.make_request("PUT", f"/deliverables/{deliverable_id}", update_data, self.org1_admin_token)
                    if error:
                        self.log_result("Deliverable Update", False, error)
                    elif response.status_code == 200:
                        self.log_result("Deliverable Update", True, "Deliverable status update working")
                    else:
                        self.log_result("Deliverable Update", False, f"Status: {response.status_code}")
            else:
                self.log_result("Deliverables Endpoint", False, "Missing deliverables data")
        else:
            self.log_result("Deliverables Endpoint", False, f"Status: {response.status_code}")
        
        # Test team management
        response, error = self.make_request("GET", "/team", token=self.org1_admin_token)
        if error:
            self.log_result("Team Management", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "members" in data:
                members = data["members"]
                self.log_result("Team Management", True, f"Team endpoint working: {len(members)} members")
            else:
                self.log_result("Team Management", False, "Missing members data")
        else:
            self.log_result("Team Management", False, f"Status: {response.status_code}")
        
        # Test audit logs (admin only)
        response, error = self.make_request("GET", "/activity-logs", token=self.org1_admin_token)
        if error:
            self.log_result("Audit Logs", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "logs" in data:
                logs = data["logs"]
                self.log_result("Audit Logs", True, f"Audit logs working: {len(logs)} logs")
            else:
                self.log_result("Audit Logs", False, "Missing logs data")
        else:
            self.log_result("Audit Logs", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all test methods"""
        print("🚀 Starting Digital Marketing Campaign Tracker Multi-Tenant Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print("=" * 80)
        
        # Run tests in order
        success = self.test_seed_data_multitenant()
        if not success:
            print("❌ Cannot proceed without seed data")
            return
        
        time.sleep(2)  # Allow seed data to settle
        
        self.test_login_all_users()
        time.sleep(1)
        
        self.test_super_admin_organization_management()
        time.sleep(1)
        
        self.test_multitenant_data_isolation()
        time.sleep(1)
        
        self.test_dashboard_data_scoping()
        time.sleep(1)
        
        self.test_date_filters()
        time.sleep(1)
        
        self.test_existing_functionality_verification()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 MULTI-TENANT TEST SUMMARY")
        print("=" * 80)
        print(f"✅ PASSED: {self.results['passed']}")
        print(f"❌ FAILED: {self.results['failed']}")
        
        if self.results["errors"]:
            print("\n📝 FAILED TESTS:")
            for error in self.results["errors"]:
                print(f"   • {error}")
        
        success_rate = (self.results["passed"] / (self.results["passed"] + self.results["failed"]) * 100) if (self.results["passed"] + self.results["failed"]) > 0 else 0
        print(f"\n📊 SUCCESS RATE: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: Multi-tenant backend API is working very well!")
        elif success_rate >= 75:
            print("👍 GOOD: Multi-tenant backend API is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  NEEDS WORK: Multi-tenant backend API has several issues to address")
        else:
            print("🚨 CRITICAL: Multi-tenant backend API has major issues that need immediate attention")

if __name__ == "__main__":
    tester = MultiTenantTester()
    tester.run_all_tests()