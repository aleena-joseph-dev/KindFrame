import React, { createContext, useContext, useState } from 'react';

export type SensoryMode = 'calm' | 'highEnergy' | 'normal' | 'relax';

const SensoryModeContext = createContext<{
  mode: SensoryMode;
  setMode: (mode: SensoryMode) => void;
}>({
  mode: 'calm',
  setMode: () => {},
});

export const SensoryModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<SensoryMode>('calm');
  return (
    <SensoryModeContext.Provider value={{ mode, setMode }}>
      {children}
    </SensoryModeContext.Provider>
  );
};

export const useSensoryMode = () => useContext(SensoryModeContext); 