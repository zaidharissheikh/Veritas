"""Upgrade a verification-enabled database without resetting accounts or history."""
from sqlalchemy import create_engine, inspect, text


def test_existing_verified_account_is_preserved_during_reset_upgrade(monkeypatch):
    from app import db
    from tests.conftest import _TEST_DIR

    database = _TEST_DIR / 'before-reset.db'
    legacy = create_engine(f'sqlite:///{database.as_posix()}')
    try:
        with legacy.begin() as connection:
            connection.execute(text('''CREATE TABLE users (id VARCHAR(32) PRIMARY KEY, email VARCHAR(254),
                password_hash VARCHAR(100), created_at TIMESTAMP, email_verified BOOLEAN NOT NULL DEFAULT 0,
                verification_token_hash VARCHAR(64), verification_expires_at TIMESTAMP, verification_sent_at TIMESTAMP)'''))
            connection.execute(text("INSERT INTO users (id,email,password_hash,created_at,email_verified) VALUES ('usr_existing','existing@example.com','original-hash','2026-01-01',1)"))
        monkeypatch.setattr(db, 'engine', legacy)
        db.create_tables()
        db.create_tables()
        assert len(list(_TEST_DIR.glob('before-reset.pre-auth-upgrade-*.bak'))) == 1
        with legacy.connect() as connection:
            row = connection.execute(text('SELECT id,password_hash,email_verified,session_version,reset_token_hash FROM users')).one()
            assert tuple(row) == ('usr_existing', 'original-hash', 1, 0, None)
        assert {'reset_token_hash', 'reset_expires_at', 'reset_sent_at', 'session_version'} <= {
            column['name'] for column in inspect(legacy).get_columns('users')}
    finally:
        legacy.dispose()
