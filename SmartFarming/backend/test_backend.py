"""
Comprehensive Backend Testing Suite for Smart Farmer Marketplace
Tests for all API endpoints and core functionality
"""

import pytest
import json
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app
from models.models import BaseModel

@pytest.fixture(scope="session", autouse=True)
def cleanup_database():
    """Clean up test users from the database before and after running tests"""
    emails_to_delete = [
        'test@example.com',
        'farmer@test.com',
        'buyer@test.com',
        'duplicate@test.com',
        'login@test.com',
        'wrongpass@test.com',
        'testfarmer@test.com',
        'testbuyer@test.com'
    ]
    phones_to_delete = [
        '9876543210',
        '9876543211',
        '9876543212',
        '9876543213',
        '9876543214',
        '9876543215',
        '9988776655',
        '9988776656'
    ]
    
    def perform_cleanup():
        try:
            # Find test farmer IDs
            farmers = BaseModel.execute_query(
                "SELECT id FROM farmers WHERE email IN %s OR phone IN %s",
                (tuple(emails_to_delete), tuple(phones_to_delete)),
                fetch_all=True
            )
            farmer_ids = [f['id'] for f in farmers] if farmers else []
            
            # Find test buyer IDs
            buyers = BaseModel.execute_query(
                "SELECT id FROM buyers WHERE email IN %s OR phone IN %s",
                (tuple(emails_to_delete), tuple(phones_to_delete)),
                fetch_all=True
            )
            buyer_ids = [b['id'] for b in buyers] if buyers else []
            
            # Delete related/dependent records first to satisfy foreign key constraints
            if farmer_ids:
                BaseModel.execute_query("DELETE FROM orders WHERE farmer_id IN %s", (tuple(farmer_ids),))
                BaseModel.execute_query("DELETE FROM products WHERE farmer_id IN %s", (tuple(farmer_ids),))
                BaseModel.execute_query("DELETE FROM wallet WHERE farmer_id IN %s", (tuple(farmer_ids),))
                BaseModel.execute_query("DELETE FROM farmers WHERE id IN %s", (tuple(farmer_ids),))
                
            if buyer_ids:
                BaseModel.execute_query("DELETE FROM orders WHERE buyer_id IN %s", (tuple(buyer_ids),))
                BaseModel.execute_query("DELETE FROM cart WHERE buyer_id IN %s", (tuple(buyer_ids),))
                BaseModel.execute_query("DELETE FROM buyers WHERE id IN %s", (tuple(buyer_ids),))
                
            for email in emails_to_delete:
                BaseModel.execute_query("DELETE FROM users WHERE email = %s", (email,))
                
            # Clear rate limit state
            try:
                from routes.auth import _otp_attempts, _otp_last_sent
                _otp_attempts.clear()
                _otp_last_sent.clear()
            except Exception:
                pass
        except Exception as e:
            print(f"Error during database cleanup: {e}")

    # Clean before test run
    perform_cleanup()
    yield
    # Clean after test run
    perform_cleanup()

@pytest.fixture
def client():
    """FastAPI test client"""
    with TestClient(app) as client:
        yield client

@pytest.fixture
def auth_headers(client):
    """Get JWT authentication headers"""
    # Register and login test user
    register_response = client.post(
        '/api/auth/register',
        json={
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'phone': '9876543210',
            'role': 'buyer'
        }
    )
    
    token = register_response.json()['data']['access_token']
    return {'Authorization': f'Bearer {token}'}

# ============================================================================
# HEALTH & INFO ENDPOINTS
# ============================================================================

