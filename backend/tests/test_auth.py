"""Register / login / me flows and their error codes (BACKEND_CONTRACT section 2)."""
import pytest

from tests.helpers import DEFAULT_PASSWORD, register, sign_in


def assert_error(response, status: int, code: str) -> None:
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"code", "message"}
    assert body["code"] == code
    assert body["message"]


def test_register_returns_201_with_public_user(client):
    response = register(client, "Alice@Example.com")
    assert response.status_code == 201
    user = response.json()["user"]
    assert set(user) == {"id", "email", "createdAt"}
    assert user["id"].startswith("usr_")
    assert user["email"] == "alice@example.com"
    assert user["createdAt"].endswith("Z")


def test_register_rejects_duplicate_email_case_insensitively(client):
    register(client, "bob@example.com")
    assert_error(register(client, "  BOB@Example.COM "), 409, "EMAIL_TAKEN")


@pytest.mark.parametrize(
    "email, password",
    [
        ("not-an-email", DEFAULT_PASSWORD),
        ("", DEFAULT_PASSWORD),
        ("carol@example.com", "short1"),
        ("carol@example.com", "lettersonly"),
        ("carol@example.com", "12345678"),
        ("carol@example.com", "a1" * 40),
    ],
)
def test_register_rejects_invalid_input(client, email, password):
    assert_error(register(client, email, password), 422, "INVALID_INPUT")


@pytest.mark.parametrize("whitespace", [" ", "\t", "\n", "\r", "\u00a0", "\u2003", "\u202f", "\u3000"])
@pytest.mark.parametrize("position", ["leading", "middle", "trailing"])
def test_register_rejects_password_whitespace(client, session, verification_mail, whitespace, position):
    from app.repository import find_user_by_email

    passwords = {
        "leading": whitespace + DEFAULT_PASSWORD,
        "middle": DEFAULT_PASSWORD[:4] + whitespace + DEFAULT_PASSWORD[4:],
        "trailing": DEFAULT_PASSWORD + whitespace,
    }
    response = register(client, "spaces@example.com", passwords[position])
    assert_error(response, 422, "INVALID_INPUT")
    assert response.json()["message"] == "Passwords cannot contain spaces or other whitespace."
    assert find_user_by_email(session, "spaces@example.com") is None
    assert verification_mail == []


def test_register_with_missing_field_is_invalid_input(client):
    response = client.post("/auth/register", json={"email": "dan@example.com"})
    assert_error(response, 422, "INVALID_INPUT")
    assert "password" in response.json()["message"]


def test_password_is_stored_hashed(client, session):
    from app.repository import find_user_by_email

    register(client, "erin@example.com")
    stored = find_user_by_email(session, "erin@example.com")
    assert stored.password_hash.startswith("$2")
    assert DEFAULT_PASSWORD not in stored.password_hash


def test_login_returns_user_and_token(client, verification_mail):
    register(client, "frank@example.com")
    assert client.post('/auth/verify-email', json={'token': verification_mail[-1][1]}).status_code == 200
    response = client.post("/auth/login", json={"email": "FRANK@example.com", "password": DEFAULT_PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"user", "token"}
    assert body["user"]["email"] == "frank@example.com"
    assert body["token"].count(".") == 2


def test_login_with_wrong_password_is_invalid_credentials(client):
    register(client, "gina@example.com")
    response = client.post("/auth/login", json={"email": "gina@example.com", "password": "Wrong1234"})
    assert_error(response, 401, "INVALID_CREDENTIALS")


def test_login_with_unknown_email_is_invalid_credentials(client):
    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": DEFAULT_PASSWORD})
    assert_error(response, 401, "INVALID_CREDENTIALS")


def test_me_returns_the_signed_in_user(client):
    headers, user_id = sign_in(client, "hana@example.com")
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["id"] == user_id


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer not.a.token"}, {"Authorization": "Basic abc"}, {"Authorization": "Bearer "}],
)
def test_me_without_valid_token_is_session_expired(client, headers):
    assert_error(client.get("/auth/me", headers=headers), 401, "SESSION_EXPIRED")
