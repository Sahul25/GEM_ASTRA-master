"""
scripts/seed_demo_data.py
Seed the database with realistic demo data for GeM Astra.

Creates:
- 8 bidder (reviewer) accounts
- 1 government (admin) account
- 12 government tenders across 5 departments
- 45+ bids with deliberate patterns:
    Rule A: price-similar bids on the same tender
    Rule B: 3 bidder pairs appearing together in 3+ tenders
    Rule C: winner rotation across awarded tenders

Run from the project root:
    python scripts/seed_demo_data.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from datetime import datetime, timezone, timedelta
import utils.database as db

# ── Helpers ──────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def date_str(delta_days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=delta_days)).strftime("%Y-%m-%d")

def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def get_or_create_user(username, email, role, password="Demo1234"):
    existing = db.get_user_by_username(username)
    if existing:
        print(f"  [skip] user already exists: {username}")
        return existing["id"]
    user = db.create_user(username, email, hash_pw(password), role)
    print(f"  [+] created user: {username} ({role})")
    return user["id"]

def create_tender(title, desc, dept, cat, qty, unit, budget, start_delta, end_delta, created_by):
    t = db.create_gov_tender(
        title=title, description=desc, department=dept, category=cat,
        quantity=qty, unit=unit, budget_estimate=budget,
        start_date=date_str(start_delta), end_date=date_str(end_delta),
        created_by=created_by,
    )
    print(f"  [+] tender #{t['id']}: {title[:50]}")
    return t["id"]

def place_bid(tender_id, bidder_id, amount, note=""):
    existing = db.get_bid_by_tender_and_bidder(tender_id, bidder_id)
    if existing:
        print(f"  [skip] bid already exists: tender={tender_id} bidder={bidder_id}")
        return existing["id"]
    b = db.submit_bid(tender_id, bidder_id, amount, note)
    print(f"  [+] bid: tender={tender_id} bidder={bidder_id} amount={amount:,.0f}")
    return b["id"]

def award_tender(tender_id):
    db.update_gov_tender_status(tender_id, "awarded")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n=== Initialising DB ===")
    db.init_db()

    print("\n=== Creating users ===")

    # Government officers
    gov1 = get_or_create_user("gov_officer1", "gov1@procurement.in",  "admin")
    gov2 = get_or_create_user("gov_officer2", "gov2@procurement.in",  "admin")

    # Bidder companies — 8 companies
    b_alpha   = get_or_create_user("AlphaTech",      "alpha@alphatech.com",    "reviewer")
    b_beta    = get_or_create_user("BetaSystems",    "beta@betasys.com",       "reviewer")
    b_gamma   = get_or_create_user("GammaBuild",     "gamma@gammabuild.com",   "reviewer")
    b_delta   = get_or_create_user("DeltaInfra",     "delta@deltainfra.com",   "reviewer")
    b_epsilon = get_or_create_user("EpsilonTech",    "eps@epsilontech.com",    "reviewer")
    b_zeta    = get_or_create_user("ZetaSupplies",   "zeta@zetasupplies.com",  "reviewer")
    b_eta     = get_or_create_user("EtaEngineers",   "eta@etaeng.com",         "reviewer")
    b_theta   = get_or_create_user("ThetaSolutions", "theta@thetasol.com",     "reviewer")

    print("\n=== Creating tenders ===")

    # Tender 1 — IT Equipment (Rule A: price similarity AlphaTech & BetaSystems)
    t1 = create_tender(
        "Supply of 500 Desktop Computers",
        "Core i5 12th Gen, 8GB RAM, 256GB SSD, 21-inch monitor. Delivery within 60 days.",
        "Ministry of Information Technology", "IT Equipment",
        500, "units", 8_750_000, -10, 30, gov1
    )

    # Tender 2 — IT Equipment (Rule A again + Rule B co-participation)
    t2 = create_tender(
        "Supply of 200 Laptops for Government Schools",
        "Core i3, 4GB RAM, 128GB SSD, Windows 11. For district school digitisation programme.",
        "Ministry of Education", "IT Equipment",
        200, "units", 3_400_000, -8, 25, gov1
    )

    # Tender 3 — Furniture (Rule B: AlphaTech + BetaSystems co-participate again)
    t3 = create_tender(
        "Office Furniture — 300 Chairs and 100 Desks",
        "Ergonomic office chairs (IS 1831) and desks for the new district office building.",
        "Public Works Department", "Furniture",
        400, "units", 2_800_000, -5, 40, gov1
    )

    # Tender 4 — Furniture (Rule B: Alpha+Beta appear AGAIN)
    t4 = create_tender(
        "Supply of Steel Almirahs — 150 Units",
        "Heavy gauge steel almirahs, lockable, powder-coated finish.",
        "Public Works Department", "Furniture",
        150, "units", 975_000, -3, 35, gov1
    )

    # Tender 5 — Vehicles (Rule C: winner rotation — AlphaTech wins)
    t5 = create_tender(
        "Procurement of 10 Government Staff Vehicles",
        "Diesel SUV, minimum 2000cc, AC, GPS tracking, first-aid kit.",
        "Ministry of Home Affairs", "Vehicles",
        10, "units", 12_500_000, -20, -5, gov1
    )

    # Tender 6 — Vehicles (Rule C: winner rotation — BetaSystems wins)
    t6 = create_tender(
        "Supply of 5 Mobile Lab Vans",
        "Customised mobile laboratory vans with equipment mounting.",
        "Ministry of Health", "Vehicles",
        5, "units", 7_200_000, -18, -3, gov1
    )

    # Tender 7 — Vehicles (Rule C: winner rotation — GammaBuild wins)
    t7 = create_tender(
        "Fleet of 8 Ambulances for District Hospitals",
        "Type B ambulances with ALS equipment, stretcher, oxygen supply.",
        "Ministry of Health", "Vehicles",
        8, "units", 9_600_000, -15, -2, gov2
    )

    # Tender 8 — Construction
    t8 = create_tender(
        "Renovation of 3 Government Guest Houses",
        "Civil, electrical and plumbing renovation work. Scope as per detailed estimate.",
        "Public Works Department", "Construction",
        3, "units", 15_000_000, -12, 60, gov2
    )

    # Tender 9 — Medical Supplies (Rule A: price similarity EpsilonTech & ZetaSupplies)
    t9 = create_tender(
        "Supply of PPE Kits — 10,000 Units",
        "Type II PPE kit per CDSCO standards: coverall, gloves, shoe covers, face shield.",
        "Ministry of Health", "Medical Supplies",
        10_000, "kits", 2_200_000, -6, 20, gov2
    )

    # Tender 10 — Medical Supplies (Rule B: EpsilonTech + ZetaSupplies co-participate)
    t10 = create_tender(
        "Procurement of 500 Pulse Oximeters",
        "Finger-tip pulse oximeters with SpO2 and pulse rate display. BIS certified.",
        "Ministry of Health", "Medical Supplies",
        500, "units", 625_000, -4, 18, gov2
    )

    # Tender 11 — Software (smaller, misc)
    t11 = create_tender(
        "Enterprise Resource Planning Software Licence",
        "5-year ERP licence for finance, HR, and procurement modules. Cloud deployment.",
        "Ministry of Finance", "Software",
        1, "licence", 5_500_000, -1, 45, gov1
    )

    # Tender 12 — Infrastructure
    t12 = create_tender(
        "Solar Panel Installation — 50 kW System",
        "50 kW rooftop solar system with net metering, inverter, and 10-year AMC.",
        "Ministry of New & Renewable Energy", "Infrastructure",
        50, "kW", 3_750_000, 0, 50, gov1
    )

    print("\n=== Placing bids ===")

    # ── Tender 1 — Price similarity: Alpha & Beta submit very close amounts ──
    # Also: Gamma, Delta, Epsilon bid (normal competitive spread)
    place_bid(t1, b_alpha,   8_420_000, "Includes 3-year AMC")
    place_bid(t1, b_beta,    8_445_000, "Bulk pricing applied")          # < 0.3% diff → Rule A fires
    place_bid(t1, b_gamma,   9_100_000, "Standard rates")
    place_bid(t1, b_delta,   9_350_000, "Including GST")
    place_bid(t1, b_epsilon, 8_890_000, "Per unit ₹17,780")

    # ── Tender 2 — Price similarity again: Alpha & Beta close again ──
    # Rule A fires on t2 as well; Rule B builds (Alpha+Beta co-participate)
    place_bid(t2, b_alpha,   3_318_000, "School-grade keyboards included")
    place_bid(t2, b_beta,    3_325_000, "Pre-loaded software included")  # < 0.2% diff → Rule A fires
    place_bid(t2, b_gamma,   3_580_000)
    place_bid(t2, b_zeta,    3_490_000, "2-year warranty")
    place_bid(t2, b_eta,     3_610_000)

    # ── Tender 3 — Furniture: Alpha+Beta co-participate (3rd tender together) ──
    # Rule B fires: Alpha & Beta have now been in t1, t2, t3
    place_bid(t3, b_alpha,   2_650_000)
    place_bid(t3, b_beta,    2_720_000)
    place_bid(t3, b_delta,   2_500_000, "Best price guarantee")
    place_bid(t3, b_eta,     2_810_000)
    place_bid(t3, b_theta,   2_780_000)

    # ── Tender 4 — Furniture: Alpha+Beta again (4th together) ──
    # Rule B score increases
    place_bid(t4, b_alpha,   940_000)
    place_bid(t4, b_beta,    955_000)
    place_bid(t4, b_gamma,   1_020_000)
    place_bid(t4, b_zeta,    980_000)

    # ── Tender 5 — Vehicles (awarded, AlphaTech wins) ──
    # Rule C: winner rotation starts here
    place_bid(t5, b_alpha,   12_100_000, "Mahindra Scorpio N fleet deal")
    place_bid(t5, b_beta,    12_380_000)
    place_bid(t5, b_gamma,   12_650_000)
    place_bid(t5, b_delta,   13_200_000)
    award_tender(t5)

    # ── Tender 6 — Vehicles (awarded, BetaSystems wins) ──
    place_bid(t6, b_beta,    6_990_000, "Custom conversion included")
    place_bid(t6, b_alpha,   7_200_000)
    place_bid(t6, b_gamma,   7_450_000)
    place_bid(t6, b_eta,     7_100_000)
    award_tender(t6)

    # ── Tender 7 — Vehicles (awarded, GammaBuild wins) ──
    place_bid(t7, b_gamma,   9_200_000, "Specialised ambulance division")
    place_bid(t7, b_alpha,   9_480_000)
    place_bid(t7, b_beta,    9_650_000)
    place_bid(t7, b_delta,   9_900_000)
    award_tender(t7)

    # ── Tender 8 — Construction: broad participation ──
    place_bid(t8, b_delta,   14_200_000)
    place_bid(t8, b_eta,     13_850_000, "Civil works specialist")
    place_bid(t8, b_theta,   14_500_000)
    place_bid(t8, b_gamma,   15_100_000)

    # ── Tender 9 — Medical: EpsilonTech & ZetaSupplies price similarity ──
    place_bid(t9, b_epsilon, 2_142_000, "CDSCO certified stock")
    place_bid(t9, b_zeta,    2_148_000, "ISO 13485 facility")           # < 0.3% diff → Rule A fires
    place_bid(t9, b_theta,   2_310_000)
    place_bid(t9, b_alpha,   2_290_000)

    # ── Tender 10 — Medical: EpsilonTech + ZetaSupplies co-participate again ──
    # Rule B fires for this new pair
    place_bid(t10, b_epsilon, 598_000)
    place_bid(t10, b_zeta,    612_000)
    place_bid(t10, b_theta,   635_000)
    place_bid(t10, b_beta,    645_000)

    # ── Tender 11 — ERP Software: tech companies ──
    place_bid(t11, b_alpha,   5_250_000, "Proven ERP implementation")
    place_bid(t11, b_beta,    5_380_000)
    place_bid(t11, b_epsilon, 5_490_000)

    # ── Tender 12 — Solar: mixed participation ──
    place_bid(t12, b_delta,   3_600_000, "Tier 1 panels, 25yr warranty")
    place_bid(t12, b_eta,     3_720_000)
    place_bid(t12, b_theta,   3_680_000)
    place_bid(t12, b_zeta,    3_590_000, "Subsidy eligible")

    print("\n=== Verification ===")
    import sqlite3
    conn = sqlite3.connect(db.DB_PATH)
    conn.row_factory = sqlite3.Row

    users   = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    tenders = conn.execute("SELECT COUNT(*) FROM gov_tenders").fetchone()[0]
    bids    = conn.execute("SELECT COUNT(*) FROM bids").fetchone()[0]
    awarded = conn.execute("SELECT COUNT(*) FROM gov_tenders WHERE status='awarded'").fetchone()[0]
    conn.close()

    print(f"  Users:      {users}")
    print(f"  Tenders:    {tenders}")
    print(f"  Bids:       {bids}")
    print(f"  Awarded:    {awarded}")
    print("\n  Done! Run the risk analysis and bidder network endpoints to see results.")


if __name__ == "__main__":
    main()
