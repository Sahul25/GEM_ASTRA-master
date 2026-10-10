import requests

r = requests.post("http://localhost:8000/api/auth/login",
                  data={"username": "govt_officer", "password": "Govt1234"})
tok = r.json()["access_token"]
headers = {"Authorization": f"Bearer {tok}"}

risk = requests.get("http://localhost:8000/api/gov/risk-analysis", headers=headers).json()
print("SCORE:", risk["score"], "/100  BAND:", risk["score_band"])
print("Bids analysed:", risk["total_bids_analysed"], " Tenders:", risk["total_tenders_analysed"])
print()
for f in risk["findings"]:
    status = "ACTIVE" if not f["insufficient_data"] else "N/A   "
    print(f"[{status}] Rule {f['rule']} - {f['rule_name']}")
    if not f["insufficient_data"]:
        print(f"         tenders={f['tender_ids']}")
        print(f"         bidders={f['bidder_ids']}")
    print()

net = requests.get("http://localhost:8000/api/gov/bidder-network", headers=headers).json()
print(f"NETWORK: {net['total_bidders']} bidders, {net['total_edges']} edges")
print()
for n in sorted(net["nodes"], key=lambda x: -x["tender_count"])[:8]:
    print(f"  node: {n['bidder_id']:22s} tenders={n['tender_count']}")
print()
for e in sorted(net["edges"], key=lambda x: -x["shared_tender_count"])[:8]:
    print(f"  edge: {e['bidder_a']:18s} <-> {e['bidder_b']:18s} shared={e['shared_tender_count']}")
