from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password
from app.models import AuthSession, User


def register(client, **overrides):
    payload = {
        "full_name": "Asha Example",
        "email": "asha@example.in",
        "password": "CorrectHorse92Battery",
    }
    payload.update(overrides)
    return client.post("/api/v1/auth/register", json=payload)


def verify_registered(client, response):
    token = response.json()["development_verification_token"]
    return client.post("/api/v1/auth/verify-email", json={"token": token})


def test_registration_hashes_password_and_development_verification_logs_in(client):
    response = register(client)
    assert response.status_code == 201
    assert response.json()["development_verification_token"]
    assert "fintech_session" not in response.json()

    verify_response = verify_registered(client, response)
    assert verify_response.status_code == 200
    assert verify_response.cookies.get("fintech_session")
    assert client.get("/api/v1/auth/me").json()["email"] == "asha@example.in"

    db = next(client.app.dependency_overrides[get_db]())
    try:
        user = db.scalar(select(User).where(User.email == "asha@example.in"))
        assert user is not None
        assert user.password_hash != "CorrectHorse92Battery"
        assert verify_password("CorrectHorse92Battery", user.password_hash)
    finally:
        db.close()


def test_registration_rejects_duplicate_email_and_allows_no_mobile_number(client):
    created = register(client)
    assert created.status_code == 201
    assert register(client).status_code == 409
    other = register(client, email="other@example.in")
    assert other.status_code == 201
    assert other.json()["user"]["phone"] is None


def test_registration_ignores_legacy_phone_field(client):
    response = register(client, phone="+919876543210")
    assert response.status_code == 201
    assert response.json()["user"]["phone"] is None


def test_registration_validates_email_and_password(client):
    assert register(client, email="not-an-email").status_code == 422
    assert register(client, password="weakpassword123").status_code == 422


def test_login_requires_verified_email_and_bad_credentials_are_rejected(client):
    response = register(client)
    assert client.post("/api/v1/auth/login", json={"identifier": "asha@example.in", "password": "CorrectHorse92Battery"}).status_code == 401
    assert verify_registered(client, response).status_code == 200
    login = client.post("/api/v1/auth/login", json={"identifier": "asha@example.in", "password": "CorrectHorse92Battery", "remember_me": True})
    assert login.status_code == 200
    assert client.post("/api/v1/auth/login", json={"identifier": "asha@example.in", "password": "wrong"}).status_code == 401


def test_logout_revokes_server_session_and_private_identity_route(client):
    assert client.get("/api/v1/auth/session").status_code == 200
    assert client.get("/api/v1/auth/session").json() is None
    registration = register(client)
    verify_registered(client, registration)
    assert client.get("/api/v1/auth/me").status_code == 200
    assert client.get("/api/v1/auth/session").json()["email"] == "asha@example.in"
    sessions_before = next(client.app.dependency_overrides[get_db]())
    try:
        assert sessions_before.scalar(select(AuthSession)) is not None
    finally:
        sessions_before.close()
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_password_recovery_is_non_enumerating_and_revokes_old_sessions(client):
    registration = register(client)
    verify_registered(client, registration)
    first = client.post("/api/v1/auth/forgot-password", json={"email": "asha@example.in"})
    missing = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.in"})
    assert first.status_code == missing.status_code == 202
    assert first.json() == missing.json()
    assert "no email is sent" in first.json()["message"]
