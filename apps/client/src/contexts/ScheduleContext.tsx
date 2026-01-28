import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScheduleContextType {
  uploadedSchedules: any[];
  addUploadedSchedules: (schedules: any[]) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useScheduleContext = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider');
  }
  return context;
};

interface ScheduleProviderProps {
  children: ReactNode;
}

export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
  const [uploadedSchedules, setUploadedSchedules] = useState<any[]>([]);

  const addUploadedSchedules = (schedules: any[]) => {
    setUploadedSchedules(prev => [...prev, ...schedules]);
  };

  return (
    <ScheduleContext.Provider value={{ uploadedSchedules, addUploadedSchedules }}>
      {children}
    </ScheduleContext.Provider>
  );
};