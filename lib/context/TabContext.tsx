import { createContext, useContext, useState, type ReactNode } from "react";

interface TabContextType {
  tabsDisabled: boolean;
  setTabsDisabled: (disabled: boolean) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabsDisabled, setTabsDisabled] = useState(false);

  return (
    <TabContext.Provider value={{ tabsDisabled, setTabsDisabled }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within TabProvider");
  }
  return context;
}
