import pytest
from httpx import AsyncClient
from backend.main import app
import json
import base64

@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_register_and_login(async_client):
    # Test Registration
    reg_data = {
        "email": "testuser@nyaya.ai",
        "password": "Password123!",
        "name": "Test User"
    }
    res_reg = await async_client.post("/auth/register", json=reg_data)
    assert res_reg.status_code in (200, 409) # Might be 409 if user already exists
    
    # Test Login
    login_data = {
        "email": "testuser@nyaya.ai",
        "password": "Password123!"
    }
    res_login = await async_client.post("/auth/login", json=login_data)
    assert res_login.status_code == 200
    token_data = res_login.json()
    assert "token" in token_data
    
    # Test Refresh
    token = token_data["token"]
    res_refresh = await async_client.post(
        "/auth/refresh",
        json={"token": token}
    )
    assert res_refresh.status_code == 200
    new_token_data = res_refresh.json()
    assert "token" in new_token_data

@pytest.mark.asyncio
async def test_unauthorized_access(async_client):
    # Missing token
    res = await async_client.post("/chat", json={"query": "Hello"})
    assert res.status_code == 403

    # Invalid token
    res = await async_client.post("/chat", json={"query": "Hello"}, headers={"Authorization": "Bearer invalid_token"})
    assert res.status_code in (401, 403)
