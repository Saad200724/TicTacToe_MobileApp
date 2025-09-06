import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ImageBackground,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface PlayerStats {
  player_name: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  favorite_mode: string;
  average_game_duration: number;
  total_play_time: number;
}

interface GameResult {
  id: string;
  player_name: string;
  game_mode: string;
  difficulty?: string;
  winner: string;
  moves: number[];
  duration: number;
  timestamp: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'leaderboard'>('stats');

  useEffect(() => {
    fetchPlayerStats();
    fetchGameHistory();
    fetchLeaderboard();
  }, []);

  const fetchPlayerStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats/Player`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/games?player_name=Player&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setGameHistory(data);
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    Alert.alert(
      'Clear History?',
      'This will delete all your game history and statistics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/games/Player`, {
                method: 'DELETE',
              });
              if (response.ok) {
                setStats(null);
                setGameHistory([]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Success', 'Game history cleared successfully!');
                fetchPlayerStats();
                fetchGameHistory();
                fetchLeaderboard();
              }
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getResultEmoji = (winner: string, gameMode: string): string => {
    if (winner === 'X') return '🏆'; // Player wins
    if (winner === 'O' && gameMode === 'ai') return '🤖'; // AI wins
    if (winner === 'O' && gameMode === 'pvp') return '🎯'; // Player 2 wins
    return '🤝'; // Draw
  };

  const TabButton = ({ title, isActive, onPress }: any) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1578364249730-0c4ee16426fa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxnYW1pbmclMjBiYWNrZ3JvdW5kfGVufDB8fHxibGFja3wxNzU3MTQyNjgyfDA&ixlib=rb-4.1.0&q=85' }}
          style={styles.backgroundImage}
          blurRadius={2}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          >
            <Text style={styles.loadingText}>Loading Statistics...</Text>
          </LinearGradient>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1578364249730-0c4ee16426fa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxnYW1pbmclMjBiYWNrZ3JvdW5kfGVufDB8fHxibGFja3wxNzU3MTQyNjgyfDA&ixlib=rb-4.1.0&q=85' }}
        style={styles.backgroundImage}
        blurRadius={2}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.title}>STATISTICS</Text>
            <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TabButton
              title="STATS"
              isActive={activeTab === 'stats'}
              onPress={() => setActiveTab('stats')}
            />
            <TabButton
              title="HISTORY"
              isActive={activeTab === 'history'}
              onPress={() => setActiveTab('history')}
            />
            <TabButton
              title="LEADERBOARD"
              isActive={activeTab === 'leaderboard'}
              onPress={() => setActiveTab('leaderboard')}
            />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'stats' && (
              <View style={styles.statsContainer}>
                {stats && stats.total_games > 0 ? (
                  <>
                    <View style={styles.statCard}>
                      <LinearGradient
                        colors={['rgba(102, 126, 234, 0.3)', 'rgba(118, 75, 162, 0.3)']}
                        style={styles.statCardGradient}
                      >
                        <Text style={styles.statNumber}>{stats.total_games}</Text>
                        <Text style={styles.statLabel}>Total Games</Text>
                      </LinearGradient>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statCard}>
                        <LinearGradient
                          colors={['rgba(76, 175, 80, 0.3)', 'rgba(56, 142, 60, 0.3)']}
                          style={styles.statCardGradient}
                        >
                          <Text style={styles.statNumber}>{stats.wins}</Text>
                          <Text style={styles.statLabel}>Wins</Text>
                        </LinearGradient>
                      </View>

                      <View style={styles.statCard}>
                        <LinearGradient
                          colors={['rgba(244, 67, 54, 0.3)', 'rgba(211, 47, 47, 0.3)']}
                          style={styles.statCardGradient}
                        >
                          <Text style={styles.statNumber}>{stats.losses}</Text>
                          <Text style={styles.statLabel}>Losses</Text>
                        </LinearGradient>
                      </View>

                      <View style={styles.statCard}>
                        <LinearGradient
                          colors={['rgba(255, 193, 7, 0.3)', 'rgba(255, 160, 0, 0.3)']}
                          style={styles.statCardGradient}
                        >
                          <Text style={styles.statNumber}>{stats.draws}</Text>
                          <Text style={styles.statLabel}>Draws</Text>
                        </LinearGradient>
                      </View>
                    </View>

                    <View style={styles.statCard}>
                      <LinearGradient
                        colors={['rgba(156, 39, 176, 0.3)', 'rgba(123, 31, 162, 0.3)']}
                        style={styles.statCardGradient}
                      >
                        <Text style={styles.statNumber}>{stats.win_rate}%</Text>
                        <Text style={styles.statLabel}>Win Rate</Text>
                      </LinearGradient>
                    </View>

                    <View style={styles.additionalStats}>
                      <Text style={styles.additionalStatText}>
                        🎮 Favorite Mode: {stats.favorite_mode.toUpperCase()}
                      </Text>
                      <Text style={styles.additionalStatText}>
                        ⏱️ Average Game: {formatDuration(Math.round(stats.average_game_duration))}
                      </Text>
                      <Text style={styles.additionalStatText}>
                        🕒 Total Play Time: {formatDuration(stats.total_play_time)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>🎮</Text>
                    <Text style={styles.emptyStateTitle}>No Games Yet</Text>
                    <Text style={styles.emptyStateSubtitle}>Play some games to see your statistics!</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'history' && (
              <View style={styles.historyContainer}>
                {gameHistory.length > 0 ? (
                  gameHistory.map((game, index) => (
                    <View key={game.id} style={styles.historyCard}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.historyCardGradient}
                      >
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyEmoji}>
                            {getResultEmoji(game.winner, game.game_mode)}
                          </Text>
                          <View style={styles.historyInfo}>
                            <Text style={styles.historyMode}>
                              {game.game_mode === 'ai' ? `VS AI${game.difficulty ? ` (${game.difficulty})` : ''}` : 'TWO PLAYERS'}
                            </Text>
                            <Text style={styles.historyDate}>
                              {formatDate(game.timestamp)}
                            </Text>
                          </View>
                          <View style={styles.historyResult}>
                            <Text style={[
                              styles.historyWinner,
                              game.winner === 'X' ? styles.winText :
                              game.winner === 'draw' ? styles.drawText : styles.loseText
                            ]}>
                              {game.winner === 'X' ? 'WIN' :
                               game.winner === 'draw' ? 'DRAW' : 'LOSE'}
                            </Text>
                            <Text style={styles.historyDuration}>
                              {formatDuration(game.duration)}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>📊</Text>
                    <Text style={styles.emptyStateTitle}>No Game History</Text>
                    <Text style={styles.emptyStateSubtitle}>Your recent games will appear here!</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'leaderboard' && (
              <View style={styles.leaderboardContainer}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((player, index) => (
                    <View key={player.player_name} style={styles.leaderboardCard}>
                      <LinearGradient
                        colors={index === 0 ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 193, 7, 0.2)'] :
                               index === 1 ? ['rgba(192, 192, 192, 0.3)', 'rgba(158, 158, 158, 0.2)'] :
                               index === 2 ? ['rgba(205, 127, 50, 0.3)', 'rgba(184, 115, 51, 0.2)'] :
                               ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.leaderboardCardGradient}
                      >
                        <View style={styles.leaderboardHeader}>
                          <Text style={styles.leaderboardRank}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </Text>
                          <View style={styles.leaderboardInfo}>
                            <Text style={styles.leaderboardName}>{player.player_name}</Text>
                            <Text style={styles.leaderboardMode}>
                              {player.favorite_mode.toUpperCase()} • {player.total_games} games
                            </Text>
                          </View>
                          <View style={styles.leaderboardStats}>
                            <Text style={styles.leaderboardWinRate}>{player.win_rate}%</Text>
                            <Text style={styles.leaderboardWins}>{player.wins}W</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>🏆</Text>
                    <Text style={styles.emptyStateTitle}>No Leaderboard Data</Text>
                    <Text style={styles.emptyStateSubtitle}>Play more games to see rankings!</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: 10,
  },
  clearButtonText: {
    color: '#f5576c',
    fontSize: 16,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabButtonText: {
    color: '#bbb',
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  statsContainer: {
    gap: 16,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  additionalStats: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  additionalStatText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#bbb',
    fontSize: 16,
    textAlign: 'center',
  },
  historyContainer: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyCardGradient: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyMode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    color: '#bbb',
    fontSize: 12,
  },
  historyResult: {
    alignItems: 'flex-end',
  },
  historyWinner: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  winText: {
    color: '#4caf50',
  },
  loseText: {
    color: '#f44336',
  },
  drawText: {
    color: '#ff9800',
  },
  historyDuration: {
    color: '#bbb',
    fontSize: 12,
  },
  leaderboardContainer: {
    gap: 12,
  },
  leaderboardCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  leaderboardCardGradient: {
    padding: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardRank: {
    fontSize: 24,
    marginRight: 16,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaderboardMode: {
    color: '#bbb',
    fontSize: 12,
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  leaderboardWinRate: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaderboardWins: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
});