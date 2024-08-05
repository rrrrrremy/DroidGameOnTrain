import React, { useState, useMemo } from 'react';
import GameBoard from './GameBoard';
import Button from './Button';
import StartScreen from './StartScreen';
import LetterSelection from './LetterSelection';
import ReturnTilesBox from './ReturnTilesBox';
import { countLetters, preserveRandomLettersForPlayer2, checkCorrectTiles } from '../utils/gameLogic';

const DroidGame = () => {
  const [gameState, setGameState] = useState('start');
  const [board, setBoard] = useState(Array(5).fill().map(() => Array(5).fill(null)));
  const [player1Board, setPlayer1Board] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [preservedTiles, setPreservedTiles] = useState([]);
  const [letterCounts, setLetterCounts] = useState({});
  const [player2UsedLetters, setPlayer2UsedLetters] = useState({});
  const [correctTiles, setCorrectTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  
  const fullAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  
  const availableLetters = useMemo(() => {
    if (currentPlayer === 1) return fullAlphabet;
    
    const letters = Object.entries(letterCounts)
      .flatMap(([letter, count]) => 
        Array(Math.max(0, count - (player2UsedLetters[letter] || 0))).fill(letter)
      );
    
    const sortedVowels = letters.filter(letter => vowels.includes(letter)).sort();
    const sortedConsonants = letters.filter(letter => !vowels.includes(letter)).sort();
    
    return { vowels: sortedVowels, consonants: sortedConsonants };
  }, [currentPlayer, letterCounts, player2UsedLetters]);

  const handleSelectTile = (x, y) => {
    if (selectedLetter) {
      placeLetter(x, y, selectedLetter);
    } else {
      setSelectedTile({ x, y });
    }
  };

  const handleSelectLetter = (letter) => {
    if (selectedTile) {
      placeLetter(selectedTile.x, selectedTile.y, letter);
    } else {
      setSelectedLetter(letter);
    }
  };

  const placeLetter = (x, y, letter) => {
    const newBoard = board.map(row => [...row]);
    const oldLetter = newBoard[y][x];
    newBoard[y][x] = letter;
    setBoard(newBoard);

    if (currentPlayer === 2) {
      setPlayer2UsedLetters(prev => ({
        ...prev,
        [letter]: (prev[letter] || 0) + 1,
        ...(oldLetter ? { [oldLetter]: Math.max(0, (prev[oldLetter] || 0) - 1) } : {})
      }));
    }

    setSelectedTile(null);
    setSelectedLetter(null);
  };

  const handleDragStart = (e, letter, x, y) => {
    e.dataTransfer.setData('text', letter);
    e.dataTransfer.setData('sourceX', x);
    e.dataTransfer.setData('sourceY', y);
  };

  const handleDrop = (x, y, e) => {
    const letter = e.dataTransfer.getData('text');
    const sourceX = parseInt(e.dataTransfer.getData('sourceX'));
    const sourceY = parseInt(e.dataTransfer.getData('sourceY'));

    const newBoard = board.map(row => [...row]);
    
    // Remove letter from old position if it came from the board
    if (!isNaN(sourceX) && !isNaN(sourceY)) {
      newBoard[sourceY][sourceX] = null;
    }

    // Place letter in new position
    newBoard[y][x] = letter;
    setBoard(newBoard);

    if (currentPlayer === 2) {
      // Only update used letters if the tile came from available letters
      if (isNaN(sourceX) || isNaN(sourceY)) {
        setPlayer2UsedLetters(prev => ({
          ...prev,
          [letter]: (prev[letter] || 0) + 1,
        }));
      }
    }
  };

  const handleEndTurn = () => {
    if (currentPlayer === 1) {
      setPlayer1Board(board.map(row => [...row]));
      const { preservedLetters, newBoard } = preserveRandomLettersForPlayer2(board);
      setPreservedTiles(preservedLetters);
      setBoard(newBoard);
      setLetterCounts(countLetters(board));
      setPlayer2UsedLetters(countLetters(newBoard));
      setCurrentPlayer(2);
      setGameState('player2');
    } else {
      setGameState('end');
    }
  };

  const resetGame = () => {
    setBoard(Array(5).fill().map(() => Array(5).fill(null)));
    setPlayer1Board(null);
    setCurrentPlayer(1);
    setPreservedTiles([]);
    setLetterCounts({});
    setPlayer2UsedLetters({});
    setCorrectTiles([]);
    setSelectedTile(null);
    setSelectedLetter(null);
    setGameState('player1');
  };

  const handleCheck = () => {
    setCorrectTiles(checkCorrectTiles(board, player1Board));
  };

  const handleReturnTile = (letter) => {
    if (currentPlayer === 2) {
      const newBoard = board.map(row => row.map(tile => tile === letter ? null : tile));
      setBoard(newBoard);
      setPlayer2UsedLetters(prev => ({
        ...prev,
        [letter]: Math.max(0, (prev[letter] || 0) - 1)
      }));
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white text-black min-h-screen">
      {gameState === 'start' && <StartScreen onStart={() => setGameState('player1')} />}
      
      {(gameState === 'player1' || gameState === 'player2') && (
        <React.Fragment>
          <h1 className="text-3xl font-bold mb-4">
            Player {currentPlayer}'s Turn
          </h1>
          
          <div className="bg-gray-100 p-4 rounded mb-4 text-lg max-w-2xl w-full">
            {currentPlayer === 1 
              ? "Create words on the board! Drag letters to place or move them." 
              : "Reconstruct the words Player 1 created. Two letters have been preserved as hints!"}
          </div>
          
          <GameBoard 
            board={board}
            onSelectTile={handleSelectTile}
            preservedTiles={preservedTiles}
            correctTiles={correctTiles}
            selectedTile={selectedTile}
            currentPlayer={currentPlayer}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
          
          <div className="flex justify-between items-start w-full max-w-4xl mt-4">
            <LetterSelection 
              currentPlayer={currentPlayer}
              availableLetters={availableLetters}
              onSelectLetter={handleSelectLetter}
              selectedLetter={selectedLetter}
              onDragStart={handleDragStart}
            />
            {currentPlayer === 2 && (
              <div className="ml-4">
                <ReturnTilesBox onReturnTile={handleReturnTile} />
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-4">
            <Button onClick={handleEndTurn} primary>
              End Turn
            </Button>
            {currentPlayer === 2 && (
              <Button onClick={handleCheck}>
                Check
              </Button>
            )}
          </div>
        </React.Fragment>
      )}

      {gameState === 'end' && (
        <div className="flex flex-col items-center w-full max-w-4xl">
          <h2 className="text-3xl font-bold mb-4">
            Game Over!
          </h2>
          <p className="mb-8">Let's compare Player 2's reconstruction with Player 1's original words.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 w-full">
            <div>
              <h3 className="text-xl font-bold mb-2">Player 1's Words</h3>
              <GameBoard board={player1Board} onSelectTile={() => {}} preservedTiles={[]} correctTiles={[]} selectedTile={null} currentPlayer={1} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Player 2's Reconstruction</h3>
              <GameBoard board={board} onSelectTile={() => {}} preservedTiles={preservedTiles} correctTiles={correctTiles} selectedTile={null} currentPlayer={2} />
            </div>
          </div>
          <Button onClick={resetGame} primary>
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default DroidGame;