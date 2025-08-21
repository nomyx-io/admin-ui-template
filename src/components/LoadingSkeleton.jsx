import React from 'react';
import './LoadingSkeleton.css';

export const TableSkeleton = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-row skeleton-header">
        {Array.from({ length: columns }, (_, i) => (
          <div key={`header-${i}`} className="skeleton-cell skeleton-shimmer" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="skeleton-row">
          {Array.from({ length: columns }, (_, colIndex) => (
            <div 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="skeleton-cell skeleton-shimmer"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: count }, (_, i) => (
        <div key={`card-${i}`} className="skeleton-card">
          <div className="skeleton-card-header skeleton-shimmer" />
          <div className="skeleton-card-body">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '60%' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '80%' }} />
            <div className="skeleton-line skeleton-shimmer" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const LineSkeleton = ({ width = '100%' }) => {
  return <div className="skeleton-line skeleton-shimmer" style={{ width }} />;
};