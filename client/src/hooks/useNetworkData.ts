import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export interface NetworkNode {
  id: string;
  group: 'me' | 'sym' | 'asym' | 'lurker' | 'drift_user' | 'drift_file';
  name: string;
  avatar_url?: string;
  data?: any; // Extra data like file metadata
}

export interface NetworkLink {
  source: string;
  target: string;
  type: 'sym' | 'asym' | 'drift';
}

interface UseNetworkDataProps {
  currentUserId: number | null;
  meUsername: string | undefined; // Added
  meAvatarUrl: string | undefined; // Added
  isDrifting: boolean;
  driftData: { users: any[], files: any[] };
}

export const useNetworkData = ({ currentUserId, meUsername, meAvatarUrl, isDrifting, driftData }: UseNetworkDataProps) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/relationships');
      if (!res.ok) throw new Error('Failed to fetch network');
      
      const relData = await res.json();
      
      const nodeMap = new Map<string, NetworkNode>();
      const newLinks: NetworkLink[] = [];

      // 1. Add Me
      nodeMap.set(currentUserId.toString(), {
        id: currentUserId.toString(),
        group: 'me',
        name: meUsername || 'Me', 
        avatar_url: meAvatarUrl
      });

      const processNode = (r: any, group: NetworkNode['group']) => {
        if (!nodeMap.has(r.user_id.toString())) {
          nodeMap.set(r.user_id.toString(), {
            id: r.user_id.toString(),
            group,
            name: r.username,
            avatar_url: r.avatar_url
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
              avatar_url: u.avatar_url
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
                 group: 'drift_user', // Treat implicit owners as drift users
                 name: f.owner_username || 'Unknown Signal',
                 avatar_url: undefined // We might not have avatar if not fetched explicitly
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
  }, [currentUserId, isDrifting, driftData, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { nodes, links, loading, refresh: fetchData };
};
