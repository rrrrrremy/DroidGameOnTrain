import React from 'react';

const Button = ({ onClick, children, primary = false, disabled = false }) => (
  <button
    className={`button ${primary ? 'primary' : 'secondary'}${disabled ? ' disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

export default Button;
