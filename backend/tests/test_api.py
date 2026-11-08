from fastapi.testclient import TestClient
from app.main import app


def test_health_and_parse():
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        r = c.post("/parse", json={"text": "10 kilo ata 160 rupee kilo k hisab se"})
        assert r.status_code == 200
        item = r.json()["items"][0]
        assert item["product"] == "ata" and item["line_total"] == 1600.0


def test_empty_text_rejected():
    with TestClient(app) as c:
        assert c.post("/parse", json={"text": ""}).status_code == 422
