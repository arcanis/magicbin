import React from 'react';

export function CardBox({children}: {children?: React.ReactNode}) {
  return (
    <div className={`border border-gray-200 bg-white border-b border-gray-200 w-full`}>
      {children}
    </div>
  );
}
