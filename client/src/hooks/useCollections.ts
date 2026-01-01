import { useState, useEffect, useCallback } from 'react';

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
  deleteCollection: (id: number) => Promise<boolean>;
  addToCollection: (collectionId: number, fileId: number) => Promise<boolean>;
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
      const response = await fetch('/api/collections');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to fetch collections');
      }
    } catch (e) {
      console.error(e);
      setError('Network error fetching collections');
    } finally {
      setLoading(false);
    }
  }, []);

  const createCollection = async (name: string, description?: string, visibility?: 'private' | 'public' | 'sym') => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visibility }),
      });
      if (response.ok) {
        await fetchCollections(); // Refresh list
        return true;
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to create collection');
        return false;
      }
    } catch (e) {
      console.error(e);
      setError('Network error creating collection');
      return false;
    }
  };

  const deleteCollection = async (id: number) => {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setCollections(prev => prev.filter(c => c.id !== id));
        return true;
      }
      return false;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  const addToCollection = async (collectionId: number, fileId: number) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      return response.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const getCollectionDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/collections/${id}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const removeFromCollection = async (collectionId: number, fileId: number) => {
      try {
          const response = await fetch(`/api/collections/${collectionId}/files/${fileId}`, {
              method: 'DELETE'
          });
          return response.ok;
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
    addToCollection,
    getCollectionDetails,
    removeFromCollection
  };
};
