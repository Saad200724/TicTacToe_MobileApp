from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Game Models
class GameResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_name: str = "Player"
    game_mode: str  # "ai" or "pvp"
    difficulty: Optional[str] = None  # for AI games
    winner: str  # "X", "O", or "draw"
    moves: List[int]  # sequence of moves made
    duration: int  # game duration in seconds
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GameResultCreate(BaseModel):
    player_name: str = "Player"
    game_mode: str
    difficulty: Optional[str] = None
    winner: str
    moves: List[int]
    duration: int

class PlayerStats(BaseModel):
    player_name: str
    total_games: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    favorite_mode: str
    average_game_duration: float
    total_play_time: int

class GameHistory(BaseModel):
    games: List[GameResult]
    total_games: int
    stats: PlayerStats

# Routes
@api_router.get("/")
async def root():
    return {"message": "Tic Tac Toe API is running!"}

@api_router.post("/games", response_model=GameResult)
async def save_game_result(game_data: GameResultCreate):
    """Save a completed game result"""
    try:
        game_dict = game_data.dict()
        game_obj = GameResult(**game_dict)
        
        # Insert into database
        result = await db.game_results.insert_one(game_obj.dict())
        
        if result.inserted_id:
            return game_obj
        else:
            raise HTTPException(status_code=500, detail="Failed to save game result")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving game: {str(e)}")

@api_router.get("/games", response_model=List[GameResult])
async def get_game_history(player_name: str = "Player", limit: int = 20):
    """Get game history for a player"""
    try:
        games = await db.game_results.find(
            {"player_name": player_name}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return [GameResult(**game) for game in games]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching games: {str(e)}")

@api_router.get("/stats/{player_name}", response_model=PlayerStats)
async def get_player_stats(player_name: str):
    """Get comprehensive statistics for a player"""
    try:
        # Aggregate statistics
        pipeline = [
            {"$match": {"player_name": player_name}},
            {"$group": {
                "_id": None,
                "total_games": {"$sum": 1},
                "wins": {"$sum": {"$cond": [{"$eq": ["$winner", "X"]}, 1, 0]}},
                "losses": {"$sum": {"$cond": [{"$eq": ["$winner", "O"]}, 1, 0]}},
                "draws": {"$sum": {"$cond": [{"$eq": ["$winner", "draw"]}, 1, 0]}},
                "total_duration": {"$sum": "$duration"},
                "game_modes": {"$push": "$game_mode"}
            }}
        ]
        
        result = await db.game_results.aggregate(pipeline).to_list(1)
        
        if not result:
            # Return default stats for new player
            return PlayerStats(
                player_name=player_name,
                total_games=0,
                wins=0,
                losses=0,
                draws=0,
                win_rate=0.0,
                favorite_mode="ai",
                average_game_duration=0.0,
                total_play_time=0
            )
        
        stats = result[0]
        total_games = stats["total_games"]
        wins = stats["wins"]
        
        # Calculate win rate
        win_rate = (wins / total_games * 100) if total_games > 0 else 0.0
        
        # Find favorite game mode
        game_modes = stats["game_modes"]
        favorite_mode = max(set(game_modes), key=game_modes.count) if game_modes else "ai"
        
        # Calculate average game duration
        total_duration = stats["total_duration"]
        average_duration = total_duration / total_games if total_games > 0 else 0.0
        
        return PlayerStats(
            player_name=player_name,
            total_games=total_games,
            wins=wins,
            losses=stats["losses"],
            draws=stats["draws"],
            win_rate=round(win_rate, 1),
            favorite_mode=favorite_mode,
            average_game_duration=round(average_duration, 1),
            total_play_time=total_duration
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@api_router.get("/leaderboard", response_model=List[PlayerStats])
async def get_leaderboard(limit: int = 10):
    """Get top players leaderboard"""
    try:
        pipeline = [
            {"$group": {
                "_id": "$player_name",
                "total_games": {"$sum": 1},
                "wins": {"$sum": {"$cond": [{"$eq": ["$winner", "X"]}, 1, 0]}},
                "losses": {"$sum": {"$cond": [{"$eq": ["$winner", "O"]}, 1, 0]}},
                "draws": {"$sum": {"$cond": [{"$eq": ["$winner", "draw"]}, 1, 0]}},
                "total_duration": {"$sum": "$duration"},
                "game_modes": {"$push": "$game_mode"}
            }},
            {"$addFields": {
                "win_rate": {
                    "$cond": [
                        {"$gt": ["$total_games", 0]},
                        {"$multiply": [{"$divide": ["$wins", "$total_games"]}, 100]},
                        0
                    ]
                }
            }},
            {"$match": {"total_games": {"$gte": 3}}},  # Minimum 3 games to appear on leaderboard
            {"$sort": {"win_rate": -1, "total_games": -1}},
            {"$limit": limit}
        ]
        
        results = await db.game_results.aggregate(pipeline).to_list(limit)
        
        leaderboard = []
        for result in results:
            game_modes = result["game_modes"]
            favorite_mode = max(set(game_modes), key=game_modes.count) if game_modes else "ai"
            average_duration = result["total_duration"] / result["total_games"]
            
            leaderboard.append(PlayerStats(
                player_name=result["_id"],
                total_games=result["total_games"],
                wins=result["wins"],
                losses=result["losses"],
                draws=result["draws"],
                win_rate=round(result["win_rate"], 1),
                favorite_mode=favorite_mode,
                average_game_duration=round(average_duration, 1),
                total_play_time=result["total_duration"]
            ))
        
        return leaderboard
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leaderboard: {str(e)}")

@api_router.delete("/games/{player_name}")
async def clear_player_history(player_name: str):
    """Clear all game history for a player"""
    try:
        result = await db.game_results.delete_many({"player_name": player_name})
        return {"message": f"Deleted {result.deleted_count} games for {player_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing history: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()