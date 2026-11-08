from rozzy_nlu.vocab import parse_number, tokenize, add_calculations


def test_parse_number():
    assert parse_number(["do", "sau", "pachas"]) == 250
    assert parse_number(["dedh"]) == 1.5
    assert parse_number(["2.5"]) == 2.5
    assert parse_number(["ik", "sau", "vee"]) == 120
    assert parse_number(["xyz"]) is None


def test_tokenize_splits_comma():
    assert tokenize("ata 40, chawal 50") == ["ata", "40", ",", "chawal", "50"]


def _item(**k):
    base = dict(product="ata", qty=None, unit=None, price=None, price_type=None, price_per=None, needs_review=False)
    base.update(k)
    return base


def test_dozen_rate():  # "2 ande 120 rupe dargen k hisab se"
    r = add_calculations(_item(product="anday", qty=2, unit="piece", price=120, price_type="per_unit", price_per="dozen"))
    assert r["unit_price"] == {"value": 10.0, "per": "piece"} and r["line_total"] == 20.0


def test_kilo_rate():   # "10 kilo ata 160 rupee kilo k hisab se"
    r = add_calculations(_item(qty=10, unit="kg", price=160, price_type="per_unit", price_per="kg"))
    assert r["line_total"] == 1600.0


def test_pao_and_sawa():  # 1.25 kg at 600/kg = 750
    r = add_calculations(_item(qty=1.25, unit="kg", price=600, price_type="per_unit", price_per="kg"))
    assert r["line_total"] == 750.0
    r = add_calculations(_item(qty=2, unit="pao", price=400, price_type="per_unit", price_per="kg"))
    assert r["qty_base"]["value"] == 0.5 and r["line_total"] == 200.0


def test_total_price():  # "50 rupee ki ilachi"
    r = add_calculations(_item(price=50, price_type="total"))
    assert r["line_total"] == 50.0 and r["qty_base"] is None
