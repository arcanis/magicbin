import React from 'react';

export function HeaderContainer({children}: {children: React.ReactNode}) {
  return (
    <div className={`flex items-center px-4 select-none`}>
      {children}
    </div>
  );
}

export function HeaderRightAlignedItems({children}: {children: React.ReactNode}) {
  return (
    <div className={`flex items-center ml-auto`}>
      {children}
    </div>
  );
}

export function HeaderItem({name, active = true, onClick}: {name: React.ReactNode, active?: boolean, onClick?: () => void}) {
  return (
    <label className={`flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer ${active ? `text-gray-700` : `text-gray-400`}`} onClick={onClick}>
      {name}
    </label>
  );
}
