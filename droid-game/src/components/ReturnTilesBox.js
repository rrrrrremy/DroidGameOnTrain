import React from 'react';

const ReturnTilesBox = ({ onReturnTile }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const letter = e.dataTransfer.getData('text');
    onReturnTile(letter);
  };

  return (
    <div 
      className="w-48 h-48 border-4 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center bg-blue-50 text-blue-600 font-semibold cursor-pointer transition-all duration-300 hover:bg-blue-100 hover:border-blue-500 shadow-md"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <span className="text-lg">Return Tiles</span>
      <span className="text-sm text-blue-400 mt-1">Drop here</span>
    </div>
  );
};

export default ReturnTilesBox;