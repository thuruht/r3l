import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { IconMaximize } from '@tabler/icons-react';
import { NetworkNode, NetworkLink, NetworkCollection } from '../hooks/useNetworkData';
import { useCustomization } from '../context/CustomizationContext';
import CustomizationSettings from './CustomizationSettings';

interface AssociationWebProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  collections?: NetworkCollection[];
  onNodeClick: (nodeId: string) => void;
  isDrifting: boolean;
  onlineUserIds: Set<number>;
}

interface D3Node extends d3.SimulationNodeDatum, NetworkNode {}
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: 'sym' | 'asym' | 'drift' | 'collection';
}

const AssociationWeb: React.FC<AssociationWebProps> = ({ nodes, links, collections = [], onNodeClick, isDrifting, onlineUserIds }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { node_primary_color, node_secondary_color, node_size, theme_preferences } = useCustomization();
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string | null }>({ x: 0, y: 0, content: null });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Persistence Refs
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({ width: wrapperRef.current.clientWidth, height: wrapperRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialization (Run once)
  useEffect(() => {
      if (!svgRef.current) return;

      const width = dimensions.width;
      const height = dimensions.height;

      // 1. Setup SVG
      const svg = d3.select(svgRef.current)
        .attr('viewBox', [0, 0, width, height])
        .style('width', '100%')
        .style('height', '100%');

      svgSelectionRef.current = svg;

      // 2. Setup Container Group (for Zoom)
      let g = svg.select<SVGGElement>('g.main-group');
      if (g.empty()) {
          g = svg.append('g').attr('class', 'main-group');
      }
      gRef.current = g;

      // 3. Setup Layers (Order matters)
      if (g.select('.links').empty()) g.append('g').attr('class', 'links');
      if (g.select('.hulls').empty()) g.append('g').attr('class', 'hulls'); // Hulls below nodes? or above? Let's put below
      if (g.select('.nodes').empty()) g.append('g').attr('class', 'nodes');

      // 4. Setup Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });
      zoomBehaviorRef.current = zoom;
      svg.call(zoom);

      // 5. Setup Defs (Markers, Filters)
      let defs = svg.select('defs');
      if (defs.empty()) {
          defs = svg.append('defs');

          const filter = defs.append("filter").attr("id", "glow");
          filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
          const feMerge = filter.append("feMerge");
          feMerge.append("feMergeNode").attr("in", "coloredBlur");
          feMerge.append("feMergeNode").attr("in", "SourceGraphic");

          const onlineGlow = defs.append("filter").attr("id", "online-glow");
          onlineGlow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
          onlineGlow.append("feMerge").append("feMergeNode").attr("in", "coloredBlur");

          defs.append('marker')
            .attr('id', 'end-asym')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', 'var(--accent-asym)')
            .attr('d', 'M0,-5L10,0L0,5');
      }

      // 6. Setup Simulation
      if (!simulationRef.current) {
          simulationRef.current = d3.forceSimulation<D3Node, D3Link>()
            .force('link', d3.forceLink<D3Node, D3Link>().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('radial', d3.forceRadial(Math.min(width, height) / 3, width / 2, height / 2).strength(0.1))
            .force('collide', d3.forceCollide(30));
      }

      return () => {
          simulationRef.current?.stop();
      };
  }, []); // Run once on mount

  // Data Updates & Rendering Loop
  useEffect(() => {
      if (!simulationRef.current || !gRef.current || !svgSelectionRef.current) return;

      const simulation = simulationRef.current;
      const g = gRef.current;
      const svg = svgSelectionRef.current;
      const defs = svg.select('defs');

      // Update Dimensions
      svg.attr('viewBox', [0, 0, dimensions.width, dimensions.height])
         .style('background', `radial-gradient(circle at center, #1a1c24ff ${(theme_preferences.mistDensity || 0.5) * 100}%, var(--bg-color) 100%)`);

      simulation.force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2));
      simulation.force('radial', d3.forceRadial(Math.min(dimensions.width, dimensions.height) / 3, dimensions.width / 2, dimensions.height / 2).strength(0.1));

      // --- Data Merging Strategy ---
      // Preserve existing nodes to keep x,y,vx,vy
      const oldNodes = new Map(simulation.nodes().map(d => [d.id, d]));
      const newNodes = nodes.map(n => {
          const old = oldNodes.get(n.id);
          if (old) {
              // Merge, preserving simulation state
              return Object.assign(old, n);
          }
          // New node
          return { ...n } as D3Node;
      });

      // Update Simulation Data
      simulation.nodes(newNodes);
      // Create mutable link objects for the simulation
      const mutableLinks = links.map(l => ({ ...l }));

      (simulation.force('link') as d3.ForceLink<D3Node, D3Link>)
          .links(mutableLinks)
          .distance(d => d.type === 'sym' ? 80 : (d.type === 'drift' ? 60 : 120));

      // Re-heat only slightly if nodes changed count (avoid jumping)
      if (nodes.length !== oldNodes.size) {
          simulation.alpha(0.3).restart();
      } else {
          // If only data updated, keep simmering or let cool
          if (simulation.alpha() < 0.1) simulation.alpha(0.1).restart();
      }

      // --- Rendering (Enter/Update/Exit) ---

      // 1. Avatars in Defs
      const avatarPattern = defs.selectAll('pattern')
          .data(newNodes.filter(n => n.avatar_url), (d: any) => d.id);

      avatarPattern.exit().remove();

      const avatarEnter = avatarPattern.enter().append('pattern')
          .attr('id', d => `avatar-${d.id}`)
          .attr('height', '100%')
          .attr('width', '100%')
          .attr('patternContentUnits', 'objectBoundingBox');

      avatarEnter.append('image')
          .attr('height', 1)
          .attr('width', 1)
          .attr('preserveAspectRatio', 'xMidYMid slice');

      // Update existing & entered
      avatarPattern.merge(avatarEnter).select('image')
          .attr('href', d => d.avatar_url || '');


      // 2. Links
      // Use mutableLinks which will be updated by the simulation with object references
      const linkSelection = g.select('.links').selectAll<SVGLineElement, D3Link>('line')
          .data(mutableLinks, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`); // Use unique ID for key

      linkSelection.exit().remove();

      const linkEnter = linkSelection.enter().append('line');

      const allLinks = linkEnter.merge(linkSelection)
          .attr('stroke', (d) => d.type === 'sym' ? node_primary_color : node_secondary_color)
          .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1)
          .attr('opacity', (d) => d.type === 'sym' ? 0.8 : 0.4)
          .attr('stroke-dasharray', (d) => d.type === 'sym' ? 'none' : '4,4')
          .attr('marker-end', (d) => d.type === 'asym' ? 'url(#end-asym)' : null)
          .style('filter', (d) => d.type === 'sym' ? 'url(#glow)' : 'none');


      // 3. Nodes
      const nodeSelection = g.select('.nodes').selectAll<SVGGElement, D3Node>('g.node')
          .data(newNodes, d => d.id);

      nodeSelection.exit().transition().duration(300).attr('opacity', 0).remove();

      const nodeEnter = nodeSelection.enter().append('g')
          .attr('class', 'node')
          .call(drag(simulation) as any)
          .on('click', (event, d) => {
              event.stopPropagation();
              onNodeClick(d.id);
          })
          .on('mouseover', (event, d) => handleMouseOver(event, d, allLinks, allNodes, node_primary_color))
          .on('mouseout', () => handleMouseOut(allLinks, allNodes, node_primary_color));

      // Circle 1 (Fill/Bg)
      nodeEnter.append('circle').attr('class', 'bg-circle');
      // Circle 2 (Stroke/Ring)
      nodeEnter.append('circle').attr('class', 'ring-circle').attr('fill', 'transparent');
      // Label
      nodeEnter.append('text')
          .attr('dy', 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .style('pointer-events', 'none');

      const allNodes = nodeEnter.merge(nodeSelection);

      // Update Attributes
      allNodes.classed('drift-pulse', d => d.group.startsWith('drift'))
          .attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1);

      allNodes.select('.bg-circle')
          .attr('r', (d) => (d.group === 'me' ? node_size * 1.5 : (d.group === 'drift_file' ? node_size * 0.5 : node_size)))
          .attr('fill', (d) => {
              if (d.avatar_url) return `url(#avatar-${d.id})`;
              if (d.group === 'me') return 'var(--accent-me)';
              if (d.group === 'sym') return node_primary_color;
              if (d.group === 'asym') return node_secondary_color;
              if (d.group === 'drift_user') return '#555555';
              if (d.group === 'drift_file') return '#888888';
              return '#333333ff';
          })
          .style('filter', (d) => (d.group === 'sym' || d.group === 'me') ? 'url(#glow)' : (d.online ? 'url(#online-glow)' : 'none'));

      allNodes.select('.ring-circle')
          .attr('r', (d) => (d.group === 'me' ? node_size * 1.5 : (d.group === 'drift_file' ? node_size * 0.5 : node_size)))
          .attr('stroke', (d) => {
              if (d.online) return 'var(--accent-online)';
              if (d.group === 'me') return '#ffffffcc';
              if (d.group === 'sym') return node_primary_color;
              if (d.group === 'drift_file') return 'transparent';
              if (d.group === 'drift_user') return '#777';
              return 'var(--text-secondary)';
          })
          .attr('stroke-width', d => d.online ? 2.0 : 1.5);

      allNodes.select('text')
          .text(d => d.name)
          .attr('fill', 'var(--text-primary)')
          .attr('opacity', d => d.group === 'me' || d.group === 'sym' ? 0.8 : 0);


      // 4. Tick Handler
      simulation.on('tick', () => {
          allLinks
            .attr('x1', (d: any) => d.source.x || 0)
            .attr('y1', (d: any) => d.source.y || 0)
            .attr('x2', (d: any) => d.target.x || 0)
            .attr('y2', (d: any) => d.target.y || 0);

          allNodes.attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);

          // Update Hulls (Simplified for performance)
          if (collections.length > 0) {
              const hullGroup = g.select('.hulls');
              const hullData = collections.map(collection => {
                  const collectionNodes = newNodes.filter(n => {
                      if (n.group === 'drift_file') {
                          const fileId = parseInt(n.id.replace('file-', ''));
                          return collection.file_ids.includes(fileId);
                      }
                      return false;
                  })
                  .filter(n => typeof n.x === 'number' && typeof n.y === 'number')
                  .map(n => [n.x!, n.y!] as [number, number]);

                  if (collectionNodes.length < 3) return null;
                  return { id: collection.id, points: collectionNodes };
              }).filter(h => h !== null);

              const hulls = hullGroup.selectAll('path').data(hullData as any[]);
              hulls.exit().remove();
              hulls.enter().append('path')
                  .merge(hulls as any)
                  .attr('d', (d: any) => {
                      if (!d.points || d.points.length < 3) return null;
                      const hull = d3.polygonHull(d.points);
                      return hull ? `M${hull.join('L')}Z` : null;
                  })
                  .attr('fill', node_primary_color)
                  .attr('fill-opacity', 0.1)
                  .attr('stroke', node_primary_color)
                  .attr('stroke-opacity', 0.3)
                  .attr('stroke-linejoin', 'round');
          }
      });

  }, [nodes, links, collections, dimensions, isDrifting, node_primary_color, node_secondary_color, node_size, theme_preferences]);

  // Helpers for Interaction
  const handleMouseOver = (event: any, d: D3Node, allLinks: any, allNodes: any, color: string) => {
      setTooltip({ x: event.clientX, y: event.clientY, content: d.name });

      const neighbors = new Set<string>();
      allLinks.each((l: D3Link) => {
          if ((l.source as D3Node).id === d.id) neighbors.add((l.target as D3Node).id);
          else if ((l.target as D3Node).id === d.id) neighbors.add((l.source as D3Node).id);
      });
      neighbors.add(d.id);

      allNodes.attr('opacity', (n: D3Node) => neighbors.has(n.id) ? 1 : 0.1);
      allLinks.attr('opacity', (l: D3Link) =>
          ((l.source as D3Node).id === d.id || (l.target as D3Node).id === d.id) ? 1 : 0.05
      );
  };

  const handleMouseOut = (allLinks: any, allNodes: any, color: string) => {
      setTooltip(prev => ({ ...prev, content: null }));
      allNodes.attr('opacity', (d: D3Node) => d.group.startsWith('drift') ? 0.6 : 1);
      allLinks.attr('opacity', (d: D3Link) => d.type === 'sym' ? 0.8 : 0.4);
  };

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
      <svg ref={svgRef} role="img" aria-label="Network visualization graph"></svg>
      
      {/* Zoom to Fit Button */}
      <button 
        onClick={() => {
            if (!svgSelectionRef.current || !zoomBehaviorRef.current || !gRef.current) return;
            const width = dimensions.width;
            const height = dimensions.height;
            const nodes = gRef.current.selectAll('.node').data() as D3Node[];
            if (nodes.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(d => {
                if (typeof d.x === 'number' && typeof d.y === 'number') {
                    minX = Math.min(minX, d.x);
                    minY = Math.min(minY, d.y);
                    maxX = Math.max(maxX, d.x);
                    maxY = Math.max(maxY, d.y);
                }
            });
            if (minX === Infinity) return;

            const padding = 50;
            const bboxWidth = maxX - minX + padding * 2;
            const bboxHeight = maxY - minY + padding * 2;
            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;
            const scale = Math.min(1.5, Math.min(width / bboxWidth, height / bboxHeight));

            const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-midX, -midY);
            svgSelectionRef.current.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
        }}
        style={{
            position: 'absolute', bottom: '20px', right: '20px', zIndex: 100, padding: '8px',
            background: 'var(--drawer-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer'
        }}
        title="Zoom to Fit"
      >
        <IconMaximize size={20} />
      </button>

      {tooltip.content && (
        <div style={{
          position: 'absolute', left: tooltip.x + 10, top: tooltip.y + 10,
          background: '#000000cc', border: '1px solid var(--accent-sym)', padding: '5px 10px',
          borderRadius: '4px', fontSize: '12px', pointerEvents: 'none', zIndex: 100
        }}>
          {tooltip.content}
        </div>
      )}

      <CustomizationSettings />
    </div>
  );
};

export default AssociationWeb;
