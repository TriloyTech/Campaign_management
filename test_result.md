#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Digital Marketing Campaign Tracker with Unit-Based Revenue Tracking - MongoDB, BDT currency, custom auth"

backend:
  - task: "Auth - Register new user with organization"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/auth/register - creates org + admin user, returns JWT token"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Auth register creates user and org successfully with JWT token. Tested with real data."

  - task: "Auth - Login"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/auth/login - validates credentials, returns JWT token"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Auth login works for both admin (admin@agency.com/admin123) and team_member (member@agency.com/member123). JWT tokens generated correctly."

  - task: "Clients CRUD"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST/PUT/DELETE /api/clients - PUT available to all users, DELETE admin only"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - All CRUD operations work. Confirmed PUT works for ALL users (admin and team_member), DELETE is admin-only. Found 4 clients from seed data."

  - task: "Services CRUD"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST/PUT/DELETE /api/services - PUT available to all, DELETE admin only"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - All CRUD operations work. Confirmed PUT works for ALL users, DELETE is admin-only. Found 7 services from seed data."

  - task: "Campaign creation with auto-generated deliverables"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/campaigns - creates campaign, line items, and individual deliverables. E.g., 4 Static Posts @ 1600 = creates 4 deliverable records"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Campaign creation with 4 Static Posts @ 1600 correctly creates campaign with totalProjected=6400 and auto-generates 4 individual deliverable records. Campaign retrieval includes deliverables and lineItems."

  - task: "Deliverable status update with optional proof URL"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PUT /api/deliverables/:id - status dropdown (pending/in_progress/review/delivered), proof URL is OPTIONAL, auto-recalculates campaign earned revenue"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Deliverable status update works with AND without proof URL (confirmed OPTIONAL). Status change to 'delivered' correctly recalculates campaign earned revenue. Both scenarios tested successfully."

  - task: "Dashboard with financial calculations"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/dashboard - projected/earned/pending revenue, client breakdown, deliverable stats. Admin sees all, team_member sees only assigned"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Dashboard financials work correctly. Admin sees Projected=135000, Earned=30400, Pending=104600. Team_member correctly does NOT see financial data (financials=null)."

  - task: "Team management with roles (Admin/Custom Access)"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/team/invite - accepts role (admin/team_member), designation, department. GET /api/team - lists all members"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Team management works. GET /api/team found 2 members. POST /api/team/invite successfully creates both team_member and admin roles with designation and department fields."

  - task: "Audit Log"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/activity-logs - admin only, filterable by entityType and action. Logs created for all CRUD operations"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Audit logs work perfectly. Found 18 activity logs. Filtering by entityType=campaign&action=created found 4 logs. Team_member correctly denied access (403). All CRUD operations generate logs."

  - task: "Seed data"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/seed - creates demo org, 2 users, 4 clients, 7 services, 3 campaigns with line items + deliverables"
      - working: true
        agent: "testing"
        comment: "✅ PASSED - Seed data creation successful. Returns credentials for admin@agency.com/admin123 and member@agency.com/member123. Creates full demo dataset."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Super Admin organization management"
    - "Multi-tenant data isolation"
    - "Organization switching in dashboard"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Full MVP built with all backend APIs. Key test areas: 1) Auth flow (register/login), 2) Campaign creation auto-generates deliverables, 3) Deliverable status update with OPTIONAL proof URL recalculates revenue, 4) Dashboard financials are correct, 5) Team invite with role/designation/department, 6) Audit logs track all CRUD operations. Seed data endpoint at POST /api/seed creates test data. Admin: admin@agency.com/admin123, Team: member@agency.com/member123"
  - agent: "testing"
    message: "🎉 BACKEND TESTING COMPLETE - ALL 31 TESTS PASSED (100% success rate)! All API endpoints working perfectly: Auth (register/login/me), CRUD operations (clients/services with proper role restrictions), campaign creation with auto-deliverable generation, deliverable status updates with optional proof URLs, dashboard with correct financial calculations, team management with roles, and comprehensive audit logging. Role-based access controls verified. No critical issues found."
  - agent: "main"
    message: "MULTI-TENANT REFACTOR COMPLETE: Added organizations collection with Super Admin role. New features: 1) Super Admin (super@agency.com/super123) can view all orgs, 2) Organization switcher in top bar for Super Admin, 3) Data scoped by organizationId, 4) Date filter on dashboard. Seed creates 2 orgs with different data sets. Key endpoints: GET/POST/PUT/DELETE /api/organizations (super_admin only). Organization context passed via ?organizationId query param for super_admin users. All views use key prop to force re-render on org change."