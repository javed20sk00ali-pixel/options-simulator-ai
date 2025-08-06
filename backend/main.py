from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import json
import math

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Options Strategy Backend is Running ✅"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load mock option chain
with open("data/option_chain.json") as f:
    OPTION_CHAIN = json.load(f)

class Leg(BaseModel):
    symbol: str
    strike_price: float
    option_type: str  # "call" or "put"
    side: str  # "buy" or "sell"
    quantity: int
    premium: float

class StrategyRequest(BaseModel):
    legs: List[Leg]
    spot_price: float

@app.get("/options")
def get_option_chain():
    return OPTION_CHAIN

@app.post("/strategy/simulate")
def simulate_strategy(request: StrategyRequest):
    legs = request.legs
    spot = request.spot_price
    max_profit = -math.inf
    max_loss = math.inf

    payoff_data = []
    price_range = range(int(spot * 0.5), int(spot * 1.5), 100)

    for price in price_range:
        pnl = 0
        for leg in legs:
            if leg.option_type == "call":
                intrinsic = max(price - leg.strike_price, 0)
            else:
                intrinsic = max(leg.strike_price - price, 0)

            leg_pnl = (intrinsic - leg.premium) * leg.quantity if leg.side == "buy" else (leg.premium - intrinsic) * leg.quantity
            pnl += leg_pnl
        payoff_data.append({"price": price, "pnl": pnl})
        max_profit = max(max_profit, pnl)
        max_loss = min(max_loss, pnl)

    return {
        "total_premium": sum([(leg.premium * leg.quantity) * (1 if leg.side == 'buy' else -1) for leg in legs]),
        "max_profit": max_profit,
        "max_loss": max_loss,
        "payoff": payoff_data
    }

@app.post("/strategy/adjust")
def ai_adjust_strategy(request: StrategyRequest):
    adjustment = []
    for leg in request.legs:
        if leg.side == "sell" and leg.option_type == "put":
            adjustment.append(f"Consider buying lower strike Put to hedge {leg.strike_price}P")
        elif leg.side == "sell" and leg.option_type == "call":
            adjustment.append(f"Consider buying higher strike Call to cap risk on {leg.strike_price}C")
    return {"suggestions": adjustment}


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

