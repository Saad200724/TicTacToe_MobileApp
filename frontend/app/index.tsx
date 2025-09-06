import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

type Player = 'X' | 'O' | null;
type GameMode = 'menu' | 'pvp' | 'ai';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameStats {
  playerWins: number;
  aiWins: number;
  draws: number;
}

export default function TicTacToeGame() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [stats, setStats] = useState<GameStats>({ playerWins: 0, aiWins: 0, draws: 0 });
  const [gameCount, setGameCount] = useState(0);

  // Animation values
  const scaleValues = Array.from({ length: 9 }, () => useSharedValue(1));
  const boardScale = useSharedValue(0);
  const menuOpacity = useSharedValue(1);

  useEffect(() => {
    if (gameMode !== 'menu') {
      boardScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      menuOpacity.value = withTiming(0, { duration: 300 });
    } else {
      boardScale.value = withTiming(0, { duration: 300 });
      menuOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [gameMode]);

  const checkWinner = (board: Player[]): Player | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    if (board.every(cell => cell !== null)) {
      return 'draw';
    }

    return null;
  };

  const getAIMove = (board: Player[], difficulty: Difficulty): number => {
    const emptyCells = board.map((cell, index) => cell === null ? index : null).filter(val => val !== null) as number[];
    
    if (difficulty === 'easy') {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    // Check for winning move
    for (let cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'O';
      if (checkWinner(testBoard) === 'O') {
        return cell;
      }
    }

    // Check for blocking move
    for (let cell of emptyCells) {
      const testBoard = [...board];
      testBoard[cell] = 'X';
      if (checkWinner(testBoard) === 'X') {
        return cell;
      }
    }

    if (difficulty === 'medium') {
      // Take center if available
      if (board[4] === null) return 4;
      // Take corners
      const corners = [0, 2, 6, 8].filter(i => board[i] === null);
      if (corners.length > 0) {
        return corners[Math.floor(Math.random() * corners.length)];
      }
    }

    if (difficulty === 'hard') {
      // Minimax algorithm for hard difficulty
      const minimax = (board: Player[], depth: number, isMaximizing: boolean): number => {
        const result = checkWinner(board);
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        if (result === 'draw') return 0;

        if (isMaximizing) {
          let bestScore = -Infinity;
          for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
              board[i] = 'O';
              const score = minimax(board, depth + 1, false);
              board[i] = null;
              bestScore = Math.max(score, bestScore);
            }
          }
          return bestScore;
        } else {
          let bestScore = Infinity;
          for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
              board[i] = 'X';
              const score = minimax(board, depth + 1, true);
              board[i] = null;
              bestScore = Math.min(score, bestScore);
            }
          }
          return bestScore;
        }
      };

      let bestScore = -Infinity;
      let bestMove = emptyCells[0];
      for (let cell of emptyCells) {
        const testBoard = [...board];
        testBoard[cell] = 'O';
        const score = minimax(testBoard, 0, false);
        if (score > bestScore) {
          bestScore = score;
          bestMove = cell;
        }
      }
      return bestMove;
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  };

  const handleCellPress = (index: number) => {
    if (board[index] || winner) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scaleValues[index].value = withSpring(0.8, { damping: 8, stiffness: 200 }, () => {
      scaleValues[index].value = withSpring(1, { damping: 8, stiffness: 200 });
    });

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      updateStats(gameWinner);
      setTimeout(() => {
        Haptics.impactAsync(gameWinner === 'draw' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
      }, 100);
      return;
    }

    if (gameMode === 'ai' && currentPlayer === 'X') {
      setCurrentPlayer('O');
      setTimeout(() => {
        const aiMove = getAIMove(newBoard, difficulty);
        const aiBoard = [...newBoard];
        aiBoard[aiMove] = 'O';
        setBoard(aiBoard);
        
        scaleValues[aiMove].value = withSpring(0.8, { damping: 8, stiffness: 200 }, () => {
          scaleValues[aiMove].value = withSpring(1, { damping: 8, stiffness: 200 });
        });

        const aiWinner = checkWinner(aiBoard);
        if (aiWinner) {
          setWinner(aiWinner);
          updateStats(aiWinner);
          setTimeout(() => {
            Haptics.impactAsync(aiWinner === 'draw' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
          }, 100);
        } else {
          setCurrentPlayer('X');
        }
      }, 500);
    } else if (gameMode === 'pvp') {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const updateStats = (winner: Player | 'draw') => {
    setStats(prev => ({
      ...prev,
      playerWins: winner === 'X' ? prev.playerWins + 1 : prev.playerWins,
      aiWins: winner === 'O' && gameMode === 'ai' ? prev.aiWins + 1 : prev.aiWins,
      draws: winner === 'draw' ? prev.draws + 1 : prev.draws,
    }));
    setGameCount(prev => prev + 1);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    scaleValues.forEach(val => val.value = 1);
  };

  const goToMenu = () => {
    resetGame();
    setGameMode('menu');
  };

  const startGame = (mode: GameMode, diff?: Difficulty) => {
    resetGame();
    setGameMode(mode);
    if (diff) setDifficulty(diff);
  };

  const MenuButton = ({ title, onPress, gradient, style = {} }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.menuButton, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.menuButtonGradient}
      >
        <Text style={styles.menuButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }],
    opacity: boardScale.value,
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
  }));

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
          {gameMode === 'menu' ? (
            <Animated.View style={[styles.menuContainer, menuAnimatedStyle]}>
              <Text style={styles.title}>TIC TAC TOE</Text>
              <Text style={styles.subtitle}>Ultimate Mobile Edition</Text>
              
              <View style={styles.menuButtons}>
                <MenuButton
                  title="🤖 VS AI"
                  gradient={['#667eea', '#764ba2']}
                  onPress={() => startGame('ai')}
                />
                <MenuButton
                  title="👫 TWO PLAYERS"
                  gradient={['#f093fb', '#f5576c']}
                  onPress={() => startGame('pvp')}
                />
              </View>

              {gameCount > 0 && (
                <View style={styles.statsContainer}>
                  <Text style={styles.statsTitle}>STATISTICS</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statText}>Wins: {stats.playerWins}</Text>
                    <Text style={styles.statText}>Losses: {stats.aiWins}</Text>
                    <Text style={styles.statText}>Draws: {stats.draws}</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          ) : (
            <Animated.View style={[styles.gameContainer, boardAnimatedStyle]}>
              <View style={styles.gameHeader}>
                <TouchableOpacity onPress={goToMenu} style={styles.backButton}>
                  <Text style={styles.backButtonText}>← MENU</Text>
                </TouchableOpacity>
                <Text style={styles.gameTitle}>
                  {gameMode === 'ai' ? `VS AI (${difficulty.toUpperCase()})` : 'TWO PLAYERS'}
                </Text>
              </View>

              <View style={styles.currentPlayerContainer}>
                <Text style={styles.currentPlayerText}>
                  {winner ? (
                    winner === 'draw' ? '🤝 DRAW!' : `🎉 ${winner} WINS!`
                  ) : (
                    `${currentPlayer}'s Turn`
                  )}
                </Text>
              </View>

              <View style={styles.board}>
                {board.map((cell, index) => {
                  const animatedStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: scaleValues[index].value }],
                  }));

                  return (
                    <Animated.View key={index} style={animatedStyle}>
                      <TouchableOpacity
                        style={[
                          styles.cell,
                          cell === 'X' ? styles.cellX : cell === 'O' ? styles.cellO : styles.cellEmpty
                        ]}
                        onPress={() => handleCellPress(index)}
                        disabled={!!cell || !!winner}
                      >
                        <Text style={[
                          styles.cellText,
                          cell === 'X' ? styles.textX : styles.textO
                        ]}>
                          {cell}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>

              <View style={styles.gameControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={resetGame}
                >
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.controlButtonGradient}
                  >
                    <Text style={styles.controlButtonText}>🔄 NEW GAME</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {gameMode === 'ai' && (
                  <View style={styles.difficultySelector}>
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.difficultyButton,
                          difficulty === diff && styles.difficultyButtonActive
                        ]}
                        onPress={() => setDifficulty(diff)}
                      >
                        <Text style={[
                          styles.difficultyButtonText,
                          difficulty === diff && styles.difficultyButtonTextActive
                        ]}>
                          {diff.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  menuButtons: {
    width: '100%',
    maxWidth: 300,
    gap: 20,
  },
  menuButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    width: '100%',
    maxWidth: 300,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  gameTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  currentPlayerContainer: {
    marginBottom: 30,
  },
  currentPlayerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: Math.min(width - 40, 300),
    height: Math.min(width - 40, 300),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 30,
  },
  cell: {
    width: '30%',
    height: '30%',
    margin: '1.66%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cellEmpty: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cellX: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  cellO: {
    backgroundColor: 'rgba(245, 87, 108, 0.3)',
    borderWidth: 2,
    borderColor: '#f5576c',
  },
  cellText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  textX: {
    color: '#667eea',
  },
  textO: {
    color: '#f5576c',
  },
  gameControls: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  controlButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  controlButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  difficultySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  difficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  difficultyButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  difficultyButtonText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '500',
  },
  difficultyButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});