import React from 'react';
import { Card } from 'antd';

/**
 * Reusable page card component for consistent layout across admin portal pages
 * Provides a professional card wrapper with title and proper spacing
 */
const PageCard = ({ title, children, className = '', extra = null }) => {
  return (
    <div className="p-6">
      <Card
        title={
          <div className="text-2xl font-semibold text-gray-800">
            {title}
          </div>
        }
        extra={extra}
        className={`shadow-lg rounded-lg ${className}`}
        styles={{
          header: {
            borderBottom: '2px solid #f0f0f0',
            backgroundColor: '#fafafa',
            borderRadius: '8px 8px 0 0',
            padding: '20px 24px'
          },
          body: {
            padding: '24px',
            minHeight: '400px'
          }
        }}
      >
        {children}
      </Card>
    </div>
  );
};

export default PageCard;