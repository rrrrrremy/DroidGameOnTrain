import React from 'react';

const Button = ({ onClick, children, primary = false }) => (
  <button
    className={`button ${primary ? 'primary' : 'secondary'}`}
    onClick={onClick}
  >
    {children}
  </button>
);

export default Button;
