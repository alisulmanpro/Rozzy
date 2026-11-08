"""Rozzy backend (v0): one job — turn a shopkeeper sentence into JSON items.

Run:  uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
import os
import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from rozzy_nlu import load_model, predict

DEFAULT_MODEL = pathlib.Path(__file__).resolve().parents[2] / "nlu" / "models" / "rozzy_nlu_model.joblib"
MODEL_PATH = pathlib.Path(os.getenv("ROZZY_MODEL", DEFAULT_MODEL))
_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model not found: {MODEL_PATH}. Run `python nlu/scripts/train.py` first.")
    _state["model"] = load_model(MODEL_PATH)
    yield
    _state.clear()


app = FastAPI(title="Rozzy API", version="0.1.0", lifespan=lifespan)


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000, examples=["do kilo ata 40 rupee, or chawal 40 rupe"])


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH.name}


@app.post("/parse")
def parse(req: ParseRequest):
    """Sentence -> items (product, qty, unit, price, price_type, price_per, unit_price, line_total, needs_review)."""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text is empty")
    return predict(_state["model"], text)
