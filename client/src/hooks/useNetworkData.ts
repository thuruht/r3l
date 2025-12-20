import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export interface NetworkNode {
  id: string;
  group: 'me' | 'sym' | 'asym' | 'lurker' | 'drift_user' | 'drift_file';
  name: string;
  avatar_url?: string;
  online?: boolean; // New property
  primaryNodeColor?: string; // New property
  secondaryNodeColor?: string; // New property
  nodeSize?: number; // New property
  data?: any; 
  collectionIds?: number[]; // New property: Files can belong to collections
}

export interface NetworkLink {
  source: string;
  target: string;
  type: 'sym' | 'asym' | 'drift' | 'collection';
}

export interface NetworkCollection {
    id: number;
    name: string;
    file_ids: number[];
}

interface UseNetworkDataProps {
  currentUserId: number | null;
  meUsername: string | undefined; 
  meAvatarUrl: string | undefined; 
  isDrifting: boolean;
  driftData: { users: any[], files: any[] };
  onlineUserIds: Set<number>; // New prop
}

export const useNetworkData = ({ currentUserId, meUsername, meAvatarUrl, isDrifting, driftData, onlineUserIds }: UseNetworkDataProps) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [collections, setCollections] = useState<NetworkCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Parallel fetch relationships and collections
      const [relRes, collRes] = await Promise.all([
          fetch('/api/relationships'),
          fetch('/api/collections')
      ]);
      
      if (!relRes.ok) throw new Error('Failed to fetch network');
      
      const relData = await relRes.json();
      const collData = collRes.ok ? await collRes.json() : { collections: [] }; // Fail gracefully

      const nodeMap = new Map<string, NetworkNode>();
      const newLinks: NetworkLink[] = [];

      // Process Collections to get file IDs
      const loadedCollections: NetworkCollection[] = [];
      if (collData.collections) {
          // We need to fetch files for each collection to know which nodes belong to it?
          // Or we can just store the collection metadata and let the UI handle it if we had the data.
          // The /api/collections endpoint returns list of collections but NOT file IDs.
          // We would need to fetch /api/collections/:id for each to get files, which is too many requests.
          // Let's assume for now we only visualize "My Collections" if we had a bulk endpoint.
          // Or we rely on the `files` endpoint which might return collection info? No.
          
          // Optimization: Let's skip deep collection visualization for now as it requires backend changes 
          // (bulk fetch collections with file IDs).
          // OR we can just fetch the list and show "Collection Nodes".
      }

      // 1. Add Me
      nodeMap.set(currentUserId.toString(), {
        id: currentUserId.toString(),
        group: 'me',
        name: meUsername || 'Me', 
        avatar_url: meAvatarUrl,
        online: true
      });

      const processNode = (r: any, group: NetworkNode['group']) => {
        if (!nodeMap.has(r.user_id.toString())) {
          nodeMap.set(r.user_id.toString(), {
            id: r.user_id.toString(),
            group,
            name: r.username,
            avatar_url: r.avatar_url,
            online: onlineUserIds.has(r.user_id)
          });
        }
      };

      // Outgoing
      relData.outgoing.forEach((r: any) => {
        if (r.type === 'asym_follow' && r.status === 'accepted') {
          processNode(r, 'asym');
          newLinks.push({ source: currentUserId.toString(), target: r.user_id.toString(), type: 'asym' });
        }
      });

      // Incoming
      relData.incoming.forEach((r: any) => {
        if (r.type === 'asym_follow' && r.status === 'accepted') {
          processNode(r, 'asym');
          newLinks.push({ source: r.user_id.toString(), target: currentUserId.toString(), type: 'asym' });
        }
      });

      // Mutual
      relData.mutual.forEach((r: any) => {
        processNode(r, 'sym');
        newLinks.push({ source: currentUserId.toString(), target: r.user_id.toString(), type: 'sym' });
      });

      // Drift
      if (isDrifting && driftData) {
        driftData.users.forEach((u: any) => {
          const uid = u.id.toString();
          if (!nodeMap.has(uid)) {
            nodeMap.set(uid, {
              id: uid,
              group: 'drift_user',
              name: u.username,
              avatar_url: u.avatar_url,
              online: onlineUserIds.has(u.id)
            });
          }
        });
        driftData.files.forEach((f: any) => {
          const fileNodeId = `file-${f.id}`;
          const ownerId = f.user_id.toString();

          // Ensure owner node exists (stub if necessary)
          if (!nodeMap.has(ownerId)) {
             nodeMap.set(ownerId, {
                 id: ownerId,
                 group: 'drift_user', 
                 name: f.owner_username || 'Unknown Signal',
                 avatar_url: undefined,
                 online: onlineUserIds.has(f.user_id)
             });
          }

          if (!nodeMap.has(fileNodeId)) {
            nodeMap.set(fileNodeId, {
              id: fileNodeId,
              group: 'drift_file',
              name: f.filename,
              data: f
            });
            // Link to owner
            newLinks.push({ source: fileNodeId, target: ownerId, type: 'drift' });
          }
        });
      }

      setNodes(Array.from(nodeMap.values()));
      setLinks(newLinks);

    } catch (e) {
      console.error(e);
      showToast('Failed to sync network', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isDrifting, driftData, showToast, onlineUserIds]); // Added onlineUserIds dependency

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  return { nodes, links, loading, refresh: fetchData };
};
