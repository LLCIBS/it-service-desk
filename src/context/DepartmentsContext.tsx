import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Department } from '../types';

interface DepartmentsContextValue {
  departments: Department[];
  names: string[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextValue | null>(null);

export function DepartmentsProvider({ children }: { children: React.ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/departments');
      if (res.ok) setDepartments(await res.json());
      else setDepartments([]);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <DepartmentsContext.Provider
      value={{
        departments,
        names: departments.map((d) => d.name),
        loading,
        refresh,
      }}
    >
      {children}
    </DepartmentsContext.Provider>
  );
}

export function useDepartments() {
  const ctx = useContext(DepartmentsContext);
  if (!ctx) {
    throw new Error('useDepartments must be used within DepartmentsProvider');
  }
  return ctx;
}
