import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkLink } from '../hooks/useNetworkData';
import { UserPreferences } from '../context/CustomizationContext'; // Import UserPreferences

interface AssociationWebProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  onNodeClick: (nodeId: string) => void;
  isDrifting: boolean;
  onlineUserIds: Set<number>;
  userPreferences: UserPreferences | null; // New prop for user's custom preferences
}

// Map NetworkNode/Link to D3 types
interface D3Node extends d3.SimulationNodeDatum, NetworkNode {}
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: 'sym' | 'asym' | 'drift';
}

const AssociationWeb: React.FC<AssociationWebProps> = ({ nodes, links, onNodeClick, isDrifting, onlineUserIds, userPreferences }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string | null }>({ x: 0, y: 0, content: null });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({ width: wrapperRef.current.clientWidth, height: wrapperRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
      if (nodes.length === 0 && !isDrifting) return;
    }

    const drawGraph = () => {
      const width = dimensions.width;
      const height = dimensions.height;

      const svgSelection = d3.select(svgRef.current);
      svgSelection.selectAll('*').remove();

      const svg = svgSelection
        .attr('viewBox', [0, 0, width, height])
        .style('width', '100%')
        .style('height', '100%')
        .style('background', 'radial-gradient(circle at center, #1a1c24ff 0%, var(--bg-color) 80%)');

      // Add radar scan effect layer if drifting
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

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);

      // Clone nodes/links because d3 mutates them
      const d3Nodes: D3Node[] = nodes.map(n => ({ ...n }));
      const d3Links: D3Link[] = links.map(l => ({ ...l }));

      const simulation = d3.forceSimulation<D3Node, D3Link>(d3Nodes)
        .force('link', d3.forceLink<D3Node, D3Link>(d3Links).id(d => d.id).distance(d => d.type === 'sym' ? 80 : 120))
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

      const onlineGlow = defs.append("filter")
          .attr("id", "online-glow");
      onlineGlow.append("feGaussianBlur")
          .attr("stdDeviation", "3")
          .attr("result", "coloredBlur");
      const onlineFeMerge = onlineGlow.append("feMerge");
      onlineFeMerge.append("feMergeNode").attr("in", "coloredBlur");



      // Avatar Patterns
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

      const link = g.append('g')
        .selectAll('line')
        .data(d3Links)
        .join('line')
        .attr('stroke', (d) => d.type === 'sym' ? 'var(--accent-sym)' : 'var(--accent-asym)')
        .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1)
        .attr('opacity', (d) => d.type === 'sym' ? 0.8 : 0.4)
        .attr('stroke-dasharray', (d) => d.type === 'sym' ? 'none' : '4,4')
        .attr('marker-end', (d) => d.type === 'asym' ? 'url(#end-asym)' : null)
        .style('filter', (d) => d.type === 'sym' ? 'url(#glow)' : 'none');

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
          setTooltip({
            x: event.clientX,
            y: event.clientY,
            content: d.name
          });

          // Highlight the hovered node and its direct neighbors
          const neighbors = new Set<string>();
          const relatedLinks = new Set<D3Link>();

          d3Links.forEach(l => {
            if ((l.source as D3Node).id === d.id) {
              neighbors.add((l.target as D3Node).id);
              relatedLinks.add(l);
            } else if ((l.target as D3Node).id === d.id) {
              neighbors.add((l.source as D3Node).id);
              relatedLinks.add(l);
            }
          });
          neighbors.add(d.id); // Add self to neighbors

          node.attr('opacity', n => neighbors.has(n.id) ? 1 : 0.1)
              .select('circle:nth-child(2)') // The stroke circle
              .attr('stroke', n => {
                if (n.id === d.id || neighbors.has(n.id)) return 'var(--accent-sym)';
                if (n.online) return 'var(--accent-online)'; // Online but not hovered
                if (n.group === 'me') return userPreferences?.node_secondary_color || '#ffffffcc'; // Use custom secondary color
                if (n.group === 'sym') return 'var(--accent-sym)';
                if (n.group === 'drift_file') return 'transparent';
                if (n.group === 'drift_user') return '#777';
                return 'var(--text-secondary)';
              })
              .attr('stroke-width', n => (n.id === d.id || neighbors.has(n.id)) ? 2.5 : (n.online ? 2.0 : 1.5));

          link.attr('opacity', l => relatedLinks.has(l) ? 1 : 0.05)
              .attr('stroke', l => relatedLinks.has(l) ? 'var(--accent-sym-bright)' : (l.type === 'sym' ? 'var(--accent-sym)' : 'var(--accent-asym)'))
              .attr('stroke-width', l => relatedLinks.has(l) ? 2.5 : (l.type === 'sym' ? 2 : 1));
        })
        .on('mouseout', () => {
          setTooltip(prev => ({ ...prev, content: null }));
          node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1)
              .select('circle:nth-child(2)')
              .attr('stroke', (d) => {
                 if (d.online) return 'var(--accent-online)';
                 if (d.group === 'me') return userPreferences?.node_secondary_color || '#ffffffcc'; // Use custom secondary color
                 if (d.group === 'sym') return 'var(--accent-sym)';
                 if (d.group === 'drift_file') return 'transparent';
                 if (d.group === 'drift_user') return '#777';
                 return 'var(--text-secondary)';
              })
              .attr('stroke-width', d => d.online ? 2.0 : 1.5);
          link.attr('opacity', (d) => d.type === 'sym' ? 0.8 : (d.type === 'drift' ? 0.2 : 0.4))
              .attr('stroke', (d) => d.type === 'sym' ? 'var(--accent-sym)' : 'var(--accent-asym)')
              .attr('stroke-width', (d) => d.type === 'sym' ? 2 : 1);
        });

      // Initial Opacity for drift nodes
      node.attr('opacity', d => d.group.startsWith('drift') ? 0.6 : 1);

      node.append('circle')
        .attr('r', (d) => {
            if (d.group === 'me') return userPreferences?.node_size || 12; // Use custom node size
            if (d.group === 'drift_file') return 4;
            return 8;
        })
        .attr('fill', (d) => {
          if (d.avatar_url) return `url(#avatar-${d.id})`;
          if (d.group === 'me') return userPreferences?.node_primary_color || 'var(--accent-me)'; // Use custom primary color
          if (d.group === 'sym') return 'var(--accent-sym)';
          if (d.group === 'asym') return 'var(--accent-asym)';
          if (d.group === 'drift_user') return '#555555';
          if (d.group === 'drift_file') return '#888888';
          return '#333333ff';
        })
        .attr('stroke', 'transparent')
        .attr('stroke-width', 20)
        .style('filter', (d) => (d.group === 'sym' || d.group === 'me') ? 'url(#glow)' : (d.online ? 'url(#online-glow)' : 'none'));

      node.append('circle')
        .attr('r', (d) => {
            if (d.group === 'me') return userPreferences?.node_size || 12; // Use custom node size
            if (d.group === 'drift_file') return 4;
            return 8;
        })
        .attr('fill', 'transparent')
        .attr('stroke', (d) => {
           if (d.online) return 'var(--accent-online)';
           if (d.group === 'me') return userPreferences?.node_secondary_color || '#ffffffcc'; // Use custom secondary color
           if (d.group === 'sym') return 'var(--accent-sym)';
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
      });

      return () => simulation.stop();
    };

    drawGraph();
  }, [nodes, links, onNodeClick, isDrifting, onlineUserIds, dimensions, userPreferences]); // Added userPreferences to dependencies

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