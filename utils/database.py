"""
utils/database.py
Primary storage layer for GeM Astra.  SQLite-backed, parameterised queries only.
"""

import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gem_astra.db"

TENDER_COLUMNS = [
    "tender_id", "item_name", "department", "start_date", "end_date",
    "status", "quantity", "official_url", "source_type", "source_document",
]

# --------------------------------------------------------------------------- #
#  Connection                                                                  #
# --------------------------------------------------------------------------- #

def get_connection() -> sqlite3.Connection:
    """Return a connection with foreign-key enforcement and row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


# --------------------------------------------------------------------------- #
#  Schema initialisation                                                       #
# --------------------------------------------------------------------------- #

def init_db() -> None:
    """Create tables and indexes if they do not already exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tenders (
                tender_id       TEXT PRIMARY KEY,
                item_name       TEXT,
                department      TEXT,
                start_date      TEXT,
                end_date        TEXT,
                status          TEXT,
                quantity        REAL,
                official_url    TEXT,
                source_type     TEXT NOT NULL DEFAULT 'unknown',
                source_document TEXT,
                created_at      TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tenders_department
                ON tenders (department);

            CREATE INDEX IF NOT EXISTS idx_tenders_status
                ON tenders (status);

            CREATE INDEX IF NOT EXISTS idx_tenders_source_type
                ON tenders (source_type);

            CREATE TABLE IF NOT EXISTS users (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                username            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                email               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                hashed_password     TEXT    NOT NULL,
                role                TEXT    NOT NULL DEFAULT 'reviewer',
                is_active           INTEGER NOT NULL DEFAULT 1,
                created_at          TEXT    NOT NULL,
                updated_at          TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_username
                ON users (username COLLATE NOCASE);

            CREATE INDEX IF NOT EXISTS idx_users_email
                ON users (email COLLATE NOCASE);

            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token       TEXT    NOT NULL UNIQUE,
                expires_at  TEXT    NOT NULL,
                used        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS gov_tenders (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                title           TEXT    NOT NULL,
                description     TEXT,
                department      TEXT    NOT NULL,
                category        TEXT,
                quantity        REAL,
                unit            TEXT,
                budget_estimate REAL,
                start_date      TEXT    NOT NULL,
                end_date        TEXT    NOT NULL,
                status          TEXT    NOT NULL DEFAULT 'open',
                created_by      INTEGER NOT NULL REFERENCES users(id),
                created_at      TEXT    NOT NULL,
                updated_at      TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_gov_tenders_status
                ON gov_tenders (status);

            CREATE INDEX IF NOT EXISTS idx_gov_tenders_dept
                ON gov_tenders (department);

            CREATE TABLE IF NOT EXISTS bids (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                tender_id   INTEGER NOT NULL REFERENCES gov_tenders(id) ON DELETE CASCADE,
                bidder_id   INTEGER NOT NULL REFERENCES users(id),
                amount      REAL    NOT NULL,
                note        TEXT,
                status      TEXT    NOT NULL DEFAULT 'submitted',
                submitted_at TEXT   NOT NULL,
                UNIQUE(tender_id, bidder_id)
            );

            CREATE INDEX IF NOT EXISTS idx_bids_tender
                ON bids (tender_id);

            CREATE INDEX IF NOT EXISTS idx_bids_bidder
                ON bids (bidder_id);
            """
        )


# --------------------------------------------------------------------------- #
#  Read helpers                                                                #
# --------------------------------------------------------------------------- #

def fetch_all_tenders() -> pd.DataFrame:
    """Return all tenders as a DataFrame."""
    try:
        with get_connection() as conn:
            df = pd.read_sql_query(
                "SELECT * FROM tenders ORDER BY created_at DESC", conn
            )
        return df
    except Exception:
        return pd.DataFrame(columns=TENDER_COLUMNS + ["created_at"])


def fetch_tenders_filtered(
    search: str = "",
    department: Optional[str] = None,
    status: Optional[str] = None,
) -> pd.DataFrame:
    """Return tenders matching optional search text and filters."""
    clauses: list[str] = []
    params: list = []

    if search:
        clauses.append(
            "(tender_id LIKE ? OR item_name LIKE ?)"
        )
        like = f"%{search}%"
        params.extend([like, like])

    if department:
        clauses.append("department = ?")
        params.append(department)

    if status:
        clauses.append("status = ?")
        params.append(status)

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"SELECT * FROM tenders {where} ORDER BY created_at DESC"

    try:
        with get_connection() as conn:
            df = pd.read_sql_query(sql, conn, params=params)
        return df
    except Exception:
        return pd.DataFrame(columns=TENDER_COLUMNS + ["created_at"])


def fetch_distinct(column: str) -> list[str]:
    """Return sorted distinct non-null values for a column."""
    allowed = {"department", "status", "source_type"}
    if column not in allowed:
        return []
    try:
        with get_connection() as conn:
            rows = conn.execute(
                f"SELECT DISTINCT {column} FROM tenders "  # column is allow-listed
                f"WHERE {column} IS NOT NULL AND {column} != '' "
                f"ORDER BY {column}"
            ).fetchall()
        return [r[0] for r in rows]
    except Exception:
        return []


def count_tenders() -> int:
    try:
        with get_connection() as conn:
            return conn.execute("SELECT COUNT(*) FROM tenders").fetchone()[0]
    except Exception:
        return 0


def fetch_tender_by_id(tender_id: str) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM tenders WHERE tender_id = ?", (tender_id,)
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


# --------------------------------------------------------------------------- #
#  Import                                                                      #
# --------------------------------------------------------------------------- #

ALLOWED_SOURCE_TYPES = {"real_public_data", "synthetic", "synthetic_demo", "unknown"}


def import_tenders_from_df(
    df: pd.DataFrame,
    source_type_override: Optional[str] = None,
) -> dict:
    """
    Insert rows from a DataFrame into the tenders table.

    Duplicate tender_ids are skipped (not overwritten) unless the caller
    explicitly uses upsert=True (not exposed in UI — safety default).

    Returns a result dict: inserted, skipped_duplicate, rejected, errors.
    """
    result = {
        "inserted": 0,
        "skipped_duplicate": 0,
        "rejected": 0,
        "errors": [],
    }

    now = datetime.now(timezone.utc).isoformat()

    rows_to_insert: list[tuple] = []

    for idx, row in df.iterrows():
        tender_id = str(row.get("tender_id", "")).strip()
        if not tender_id:
            result["rejected"] += 1
            result["errors"].append(f"Row {idx + 1}: missing tender_id — skipped.")
            continue

        # Determine source_type
        raw_src = str(row.get("source_type", "")).strip().lower()
        if source_type_override:
            src = source_type_override
        elif raw_src in ALLOWED_SOURCE_TYPES:
            src = raw_src
        else:
            src = "unknown"

        rows_to_insert.append((
            tender_id,
            _clean(row, "item_name"),
            _clean(row, "department"),
            _clean(row, "start_date"),
            _clean(row, "end_date"),
            _clean(row, "status"),
            _to_float(row.get("quantity")),
            _clean(row, "official_url"),
            src,
            _clean(row, "source_document"),
            now,
        ))

    if not rows_to_insert:
        return result

    sql = """
        INSERT OR IGNORE INTO tenders
            (tender_id, item_name, department, start_date, end_date,
             status, quantity, official_url, source_type, source_document, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    try:
        with get_connection() as conn:
            conn.execute("BEGIN")
            try:
                for row_tuple in rows_to_insert:
                    cur = conn.execute(sql, row_tuple)
                    if cur.rowcount == 1:
                        result["inserted"] += 1
                    else:
                        result["skipped_duplicate"] += 1
                conn.execute("COMMIT")
            except Exception as e:
                conn.execute("ROLLBACK")
                result["errors"].append(f"Transaction rolled back: {e}")
                result["inserted"] = 0
    except Exception as e:
        result["errors"].append(f"Connection error: {e}")

    return result


# --------------------------------------------------------------------------- #
#  Helpers                                                                     #
# --------------------------------------------------------------------------- #

def _clean(row, key: str) -> Optional[str]:
    val = row.get(key, None)
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s else None


def _to_float(val) -> Optional[float]:
    try:
        f = float(val)
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------- #
#  User helpers                                                                #
# --------------------------------------------------------------------------- #

def create_user(username: str, email: str, hashed_password: str, role: str = "reviewer") -> dict:
    """Insert a new user. Raises ValueError on duplicate username/email."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO users (username, email, hashed_password, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (username.strip(), email.strip().lower(), hashed_password, role, now, now),
            )
            user_id = conn.execute(
                "SELECT id FROM users WHERE username = ? COLLATE NOCASE", (username.strip(),)
            ).fetchone()[0]
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError as exc:
        msg = str(exc).lower()
        if "username" in msg:
            raise ValueError("Username is already taken.")
        if "email" in msg:
            raise ValueError("An account with this email already exists.")
        raise ValueError("Registration failed — duplicate entry.")


def get_user_by_username(username: str) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username.strip(),)
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def get_user_by_email(email: str) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email.strip().lower(),)
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def get_user_by_id(user_id: int) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


# --------------------------------------------------------------------------- #
#  Password-reset token helpers                                                #
# --------------------------------------------------------------------------- #

def create_reset_token(user_id: int, token: str, expires_at: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        # Invalidate any previous unused tokens for this user
        conn.execute(
            "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
            (user_id,),
        )
        conn.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at)
            VALUES (?, ?, ?, 0, ?)
            """,
            (user_id, token, expires_at, now),
        )


def get_reset_token(token: str) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM password_reset_tokens WHERE token = ?", (token,)
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def consume_reset_token(token: str, new_hashed_password: str) -> bool:
    """
    Mark the token as used and update the user's password atomically.
    Returns True on success, False if the token is invalid/expired/already used.
    """
    now = datetime.now(timezone.utc).isoformat()
    record = get_reset_token(token)
    if not record:
        return False
    if record["used"]:
        return False
    if record["expires_at"] < now:
        return False
    try:
        with get_connection() as conn:
            conn.execute("BEGIN")
            conn.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,)
            )
            conn.execute(
                "UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?",
                (new_hashed_password, now, record["user_id"]),
            )
            conn.execute("COMMIT")
        return True
    except Exception:
        return False


# --------------------------------------------------------------------------- #
#  Government Tender helpers                                                   #
# --------------------------------------------------------------------------- #

def create_gov_tender(
    title: str, description: str, department: str, category: str,
    quantity: float, unit: str, budget_estimate: float,
    start_date: str, end_date: str, created_by: int,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO gov_tenders
                (title, description, department, category, quantity, unit,
                 budget_estimate, start_date, end_date, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
            """,
            (title, description, department, category, quantity, unit,
             budget_estimate, start_date, end_date, created_by, now, now),
        )
        new_id = cur.lastrowid
    # Fetch after the connection is closed (committed)
    return get_gov_tender_by_id(new_id)


def list_gov_tenders(status: Optional[str] = None, department: Optional[str] = None,
                      search: str = "") -> list[dict]:
    clauses, params = [], []
    if status:
        clauses.append("status = ?"); params.append(status)
    if department:
        clauses.append("department = ?"); params.append(department)
    if search:
        clauses.append("(title LIKE ? OR department LIKE ? OR category LIKE ?)")
        like = f"%{search}%"; params.extend([like, like, like])
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"SELECT * FROM gov_tenders {where} ORDER BY created_at DESC"
    try:
        with get_connection() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []


def get_gov_tender_by_id(tender_id: int) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM gov_tenders WHERE id = ?", (tender_id,)
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def update_gov_tender_status(tender_id: int, status: str) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_connection() as conn:
            conn.execute(
                "UPDATE gov_tenders SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, tender_id),
            )
        return True
    except Exception:
        return False


def count_gov_tenders_by_status() -> dict:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as cnt FROM gov_tenders GROUP BY status"
            ).fetchall()
        return {r["status"]: r["cnt"] for r in rows}
    except Exception:
        return {}


# --------------------------------------------------------------------------- #
#  Bid helpers                                                                 #
# --------------------------------------------------------------------------- #

def submit_bid(tender_id: int, bidder_id: int, amount: float, note: str = "") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_connection() as conn:
            cur = conn.execute(
                """
                INSERT INTO bids (tender_id, bidder_id, amount, note, status, submitted_at)
                VALUES (?, ?, ?, ?, 'submitted', ?)
                """,
                (tender_id, bidder_id, amount, note, now),
            )
            new_id = cur.lastrowid
        # Fetch after commit
        return get_bid_by_id(new_id)
    except sqlite3.IntegrityError:
        raise ValueError("You have already submitted a bid for this tender.")


def update_bid(tender_id: int, bidder_id: int, amount: float, note: str = "") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE bids SET amount = ?, note = ?, submitted_at = ?
            WHERE tender_id = ? AND bidder_id = ?
            """,
            (amount, note, now, tender_id, bidder_id),
        )
    row = get_bid_by_tender_and_bidder(tender_id, bidder_id)
    if not row:
        raise ValueError("Bid not found.")
    return row


def get_bid_by_id(bid_id: int) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM bids WHERE id = ?", (bid_id,)).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def get_bid_by_tender_and_bidder(tender_id: int, bidder_id: int) -> Optional[dict]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM bids WHERE tender_id = ? AND bidder_id = ?",
                (tender_id, bidder_id),
            ).fetchone()
        return dict(row) if row else None
    except Exception:
        return None


def list_bids_for_tender(tender_id: int) -> list[dict]:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT b.*, u.username, u.email
                FROM bids b JOIN users u ON b.bidder_id = u.id
                WHERE b.tender_id = ?
                ORDER BY b.amount ASC
                """,
                (tender_id,),
            ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []


def list_bids_for_user(bidder_id: int) -> list[dict]:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT b.*, g.title as tender_title, g.department, g.end_date,
                       g.status as tender_status, g.budget_estimate
                FROM bids b JOIN gov_tenders g ON b.tender_id = g.id
                WHERE b.bidder_id = ?
                ORDER BY b.submitted_at DESC
                """,
                (bidder_id,),
            ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        return []


def count_bids_for_tender(tender_id: int) -> int:
    try:
        with get_connection() as conn:
            return conn.execute(
                "SELECT COUNT(*) FROM bids WHERE tender_id = ?", (tender_id,)
            ).fetchone()[0]
    except Exception:
        return 0
