/**
 * Association Web Visualization Component
 * D3.js-based network graph showing user connections and content relationships
 */

export class AssociationWeb {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            nodeRadius: options.nodeRadius || 8,
            linkDistance: options.linkDistance || 100,
            charge: options.charge || -300,
            ...options
        };
        
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
    }

    async init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container ${this.containerId} not found`);
            return;
        }

        // Create SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', this.options.width)
            .attr('height', this.options.height)
            .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
            .style('max-width', '100%')
            .style('height', 'auto');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.select('.graph-container')
                    .attr('transform', event.transform);
            });

        this.svg.call(zoom);

        // Create container for graph elements
        this.graphContainer = this.svg.append('g')
            .attr('class', 'graph-container');

        // Create simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(this.options.linkDistance))
            .force('charge', d3.forceManyBody().strength(this.options.charge))
            .force('center', d3.forceCenter(this.options.width / 2, this.options.height / 2))
            .force('collision', d3.forceCollide().radius(this.options.nodeRadius * 2));

        await this.loadData();
        this.render();
    }

    async loadData() {
        try {
            const response = await window.r3l.apiGet('/api/network');
            this.nodes = response.nodes || [];
            this.links = response.links || [];
            
            // Add visibility filtering
            if (window.r3l.isAuthenticated()) {
                const visibility = await window.r3l.apiGet('/api/user/visibility');
                this.filterByVisibility(visibility);
            }
        } catch (error) {
            console.error('Failed to load network data:', error);
            this.nodes = [];
            this.links = [];
        }
    }

    filterByVisibility(userVisibility) {
        // Filter out lurker mode users if they don't want to show in network
        this.nodes = this.nodes.filter(node => {
            if (node.type === 'user' && node.visibility) {
                return node.visibility.showInNetwork !== false;
            }
            return true;
        });

        // Update links to match filtered nodes
        const nodeIds = new Set(this.nodes.map(n => n.id));
        this.links = this.links.filter(link => 
            nodeIds.has(link.source) && nodeIds.has(link.target)
        );
    }

    render() {
        // Clear existing elements
        this.graphContainer.selectAll('*').remove();

        // Create links
        const link = this.graphContainer.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.links)
            .enter().append('line')
            .attr('class', d => `link link-${d.type}`)
            .attr('stroke', d => this.getLinkColor(d.type))
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.6);

        // Create nodes
        const node = this.graphContainer.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', d => `node node-${d.type}`)
            .call(this.drag());

        // Add circles for nodes
        node.append('circle')
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('opacity', d => d.visibility?.mode === 'lurker' ? 0.5 : 1);

        // Add labels
        node.append('text')
            .text(d => d.label)
            .attr('x', 0)
            .attr('y', d => this.getNodeRadius(d) + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#333')
            .style('pointer-events', 'none');

        // Add click handlers
        node.on('click', (event, d) => this.handleNodeClick(event, d))
            .on('mouseover', (event, d) => this.handleNodeHover(event, d))
            .on('mouseout', (event, d) => this.handleNodeOut(event, d));

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);

        // Add tick handler
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        this.simulation.restart();
    }

    getNodeColor(type) {
        const colors = {
            user: '#4f46e5',
            content: '#059669',
            workspace: '#dc2626'
        };
        return colors[type] || '#6b7280';
    }

    getLinkColor(type) {
        const colors = {
            follows: '#8b5cf6',
            author: '#f59e0b',
            collaborates: '#ef4444'
        };
        return colors[type] || '#9ca3af';
    }

    getNodeRadius(node) {
        if (node.type === 'user') {
            return node.visibility?.mode === 'lurker' ? 6 : this.options.nodeRadius;
        }
        return this.options.nodeRadius;
    }

    handleNodeClick(event, node) {
        event.stopPropagation();
        
        if (node.type === 'user') {
            window.location.href = `/profile.html?user=${node.id.replace('user-', '')}`;
        } else if (node.type === 'content') {
            window.location.href = `/content.html?id=${node.id.replace('content-', '')}`;
        }
    }

    handleNodeHover(event, node) {
        // Highlight connected nodes and links
        this.svg.selectAll('.node')
            .style('opacity', 0.3);
        
        this.svg.selectAll('.link')
            .style('opacity', 0.1);

        // Highlight current node and its connections
        const connectedNodes = new Set([node.id]);
        this.links.forEach(link => {
            if (link.source.id === node.id || link.target.id === node.id) {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            }
        });

        this.svg.selectAll('.node')
            .filter(d => connectedNodes.has(d.id))
            .style('opacity', 1);

        this.svg.selectAll('.link')
            .filter(d => d.source.id === node.id || d.target.id === node.id)
            .style('opacity', 0.8);

        // Show tooltip
        this.showTooltip(event, node);
    }

    handleNodeOut(event, node) {
        // Reset opacity
        this.svg.selectAll('.node').style('opacity', 1);
        this.svg.selectAll('.link').style('opacity', 0.6);
        
        // Hide tooltip
        this.hideTooltip();
    }

    showTooltip(event, node) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'association-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        tooltip.html(`
            <strong>${node.label}</strong><br>
            Type: ${node.type}<br>
            ${node.visibility?.mode === 'lurker' ? 'Mode: Lurker<br>' : ''}
            Click to view
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        d3.selectAll('.association-tooltip').remove();
    }

    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    async refresh() {
        await this.loadData();
        this.render();
    }

    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.svg) {
            this.svg.remove();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('association-web-container')) {
        const web = new AssociationWeb('association-web-container');
        web.init();
        
        // Make it globally accessible for refresh
        window.associationWeb = web;
    }
});