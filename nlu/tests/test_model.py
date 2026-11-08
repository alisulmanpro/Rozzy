import pathlib
import pytest
from rozzy_nlu import load_model, predict

MODEL = pathlib.Path(__file__).resolve().parents[1] / "models" / "rozzy_nlu_model.joblib"
pytestmark = pytest.mark.skipif(not MODEL.exists(), reason="model file missing: run scripts/train.py")


@pytest.fixture(scope="module")
def model():
    return load_model(MODEL)


def test_basic_urdu(model):
    r = predict(model, "do kilo ata 40 rupee, or chawal 40 rupe")
    a, c = r["items"]
    assert (a["product"], a["qty"], a["unit"], a["price"]) == ("ata", 2, "kg", 40)
    assert (c["product"], c["qty"], c["price"]) == ("chawal", None, 40)


def test_dozen_rate(model):
    it = predict(model, "2 ande 120 rupe dargen k hisab se")["items"][0]
    assert it["product"] == "anday" and it["line_total"] == 20.0


def test_punjabi_fraction_rate(model):
    it = predict(model, "sawa kilo chai patti 600 rupaye kilo de hisab naal")["items"][0]
    assert it["product"] == "chai" and it["qty"] == 1.25 and it["line_total"] == 750.0


def test_unknown_product_is_flagged(model):
    r = predict(model, "50 rupee ki ilachi")
    assert r["needs_review"] is True and r["items"][0]["product"] == "unknown"
