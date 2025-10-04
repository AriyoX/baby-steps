import React, { createContext, useContext, useState } from 'react';

interface ChildProfile {
  id: string;
  name: string;
  gender: string;
  age: string;
  avatar?: string;
}

interface ChildContextType {
  activeChild: ChildProfile | null;
  setActiveChild: (child: ChildProfile | null) => void;
}

export const ChildContext = createContext<ChildContextType | undefined>(undefined);

export const ChildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);

  return (
    <ChildContext.Provider value={{ activeChild, setActiveChild }}>
      {children}
    </ChildContext.Provider>
  );
};

export const useChild = () => {
  const context = useContext(ChildContext);
  if (context === undefined) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
};