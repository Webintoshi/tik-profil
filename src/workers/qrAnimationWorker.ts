const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

interface WorldNode {
  lat: number;
  lon: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  life: number;
  targetX?: number;
  targetY?: number;
}

interface QRModule {
  x: number;
  y: number;
  size: number;
  opacity: number;
  targetSize: number;
}

interface WorkerMessage {
  type: 'init' | 'update' | 'calculate' | 'cleanup';
  data?: any;
}

let worldNodes: WorldNode[] = [];
let particles: Particle[] = [];
let qrModules: QRModule[] = [];
// eslint-disable-next-line prefer-const
let animationFrameId: number = 0;
// eslint-disable-next-line prefer-const
let lastTime: number = 0;
let zoomLevel: number = 0;
// eslint-disable-next-line prefer-const
let targetZoomLevel: number = 0;

const initWorldNodes = (nodeCount: number): void => {
  worldNodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const lat = (Math.random() - 0.5) * Math.PI;
    const lon = (Math.random() - 0.5) * Math.PI * 2;
    worldNodes.push({ lat, lon });
  }
};

const initParticles = (count: number, width: number, height: number, reducedMotion: boolean): void => {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 200 - 100,
      vx: (Math.random() - 0.5) * (reducedMotion ? 0.05 : 0.3),
      vy: (Math.random() - 0.5) * (reducedMotion ? 0.05 : 0.3),
      vz: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 1.5 + 0.5,
      life: Math.random() * 100 + 50,
    });
  }
};

const initQRModules = (gridSize: number, centerX: number, centerY: number, moduleSize: number): void => {
  qrModules = [];
  const totalQRModules = gridSize * gridSize;
  
  for (let i = 0; i < totalQRModules; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    const x = centerX + (col - gridSize / 2) * moduleSize;
    const y = centerY + (row - gridSize / 2) * moduleSize;
    
    const isActive = Math.random() < 0.3;
    
    if (isActive) {
      qrModules.push({
        x,
        y,
        size: 0,
        opacity: 0,
        targetSize: moduleSize * 0.4,
      });
    }
  }
};

const projectWorldNode = (
  node: WorldNode,
  rotX: number,
  rotY: number,
  baseWorldRadius: number,
  centerX: number,
  centerY: number,
  currentZoom: number
) => {
  const r = baseWorldRadius * (0.8 + currentZoom * 0.4);

  const x = r * Math.cos(node.lat) * Math.cos(node.lon);
  const y = r * Math.cos(node.lat) * Math.sin(node.lon);
  const z = r * Math.sin(node.lat);

  const cosRx = Math.cos(rotX);
  const sinRx = Math.sin(rotX);
  const cosRy = Math.cos(rotY);
  const sinRy = Math.sin(rotY);

  const y1 = y * cosRx - z * sinRx;
  const z1 = y * sinRx + z * cosRx;
  const x2 = x * cosRy + z1 * sinRy;
  const z2 = -x * sinRy + z1 * cosRy;

  return {
    x: centerX + x2,
    y: centerY + y1,
    z: z2,
    visible: z2 > -r * 0.2,
    normalizedZ: z2 / r,
  };
};

const updateParticles = (width: number, height: number): void => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    p.life -= 1;

    if (p.x < -50 || p.x > width + 50 || 
        p.y < -50 || p.y > height + 50 ||
        p.life <= 0) {
      particles.splice(i, 1);
    }
  }
};

const updateQRModules = (currentZoom: number): void => {
  const maxOpacity = 0.4 + currentZoom * 0.4;
  
  qrModules.forEach((mod) => {
    const sizeDiff = mod.targetSize - mod.size;
    mod.size += sizeDiff * 0.08;
    
    const targetOpacity = maxOpacity;
    const opacityDiff = targetOpacity - mod.opacity;
    mod.opacity += opacityDiff * 0.06;
  });
};

const emitParticlesFromWorld = (
  projectedX: number,
  projectedY: number,
  projectedZ: number,
  baseWorldRadius: number,
  currentZoom: number,
  maxParticles: number
): void => {
  if (currentZoom <= 0.3) return;
  
  const worldR = baseWorldRadius * (0.8 + currentZoom * 0.4);
  
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    const offsetX = Math.cos(angle) * speed;
    const offsetY = Math.sin(angle) * speed;
    
    particles.push({
      x: projectedX + offsetX,
      y: projectedY + offsetY,
      z: projectedZ + Math.random() * 20 - 10,
      vx: offsetX * 0.3,
      vy: offsetY * 0.3,
      vz: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 1.5 + 0.5,
      life: 80 + Math.random() * 40,
      targetX: projectedX,
      targetY: projectedY,
    });
  }
  
  if (particles.length > maxParticles) {
    particles.splice(0, particles.length - maxParticles);
  }
};

const calculateFrame = (data: any): any => {
  const {
    width,
    height,
    centerX,
    centerY,
    baseWorldRadius,
    rotX,
    rotY,
    currentZoom,
    particleCount,
    reducedMotion,
  } = data;

  const zoomDiff = targetZoomLevel - zoomLevel;
  zoomLevel += zoomDiff * 0.05;

  updateParticles(width, height);
  updateQRModules(zoomLevel);

  const projectedNodes = worldNodes.map((node) =>
    projectWorldNode(node, rotX, rotY, baseWorldRadius, centerX, centerY, zoomLevel)
  );

  const activeNodes = projectedNodes.filter((node) => node.visible);

  if (!reducedMotion && Math.random() > 0.97) {
    const randomNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
    if (randomNode) {
      emitParticlesFromWorld(
        randomNode.x,
        randomNode.y,
        randomNode.z,
        baseWorldRadius,
        zoomLevel,
        particleCount * 1.5
      );
    }
  }

  return {
    particles,
    qrModules,
    projectedNodes,
    activeNodes,
    zoomLevel,
    timestamp: Date.now(),
  };
};

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      initWorldNodes(data.nodeCount);
      initParticles(data.particleCount, data.width, data.height, data.reducedMotion);
      initQRModules(data.gridSize, data.centerX, data.centerY, data.moduleSize);
      self.postMessage({ type: 'initialized' });
      break;

    case 'update':
      const frameData = calculateFrame(data);
      self.postMessage({ type: 'frame', data: frameData });
      break;

    case 'cleanup':
      worldNodes = [];
      particles = [];
      qrModules = [];
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      self.postMessage({ type: 'cleaned' });
      break;

    default:
      break;
  }
};

export {};
