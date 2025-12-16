import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  group: 'me' | 'sym' | 'asym' | 'lurker' | 'drift_user' | 'drift_file';
  name: string;
  avatar_url?: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: 'sym' | 'asym' | 'drift';
}

interface AssociationWebProps {
  onNodeClick: (nodeId: string) => void;
  currentUserId: number | null;
  isDrifting: boolean;
  driftData: { users: any[], files: any[] };
}

interface APIUser {
  id: number;
  username: string;
  avatar_url?: string;
  created_at: string;
}

interface APIRelationship {
  user_id: number;
  type: 'asym_follow' | 'sym_request' | 'sym_accepted';
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
}

interface APIMutualConnection {
  user_a_id: number;
  user_b_id: number;
}

const AssociationWeb: React.FC<AssociationWebProps> = ({ onNodeClick, currentUserId, isDrifting, driftData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string | null }>({ x: 0, y: 0, content: null });

  useEffect(() => {
    if (!svgRef.current || currentUserId === null) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, relationshipsRes] = await Promise.all([
          fetch('/api/d1/users'),
          fetch('/api/relationships'),
        ]);

        if (!usersRes.ok || !relationshipsRes.ok) throw new Error('Failed to fetch data');

        const allUsers: APIUser[] = await usersRes.json();
        const userRelationships = await relationshipsRes.json();

        const d3Nodes: D3Node[] = allUsers.map(user => {
          let group: D3Node['group'] = 'lurker';
          if (user.id === currentUserId) {
            group = 'me';
          } else {
            const isSym = userRelationships.mutual.some(
              (m: APIMutualConnection) =>
                (m.user_a_id === currentUserId && m.user_b_id === user.id) ||
                (m.user_b_id === currentUserId && m.user_a_id === user.id)
            );

            if (isSym) {
              group = 'sym';
            } else {
              const isAsym = 
                userRelationships.outgoing.some(
                  (r: APIRelationship) => r.user_id === user.id && r.type === 'asym_follow' && r.status === 'accepted'
                ) ||
                userRelationships.incoming.some(
                  (r: APIRelationship) => r.user_id === user.id && r.type === 'asym_follow' && r.status === 'accepted'
                );

              if (isAsym) group = 'asym';
            }
          }
          return { id: user.id.toString(), group, name: user.username, avatar_url: user.avatar_url };
        });

        const d3Links: D3Link[] = [];
        userRelationships.outgoing.forEach((rel: APIRelationship) => {
          if (rel.type === 'asym_follow' && rel.status === 'accepted') {
            d3Links.push({ source: currentUserId.toString(), target: rel.user_id.toString(), type: 'asym' });
          }
        });
        userRelationships.incoming.forEach((rel: APIRelationship) => {
          if (rel.type === 'asym_follow' && rel.status === 'accepted') {
             d3Links.push({ source: rel.user_id.toString(), target: currentUserId.toString(), type: 'asym' });
          }
        });
        userRelationships.mutual.forEach((m: APIMutualConnection) => {
          d3Links.push({ source: m.user_a_id.toString(), target: m.user_b_id.toString(), type: 'sym' });
        });

        // --- Drift Logic ---
        if (isDrifting && driftData) {
            driftData.users.forEach((u: any) => {
                if (!d3Nodes.find(n => n.id === u.id.toString())) {
                    d3Nodes.push({
                        id: u.id.toString(),
                        group: 'drift_user',
                        name: u.username,
                        avatar_url: u.avatar_url
                    });
                }
            });
            driftData.files.forEach((f: any) => {
                const fileNodeId = `file-${f.id}`;
                if (!d3Nodes.find(n => n.id === fileNodeId)) {
                    d3Nodes.push({
                        id: fileNodeId,
                        group: 'drift_file',
                        name: f.filename
                    });
                    // Link file to its owner
                    d3Links.push({
                        source: fileNodeId,
                        target: f.user_id.toString(),
                        type: 'drift'
                    });
                }
            });
        }

        drawGraph(d3Nodes, d3Links);

      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    const drawGraph = (nodes: D3Node[], links: D3Link[]) => {
      const width = wrapperRef.current?.clientWidth || window.innerWidth;
      const height = wrapperRef.current?.clientHeight || window.innerHeight;

      const svgSelection = d3.select(svgRef.current);
      svgSelection.selectAll('*').remove();

      const svg = svgSelection
        .attr('viewBox', [0, 0, width, height])
        .style('width', '100%')
        .style('height', '100%')
        .style('background', 'radial-gradient(circle at center, #1a1c24ff 0%, var(--bg-color) 80%)');

      const g = svg.append('g');

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);

      const simulation = d3.forceSimulation<D3Node, D3Link>(nodes)
        .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(d => d.type === 'sym' ? 80 : 120))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(25));

      const defs = svg.append('defs');
      
      const filter = defs.append("filter")
          .attr("id", "glow");
      filter.append("feGaussianBlur")
          .attr("stdDeviation", "2.5")
          .attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      // Avatar Patterns
      nodes.forEach(d => {
        if (d.avatar_url) {
            defs.append('pattern')
                .attr('id', `avatar-${d.id}`)
                .attr('height', '100%')
                .attr('width', '100%')
                .attr('patternContentUnits', 'objectBoundingBox')
                .append('image')
                .attr('height', 1)
                .attr('width', 1)
                .attr('preserveAspectRatio', 'xMidYMid slice')
                .attr('href', d.avatar_url);
        }
      });

      defs.selectAll('marker')
        .data(['end-asym'])
        .join('marker')
        .attr('id', d => d)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', 'var(--accent-asym)')
        .attr('d', 'M0,-5L10,0L0,5');

      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', (d) => d.type === 'sym' ? 'var(--accent-sym)' : 'var(--accent-asym)')
        .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1)
        .attr('opacity', (d) => d.type === 'sym' ? 0.8 : 0.4)
        .attr('stroke-dasharray', (d) => d.type === 'sym' ? 'none' : '4,4')
        .attr('marker-end', (d) => d.type === 'asym' ? 'url(#end-asym)' : null)
        .style('filter', (d) => d.type === 'sym' ? 'url(#glow)' : 'none');

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(drag(simulation) as any)
        .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick(d.id);
        })
        .on('mouseover', (event, d) => {
          setTooltip({
            x: event.clientX,
            y: event.clientY,
            content: d.name
          });
          link.attr('opacity', l => (l.source === d || l.target === d) ? 1 : 0.1);
          node.attr('opacity', n => {
            const isConnected = links.some(l => (l.source === d && l.target === n) || (l.target === d && l.source === n));
            return (n === d || isConnected) ? 1 : 0.2;
          });
        })
        .on('mouseout', () => {
          setTooltip(prev => ({ ...prev, content: null }));
          link.attr('opacity', (d) => d.type === 'sym' ? 0.8 : (d.type === 'drift' ? 0.2 : 0.4));
          node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1);
        });

      // Initial Opacity for drift nodes
      node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1);

      node.append('circle')
        .attr('r', (d) => {
            if (d.group === 'me') return 12;
            if (d.group === 'drift_file') return 4;
            return 8;
        })
        .attr('fill', (d) => {
          if (d.avatar_url) return `url(#avatar-${d.id})`;
          if (d.group === 'me') return 'var(--accent-me)';
          if (d.group === 'sym') return 'var(--accent-sym)';
          if (d.group === 'asym') return 'var(--accent-asym)';
          if (d.group === 'drift_user') return '#555555';
          if (d.group === 'drift_file') return '#888888';
          return '#333333ff';
        })
        .attr('stroke', 'transparent')
        .attr('stroke-width', 20)
        .style('filter', (d) => (d.group === 'sym' || d.group === 'me') ? 'url(#glow)' : 'none');

      node.append('circle')
        .attr('r', (d) => {
            if (d.group === 'me') return 12;
            if (d.group === 'drift_file') return 4;
            return 8;
        })
        .attr('fill', 'transparent')
        .attr('stroke', (d) => {
           if (d.group === 'me') return '#ffffffcc';
           if (d.group === 'sym') return 'var(--accent-sym)';
           if (d.group === 'drift_file') return 'transparent';
           if (d.group === 'drift_user') return '#777';
           return 'var(--text-secondary)';
        })
        .attr('stroke-width', 1.5);

      node.append('text')
        .text(d => d.name)
        .attr('dy', 25)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-primary)')
        .attr('font-size', '10px')
        .attr('opacity', d => d.group === 'me' || d.group === 'sym' ? 0.8 : 0)
        .style('pointer-events', 'none');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

      return () => simulation.stop();
    };

    fetchData();
  }, [currentUserId, onNodeClick, isDrifting, driftData]);

  const drag = (simulation: d3.Simulation<D3Node, D3Link>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag<Element, D3Node>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  };

  return (
    <div ref={wrapperRef} className="association-web-container" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <svg ref={svgRef}></svg>
      {tooltip.content && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 10,
          top: tooltip.y + 10,
          background: '#000000cc',
          border: '1px solid var(--accent-sym)',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 100
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default AssociationWeb;