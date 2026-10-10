"""
Add 3 more awarded tenders so AlphaTech, BetaSystems, GammaBuild
each win 2 tenders — triggering Rule C (winner rotation).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import utils.database as db
from datetime import datetime, timezone, timedelta

def date_str(d): return (datetime.now(timezone.utc) + timedelta(days=d)).strftime("%Y-%m-%d")
def now_iso(): return datetime.now(timezone.utc).isoformat()

db.init_db()

# Get user IDs
alpha   = db.get_user_by_username("AlphaTech")["id"]
beta    = db.get_user_by_username("BetaSystems")["id"]
gamma   = db.get_user_by_username("GammaBuild")["id"]
delta   = db.get_user_by_username("DeltaInfra")["id"]
eta     = db.get_user_by_username("EtaEngineers")["id"]
gov1    = db.get_user_by_username("gov_officer1")["id"]

# ── 3 new awarded tenders ──────────────────────────────────────────────────

t_a = db.create_gov_tender(
    "IT Hardware for 10 Sub-District Offices",
    "Desktops, printers and UPS for district offices.",
    "Ministry of Information Technology", "IT Equipment",
    250, "units", 4_200_000,
    date_str(-25), date_str(-8), gov1
)
print("tender:", t_a["id"], t_a["title"])

t_b = db.create_gov_tender(
    "Portable Water Testing Kits — 2000 Units",
    "Field water quality testing kits for rural health workers.",
    "Ministry of Health", "Medical Supplies",
    2000, "kits", 1_800_000,
    date_str(-22), date_str(-6), gov1
)
print("tender:", t_b["id"], t_b["title"])

t_c = db.create_gov_tender(
    "Construction of 4 Community Halls",
    "Civil construction of multi-purpose community halls with basic facilities.",
    "Public Works Department", "Construction",
    4, "units", 22_000_000,
    date_str(-30), date_str(-10), gov1
)
print("tender:", t_c["id"], t_c["title"])

# ── Bids with won/lost ─────────────────────────────────────────────────────

conn = sqlite3.connect(db.DB_PATH)
now = now_iso()

bids_ta = [
    (t_a["id"], alpha,  4_080_000, "won"),   # AlphaTech wins round 2
    (t_a["id"], beta,   4_220_000, "lost"),
    (t_a["id"], gamma,  4_350_000, "lost"),
    (t_a["id"], delta,  4_500_000, "lost"),
    (t_a["id"], eta,    4_400_000, "lost"),
]
bids_tb = [
    (t_b["id"], beta,   1_740_000, "won"),   # BetaSystems wins round 2
    (t_b["id"], alpha,  1_790_000, "lost"),
    (t_b["id"], gamma,  1_850_000, "lost"),
    (t_b["id"], eta,    1_900_000, "lost"),
]
bids_tc = [
    (t_c["id"], gamma,  21_200_000, "won"),  # GammaBuild wins round 2
    (t_c["id"], alpha,  21_800_000, "lost"),
    (t_c["id"], beta,   22_400_000, "lost"),
    (t_c["id"], delta,  23_100_000, "lost"),
]

for bid_list in [bids_ta, bids_tb, bids_tc]:
    for (tid, bidder_id, amount, status) in bid_list:
        conn.execute(
            "INSERT OR IGNORE INTO bids (tender_id, bidder_id, amount, note, status, submitted_at) VALUES (?,?,?,?,?,?)",
            (tid, bidder_id, amount, "", status, now)
        )
        print(f"  bid: tender={tid} bidder={bidder_id} amount={amount:,} status={status}")

conn.commit()
conn.close()

# Mark tenders as awarded
db.update_gov_tender_status(t_a["id"], "awarded")
db.update_gov_tender_status(t_b["id"], "awarded")
db.update_gov_tender_status(t_c["id"], "awarded")

print("\nDone — 3 new awarded tenders, Rule C should now fire.")
print("Verify with: python scripts/verify_risk.py")
