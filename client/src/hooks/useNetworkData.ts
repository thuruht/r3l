import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export interface NetworkNode {
  id: string;
  group: 'me' | 'sym' | 'asym' | 'lurker' | 'drift_user' | 'drift_file' | 'artifact' | 'collection';
  name: string;
  avatar_url?: string;
  online?: boolean;
  data?: any;
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
  onlineUserIds: Set<number>;
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
      const [relRes, fileRes, collRes] = await Promise.all([
          fetch('/api/relationships'),
          fetch('/api/files'),
          fetch('/api/collections')
      ]);
      
      const relData = await relRes.json();
      const fileData = await fileRes.json();
      const collData = collRes.ok ? await collRes.json() : { collections: [] };

      // Process Collections
      const loadedCollections: NetworkCollection[] = [];
      if (collData.collections) {
          collData.collections.forEach((c: any) => {
              loadedCollections.push({
                  id: c.id,
                  name: c.name,
                  file_ids: c.file_ids || []
              });
          });
      }
      setCollections(loadedCollections);

      const nodeMap = new Map<string, NetworkNode>();
      const newLinks: NetworkLink[] = [];

      // Add "Me" hub
      nodeMap.set(currentUserId.toString(), {
        id: currentUserId.toString(),
        group: 'me',
        name: meUsername || 'Me',
        avatar_url: meAvatarUrl,
        online: true
      });

      // Add personal artifacts as nodes linked to "Me"
      if (fileData.files) {
          fileData.files.forEach((f: any) => {
            const fileId = `file-${f.id}`;
            nodeMap.set(fileId, {
              id: fileId,
              group: 'artifact',
              name: f.filename,
              data: f
            });
            newLinks.push({ source: fileId, target: currentUserId.toString(), type: 'drift' }); // Using 'drift' type for dotted line look, or create new type 'artifact'
          });
      }

      // Add Collection Nodes
      loadedCollections.forEach(c => {
          const collectionNodeId = `collection-${c.id}`;
          nodeMap.set(collectionNodeId, {
              id: collectionNodeId,
              group: 'collection',
              name: c.name,
              data: c,
              online: true
          });
          
          // Link Collection to Me
          newLinks.push({ source: currentUserId.toString(), target: collectionNodeId, type: 'collection' });

          // Link Collection to Files
          c.file_ids.forEach(fid => {
              const fileNodeId = `file-${fid}`;
              if (nodeMap.has(fileNodeId)) {
                  newLinks.push({ source: collectionNodeId, target: fileNodeId, type: 'collection' });
              }
          });
      });

      // Add Social Nodes
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
      relData.outgoing?.forEach((r: any) => {
        if (r.type === 'asym_follow' && r.status === 'accepted') {
          processNode(r, 'asym');
          newLinks.push({ source: currentUserId.toString(), target: r.user_id.toString(), type: 'asym' });
        }
      });

      // Incoming
      relData.incoming?.forEach((r: any) => {
        if (r.type === 'asym_follow' && r.status === 'accepted') {
          processNode(r, 'asym');
          newLinks.push({ source: r.user_id.toString(), target: currentUserId.toString(), type: 'asym' });
        }
      });

      relData.mutual?.forEach((r: any) => {
        processNode(r, 'sym');
        newLinks.push({ source: currentUserId.toString(), target: r.user_id.toString(), type: 'sym' });
      });

      // Drift Logic
      if (isDrifting && driftData) {
        driftData.users?.forEach((u: any) => {
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

        driftData.files?.forEach((f: any) => {
            const fileNodeId = `file-${f.id}`;
            const ownerId = f.user_id.toString();

            // Ensure owner node exists (stub if necessary)
            if (!nodeMap.has(ownerId)) {
                nodeMap.set(ownerId, {
                    id: ownerId,
                    group: 'drift_user',
                    name: f.owner_username || 'Unknown Signal',
                    online: onlineUserIds.has(f.user_id)
                });
            }

            if (!nodeMap.has(fileNodeId)) {
                nodeMap.set(fileNodeId, { id: fileNodeId, group: 'drift_file', name: f.filename, data: f });
                newLinks.push({ source: fileNodeId, target: ownerId, type: 'drift' });
            }
        });
      }

      setNodes(Array.from(nodeMap.values()));
      setLinks(newLinks);
    } catch (e) {
      console.error(e);
      showToast('Failed to sync filenet', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, meUsername, meAvatarUrl, isDrifting, driftData, onlineUserIds, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { nodes, links, collections, loading, refresh: fetchData };
};