class TestHealthEndpoints:
    """Test health check and info endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        data = response.json
        assert data['status'] == 'success'
    
    def test_api_info(self, client):
        """Test API info endpoint"""
        response = client.get('/api')
        assert response.status_code == 200
        data = response.json
        assert 'endpoints' in data

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

class TestAuthenticationEndpoints:
    """Test all authentication endpoints"""
    
    def test_register_farmer(self, client):
        """Test farmer registration"""
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'farmer@test.com',
                'password': 'FarmerPass123!',
                'first_name': 'John',
                'last_name': 'Farmer',
                'phone': '9876543210',
                'role': 'farmer'
            }
        )
        
        assert response.status_code == 201
        data = response.json
        assert data['status'] == 'success'
        assert 'access_token' in data['data']
        assert 'refresh_token' in data['data']
        assert data['data']['user']['role'] == 'farmer'
    
    def test_register_buyer(self, client):
        """Test buyer registration"""
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'buyer@test.com',
                'password': 'BuyerPass123!',
                'first_name': 'Jane',
                'last_name': 'Buyer',
                'phone': '9876543211',
                'role': 'buyer'
            }
        )
        
        assert response.status_code == 201
        data = response.json
        assert data['data']['user']['role'] == 'buyer'
    
    def test_register_duplicate_email(self, client):
        """Test registration with duplicate email"""
        # First registration
        client.post(
            '/api/auth/register',
            json={
                'email': 'duplicate@test.com',
                'password': 'Pass123!',
                'first_name': 'First',
                'last_name': 'User',
                'phone': '9876543212',
                'role': 'farmer'
            }
        )
        
        # Duplicate registration
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'duplicate@test.com',
                'password': 'AnotherPass123!',
                'first_name': 'Second',
                'last_name': 'User',
                'phone': '9876543213',
                'role': 'farmer'
            }
        )
        
        assert response.status_code == 409
        data = response.json()
        assert 'already registered' in data['error'].lower()
    
    def test_login_success(self, client):
        """Test successful login"""
        # Register user
        client.post(
            '/api/auth/register',
            json={
                'email': 'login@test.com',
                'password': 'LoginPass123!',
                'first_name': 'Login',
                'last_name': 'Test',
                'phone': '9876543214',
                'role': 'buyer'
            }
        )
        
        # Login
        response = client.post(
            '/api/auth/login',
            json={
                'email': 'login@test.com',
                'password': 'LoginPass123!'
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password"""
        # Register user
        client.post(
            '/api/auth/register',
            json={
                'email': 'wrongpass@test.com',
                'password': 'CorrectPass123!',
                'first_name': 'Wrong',
                'last_name': 'Pass',
                'phone': '9876543215',
                'role': 'buyer'
            }
        )
        
        # Try login with wrong password
        response = client.post(
            '/api/auth/login',
            json={
                'email': 'wrongpass@test.com',
                'password': 'WrongPass123!'
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert 'error' in data
    
    def test_get_profile(self, client, auth_headers):
        """Test get profile endpoint"""
        response = client.get(
            '/api/auth/profile',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'user' in data
        assert 'email' in data['user']
    
    def test_profile_without_auth(self, client):
        """Test accessing protected route without auth"""
        response = client.get('/api/auth/profile')
        assert response.status_code == 401

# ============================================================================
# FARMER ENDPOINTS
# ============================================================================

class TestFarmerEndpoints:
    """Test farmer-specific endpoints"""
    
    @pytest.fixture
    def farmer_headers(self, client):
        """Get farmer JWT headers"""
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'testfarmer@test.com',
                'password': 'FarmerTest123!',
                'first_name': 'Test',
                'last_name': 'Farmer',
                'phone': '9988776655',
                'role': 'farmer'
            }
        )
        
        token = response.json()['access_token']
        return {'Authorization': f'Bearer {token}'}
    
    def test_farmer_dashboard(self, client, farmer_headers):
        """Test farmer dashboard endpoint"""
        response = client.get(
            '/api/farmer/dashboard',
            headers=farmer_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'stats' in data
    
    def test_create_product(self, client, farmer_headers):
        """Test create product endpoint"""
        response = client.post(
            '/api/farmer/products',
            json={
                'name': 'Organic Tomatoes',
                'description': 'Fresh organic tomatoes from farm',
                'price': 50,
                'category': 'vegetables',
                'quantity': 100,
                'unit': 'kg'
            },
            headers=farmer_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert 'product' in data
        assert data['product']['name'] == 'Organic Tomatoes'

# ============================================================================
# BUYER ENDPOINTS
# ============================================================================

class TestBuyerEndpoints:
    """Test buyer-specific endpoints"""
    
    @pytest.fixture
    def buyer_headers(self, client):
        """Get buyer JWT headers"""
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'testbuyer@test.com',
                'password': 'BuyerTest123!',
                'first_name': 'Test',
                'last_name': 'Buyer',
                'phone': '9988776656',
                'role': 'buyer'
            }
        )
        
        token = response.json()['access_token']
        return {'Authorization': f'Bearer {token}'}
    
    def test_get_products(self, client, buyer_headers):
        """Test get products endpoint"""
        response = client.get(
            '/api/buyer/products?page=1&limit=10',
            headers=buyer_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data
        assert 'pagination' in data
    
    def test_search_products(self, client, buyer_headers):
        """Test search products endpoint"""
        response = client.get(
            '/api/buyer/products/search?q=tomato',
            headers=buyer_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'data' in data

# ============================================================================
# ERROR HANDLING
# ============================================================================

class TestErrorHandling:
    """Test error handling"""
    
    def test_invalid_json(self, client):
        """Test invalid JSON request"""
        response = client.post(
            '/api/auth/login',
            data='invalid json',
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    def test_missing_required_fields(self, client):
        """Test missing required fields"""
        response = client.post(
            '/api/auth/register',
            json={
                'email': 'incomplete@test.com'
                # Missing other required fields
            }
        )
        
        assert response.status_code == 400
    
    def test_not_found(self, client):
        """Test 404 endpoint"""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404

# ============================================================================
# TEST RUNNER
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
