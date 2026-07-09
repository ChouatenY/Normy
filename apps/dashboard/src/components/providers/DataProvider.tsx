'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.js';
import { DbService, type Project, type ApiKey } from '../../lib/db-service.js';

interface DataContextType {
  projects: Project[];
  selectedProject: Project | null;
  apiKeys: ApiKey[];
  loadingProjects: boolean;
  refreshProjects: () => Promise<void>;
  refreshApiKeys: () => Promise<void>;
  setSelectedProject: (proj: Project | null) => void;
}

const DataContext = createContext<DataContextType>({
  projects: [],
  selectedProject: null,
  apiKeys: [],
  loadingProjects: true,
  refreshProjects: async () => {},
  refreshApiKeys: async () => {},
  setSelectedProject: () => {},
});

export const useData = () => useContext(DataContext);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const refreshProjects = async () => {
    if (!user) return;
    setLoadingProjects(true);
    const list = await DbService.getProjects(user.email || 'default@example.com');
    setProjects(list || []);
    if (list && list.length > 0 && (!selectedProject || !list.find(p => p.id === selectedProject.id))) {
      setSelectedProject(list[0] ?? null);
    }
    setLoadingProjects(false);
  };

  const refreshApiKeys = async () => {
    if (!selectedProject) return;
    const list = await DbService.getApiKeys(selectedProject.id);
    setApiKeys(list || []);
  };

  useEffect(() => {
    refreshProjects();
  }, [user]);

  useEffect(() => {
    refreshApiKeys();
  }, [selectedProject]);

  return (
    <DataContext.Provider value={{
      projects,
      selectedProject,
      apiKeys,
      loadingProjects,
      refreshProjects,
      refreshApiKeys,
      setSelectedProject
    }}>
      {children}
    </DataContext.Provider>
  );
}
