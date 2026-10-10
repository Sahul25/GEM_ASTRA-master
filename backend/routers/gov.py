"""
backend/routers/gov.py
Government tender management + bidder bid-submission endpoints.

Government routes  (role = admin)
----------------------------------
POST   /api/gov/tenders                  — create a new tender
GET    /api/gov/tenders                  — list all tenders (with filters)
GET    /api/gov/tenders/{id}             — single tender detail + bids
PATCH  /api/gov/tenders/{id}/status      — close / reopen tender
GET    /api/gov/tenders/{id}/bids        — all bids for a tender
GET    /api/gov/stats                    — dashboard summary stats

Bidder routes  (role = reviewer)
----------------------------------
GET    /api/gov/open-tenders             — list open tenders (public to all logged-in)
POST   /api/gov/tenders/{id}/bid         — submit or update own bid
GET    /api/gov/my-bids                  — bidder's own bid history
"""

from __future__ import annotations

from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, field_validator

import utils.database as db
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/gov", tags=["government"])


# --------------------------------------------------------------------------- #
#  Role guards                                                                 #
# --------------------------------------------------------------------------- #

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Government officer access required.",
        )
    return current_user


def require_reviewer(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "reviewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bidder account required.",
        )
    return current_user


# --------------------------------------------------------------------------- #
#  Pydantic models                                                             #
# --------------------------------------------------------------------------- #

class CreateTenderRequest(BaseModel):
    title: str
    description: str = ""
    department: str
    category: str = ""
    quantity: float = 0
    unit: str = ""
    budget_estimate: float = 0
    start_date: str
    end_date: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title is required.")
        if len(v) > 200:
            raise ValueError("Title must be 200 characters or fewer.")
        return v

    @field_validator("department")
    @classmethod
    def dept_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Department is required.")
        return v

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: str) -> str:
        return v  # cross-field validation below

    def validate_dates(self) -> None:
        try:
            s = datetime.fromisoformat(self.start_date)
            e = datetime.fromisoformat(self.end_date)
        except ValueError:
            raise ValueError("Dates must be in ISO format (YYYY-MM-DD).")
        if e <= s:
            raise ValueError("End date must be after start date.")


class TenderStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"open", "closed", "awarded", "cancelled"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}.")
        return v


class BidRequest(BaseModel):
    amount: float
    note: str = ""

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Bid amount must be greater than zero.")
        return v


class TenderOut(BaseModel):
    id: int
    title: str
    description: str
    department: str
    category: str
    quantity: float
    unit: str
    budget_estimate: float
    start_date: str
    end_date: str
    status: str
    created_by: int
    created_at: str
    bid_count: int = 0


class BidOut(BaseModel):
    id: int
    tender_id: int
    bidder_id: int
    amount: float
    note: str
    status: str
    submitted_at: str
    username: Optional[str] = None
    email: Optional[str] = None
    tender_title: Optional[str] = None
    department: Optional[str] = None
    tender_status: Optional[str] = None
    budget_estimate: Optional[float] = None


class GovStats(BaseModel):
    total_tenders: int
    open_tenders: int
    closed_tenders: int
    awarded_tenders: int
    total_bids: int
    total_bidders: int


def _tender_out(t: dict, bid_count: int = 0) -> TenderOut:
    return TenderOut(
        id=t["id"],
        title=t["title"],
        description=t.get("description") or "",
        department=t["department"],
        category=t.get("category") or "",
        quantity=t.get("quantity") or 0,
        unit=t.get("unit") or "",
        budget_estimate=t.get("budget_estimate") or 0,
        start_date=t["start_date"],
        end_date=t["end_date"],
        status=t["status"],
        created_by=t["created_by"],
        created_at=t["created_at"],
        bid_count=bid_count,
    )


def _bid_out(b: dict) -> BidOut:
    return BidOut(
        id=b["id"],
        tender_id=b["tender_id"],
        bidder_id=b["bidder_id"],
        amount=b["amount"],
        note=b.get("note") or "",
        status=b.get("status") or "submitted",
        submitted_at=b["submitted_at"],
        username=b.get("username"),
        email=b.get("email"),
        tender_title=b.get("tender_title"),
        department=b.get("department"),
        tender_status=b.get("tender_status"),
        budget_estimate=b.get("budget_estimate"),
    )


# --------------------------------------------------------------------------- #
#  Government — Tender CRUD                                                    #
# --------------------------------------------------------------------------- #

@router.post("/tenders", response_model=TenderOut, status_code=201,
             summary="[Admin] Create a new tender")
def create_tender(body: CreateTenderRequest, admin: dict = Depends(require_admin)):
    body.validate_dates()
    tender = db.create_gov_tender(
        title=body.title.strip(),
        description=body.description.strip(),
        department=body.department.strip(),
        category=body.category.strip(),
        quantity=body.quantity,
        unit=body.unit.strip(),
        budget_estimate=body.budget_estimate,
        start_date=body.start_date,
        end_date=body.end_date,
        created_by=admin["id"],
    )
    return _tender_out(tender)


