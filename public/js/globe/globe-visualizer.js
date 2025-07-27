/**
 * GlobeVisualizer - A wrapper for Leaflet map visualization
 * Handles map initialization, points, connections, and markers
 */
export class GlobeVisualizer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.map = null;
    this.markers = [];
    this.connections = [];
    this.messageElement = null;
  }

  /**
   * Initialize the map
   * @returns {Promise<{loaded: boolean, error: string|null}>}
   */
  async init() {
    try {
      if (!this.container) {
        return { 
          loaded: false, 
          error: `Container element #${this.containerId} not found` 
        };
      }

      // Check if Leaflet is available
      if (!window.L) {
        console.error('Leaflet library not found. Loading from CDN as fallback.');
        
        // Try loading from CDN as fallback
        try {
          await this.loadLeafletFromCDN();
        } catch (err) {
          return { 
            loaded: false, 
            error: 'Could not load Leaflet library. Please check your internet connection.' 
          };
        }
      }

      // Initialize map
      this.map = L.map(this.containerId).setView([20, 0], 2);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(this.map);

      // Create message container for instructions
      this.createMessageContainer();
      
      // Enable map click handler for adding points
      this.map.on('click', this.onMapClick.bind(this));
      
      return { loaded: true, error: null };
    } catch (err) {
      console.error('Error initializing map:', err);
      return { 
        loaded: false, 
        error: err.message || 'Failed to initialize map' 
      };
    }
  }

  /**
   * Load Leaflet from CDN as fallback
   * @returns {Promise<void>}
   */
  loadLeafletFromCDN() {
    return new Promise((resolve, reject) => {
      // Load CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      
      script.onload = () => {
        console.log('Leaflet loaded from CDN successfully');
        resolve();
      };
      
      script.onerror = (err) => {
        console.error('Failed to load Leaflet from CDN:', err);
        reject(new Error('Failed to load Leaflet from CDN'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Create message container for map instructions
   */
  createMessageContainer() {
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'map-message';
    this.messageElement.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      pointer-events: none;
      display: none;
    `;
    this.container.appendChild(this.messageElement);
  }

  /**
   * Set a message to display on the map
   * @param {string} message 
   */
  setMessage(message) {
    if (!this.messageElement) return;
    
    this.messageElement.textContent = message;
    this.messageElement.style.display = 'block';
  }

  /**
   * Clear the current message
   */
  clearMessage() {
    if (!this.messageElement) return;
    
    this.messageElement.textContent = '';
    this.messageElement.style.display = 'none';
  }

  /**
   * Handle map click event
   * @param {object} e Click event
   */
  onMapClick(e) {
    // This is a placeholder - the actual implementation is handled by the parent
    console.log('Map clicked at:', e.latlng);
  }

  /**
   * Resize the map when container size changes
   */
  resize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * Clear all points and connections
   */
  clear() {
    // Clear markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    
    // Clear connections
    this.connections.forEach(line => line.remove());
    this.connections = [];
  }

  /**
   * Add a point to the map
   * @param {object} point Point data
   * @returns {object} The created marker
   */
  addPoint(point) {
    if (!this.map) return null;
    
    const [lng, lat] = point.coordinates;
    const { name, description, icon, color } = point.properties;
    
    // Create custom icon HTML
    const iconHtml = `
      <div class="marker-icon" style="background-color: ${color || 'var(--accent-color)'}">
        <span class="material-icons">${icon || 'place'}</span>
      </div>
    `;
    
    // Create marker with custom icon
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(this.map);
    
    // Add popup
    marker.bindPopup(`
      <div class="map-popup">
        <h4>${name || 'Untitled'}</h4>
        <p>${description || 'No description'}</p>
      </div>
    `);
    
    this.markers.push(marker);
    
    return marker;
  }
  
  /**
   * Add a temporary marker (used for placing new points)
   * @param {Array} coordinates [lng, lat]
   * @param {object} properties Properties
   * @returns {object} The created marker
   */
  addTempMarker(coordinates, properties = {}) {
    if (!this.map) return null;
    
    const [lng, lat] = coordinates;
    const { name = 'New Point' } = properties;
    
    // Create marker with pulsing icon
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `
          <div class="marker-icon" style="
            background-color: var(--accent-color);
            animation: pulse 1.5s infinite;
          ">
            <span class="material-icons">add_location</span>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>
        `,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(this.map);
    
    // Add popup
    marker.bindPopup(`<div class="map-popup"><h4>${name}</h4><p>Click to place point</p></div>`);
    marker.openPopup();
    
    this.markers.push(marker);
    
    return marker;
  }
  
  /**
   * Remove a specific marker
   * @param {object} marker The marker to remove
   */
  removeMarker(marker) {
    if (!marker) return;
    
    marker.remove();
    this.markers = this.markers.filter(m => m !== marker);
  }

  /**
   * Add a connection between two points
   * @param {object} connection Connection data
   * @returns {object} The created polyline
   */
  addConnection(connection) {
    if (!this.map) return null;
    
    const { source, target, properties } = connection;
    const { color = 'var(--accent-color)', name, description } = properties || {};
    
    // Create polyline
    const line = L.polyline([
      [source[1], source[0]], // [lat, lng]
      [target[1], target[0]]  // [lat, lng]
    ], {
      color: color,
      weight: 2,
      opacity: 0.7,
      dashArray: '5, 5'
    }).addTo(this.map);
    
    // Add popup if name or description exists
    if (name || description) {
      line.bindPopup(`
        <div class="map-popup">
          ${name ? `<h4>${name}</h4>` : ''}
          ${description ? `<p>${description}</p>` : ''}
        </div>
      `);
    }
    
    this.connections.push(line);
    
    return line;
  }
}
