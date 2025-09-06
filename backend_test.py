#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Tic-Tac-Toe Game
Tests all game result endpoints with various scenarios
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://tictacplay.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class TicTacToeAPITester:
    def __init__(self):
        self.base_url = API_BASE
        self.test_results = []
        self.test_players = ["Alice", "Bob", "Charlie", "Diana"]
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_test("API Health Check", True, "API is accessible")
                return True
            else:
                self.log_test("API Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def create_sample_game(self, player_name="TestPlayer", game_mode="ai", difficulty="easy", 
                          winner="X", moves=None, duration=45):
        """Create a sample game result"""
        if moves is None:
            moves = [0, 4, 1, 3, 2]  # X wins with top row
            
        return {
            "player_name": player_name,
            "game_mode": game_mode,
            "difficulty": difficulty,
            "winner": winner,
            "moves": moves,
            "duration": duration
        }

    def test_save_game_result(self):
        """Test POST /api/games endpoint"""
        print("Testing POST /api/games - Save Game Results")
        
        # Test 1: Valid AI game (win)
        game_data = self.create_sample_game("Alice", "ai", "easy", "X", [0, 4, 1, 3, 2], 30)
        try:
            response = requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if "id" in result and result["player_name"] == "Alice":
                    self.log_test("Save AI Game (Win)", True, "Game saved successfully")
                else:
                    self.log_test("Save AI Game (Win)", False, "Invalid response structure", result)
            else:
                self.log_test("Save AI Game (Win)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Save AI Game (Win)", False, f"Request error: {str(e)}")

        # Test 2: Valid PvP game (loss)
        game_data = self.create_sample_game("Bob", "pvp", None, "O", [0, 1, 4, 2, 8, 3], 60)
        try:
            response = requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
            if response.status_code == 200:
                self.log_test("Save PvP Game (Loss)", True, "PvP game saved successfully")
            else:
                self.log_test("Save PvP Game (Loss)", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Save PvP Game (Loss)", False, f"Request error: {str(e)}")

        # Test 3: Draw game
        game_data = self.create_sample_game("Charlie", "ai", "medium", "draw", [0, 1, 2, 3, 5, 4, 6, 8, 7], 90)
        try:
            response = requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
            if response.status_code == 200:
                self.log_test("Save Draw Game", True, "Draw game saved successfully")
            else:
                self.log_test("Save Draw Game", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Save Draw Game", False, f"Request error: {str(e)}")

        # Test 4: Hard difficulty AI game
        game_data = self.create_sample_game("Diana", "ai", "hard", "O", [0, 4, 1, 5, 3, 6], 120)
        try:
            response = requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
            if response.status_code == 200:
                self.log_test("Save Hard AI Game", True, "Hard AI game saved successfully")
            else:
                self.log_test("Save Hard AI Game", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Save Hard AI Game", False, f"Request error: {str(e)}")

        # Test 5: Invalid data (missing required field)
        invalid_data = {"player_name": "Invalid", "game_mode": "ai"}  # Missing required fields
        try:
            response = requests.post(f"{self.base_url}/games", json=invalid_data, timeout=10)
            if response.status_code >= 400:
                self.log_test("Invalid Game Data Validation", True, "Properly rejected invalid data")
            else:
                self.log_test("Invalid Game Data Validation", False, "Should have rejected invalid data")
        except Exception as e:
            self.log_test("Invalid Game Data Validation", False, f"Request error: {str(e)}")

    def test_get_game_history(self):
        """Test GET /api/games endpoint"""
        print("Testing GET /api/games - Retrieve Game History")
        
        # Test 1: Get games for existing player
        try:
            response = requests.get(f"{self.base_url}/games?player_name=Alice", timeout=10)
            if response.status_code == 200:
                games = response.json()
                if isinstance(games, list):
                    self.log_test("Get Alice's Game History", True, f"Retrieved {len(games)} games")
                else:
                    self.log_test("Get Alice's Game History", False, "Response is not a list", games)
            else:
                self.log_test("Get Alice's Game History", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Alice's Game History", False, f"Request error: {str(e)}")

        # Test 2: Get games for non-existent player
        try:
            response = requests.get(f"{self.base_url}/games?player_name=NonExistentPlayer", timeout=10)
            if response.status_code == 200:
                games = response.json()
                if isinstance(games, list) and len(games) == 0:
                    self.log_test("Get Non-existent Player History", True, "Returned empty list for new player")
                else:
                    self.log_test("Get Non-existent Player History", False, "Should return empty list", games)
            else:
                self.log_test("Get Non-existent Player History", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Non-existent Player History", False, f"Request error: {str(e)}")

        # Test 3: Test limit parameter
        try:
            response = requests.get(f"{self.base_url}/games?player_name=Alice&limit=1", timeout=10)
            if response.status_code == 200:
                games = response.json()
                if isinstance(games, list) and len(games) <= 1:
                    self.log_test("Game History Limit Parameter", True, f"Limit respected, got {len(games)} games")
                else:
                    self.log_test("Game History Limit Parameter", False, "Limit not respected", games)
            else:
                self.log_test("Game History Limit Parameter", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Game History Limit Parameter", False, f"Request error: {str(e)}")

    def test_player_stats(self):
        """Test GET /api/stats/{player_name} endpoint"""
        print("Testing GET /api/stats/{player_name} - Player Statistics")
        
        # Test 1: Get stats for existing player
        try:
            response = requests.get(f"{self.base_url}/stats/Alice", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["player_name", "total_games", "wins", "losses", "draws", 
                                 "win_rate", "favorite_mode", "average_game_duration", "total_play_time"]
                if all(field in stats for field in required_fields):
                    self.log_test("Get Alice's Stats", True, f"Stats: {stats['total_games']} games, {stats['win_rate']}% win rate")
                else:
                    self.log_test("Get Alice's Stats", False, "Missing required fields in stats", stats)
            else:
                self.log_test("Get Alice's Stats", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Alice's Stats", False, f"Request error: {str(e)}")

        # Test 2: Get stats for new player (should return default stats)
        try:
            response = requests.get(f"{self.base_url}/stats/NewPlayer", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                if stats["total_games"] == 0 and stats["win_rate"] == 0.0:
                    self.log_test("Get New Player Stats", True, "Returned default stats for new player")
                else:
                    self.log_test("Get New Player Stats", False, "Should return zero stats for new player", stats)
            else:
                self.log_test("Get New Player Stats", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get New Player Stats", False, f"Request error: {str(e)}")

    def test_leaderboard(self):
        """Test GET /api/leaderboard endpoint"""
        print("Testing GET /api/leaderboard - Top Players Ranking")
        
        # Test 1: Get default leaderboard
        try:
            response = requests.get(f"{self.base_url}/leaderboard", timeout=10)
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list):
                    self.log_test("Get Leaderboard", True, f"Retrieved leaderboard with {len(leaderboard)} players")
                    
                    # Verify leaderboard is sorted by win rate
                    if len(leaderboard) > 1:
                        is_sorted = all(leaderboard[i]["win_rate"] >= leaderboard[i+1]["win_rate"] 
                                      for i in range(len(leaderboard)-1))
                        if is_sorted:
                            self.log_test("Leaderboard Sorting", True, "Leaderboard properly sorted by win rate")
                        else:
                            self.log_test("Leaderboard Sorting", False, "Leaderboard not sorted correctly")
                else:
                    self.log_test("Get Leaderboard", False, "Response is not a list", leaderboard)
            else:
                self.log_test("Get Leaderboard", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Get Leaderboard", False, f"Request error: {str(e)}")

        # Test 2: Test limit parameter
        try:
            response = requests.get(f"{self.base_url}/leaderboard?limit=2", timeout=10)
            if response.status_code == 200:
                leaderboard = response.json()
                if isinstance(leaderboard, list) and len(leaderboard) <= 2:
                    self.log_test("Leaderboard Limit Parameter", True, f"Limit respected, got {len(leaderboard)} players")
                else:
                    self.log_test("Leaderboard Limit Parameter", False, "Limit not respected", leaderboard)
            else:
                self.log_test("Leaderboard Limit Parameter", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Leaderboard Limit Parameter", False, f"Request error: {str(e)}")

    def test_clear_player_history(self):
        """Test DELETE /api/games/{player_name} endpoint"""
        print("Testing DELETE /api/games/{player_name} - Clear Player History")
        
        # First, create a test player with some games
        test_player = "TestDeletePlayer"
        
        # Create a few games for the test player
        for i in range(3):
            game_data = self.create_sample_game(test_player, "ai", "easy", "X", [0, 4, 1, 3, 2], 30 + i*10)
            try:
                requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
            except:
                pass  # Ignore errors in setup
        
        # Wait a moment for data to be saved
        time.sleep(1)
        
        # Test 1: Clear existing player's history
        try:
            response = requests.delete(f"{self.base_url}/games/{test_player}", timeout=10)
            if response.status_code == 200:
                result = response.json()
                if "message" in result and "Deleted" in result["message"]:
                    self.log_test("Clear Player History", True, f"Successfully cleared history: {result['message']}")
                else:
                    self.log_test("Clear Player History", False, "Invalid response format", result)
            else:
                self.log_test("Clear Player History", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Clear Player History", False, f"Request error: {str(e)}")

        # Test 2: Verify history is cleared
        try:
            response = requests.get(f"{self.base_url}/games?player_name={test_player}", timeout=10)
            if response.status_code == 200:
                games = response.json()
                if isinstance(games, list) and len(games) == 0:
                    self.log_test("Verify History Cleared", True, "Player history successfully cleared")
                else:
                    self.log_test("Verify History Cleared", False, f"History not cleared, found {len(games)} games")
            else:
                self.log_test("Verify History Cleared", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Verify History Cleared", False, f"Request error: {str(e)}")

        # Test 3: Clear non-existent player (should not error)
        try:
            response = requests.delete(f"{self.base_url}/games/NonExistentPlayer", timeout=10)
            if response.status_code == 200:
                result = response.json()
                self.log_test("Clear Non-existent Player", True, f"Handled gracefully: {result['message']}")
            else:
                self.log_test("Clear Non-existent Player", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Clear Non-existent Player", False, f"Request error: {str(e)}")

    def create_comprehensive_test_data(self):
        """Create comprehensive test data for various scenarios"""
        print("Creating comprehensive test data...")
        
        test_scenarios = [
            # Alice - AI games with different difficulties and outcomes
            {"player": "Alice", "mode": "ai", "difficulty": "easy", "winner": "X", "moves": [0, 4, 1, 3, 2], "duration": 25},
            {"player": "Alice", "mode": "ai", "difficulty": "medium", "winner": "O", "moves": [0, 4, 1, 5, 3, 6], "duration": 45},
            {"player": "Alice", "mode": "ai", "difficulty": "hard", "winner": "draw", "moves": [0, 1, 2, 3, 5, 4, 6, 8, 7], "duration": 90},
            {"player": "Alice", "mode": "ai", "difficulty": "easy", "winner": "X", "moves": [4, 0, 5, 1, 6, 2], "duration": 30},
            
            # Bob - Mix of AI and PvP games
            {"player": "Bob", "mode": "pvp", "difficulty": None, "winner": "X", "moves": [0, 1, 4, 2, 8], "duration": 60},
            {"player": "Bob", "mode": "pvp", "difficulty": None, "winner": "O", "moves": [0, 4, 1, 5, 2, 6], "duration": 75},
            {"player": "Bob", "mode": "ai", "difficulty": "medium", "winner": "X", "moves": [4, 0, 5, 1, 6, 2], "duration": 40},
            {"player": "Bob", "mode": "ai", "difficulty": "hard", "winner": "O", "moves": [0, 4, 1, 5, 3, 6], "duration": 85},
            
            # Charlie - Mostly PvP games
            {"player": "Charlie", "mode": "pvp", "difficulty": None, "winner": "X", "moves": [0, 1, 4, 2, 8], "duration": 50},
            {"player": "Charlie", "mode": "pvp", "difficulty": None, "winner": "X", "moves": [4, 0, 5, 1, 6, 2], "duration": 65},
            {"player": "Charlie", "mode": "pvp", "difficulty": None, "winner": "draw", "moves": [0, 1, 2, 3, 5, 4, 6, 8, 7], "duration": 120},
            
            # Diana - High win rate player
            {"player": "Diana", "mode": "ai", "difficulty": "easy", "winner": "X", "moves": [0, 4, 1, 3, 2], "duration": 20},
            {"player": "Diana", "mode": "ai", "difficulty": "medium", "winner": "X", "moves": [4, 0, 5, 1, 6, 2], "duration": 35},
            {"player": "Diana", "mode": "ai", "difficulty": "hard", "winner": "X", "moves": [0, 1, 4, 2, 8], "duration": 55},
            {"player": "Diana", "mode": "pvp", "difficulty": None, "winner": "X", "moves": [4, 0, 5, 1, 6, 2], "duration": 45},
            {"player": "Diana", "mode": "ai", "difficulty": "medium", "winner": "O", "moves": [0, 4, 1, 5, 3, 6], "duration": 40},
        ]
        
        created_count = 0
        for scenario in test_scenarios:
            game_data = self.create_sample_game(
                scenario["player"], 
                scenario["mode"], 
                scenario["difficulty"], 
                scenario["winner"], 
                scenario["moves"], 
                scenario["duration"]
            )
            try:
                response = requests.post(f"{self.base_url}/games", json=game_data, timeout=10)
                if response.status_code == 200:
                    created_count += 1
            except:
                pass  # Continue with other scenarios
        
        print(f"Created {created_count}/{len(test_scenarios)} test games")
        time.sleep(2)  # Wait for data to be processed

    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("TIC-TAC-TOE BACKEND API COMPREHENSIVE TESTING")
        print("=" * 60)
        print()
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Create comprehensive test data
        self.create_comprehensive_test_data()
        
        # Run all endpoint tests
        self.test_save_game_result()
        self.test_get_game_history()
        self.test_player_stats()
        self.test_leaderboard()
        self.test_clear_player_history()
        
        # Print summary
        self.print_summary()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['message']}")
            print()
        
        print("DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["message"]:
                print(f"   {result['message']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = TicTacToeAPITester()
    tester.run_all_tests()