@router.get("/tenders", response_model=list[TenderOut],
            summary="[Admin] List all tenders")
def list_all_tenders(
    status_filter: Optional[str] = Query(None, alias="status"),
    department: Optional[str] = None,
    search: str = "",
    _admin: dict = Depends(require_admin),
):
    tenders = db.list_gov_tenders(status=status_filter, department=department, search=search)
    return [_tender_out(t, db.count_bids_for_tender(t["id"])) for t in tenders]


@router.get("/tenders/{tender_id}", response_model=TenderOut,
            summary="[Admin] Single tender detail")
def get_tender(tender_id: int, _admin: dict = Depends(require_admin)):
    t = db.get_gov_tender_by_id(tender_id)
    if not t:
        raise HTTPException(404, "Tender not found.")
    return _tender_out(t, db.count_bids_for_tender(tender_id))


@router.patch("/tenders/{tender_id}/status", response_model=TenderOut,
              summary="[Admin] Update tender status")
def update_tender_status(
    tender_id: int,
    body: TenderStatusUpdate,
    _admin: dict = Depends(require_admin),
):
    t = db.get_gov_tender_by_id(tender_id)
    if not t:
        raise HTTPException(404, "Tender not found.")
    db.update_gov_tender_status(tender_id, body.status)
    updated = db.get_gov_tender_by_id(tender_id)
    return _tender_out(updated, db.count_bids_for_tender(tender_id))


@router.get("/tenders/{tender_id}/bids", response_model=list[BidOut],
            summary="[Admin] All bids for a tender")
def get_tender_bids(tender_id: int, _admin: dict = Depends(require_admin)):
    t = db.get_gov_tender_by_id(tender_id)
    if not t:
        raise HTTPException(404, "Tender not found.")
    return [_bid_out(b) for b in db.list_bids_for_tender(tender_id)]


@router.get("/stats", response_model=GovStats,
            summary="[Admin] Dashboard summary stats")
def get_gov_stats(_admin: dict = Depends(require_admin)):
    counts = db.count_gov_tenders_by_status()
    all_tenders = db.list_gov_tenders()
    total_bids = sum(db.count_bids_for_tender(t["id"]) for t in all_tenders)
    # unique bidder count
    try:
        with db.get_connection() as conn:
            total_bidders = conn.execute(
                "SELECT COUNT(DISTINCT bidder_id) FROM bids"
            ).fetchone()[0]
    except Exception:
        total_bidders = 0

    return GovStats(
        total_tenders=sum(counts.values()),
        open_tenders=counts.get("open", 0),
        closed_tenders=counts.get("closed", 0),
        awarded_tenders=counts.get("awarded", 0),
        total_bids=total_bids,
        total_bidders=total_bidders,
    )


# --------------------------------------------------------------------------- #
#  Bidder — Browse & Bid                                                       #
# --------------------------------------------------------------------------- #

@router.get("/open-tenders", response_model=list[TenderOut],
            summary="[Bidder] List open tenders")
def list_open_tenders(
    search: str = "",
    department: Optional[str] = None,
    _user: dict = Depends(get_current_user),   # any logged-in user
):
    tenders = db.list_gov_tenders(status="open", department=department, search=search)
    return [_tender_out(t, db.count_bids_for_tender(t["id"])) for t in tenders]


@router.post("/tenders/{tender_id}/bid", response_model=BidOut, status_code=201,
             summary="[Bidder] Submit or update a bid")
def submit_bid(
    tender_id: int,
    body: BidRequest,
    bidder: dict = Depends(require_reviewer),
):
    t = db.get_gov_tender_by_id(tender_id)
    if not t:
        raise HTTPException(404, "Tender not found.")
    if t["status"] != "open":
        raise HTTPException(400, "This tender is not open for bidding.")

    # Check deadline
    now = datetime.now(timezone.utc).isoformat()
    if t["end_date"] < now[:10]:
        raise HTTPException(400, "The bidding deadline for this tender has passed.")

    existing = db.get_bid_by_tender_and_bidder(tender_id, bidder["id"])
    if existing:
        # Update existing bid
        bid = db.update_bid(tender_id, bidder["id"], body.amount, body.note)
    else:
        try:
            bid = db.submit_bid(tender_id, bidder["id"], body.amount, body.note)
        except ValueError as e:
            raise HTTPException(400, str(e))
    return _bid_out(bid)


@router.get("/my-bids", response_model=list[BidOut],
            summary="[Bidder] My bid history")
def my_bids(bidder: dict = Depends(require_reviewer)):
    return [_bid_out(b) for b in db.list_bids_for_user(bidder["id"])]


# --------------------------------------------------------------------------- #
#  Risk Analysis endpoint                                                      #
# --------------------------------------------------------------------------- #

