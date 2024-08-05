import React from 'react';

const Button = ({ onClick, children, primary = false }) => (
  <button 
    onClick={onClick}
    className={`button ${primary ? 'primary' : 'secondary'}`}
  >
    {children}
  </button>
);

export default Button;