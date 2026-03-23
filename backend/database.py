import os
import sqlite3
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", "prelegal.db")


def init_db() -> None:
    """Drop and recreate the database with a fresh users table."""
    db_file = Path(DB_PATH)
    if db_file.exists():
        db_file.unlink()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