@router.get("/risk-analysis", summary="[Admin] Run risk analysis on all gov bids")
def get_risk_analysis(_admin: dict = Depends(require_admin)):
    """
    Run the risk engine over all bids submitted to government tenders.
    Returns a structured result with score, band, findings, and warnings.
    Each finding includes signals, tender IDs, thresholds, and data-completeness info.
    Missing data is flagged as unavailable — it does NOT increase the score.
    """
    import pandas as pd
    from utils.risk_engine import analyse

    # Pull all bids with tender metadata from the gov bids table
    try:
        with db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT b.tender_id   AS tender_id,
                       u.username    AS bidder_id,
                       b.amount      AS bid_amount,
                       b.submitted_at AS bid_timestamp,
                       b.status      AS outcome,
                       g.category    AS product_category,
                       'real_public_data' AS source_type,
                       g.title       AS tender_title,
                       g.department  AS department,
                       g.budget_estimate AS budget_estimate,
                       g.start_date  AS start_date,
                       g.end_date    AS end_date
                FROM bids b
                JOIN users u ON b.bidder_id = u.id
                JOIN gov_tenders g ON b.tender_id = g.id
                """
            ).fetchall()
        bids = pd.DataFrame([dict(r) for r in rows])
    except Exception as exc:
        return {
            "error": f"Could not load bids: {exc}",
            "score": 0, "score_band": "Low",
            "findings": [], "warnings": [],
        }

    result = analyse(bids)

    findings_out = []
    for f in result.findings:
        findings_out.append({
            "rule": f.rule,
            "rule_name": f.rule_name,
            "tender_ids": f.tender_ids,
            "bidder_ids": f.bidder_ids,
            "evidence": f.evidence,
            "threshold_or_criterion": f.threshold_or_criterion,
            "explanation": f.explanation,
            "source_type": f.source_type,
            "data_limitations": f.data_limitations,
            "insufficient_data": f.insufficient_data,
        })

    return {
        "score": result.score,
        "score_band": result.score_band,
        "score_explanation": result.score_explanation,
        "source_type": result.source_type,
        "real_data_available": result.real_data_available,
        "total_bids_analysed": len(bids),
        "total_tenders_analysed": int(bids["tender_id"].nunique()) if not bids.empty else 0,
        "findings": findings_out,
        "warnings": result.warnings,
        "config_weights": {
            "rule_a_price_similarity": "35 / 100",
            "rule_b_co_participation": "25 / 100",
            "rule_c_winner_rotation": "40 / 100",
            "note": "Prototype weights only — not calibrated probabilities.",
        },
    }


# --------------------------------------------------------------------------- #
#  Bidder Network (co-participation) endpoint                                  #
# --------------------------------------------------------------------------- #

@router.get("/bidder-network", summary="[Admin] Co-participation graph of all bidders")
def get_bidder_network(_admin: dict = Depends(require_admin)):
    """
    Builds a co-participation graph from all bids on government tenders.
    Nodes = bidder usernames. Edges = shared tender participation.
    Edge weight = number of shared tenders.
    This is a co-participation graph, NOT a cartel map.
    """
    import itertools
    from collections import defaultdict

    try:
        with db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT b.tender_id, u.username AS bidder_id, g.title AS tender_title
                FROM bids b
                JOIN users u ON b.bidder_id = u.id
                JOIN gov_tenders g ON b.tender_id = g.id
                """
            ).fetchall()
    except Exception as exc:
        return {"nodes": [], "edges": [], "error": str(exc)}

    if not rows:
        return {
            "nodes": [], "edges": [],
            "disclaimer": (
                "No bids found. This co-participation graph shows shared tender "
                "participation only — it is NOT evidence of coordination or collusion."
            ),
            "total_bidders": 0, "total_edges": 0,
        }

    # Build tender → bidders map
    tender_bidders: dict[int, set[str]] = defaultdict(set)
    bidder_tender_count: dict[str, int] = defaultdict(int)
    tender_titles: dict[int, str] = {}

    for r in rows:
        tender_bidders[r["tender_id"]].add(r["bidder_id"])
        bidder_tender_count[r["bidder_id"]] += 1
        tender_titles[r["tender_id"]] = r["tender_title"]

    # Nodes
    nodes = [
        {"bidder_id": b, "tender_count": c}
        for b, c in sorted(bidder_tender_count.items())
    ]

    # Edges
    pair_tenders: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for tid, bidder_set in tender_bidders.items():
        for b1, b2 in itertools.combinations(sorted(bidder_set), 2):
            pair_tenders[(b1, b2)].append({
                "tender_id": tid,
                "tender_title": tender_titles.get(tid, ""),
            })

    edges = [
        {
            "bidder_a": b1,
            "bidder_b": b2,
            "shared_tender_count": len(tenders),
            "shared_tenders": tenders,
        }
        for (b1, b2), tenders in sorted(pair_tenders.items())
    ]

    return {
        "nodes": nodes,
        "edges": edges,
        "disclaimer": (
            "This is a co-participation graph — nodes are bidder IDs, edges indicate "
            "shared participation in the same government tender. "
            "Shared participation is a review signal only. "
            "It is NOT evidence of coordination, collusion, or fraud."
        ),
        "total_bidders": len(nodes),
        "total_edges": len(edges),
    }
