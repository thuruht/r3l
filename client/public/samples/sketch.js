// R3L:F — Signal Processor
// A sample JavaScript file for testing code editing + collaboration

class SignalNode {
  constructor(id, frequency, amplitude) {
    this.id = id;
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.connections = new Map();
    this.lastPulse = Date.now();
  }

  connect(target) {
    if (!this.connections.has(target.id)) {
      this.connections.set(target.id, target);
      target.connections.set(this.id, this);
      return 'SYM';
    }
    return 'A-SYM';
  }

  pulse() {
    const now = Date.now();
    const elapsed = now - this.lastPulse;
    const signal = this.amplitude * Math.sin(2 * Math.PI * this.frequency * elapsed / 1000);

    for (const [id, node] of this.connections) {
      node.receive(this.id, signal);
    }

    this.lastPulse = now;
    return signal;
  }

  receive(fromId, signal) {
    const attenuated = signal * 0.97;
    // TODO: implement resonance detection
    return attenuated;
  }
}

function createDriftNetwork(size = 12) {
  const nodes = [];
  for (let i = 0; i < size; i++) {
    nodes.push(new SignalNode(
      `node_${i}`,
      0.1 + Math.random() * 2,
      0.5 + Math.random() * 1.5
    ));
  }

  // Create random connections
  for (let i = 0; i < size * 1.5; i++) {
    const a = Math.floor(Math.random() * size);
    const b = Math.floor(Math.random() * size);
    if (a !== b) nodes[a].connect(nodes[b]);
  }

  return nodes;
}

const network = createDriftNetwork(24);
console.log(`Network initialized: ${network.length} nodes`);

export { SignalNode, createDriftNetwork };
