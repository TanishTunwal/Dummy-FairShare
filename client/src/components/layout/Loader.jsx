import React from 'react';

const Loader = ({ size = 'medium', centered = true }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4 border-2';
      case 'large':
        return 'w-12 h-12 border-4';
      default:
        return 'w-8 h-8 border-3';
    }
  };

  return (
    <div className={`${centered ? 'loading-container' : ''}`}>
      <div className={`loader ${getSize()}`}></div>
    </div>
  );
};

export default Loader; 