#!/usr/bin/env python3
"""
Digital Marketing Campaign Tracker Backend API Test Suite
Tests all backend API endpoints with proper authentication and role-based access.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://campaign-tracker-71.preview.emergentagent.com/api"

class CampaignTrackerTester:
    def __init__(self):
        self.admin_token = None
        self.member_token = None
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
    
    def test_seed_data(self):
        """Test seed data creation"""
        print("\n=== TESTING SEED DATA ===")
        
        response, error = self.make_request("POST", "/seed")
        if error:
            self.log_result("Seed Data Creation", False, error)
            return False
        
        if response.status_code == 200:
            data = response.json()
            credentials = data.get("credentials", {})
            admin_creds = credentials.get("admin", {})
            member_creds = credentials.get("teamMember", {})
            
            if admin_creds.get("email") == "admin@agency.com" and member_creds.get("email") == "member@agency.com":
                self.log_result("Seed Data Creation", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_result("Seed Data Creation", False, "Missing credentials in response")
                return False
        else:
            self.log_result("Seed Data Creation", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    
    def test_auth_register(self):
        """Test user registration"""
        print("\n=== TESTING AUTH - REGISTER ===")
        
        # Test registration
        register_data = {
            "email": "test@company.com",
            "password": "testpass123",
            "name": "Test User",
            "organizationName": "Test Company Ltd"
        }
        
        response, error = self.make_request("POST", "/auth/register", register_data)
        if error:
            self.log_result("Auth Register", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                user = data["user"]
                if user.get("role") == "admin" and user.get("organizationName") == "Test Company Ltd":
                    self.log_result("Auth Register", True, "User and org created successfully")
                else:
                    self.log_result("Auth Register", False, "Invalid user role or org name")
            else:
                self.log_result("Auth Register", False, "Missing token or user in response")
        else:
            self.log_result("Auth Register", False, f"Status: {response.status_code}, Response: {response.text}")
    
    def test_auth_login(self):
        """Test user login with seed credentials"""
        print("\n=== TESTING AUTH - LOGIN ===")
        
        # Test admin login
        admin_login = {
            "email": "admin@agency.com",
            "password": "admin123"
        }
        
        response, error = self.make_request("POST", "/auth/login", admin_login)
        if error:
            self.log_result("Auth Login (Admin)", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.admin_token = data["token"]
                user = data["user"]
                if user.get("role") == "admin":
                    self.log_result("Auth Login (Admin)", True, f"Admin logged in: {user.get('name')}")
                else:
                    self.log_result("Auth Login (Admin)", False, "User role not admin")
            else:
                self.log_result("Auth Login (Admin)", False, "Missing token or user")
        else:
            self.log_result("Auth Login (Admin)", False, f"Status: {response.status_code}")
        
        # Test team member login
        member_login = {
            "email": "member@agency.com", 
            "password": "member123"
        }
        
        response, error = self.make_request("POST", "/auth/login", member_login)
        if error:
            self.log_result("Auth Login (Member)", False, error)
            return
            
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                self.member_token = data["token"]
                user = data["user"]
                if user.get("role") == "team_member":
                    self.log_result("Auth Login (Member)", True, f"Member logged in: {user.get('name')}")
                else:
                    self.log_result("Auth Login (Member)", False, "User role not team_member")
            else:
                self.log_result("Auth Login (Member)", False, "Missing token or user")
        else:
            self.log_result("Auth Login (Member)", False, f"Status: {response.status_code}")
    
    def test_auth_me(self):
        """Test token validation"""
        print("\n=== TESTING AUTH - ME ===")
        
        if not self.admin_token:
            self.log_result("Auth Me", False, "No admin token available")
            return
        
        response, error = self.make_request("GET", "/auth/me", token=self.admin_token)
        if error:
            self.log_result("Auth Me", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                user = data["user"]
                if user.get("role") == "admin":
                    self.log_result("Auth Me", True, f"Token valid for: {user.get('name')}")
                else:
                    self.log_result("Auth Me", False, "Invalid user role in response")
            else:
                self.log_result("Auth Me", False, "Missing user in response")
        else:
            self.log_result("Auth Me", False, f"Status: {response.status_code}")
    
    def test_clients_crud(self):
        """Test clients CRUD operations"""
        print("\n=== TESTING CLIENTS CRUD ===")
        
        if not self.admin_token:
            self.log_result("Clients CRUD", False, "No admin token")
            return
        
        # GET clients
        response, error = self.make_request("GET", "/clients", token=self.admin_token)
        if error:
            self.log_result("Clients GET", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "clients" in data and isinstance(data["clients"], list):
                self.log_result("Clients GET", True, f"Found {len(data['clients'])} clients")
                clients_list = data["clients"]
            else:
                self.log_result("Clients GET", False, "Invalid response format")
                return
        else:
            self.log_result("Clients GET", False, f"Status: {response.status_code}")
            return
        
        # POST new client  
        new_client = {
            "name": "Test Client Corp",
            "contactPerson": "John Doe",
            "email": "john@testclient.com",
            "phone": "+880 1711-999999",
            "industry": "Technology"
        }
        
        response, error = self.make_request("POST", "/clients", new_client, self.admin_token)
        if error:
            self.log_result("Clients POST", False, error)
            return
        
        if response.status_code == 201:
            data = response.json()
            if "client" in data:
                created_client = data["client"]
                client_id = created_client.get("id")
                self.log_result("Clients POST", True, f"Created client: {created_client.get('name')}")
            else:
                self.log_result("Clients POST", False, "Missing client in response")
                return
        else:
            self.log_result("Clients POST", False, f"Status: {response.status_code}")
            return
        
        # PUT update client (test that ALL users can update, not just admin)
        update_data = {"name": "Test Client Corp - Updated"}
        
        # Test with admin token
        response, error = self.make_request("PUT", f"/clients/{client_id}", update_data, self.admin_token)
        if error:
            self.log_result("Clients PUT (Admin)", False, error)
        elif response.status_code == 200:
            self.log_result("Clients PUT (Admin)", True, "Admin can update clients")
        else:
            self.log_result("Clients PUT (Admin)", False, f"Status: {response.status_code}")
        
        # Test with member token
        if self.member_token:
            response, error = self.make_request("PUT", f"/clients/{client_id}", {"name": "Test Client Corp - Member Update"}, self.member_token)
            if error:
                self.log_result("Clients PUT (Member)", False, error)
            elif response.status_code == 200:
                self.log_result("Clients PUT (Member)", True, "Team member can update clients")
            else:
                self.log_result("Clients PUT (Member)", False, f"Status: {response.status_code}")
        
        # DELETE client (admin only)
        response, error = self.make_request("DELETE", f"/clients/{client_id}", token=self.admin_token)
        if error:
            self.log_result("Clients DELETE", False, error)
        elif response.status_code == 200:
            self.log_result("Clients DELETE", True, "Admin can delete clients")
        else:
            self.log_result("Clients DELETE", False, f"Status: {response.status_code}")
    
    def test_services_crud(self):
        """Test services CRUD operations"""
        print("\n=== TESTING SERVICES CRUD ===")
        
        if not self.admin_token:
            self.log_result("Services CRUD", False, "No admin token")
            return
        
        # GET services
        response, error = self.make_request("GET", "/services", token=self.admin_token)
        if error:
            self.log_result("Services GET", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "services" in data and isinstance(data["services"], list):
                self.log_result("Services GET", True, f"Found {len(data['services'])} services")
            else:
                self.log_result("Services GET", False, "Invalid response format")
        else:
            self.log_result("Services GET", False, f"Status: {response.status_code}")
            return
        
        # POST new service
        new_service = {
            "name": "Test Service",
            "defaultRate": 2500,
            "description": "Test service description"
        }
        
        response, error = self.make_request("POST", "/services", new_service, self.admin_token)
        if error:
            self.log_result("Services POST", False, error)
            return
        
        if response.status_code == 201:
            data = response.json()
            if "service" in data:
                created_service = data["service"]
                service_id = created_service.get("id")
                self.log_result("Services POST", True, f"Created service: {created_service.get('name')}")
            else:
                self.log_result("Services POST", False, "Missing service in response")
                return
        else:
            self.log_result("Services POST", False, f"Status: {response.status_code}")
            return
        
        # PUT update service (test ALL users can update)
        update_data = {"name": "Test Service - Updated", "defaultRate": 3000}
        
        # Test with admin
        response, error = self.make_request("PUT", f"/services/{service_id}", update_data, self.admin_token)
        if error:
            self.log_result("Services PUT (Admin)", False, error)
        elif response.status_code == 200:
            self.log_result("Services PUT (Admin)", True, "Admin can update services")
        else:
            self.log_result("Services PUT (Admin)", False, f"Status: {response.status_code}")
        
        # Test with member
        if self.member_token:
            response, error = self.make_request("PUT", f"/services/{service_id}", {"description": "Updated by member"}, self.member_token)
            if error:
                self.log_result("Services PUT (Member)", False, error)
            elif response.status_code == 200:
                self.log_result("Services PUT (Member)", True, "Team member can update services")
            else:
                self.log_result("Services PUT (Member)", False, f"Status: {response.status_code}")
        
        # DELETE service (admin only)
        response, error = self.make_request("DELETE", f"/services/{service_id}", token=self.admin_token)
        if error:
            self.log_result("Services DELETE", False, error)
        elif response.status_code == 200:
            self.log_result("Services DELETE", True, "Admin can delete services")
        else:
            self.log_result("Services DELETE", False, f"Status: {response.status_code}")
    
    def test_campaigns_and_deliverables(self):
        """Test campaign creation with auto-generated deliverables"""
        print("\n=== TESTING CAMPAIGNS & DELIVERABLES ===")
        
        if not self.admin_token:
            self.log_result("Campaigns Test", False, "No admin token")
            return
        
        # First get clients and services to use in campaign
        clients_resp, _ = self.make_request("GET", "/clients", token=self.admin_token)
        services_resp, _ = self.make_request("GET", "/services", token=self.admin_token)
        
        if clients_resp.status_code != 200 or services_resp.status_code != 200:
            self.log_result("Campaigns Setup", False, "Could not fetch clients/services")
            return
        
        clients = clients_resp.json().get("clients", [])
        services = services_resp.json().get("services", [])
        
        if not clients or not services:
            self.log_result("Campaigns Setup", False, "No clients or services available")
            return
        
        client_id = clients[0]["id"]
        static_service = next((s for s in services if "Static" in s["name"]), services[0])
        
        # Create campaign with line items that should auto-generate deliverables
        campaign_data = {
            "name": "Test Campaign - Auto Deliverables",
            "clientId": client_id,
            "type": "one-time",
            "startDate": "2025-06-01",
            "endDate": "2025-08-31",
            "assignedTo": [],
            "lineItems": [
                {
                    "serviceId": static_service["id"],
                    "serviceName": static_service["name"],
                    "quantity": 4,  # Should create 4 individual deliverables
                    "rate": 1600
                }
            ]
        }
        
        response, error = self.make_request("POST", "/campaigns", campaign_data, self.admin_token)
        if error:
            self.log_result("Campaign Creation", False, error)
            return
        
        if response.status_code == 201:
            data = response.json()
            campaign = data.get("campaign", {})
            deliverables = data.get("deliverables", [])
            
            campaign_id = campaign.get("id")
            
            # Verify campaign details
            if campaign.get("totalProjected") == 6400:  # 4 * 1600
                self.log_result("Campaign Creation", True, f"Campaign created with correct projected revenue: {campaign.get('totalProjected')}")
            else:
                self.log_result("Campaign Creation", False, f"Incorrect projected revenue: {campaign.get('totalProjected')}")
            
            # Verify deliverables auto-generation
            if len(deliverables) == 4:
                self.log_result("Auto-Generate Deliverables", True, f"Created {len(deliverables)} deliverable records")
            else:
                self.log_result("Auto-Generate Deliverables", False, f"Expected 4 deliverables, got {len(deliverables)}")
                
        else:
            self.log_result("Campaign Creation", False, f"Status: {response.status_code}")
            return
        
        # Test campaign retrieval
        response, error = self.make_request("GET", f"/campaigns/{campaign_id}", token=self.admin_token)
        if error:
            self.log_result("Campaign GET by ID", False, error)
        elif response.status_code == 200:
            data = response.json()
            if "campaign" in data and "deliverables" in data and "lineItems" in data:
                self.log_result("Campaign GET by ID", True, "Campaign details retrieved with deliverables and line items")
            else:
                self.log_result("Campaign GET by ID", False, "Missing campaign details")
        else:
            self.log_result("Campaign GET by ID", False, f"Status: {response.status_code}")
        
        # Test deliverable status update (proof URL should be OPTIONAL)
        response, error = self.make_request("GET", f"/deliverables?campaignId={campaign_id}", token=self.admin_token)
        if error or response.status_code != 200:
            self.log_result("Deliverables GET", False, "Could not fetch deliverables")
            return
        
        deliverables = response.json().get("deliverables", [])
        if deliverables:
            deliverable_id = deliverables[0]["id"]
            
            # Test status update WITHOUT proof URL (should work)
            update_data = {"status": "delivered"}
            response, error = self.make_request("PUT", f"/deliverables/{deliverable_id}", update_data, self.admin_token)
            if error:
                self.log_result("Deliverable Status Update (No Proof)", False, error)
            elif response.status_code == 200:
                data = response.json()
                if "totalEarned" in data:
                    self.log_result("Deliverable Status Update (No Proof)", True, f"Status updated, revenue recalculated: {data['totalEarned']}")
                else:
                    self.log_result("Deliverable Status Update (No Proof)", False, "Revenue not recalculated")
            else:
                self.log_result("Deliverable Status Update (No Proof)", False, f"Status: {response.status_code}")
            
            # Test status update WITH proof URL (should also work)
            update_data = {"status": "delivered", "proofUrl": "https://example.com/proof"}
            if len(deliverables) > 1:
                second_deliverable_id = deliverables[1]["id"]
                response, error = self.make_request("PUT", f"/deliverables/{second_deliverable_id}", update_data, self.admin_token)
                if error:
                    self.log_result("Deliverable Status Update (With Proof)", False, error)
                elif response.status_code == 200:
                    self.log_result("Deliverable Status Update (With Proof)", True, "Status updated with proof URL")
                else:
                    self.log_result("Deliverable Status Update (With Proof)", False, f"Status: {response.status_code}")
    
    def test_dashboard(self):
        """Test dashboard financial calculations"""
        print("\n=== TESTING DASHBOARD ===")
        
        if not self.admin_token:
            self.log_result("Dashboard Test", False, "No admin token")
            return
        
        # Test admin dashboard (should see financials)
        response, error = self.make_request("GET", "/dashboard", token=self.admin_token)
        if error:
            self.log_result("Dashboard (Admin)", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            financials = data.get("financials")
            if financials and "totalProjected" in financials and "totalEarned" in financials:
                projected = financials["totalProjected"]
                earned = financials["totalEarned"]
                pending = financials.get("totalPending", 0)
                self.log_result("Dashboard (Admin)", True, f"Financials: Projected={projected}, Earned={earned}, Pending={pending}")
            else:
                self.log_result("Dashboard (Admin)", False, "Missing financial data")
        else:
            self.log_result("Dashboard (Admin)", False, f"Status: {response.status_code}")
        
        # Test team member dashboard (should NOT see financials)
        if self.member_token:
            response, error = self.make_request("GET", "/dashboard", token=self.member_token)
            if error:
                self.log_result("Dashboard (Member)", False, error)
            elif response.status_code == 200:
                data = response.json()
                financials = data.get("financials")
                if financials is None:
                    self.log_result("Dashboard (Member)", True, "Team member correctly does not see financials")
                else:
                    self.log_result("Dashboard (Member)", False, "Team member should not see financial data")
            else:
                self.log_result("Dashboard (Member)", False, f"Status: {response.status_code}")
    
    def test_team_management(self):
        """Test team management with roles"""
        print("\n=== TESTING TEAM MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_result("Team Management", False, "No admin token")
            return
        
        # GET team members
        response, error = self.make_request("GET", "/team", token=self.admin_token)
        if error:
            self.log_result("Team GET", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "members" in data and isinstance(data["members"], list):
                self.log_result("Team GET", True, f"Found {len(data['members'])} team members")
            else:
                self.log_result("Team GET", False, "Invalid team response")
        else:
            self.log_result("Team GET", False, f"Status: {response.status_code}")
            return
        
        # POST team invite
        invite_data = {
            "name": "New Team Member",
            "email": "newmember@agency.com",
            "password": "newpass123",
            "role": "team_member",
            "designation": "Junior Designer",
            "department": "Creative"
        }
        
        response, error = self.make_request("POST", "/team/invite", invite_data, self.admin_token)
        if error:
            self.log_result("Team Invite", False, error)
        elif response.status_code == 201:
            data = response.json()
            member = data.get("member", {})
            if member.get("role") == "team_member" and member.get("designation") == "Junior Designer":
                self.log_result("Team Invite", True, f"Invited member: {member.get('name')} as {member.get('role')}")
            else:
                self.log_result("Team Invite", False, "Incorrect member details")
        else:
            self.log_result("Team Invite", False, f"Status: {response.status_code}")
        
        # Test admin role invite
        admin_invite = {
            "name": "New Admin",
            "email": "newadmin@agency.com", 
            "password": "adminpass123",
            "role": "admin",
            "designation": "Account Manager",
            "department": "Management"
        }
        
        response, error = self.make_request("POST", "/team/invite", admin_invite, self.admin_token)
        if error:
            self.log_result("Team Invite Admin", False, error)
        elif response.status_code == 201:
            data = response.json()
            member = data.get("member", {})
            if member.get("role") == "admin":
                self.log_result("Team Invite Admin", True, f"Invited admin: {member.get('name')}")
            else:
                self.log_result("Team Invite Admin", False, "Role not set to admin")
        else:
            self.log_result("Team Invite Admin", False, f"Status: {response.status_code}")
    
    def test_audit_logs(self):
        """Test audit logging functionality"""
        print("\n=== TESTING AUDIT LOGS ===")
        
        if not self.admin_token:
            self.log_result("Audit Logs", False, "No admin token")
            return
        
        # Test basic audit log retrieval (admin only)
        response, error = self.make_request("GET", "/activity-logs", token=self.admin_token)
        if error:
            self.log_result("Audit Logs GET", False, error)
            return
        
        if response.status_code == 200:
            data = response.json()
            if "logs" in data and isinstance(data["logs"], list):
                logs = data["logs"]
                self.log_result("Audit Logs GET", True, f"Found {len(logs)} activity logs")
            else:
                self.log_result("Audit Logs GET", False, "Invalid logs response")
                return
        else:
            self.log_result("Audit Logs GET", False, f"Status: {response.status_code}")
            return
        
        # Test filtered audit logs
        response, error = self.make_request("GET", "/activity-logs?entityType=campaign&action=created", token=self.admin_token)
        if error:
            self.log_result("Audit Logs Filter", False, error)
        elif response.status_code == 200:
            data = response.json()
            logs = data.get("logs", [])
            campaign_logs = [log for log in logs if log.get("entityType") == "campaign" and log.get("action") == "created"]
            if len(campaign_logs) > 0:
                self.log_result("Audit Logs Filter", True, f"Found {len(campaign_logs)} campaign creation logs")
            else:
                self.log_result("Audit Logs Filter", True, "Filter working (no matching logs found)")
        else:
            self.log_result("Audit Logs Filter", False, f"Status: {response.status_code}")
        
        # Test team member cannot access audit logs
        if self.member_token:
            response, error = self.make_request("GET", "/activity-logs", token=self.member_token)
            if error:
                self.log_result("Audit Logs Access Control", False, error)
            elif response.status_code == 403:
                self.log_result("Audit Logs Access Control", True, "Team member correctly denied access")
            else:
                self.log_result("Audit Logs Access Control", False, f"Team member should be denied access, got status: {response.status_code}")
    
    def test_role_based_access(self):
        """Test role-based access controls"""
        print("\n=== TESTING ROLE-BASED ACCESS ===")
        
        if not self.member_token:
            self.log_result("Role-Based Access", False, "No member token")
            return
        
        # Test team member can view campaigns (but only assigned ones in real scenario)
        response, error = self.make_request("GET", "/campaigns", token=self.member_token)
        if error:
            self.log_result("Member Campaign Access", False, error)
        elif response.status_code == 200:
            self.log_result("Member Campaign Access", True, "Team member can view campaigns")
        else:
            self.log_result("Member Campaign Access", False, f"Status: {response.status_code}")
        
        # Test team member CANNOT create campaigns
        campaign_data = {
            "name": "Unauthorized Campaign",
            "clientId": "test-id",
            "type": "one-time",
            "lineItems": [{"serviceName": "Test", "quantity": 1, "rate": 1000}]
        }
        
        response, error = self.make_request("POST", "/campaigns", campaign_data, self.member_token)
        if error:
            self.log_result("Member Campaign Create", False, error)
        elif response.status_code == 403:
            self.log_result("Member Campaign Create", True, "Team member correctly denied campaign creation")
        else:
            self.log_result("Member Campaign Create", False, f"Team member should be denied, got status: {response.status_code}")
        
        # Test team member CAN update deliverables
        response, error = self.make_request("GET", "/deliverables", token=self.member_token)
        if error or response.status_code != 200:
            self.log_result("Member Deliverable Access", False, "Could not fetch deliverables")
        else:
            deliverables = response.json().get("deliverables", [])
            if deliverables:
                deliverable_id = deliverables[0]["id"]
                update_data = {"status": "in_progress"}
                
                response, error = self.make_request("PUT", f"/deliverables/{deliverable_id}", update_data, self.member_token)
                if error:
                    self.log_result("Member Deliverable Update", False, error)
                elif response.status_code == 200:
                    self.log_result("Member Deliverable Update", True, "Team member can update deliverables")
                else:
                    self.log_result("Member Deliverable Update", False, f"Status: {response.status_code}")
    
    def run_all_tests(self):
        """Run all test methods"""
        print("🚀 Starting Digital Marketing Campaign Tracker Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print("=" * 80)
        
        # Run tests in order
        self.test_seed_data()
        time.sleep(1)  # Small delay between tests
        
        self.test_auth_register()
        time.sleep(1)
        
        self.test_auth_login()
        time.sleep(1)
        
        self.test_auth_me()
        time.sleep(1)
        
        self.test_clients_crud()
        time.sleep(1)
        
        self.test_services_crud()
        time.sleep(1)
        
        self.test_campaigns_and_deliverables()
        time.sleep(1)
        
        self.test_dashboard()
        time.sleep(1)
        
        self.test_team_management()
        time.sleep(1)
        
        self.test_audit_logs()
        time.sleep(1)
        
        self.test_role_based_access()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 TEST SUMMARY")
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
            print("🎉 EXCELLENT: Backend API is working very well!")
        elif success_rate >= 75:
            print("👍 GOOD: Backend API is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️  NEEDS WORK: Backend API has several issues to address")
        else:
            print("🚨 CRITICAL: Backend API has major issues that need immediate attention")

if __name__ == "__main__":
    tester = CampaignTrackerTester()
    tester.run_all_tests()