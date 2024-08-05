const LetterTile = ({ letter, onSelect, isSelected }) => {
  return (
    <div 
      className={`letter ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(letter)}
    >
      {letter}
    </div>
  );
};

const BoardTile = ({ letter, onSelect, isActive, isPreserved, isCorrect, isSelected }) => {
  let tileClass = 'tile';
  if (isActive) {
    tileClass += ' active';
    if (letter) {
      if (isPreserved) {
        tileClass += ' bg-green-200 border-green-400';
      } else if (isCorrect) {
        tileClass += ' bg-yellow-200 border-yellow-400';
      } else {
        tileClass += ' bg-blue-200 border-blue-400';
      }
    } else {
      tileClass += ' bg-gray-200 border-gray-300';
    }
  } else {
    tileClass += ' bg-gray-100 border-gray-200';
  }
  if (isSelected) {
    tileClass += ' selected';
  }

  return (
    <div 
      className={tileClass}
      onClick={isActive && !isPreserved ? onSelect : undefined}
    >
      {letter && isActive && <span>{letter}</span>}
    </div>
  );
};

const Button = ({ onClick, children, primary = false }) => (
  <button 
    onClick={onClick}
    className={`button ${primary ? 'primary' : 'secondary'}`}
  >
    {children}
  </button>
);

const StartScreen = ({ onStart }) => (
  <div className="container">
    <h1>Droid</h1>
    <p>A word reconstruction game</p>
    <Button onClick={onStart} primary>
      ▶️ Start Game
    </Button>
  </div>
);

const TransitionScreen = ({ onContinue, player, preservedLetterCount, setPreservedLetterCount }) => (
  <div className="container">
    <h2>
      {player === 1 ? "Player 1's Turn Complete" : "Player 2's Turn"}
    </h2>
    {player === 1 ? (
      <React.Fragment>
        <p>
          Choose how many letters to leave on the board for Player 2:
        </p>
        <div className="flex items-center mb-8">
          <button onClick={() => setPreservedLetterCount(Math.max(1, preservedLetterCount - 1))} className="button secondary">
            ➖
          </button>
          <span className="mx-4 text-2xl font-bold">{preservedLetterCount}</span>
          <button onClick={() => setPreservedLetterCount(Math.min(3, preservedLetterCount + 1))} className="button secondary">
            ➕
          </button>
        </div>
      </React.Fragment>
    ) : (
      <p>
        Try to reconstruct the words Player 1 created using the {preservedLetterCount} preserved letter{preservedLetterCount > 1 ? 's' : ''} as hints!
      </p>
    )}
    <Button onClick={onContinue} primary>
      ▶️ Continue
    </Button>
  </div>
);

const GameBoard = ({ board, onSelectTile, preservedTiles, correctTiles, selectedTile }) => {
  const removedSquares = [1, 2, 4, 5, 11, 15, 16, 20, 21, 23, 25];

  return (
    <div className="board">
      {board.map((row, y) => 
        row.map((tile, x) => {
          const squareNumber = y * 5 + x + 1;
          const isActive = !removedSquares.includes(squareNumber);
          const isPreserved = preservedTiles.some(t => t.x === x && t.y === y);
          const isCorrect = correctTiles.some(t => t.x === x && t.y === y);
          const isSelected = selectedTile && selectedTile.x === x && selectedTile.y === y;
          return (
            <BoardTile 
              key={`${x},${y}`} 
              letter={tile}
              onSelect={() => onSelectTile(x, y)} 
              isActive={isActive}
              isPreserved={isPreserved}
              isCorrect={isCorrect}
              isSelected={isSelected}
            />
          );
        })
      )}
    </div>
  );
};

const DroidGame = () => {
  const [gameState, setGameState] = React.useState('start');
  const [board, setBoard] = React.useState(Array(5).fill().map(() => Array(5).fill(null)));
  const [player1Board, setPlayer1Board] = React.useState(null);
  const [currentPlayer, setCurrentPlayer] = React.useState(1);
  const [preservedTiles, setPreservedTiles] = React.useState([]);
  const [letterCounts, setLetterCounts] = React.useState({});
  const [player2UsedLetters, setPlayer2UsedLetters] = React.useState({});
  const [preservedLetterCount, setPreservedLetterCount] = React.useState(2);
  const [correctTiles, setCorrectTiles] = React.useState([]);
  const [selectedTile, setSelectedTile] = React.useState(null);
  const [selectedLetter, setSelectedLetter] = React.useState(null);
  
  const fullAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = React.useMemo(() => {
    if (currentPlayer === 1) return fullAlphabet;
    return Object.entries(letterCounts)
      .flatMap(([letter, count]) => 
        Array(Math.max(0, count - (player2UsedLetters[letter] || 0))).fill(letter)
      );
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
  
  const countLetters = (board) => {
    const counts = {};
    board.flat().forEach(letter => {
      if (letter) {
        counts[letter] = (counts[letter] || 0) + 1;
      }
    });
    return counts;
  };

  const handleEndTurn = () => {
    if (currentPlayer === 1) {
      setPlayer1Board(board.map(row => [...row]));
      setLetterCounts(countLetters(board));
      setGameState('transition');
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
    setPreservedLetterCount(2);
    setCorrectTiles([]);
    setSelectedTile(null);
    setGameState('player1');
  };

  const preserveLettersForPlayer2 = () => {
    const flatBoard = board.flat();
    const filledTiles = flatBoard.reduce((acc, letter, index) => {
      if (letter) acc.push({ x: index % 5, y: Math.floor(index / 5), letter });
      return acc;
    }, []);

    const preservedLetters = [];
    while (preservedLetters.length < preservedLetterCount && filledTiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * filledTiles.length);
      preservedLetters.push(filledTiles.splice(randomIndex, 1)[0]);
    }

    setPreservedTiles(preservedLetters);
    const newBoard = Array(5).fill().map(() => Array(5).fill(null));
    preservedLetters.forEach(({ x, y, letter }) => {
      newBoard[y][x] = letter;
    });
    setBoard(newBoard);
    setPlayer2UsedLetters(countLetters(newBoard));
  };

  const handleCheck = () => {
    const newCorrectTiles = [];
    board.forEach((row, y) => {
      row.forEach((letter, x) => {
        if (letter && letter === player1Board[y][x]) {
          newCorrectTiles.push({ x, y });
        }
      });
    });
    setCorrectTiles(newCorrectTiles);
  };

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 bg-gray-200 text-gray-800 min-h-screen">
      {gameState === 'start' && <StartScreen onStart={() => setGameState('player1')} />}
      
      {gameState === 'transition' && 
        <TransitionScreen 
          onContinue={() => {
            if (currentPlayer === 1) {
              preserveLettersForPlayer2();
              setCurrentPlayer(2);
            }
            setGameState('player2');
          }} 
          player={currentPlayer}
          preservedLetterCount={preservedLetterCount}
          setPreservedLetterCount={setPreservedLetterCount}
        />
      }

      {(gameState === 'player1' || gameState === 'player2') && (
        <React.Fragment>
          <h1 className="text-3xl font-bold mb-6 text-gray-800">
            Player {currentPlayer}'s Turn
          </h1>
          
          <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg shadow-sm mb-8 text-sm flex items-center">
            <span className="text-blue-800">{currentPlayer === 1 ? "Create words on the board!" : `Reconstruct the words Player 1 created using the ${preservedLetterCount} green letter${preservedLetterCount > 1 ? 's' : ''} as hints!`}</span>
          </div>
          
          <GameBoard 
            board={board}
            onSelectTile={handleSelectTile}
            preservedTiles={preservedTiles}
            correctTiles={correctTiles}
            selectedTile={selectedTile}
          />
          
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl bg-white p-4 rounded-lg shadow-md mb-8 border border-gray-300">
            {availableLetters.map((letter, index) => (
              <LetterTile 
                key={`${letter}-${index}`}
                letter={letter} 
                onSelect={handleSelectLetter}
                isSelected={selectedLetter === letter}
              />
            ))}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleEndTurn} primary>
              End Turn
            </Button>
            {currentPlayer === 2 && (
              <Button onClick={handleCheck}>
                ✅ Check
              </Button>
            )}
          </div>
        </React.Fragment>
      )}

      {gameState === 'end' && (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            Game Over!
          </h2>
          <p className="mb-12 text-center text-gray-600">Let's compare Player 2's reconstruction with Player 1's original words.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-700">Player 1's Words</h3>
              <GameBoard board={player1Board} onSelectTile={() => {}} preservedTiles={[]} correctTiles={[]} selectedTile={null} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-700">Player 2's Reconstruction</h3>
              <GameBoard board={board} onSelectTile={() => {}} preservedTiles={preservedTiles} correctTiles={correctTiles} selectedTile={null} />
            </div>
          </div>
          <Button onClick={resetGame} primary>
            🔄 Play Again
          </Button>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<DroidGame />, document.getElementById('root'));