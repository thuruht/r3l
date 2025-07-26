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
    this.tempMarkers = new Map();
    this.loaded = false;
    this.clickHandler = null;
    this.messageControl = null;
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
      
      // Create a message control
      this.messageControl = L.control({ position: 'topcenter' });
      
      this.messageControl.onAdd = function() {
        this._div = L.DomUtil.create('div', 'map-message-control hidden');
        return this._div;
      };
      
      this.messageControl.update = function(message) {
        if (!message) {
          this._div.classList.add('hidden');
          return;
        }
        
        this._div.innerHTML = message;
        this._div.classList.remove('hidden');
      };
      
      // Create custom control position
      const createCustomPositions = () => {
        const mapContainer = this.map.getContainer();
        const controlCorners = mapContainer.querySelectorAll('.leaflet-control-container');
        
        if (controlCorners.length > 0) {
          const controlContainer = controlCorners[0];
          
          // Create top center control corner
          const topCenter = L.DomUtil.create('div', 'leaflet-top leaflet-center');
          controlContainer.appendChild(topCenter);
        }
      };
      
      createCustomPositions();
      this.messageControl.addTo(this.map);
      
      // Add CSS for the control position
      const style = document.createElement('style');
      style.innerHTML = `
        .leaflet-center {
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }
        
        .map-message-control {
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 15px;
          border-radius: 4px;
          margin-top: 10px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
          font-size: 14px;
          text-align: center;
          max-width: 300px;
          transition: opacity 0.3s;
        }
        
        .map-message-control.hidden {
          display: none;
        }
      `;
      document.head.appendChild(style);
      
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
   * Add a temporary marker (for point creation)
   * @param {Array<number>} coordinates - [longitude, latitude]
   * @param {Object} properties - Properties for the marker
   * @returns {string} Marker ID
   */
  addTempMarker(coordinates, properties) {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return null;
    }
    
    try {
      const [longitude, latitude] = coordinates;
      
      // Create marker options
      const markerOptions = {
        title: properties.name || 'New Point',
        alt: properties.description || '',
        riseOnHover: true,
        draggable: true // Allow dragging
      };
      
      // Create the marker
      const marker = L.marker([latitude, longitude], markerOptions).addTo(this.map);
      
      // Add popup with info
      marker.bindPopup(`
        <div class="map-popup">
          <h4>${properties.name || 'New Point'}</h4>
          <p>${properties.description || 'Your new map point'}</p>
        </div>
      `);
      
      // Handle marker drag for updating form
      marker.on('dragend', (event) => {
        const latlng = marker.getLatLng();
        
        // Find and update form inputs if they exist
        const latInput = document.getElementById('point-lat');
        const lngInput = document.getElementById('point-lng');
        
        if (latInput && lngInput) {
          latInput.value = latlng.lat.toFixed(6);
          lngInput.value = latlng.lng.toFixed(6);
        }
      });
      
      // Store the marker
      const id = `temp-${Date.now()}`;
      this.tempMarkers.set(id, {
        marker,
        data: { coordinates, properties }
      });
      
      return id;
    } catch (error) {
      console.error('Error adding temp marker:', error);
      return null;
    }
  }
  
  /**
   * Remove a marker from the map
   * @param {string} markerId - The ID of the marker to remove
   */
  removeMarker(markerId) {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    try {
      // Check if it's a temporary marker
      if (this.tempMarkers.has(markerId)) {
        const { marker } = this.tempMarkers.get(markerId);
        this.map.removeLayer(marker);
        this.tempMarkers.delete(markerId);
        return true;
      }
      
      // Check if it's a regular point
      if (this.points.has(markerId)) {
        const { marker } = this.points.get(markerId);
        this.map.removeLayer(marker);
        this.points.delete(markerId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error removing marker:', error);
      return false;
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
   * Set up a click handler for the map
   * @param {Function} callback - The function to call when map is clicked
   */
  onMapClick(callback) {
    if (!this.loaded || !this.map) {
      console.error('Map not loaded');
      return;
    }
    
    // Remove existing click handler if any
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
    }
    
    // Set new click handler
    this.clickHandler = callback;
    this.map.on('click', this.clickHandler);
  }
  
  /**
   * Set a message to display on the map
   * @param {string} message - The message to display
   */
  setMessage(message) {
    if (!this.messageControl) return;
    this.messageControl.update(message);
  }
  
  /**
   * Clear any displayed message
   */
  clearMessage() {
    if (!this.messageControl) return;
    this.messageControl.update(null);
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
    
    // Remove all temp markers
    this.tempMarkers.forEach(marker => {
      this.map.removeLayer(marker.marker);
    });
    this.tempMarkers.clear();
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
