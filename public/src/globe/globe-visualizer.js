/**
 * GlobeVisualizer - A class for visualizing geographic data on a map
 * Wrapper around Leaflet for the R3L:F application
 */
export class GlobeVisualizer {
  /**
   * Constructor for GlobeVisualizer
   * @param {string} containerId - The ID of the container element
   */
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.points = new Map();
    this.connections = new Map();
    this.loaded = false;
  }

  /**
   * Initialize the map
   * @returns {Promise<{loaded: boolean, error: string|null}>}
   */
  async init() {
    try {
      const container = document.getElementById(this.containerId);
      
      if (!container) {
        return { loaded: false, error: 'Container element not found' };
      }
      
      // Check if Leaflet is loaded
      if (!window.L) {
        return { loaded: false, error: 'Leaflet library not loaded' };
      }
      
      // Create the map
      this.map = L.map(container, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true
      });
      
      // Add the tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      }).addTo(this.map);
      
      // Add zoom controls
      L.control.zoom({
        position: 'bottomright'
      }).addTo(this.map);
      
      this.loaded = true;
      return { loaded: true, error: null };
    } catch (error) {
      console.error('Error initializing map:', error);
      return { loaded: false, error: error.message || 'Failed to initialize map' };
    }
  }
  
  /**
   * Add a point to the map
   * @param {Object} point - The point data
   * @param {Array<number>} point.coordinates - [longitude, latitude]
   * @param {Object} point.properties - Properties of the point
   */
  addPoint(point) {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    try {
      const { coordinates, properties } = point;
      const [longitude, latitude] = coordinates;
      
      // Create a marker with custom icon
      const markerOptions = {
        title: properties.name || 'Unnamed point',
        alt: properties.description || '',
        riseOnHover: true
      };
      
      // Create the marker
      const marker = L.marker([latitude, longitude], markerOptions).addTo(this.map);
      
      // Add popup with info
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${properties.name || 'Unnamed point'}</h4>
          <p>${properties.description || 'No description'}</p>
        </div>
      `);
      
      // Store the marker
      const id = `point-${this.points.size}`;
      this.points.set(id, {
        marker,
        data: point
      });
      
      return id;
    } catch (error) {
      console.error('Error adding point:', error);
      return null;
    }
  }
  
  /**
   * Add a connection between two points
   * @param {Object} connection - The connection data
   * @param {Array<number>} connection.source - [longitude, latitude] of source
   * @param {Array<number>} connection.target - [longitude, latitude] of target
   * @param {Object} connection.properties - Properties of the connection
   */
  addConnection(connection) {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    try {
      const { source, target, properties } = connection;
      const [sourceLong, sourceLat] = source;
      const [targetLong, targetLat] = target;
      
      // Create a line
      const line = L.polyline(
        [[sourceLat, sourceLong], [targetLat, targetLong]],
        {
          color: properties.color || '#3388ff',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5',
          smoothFactor: 1
        }
      ).addTo(this.map);
      
      // Add popup with info
      line.bindPopup(`
        <div class="map-popup">
          <h4>${properties.name || 'Connection'}</h4>
          <p>${properties.description || 'No description'}</p>
        </div>
      `);
      
      // Store the line
      const id = `connection-${this.connections.size}`;
      this.connections.set(id, {
        line,
        data: connection
      });
      
      return id;
    } catch (error) {
      console.error('Error adding connection:', error);
      return null;
    }
  }
  
  /**
   * Clear all points and connections from the map
   */
  clear() {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    // Remove all points
    this.points.forEach(point => {
      this.map.removeLayer(point.marker);
    });
    this.points.clear();
    
    // Remove all connections
    this.connections.forEach(connection => {
      this.map.removeLayer(connection.line);
    });
    this.connections.clear();
  }
  
  /**
   * Resize the map to fit the container
   */
  resize() {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    this.map.invalidateSize();
  }
}
