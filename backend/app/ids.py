"""Public identifiers: usr_ + 16 hex for users, res_ + 8 hex for analysis results."""
import secrets


def new_user_id() -> str:
    return f"usr_{secrets.token_hex(8)}"


def new_result_id() -> str:
    return f"res_{secrets.token_hex(4)}"
