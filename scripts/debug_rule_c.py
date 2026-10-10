import sys; sys.path.insert(0, ".")
import pandas as pd
import utils.database as db

with db.get_connection() as conn:
    rows = conn.execute("""
        SELECT b.tender_id, u.username AS bidder_id, b.amount AS bid_amount,
               b.submitted_at AS bid_timestamp, b.status AS outcome,
               g.category AS product_category,
               'real_public_data' AS source_type
        FROM bids b
        JOIN users u ON b.bidder_id = u.id
        JOIN gov_tenders g ON b.tender_id = g.id
    """).fetchall()

bids = pd.DataFrame([dict(r) for r in rows])

outcome_col = bids["outcome"].astype(str).str.strip().str.lower()
reliable = bids[outcome_col.isin(["won", "lost", "awarded", "unsuccessful"])]
print("Reliable rows:", len(reliable))
print(reliable[["tender_id", "bidder_id", "outcome"]].to_string())

winners = reliable[reliable["outcome"].isin(["won", "awarded"])][["tender_id", "bidder_id"]].drop_duplicates()
print("\nWinners:")
print(winners.to_string())
print("Unique awarded tenders:", winners["tender_id"].nunique())

wc = winners.groupby("bidder_id")["tender_id"].count()
print("\nWin counts per bidder:")
print(wc.to_string())

rotating = wc[wc >= 2]  # rotation_min_wins = 2
print("\nBidders with >= 2 wins:", list(rotating.index))
print("Need 2+ bidders for rotation:", len(rotating) >= 2)
