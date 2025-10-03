export class GlobeVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.clickHandler = null;
        this.messageEl = null;
    }

    async init() {
        try {
            const container = document.getElementById(this.containerId);
            if (!container) {
                return { loaded: false, error: 'Container not found' };
            }

            // Check if Leaflet is loaded
            if (typeof L === 'undefined') {
                return { loaded: false, error: 'Leaflet library not loaded' };
            }

            // Initialize map
            this.map = L.map(this.containerId).setView([20, 0], 2);

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Add click handler
            this.map.on('click', (e) => {
                if (this.clickHandler) {
                    this.clickHandler(e);
                }
            });

            return { loaded: true };
        } catch (error) {
            console.error('Failed to initialize map:', error);
            return { loaded: false, error: error.message };
        }
    }

    addPoint(point) {
        if (!this.map || !point.coordinates) return;

        const [lng, lat] = point.coordinates;
        const props = point.properties || {};

        const marker = L.marker([lat, lng], {
            icon: this.createIcon(props.icon, props.color)
        }).addTo(this.map);

        if (props.name || props.description) {
            marker.bindPopup(`
                <div class="map-popup">
                    ${props.name ? `<h4>${props.name}</h4>` : ''}
                    ${props.description ? `<p>${props.description}</p>` : ''}
                </div>
            `);
        }

        this.markers.push(marker);
        return marker;
    }

    addTempMarker(coordinates, properties) {
        const [lng, lat] = coordinates;
        const marker = L.marker([lat, lng], {
            icon: this.createIcon(properties.icon, properties.color),
            draggable: true
        }).addTo(this.map);

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            document.getElementById('point-lat').value = pos.lat.toFixed(6);
            document.getElementById('point-lng').value = pos.lng.toFixed(6);
        });

        this.markers.push(marker);
        return marker;
    }

    removeMarker(marker) {
        if (marker && this.map) {
            this.map.removeLayer(marker);
            this.markers = this.markers.filter(m => m !== marker);
        }
    }

    addConnection(connection) {
        if (!this.map || !connection.source || !connection.target) return;

        const [lng1, lat1] = connection.source;
        const [lng2, lat2] = connection.target;

        const line = L.polyline([[lat1, lng1], [lat2, lng2]], {
            color: connection.properties?.color || 'var(--accent-purple)',
            weight: 2,
            opacity: 0.6
        }).addTo(this.map);

        this.markers.push(line);
        return line;
    }

    createIcon(iconType, color) {
        const iconHtml = `
            <div style="
                background: ${color || 'var(--accent-purple)'};
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                <span style="color: white; font-size: 16px;">📍</span>
            </div>
        `;

        return L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
    }

    clear() {
        this.markers.forEach(marker => {
            if (this.map) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];
    }

    resize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    setClickHandler(handler) {
        this.clickHandler = handler;
    }

    setMessage(message) {
        if (!this.messageEl) {
            this.messageEl = document.createElement('div');
            this.messageEl.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--accent-purple);
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: var(--radius-md);
                z-index: 1000;
                box-shadow: var(--shadow-medium);
            `;
            document.getElementById(this.containerId).parentElement.appendChild(this.messageEl);
        }
        this.messageEl.textContent = message;
        this.messageEl.style.display = 'block';
    }

    clearMessage() {
        if (this.messageEl) {
            this.messageEl.style.display = 'none';
        }
    }

    onMapClick(event) {
        // Simulate a click event for programmatic use
        if (this.clickHandler) {
            this.clickHandler(event);
        }
    }
}
