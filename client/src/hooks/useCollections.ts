import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string;
  visibility: 'private' | 'public' | 'sym';
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionFile {
  id: number;
  filename: string;
  mime_type: string;
  size: number;
  file_order: number;
}

interface UseCollectionsReturn {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, description?: string, visibility?: 'private' | 'public' | 'sym') => Promise<boolean>;
  updateCollection: (id: number, name: string, description?: string, visibility?: 'private' | 'public' | 'sym') => Promise<boolean>;
  deleteCollection: (id: number) => Promise<boolean>;
  addToCollection: (collectionId: number, fileId: number) => Promise<{ success: boolean; error?: string; status?: number }>;
  getCollectionDetails: (id: number) => Promise<{ collection: Collection, files: CollectionFile[] } | null>;
  removeFromCollection: (collectionId: number, fileId: number) => Promise<boolean>;
}

export const useCollections = (): UseCollectionsReturn => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ collections: Collection[] }>('/api/collections');
      setCollections(data.collections);
    } catch (e) {
      console.error(e);
      setError('Network error fetching collections');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCollection = async (name: string, description?: string, visibility?: 'private' | 'public' | 'sym') => {
    try {
      await apiFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visibility }),
      });
      await fetchCollections(); // Refresh list
      return true;
    } catch (e) {
      console.error(e);
      setError('Network error creating collection');
      return false;
    }
  };

  const deleteCollection = async (id: number) => {
    try {
      await apiFetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });
      setCollections(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  const updateCollection = async (id: number, name: string, description?: string, visibility?: 'private' | 'public' | 'sym'): Promise<boolean> => {
    try {
      await apiFetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visibility }),
      });
      await fetchCollections();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const addToCollection = async (collectionId: number, fileId: number): Promise<{ success: boolean; error?: string; status?: number }> => {
    try {
      await apiFetch(`/api/collections/${collectionId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error' };
    }
  };

  const getCollectionDetails = async (id: number): Promise<{ collection: Collection, files: CollectionFile[] } | null> => {
    try {
      return await apiFetch<{ collection: Collection, files: CollectionFile[] }>(`/api/collections/${id}`);
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const removeFromCollection = async (collectionId: number, fileId: number) => {
      try {
      await apiFetch(`/api/collections/${collectionId}/files/${fileId}`, {
          method: 'DELETE'
      });
      return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  return {
    collections,
    loading,
    error,
    fetchCollections,
    createCollection,
    deleteCollection,
    updateCollection,
    addToCollection,
    getCollectionDetails,
    removeFromCollection
  };
};
