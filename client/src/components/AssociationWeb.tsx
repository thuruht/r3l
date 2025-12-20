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
  
  // Refs to hold D3 objects for external manipulation
  const svgSelectionRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gSelectionRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({ width: wrapperRef.current.clientWidth, height: wrapperRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const zoomToFit = () => {
    if (!svgSelectionRef.current || !zoomBehaviorRef.current || !gSelectionRef.current || nodes.length === 0) return;

    const width = dimensions.width;
    const height = dimensions.height;
    
    // We need to query the D3 nodes.
    const d3Nodes = svgSelectionRef.current.selectAll<SVGGElement, D3Node>('g > g').data();
    if (d3Nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    d3Nodes.forEach(d => {
        if (typeof d.x === 'number' && typeof d.y === 'number') {
            minX = Math.min(minX, d.x);
            minY = Math.min(minY, d.y);
            maxX = Math.max(maxX, d.x);
            maxY = Math.max(maxY, d.y);
        }
    });

    if (minX === Infinity) return; // No valid coordinates yet

    const padding = 50;
    const bboxWidth = maxX - minX + padding * 2;
    const bboxHeight = maxY - minY + padding * 2;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const scale = Math.min(width / bboxWidth, height / bboxHeight);
    // Limit scale to avoiding zooming in too much (e.g. single node)
    const limitedScale = Math.min(scale, 1.5); 

    const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(limitedScale)
        .translate(-midX, -midY);

    svgSelectionRef.current.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
  };

  // Auto-zoom when nodes array length changes significantly (e.g. drift toggle)
  useEffect(() => {
      // Small timeout to allow simulation to assign initial positions
      const timer = setTimeout(() => {
          zoomToFit();
      }, 500); 
      return () => clearTimeout(timer);
  }, [nodes.length, isDrifting]);


  useEffect(() => {
    if (!svgRef.current) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // Clear previous if total reset needed
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .style('width', '100%')
      .style('height', '100%')
      // Apply Mist Density via gradient or opacity
      .style('background', `radial-gradient(circle at center, #1a1c24ff ${(theme_preferences.mistDensity || 0.5) * 100}%, var(--bg-color) 100%)`);

    svgSelectionRef.current = svg;

    if (isDrifting) {
        svg.append('circle')
           .attr('cx', width / 2)
           .attr('cy', height / 2)
           .attr('r', 0)
           .attr('fill', 'none')
           .attr('stroke', 'var(--accent-sym)')
           .attr('stroke-width', 2)
           .attr('opacity', 0.5)
           .classed('radar-scan', true);
    }

    const g = svg.append('g');
    gSelectionRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial Data Setup
    const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
    const d3Links: D3Link[] = links.map(l => ({ ...l }));

    const simulation = d3.forceSimulation<D3Node, D3Link>(d3Nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(d => d.type === 'sym' ? 80 : (d.type === 'drift' ? 60 : 120)))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('radial', d3.forceRadial(Math.min(width, height) / 3, width / 2, height / 2).strength(0.1))
      .force('collide', d3.forceCollide(30));

    // Hull Drawing Helper
    const hullLayer = svg.append('g').attr('class', 'hulls');

    // Defs & Filters (Markers, Glows)
    const defs = svg.append('defs');
    
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const onlineGlow = defs.append("filter").attr("id", "online-glow");
    onlineGlow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    onlineGlow.append("feMerge").append("feMergeNode").attr("in", "coloredBlur");

    d3Nodes.forEach(d => {
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

    // Draw Links
    const link = g.append('g')
      .selectAll('line')
      .data(d3Links)
      .join('line')
      // Use Custom Colors
      .attr('stroke', (d) => d.type === 'sym' ? node_primary_color : node_secondary_color)
      .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1)
      .attr('opacity', (d) => d.type === 'sym' ? 0.8 : 0.4)
      .attr('stroke-dasharray', (d) => d.type === 'sym' ? 'none' : '4,4')
      .attr('marker-end', (d) => d.type === 'asym' ? 'url(#end-asym)' : null)
      .style('filter', (d) => d.type === 'sym' ? 'url(#glow)' : 'none');

    // Draw Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(d3Nodes)
      .join('g')
      .classed('drift-pulse', d => d.group.startsWith('drift'))
      .call(drag(simulation) as any)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      })
      .on('mouseover', (event, d) => {
        setTooltip({ x: event.clientX, y: event.clientY, content: d.name });
        // Hover highlighting logic
        const neighbors = new Set<string>();
        const relatedLinks = new Set<D3Link>();
        d3Links.forEach(l => {
          if ((l.source as D3Node).id === d.id) { neighbors.add((l.target as D3Node).id); relatedLinks.add(l); } 
          else if ((l.target as D3Node).id === d.id) { neighbors.add((l.source as D3Node).id); relatedLinks.add(l); }
        });
        neighbors.add(d.id);

        node.attr('opacity', n => neighbors.has(n.id) ? 1 : 0.1)
            .select('circle:nth-child(2)')
            .attr('stroke', n => {
              if (n.id === d.id || neighbors.has(n.id)) return node_primary_color;
              if (n.online) return 'var(--accent-online)';
              if (n.group === 'me') return '#ffffffcc';
              if (n.group === 'sym') return node_primary_color;
              return 'var(--text-secondary)';
            })
            .attr('stroke-width', n => (n.id === d.id || neighbors.has(n.id)) ? 2.5 : (n.online ? 2.0 : 1.5));

        link.attr('opacity', l => relatedLinks.has(l) ? 1 : 0.05)
            .attr('stroke', l => relatedLinks.has(l) ? 'var(--accent-sym-bright)' : (l.type === 'sym' ? node_primary_color : node_secondary_color))
            .attr('stroke-width', l => relatedLinks.has(l) ? 2.5 : (l.type === 'sym' ? 2 : 1));
      })
      .on('mouseout', () => {
        setTooltip(prev => ({ ...prev, content: null }));
        // Reset styles
        node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1)
            .select('circle:nth-child(2)')
            .attr('stroke', (d) => {
               if (d.online) return 'var(--accent-online)';
               if (d.group === 'me') return '#ffffffcc';
               if (d.group === 'sym') return node_primary_color;
               if (d.group === 'drift_file') return 'transparent';
               if (d.group === 'drift_user') return '#777';
               return 'var(--text-secondary)';
            })
            .attr('stroke-width', d => d.online ? 2.0 : 1.5);
        link.attr('opacity', (d) => d.type === 'sym' ? 0.8 : (d.type === 'drift' ? 0.2 : 0.4))
            .attr('stroke', (d) => d.type === 'sym' ? node_primary_color : node_secondary_color)
            .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1);
      });

    node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1);

    node.append('circle')
      .attr('r', (d) => {
          if (d.group === 'me') return node_size * 1.5;
          if (d.group === 'drift_file') return node_size * 0.5;
          return node_size; // Use customized size
      })
      .attr('fill', (d) => {
        if (d.avatar_url) return `url(#avatar-${d.id})`;
        if (d.group === 'me') return 'var(--accent-me)';
        if (d.group === 'sym') return node_primary_color;
        if (d.group === 'asym') return node_secondary_color;
        if (d.group === 'drift_user') return '#555555';
        if (d.group === 'drift_file') return '#888888';
        return '#333333ff';
      })
      .attr('stroke', 'transparent')
      .attr('stroke-width', 20)
      .style('filter', (d) => (d.group === 'sym' || d.group === 'me') ? 'url(#glow)' : (d.online ? 'url(#online-glow)' : 'none'));

    node.append('circle')
      .attr('r', (d) => {
          if (d.group === 'me') return node_size * 1.5;
          if (d.group === 'drift_file') return node_size * 0.5;
          return node_size;
      })
      .attr('fill', 'transparent')
      .attr('stroke', (d) => {
         if (d.online) return 'var(--accent-online)';
         if (d.group === 'me') return '#ffffffcc';
         if (d.group === 'sym') return node_primary_color;
         if (d.group === 'drift_file') return 'transparent';
         if (d.group === 'drift_user') return '#777';
         return 'var(--text-secondary)';
      })
      .attr('stroke-width', d => d.online ? 2.0 : 1.5);

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

      // Update Hulls
      if (collections.length > 0) {
        const hullData = collections.map(collection => {
             // Find all nodes in this collection
             const collectionNodes = d3Nodes.filter(n => {
                 // The 'file-ID' format in nodes.id vs file_ids in collection
                 if (n.group === 'drift_file') {
                     const fileId = parseInt(n.id.replace('file-', ''));
                     return collection.file_ids.includes(fileId);
                 }
                 // If we had collection-specific nodes, check them here.
                 // Currently we only have Drift Files or "My Files" if we loaded them.
                 // Assuming we might map local files to nodes eventually.
                 return false;
             }).map(n => [n.x, n.y] as [number, number]);

             if (collectionNodes.length < 3) return null; // Need 3 points for a hull
             return { id: collection.id, name: collection.name, points: collectionNodes };
        }).filter(h => h !== null);

        hullLayer.selectAll('path')
           .data(hullData as any[])
           .join('path')
           .attr('d', (d: any) => {
               const hull = d3.polygonHull(d.points);
               return hull ? `M${hull.join('L')}Z` : null;
           })
           .attr('fill', node_primary_color) // Use theme color
           .attr('fill-opacity', 0.1)
           .attr('stroke', node_primary_color)
           .attr('stroke-width', 1)
           .attr('stroke-opacity', 0.3)
           .attr('stroke-linejoin', 'round');
      }
    });

    return () => simulation.stop();
  }, [nodes, links, collections, onNodeClick, isDrifting, onlineUserIds, dimensions, node_primary_color, node_secondary_color, node_size, theme_preferences]);

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
        onClick={zoomToFit}
        style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 100,
            padding: '8px',
            background: 'var(--drawer-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '4px',
            cursor: 'pointer'
        }}
        title="Zoom to Fit"
        aria-label="Zoom to fit"
      >
        <IconMaximize size={20} />
      </button>

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

      <CustomizationSettings />
    </div>
  );
};

export default AssociationWeb;
