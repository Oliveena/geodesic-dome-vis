import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Generate icosahedron vertices and faces
function createIcosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  
  const vertices = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ].map(v => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  });
  
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  
  return { vertices, faces };
}

// Subdivide a triangle into smaller triangles
function subdivideTriangle(v1, v2, v3, frequency) {
  const triangles = [];
  
  for (let i = 0; i < frequency; i++) {
    for (let j = 0; j < frequency - i; j++) {
      const a1 = i / frequency;
      const a2 = (i + 1) / frequency;
      const b1 = j / frequency;
      const b2 = (j + 1) / frequency;
      
      const p1 = interpolateAndNormalize(v1, v2, v3, a1, b1);
      const p2 = interpolateAndNormalize(v1, v2, v3, a2, b1);
      const p3 = interpolateAndNormalize(v1, v2, v3, a1, b2);
      
      triangles.push([p1, p2, p3]);
      
      if (j < frequency - i - 1) {
        const p4 = interpolateAndNormalize(v1, v2, v3, a2, b2);
        triangles.push([p2, p4, p3]);
      }
    }
  }
  
  return triangles;
}

function interpolateAndNormalize(v1, v2, v3, a, b) {
  const c = 1 - a - b;
  const x = v1[0] * c + v2[0] * a + v3[0] * b;
  const y = v1[1] * c + v2[1] * a + v3[1] * b;
  const z = v1[2] * c + v2[2] * a + v3[2] * b;
  
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}

// Create geodesic dome
function createGeodesicDome(frequency) {
  const ico = createIcosahedron();
  const allTriangles = [];
  
  ico.faces.forEach(face => {
    const v1 = ico.vertices[face[0]];
    const v2 = ico.vertices[face[1]];
    const v3 = ico.vertices[face[2]];
    
    const subdivided = subdivideTriangle(v1, v2, v3, frequency);
    allTriangles.push(...subdivided);
  });
  
  return allTriangles;
}

export default function GeodesicDomeVisualizer() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const groundPlaneRef = useRef(null);
  const [frequency, setFrequency] = useState(2);
  const [triangleCount, setTriangleCount] = useState(80);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showSolid, setShowSolid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hemisphereMode, setHemisphereMode] = useState(false);
  const [showFloors, setShowFloors] = useState(false);
  const [numFloors, setNumFloors] = useState(3);
  const [showVentilation, setShowVentilation] = useState(false);
  const [showTower, setShowTower] = useState(false);
  
  useEffect(() => {
    console.log('GeodesicDome component mounted');
    console.log('mountRef:', mountRef.current);
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 3;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0x4da6ff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xff6b35, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);
    
    // Grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x1a2332, 0x0f1419);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);
    
    // Ground plane for hemisphere mode
    const groundGeometry = new THREE.CircleGeometry(1, 64);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a2332,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.visible = false;
    scene.add(groundPlane);
    groundPlaneRef.current = groundPlane;
    
    // Animation
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      if (meshRef.current && autoRotate) {
        meshRef.current.rotation.y += 0.003;
        meshRef.current.rotation.x += 0.001;
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Mouse interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    
    const onMouseMove = (e) => {
      if (isDragging && meshRef.current) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        meshRef.current.rotation.y += deltaX * 0.01;
        meshRef.current.rotation.x += deltaY * 0.01;
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };
    
    const onMouseUp = () => {
      isDragging = false;
    };
    
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    
    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [autoRotate]);
  
  // Update dome geometry
  useEffect(() => {
    console.log('Dome geometry effect running');
    if (!sceneRef.current) {
      console.log('Scene not ready yet');
      return;
    }

    // Remove old mesh
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
    }

    // Create new geometry
    let triangles = createGeodesicDome(frequency);
    console.log('Created triangles:', triangles.length);
    
    // Filter for hemisphere if needed
    if (hemisphereMode) {
      triangles = triangles.filter(triangle => {
        // Keep triangle if any vertex is above y = 0
        return triangle.some(vertex => vertex[1] >= -0.05);
      });
    }
    
    setTriangleCount(triangles.length);
    
    // Create main group for everything (dome, floors, tower)
    const group = new THREE.Group();
    
    // Separate triangles into regular and ventilation
    const ventTriangles = [];
    const regularTriangles = [];
    
    triangles.forEach((triangle, index) => {
      // Select some triangles as ventilation (evenly distributed)
      // Only use triangles in upper portions for vents
      const avgY = (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3;
      if (showVentilation && avgY > 0.3 && index % 7 === 0) {
        ventTriangles.push(triangle);
      } else {
        regularTriangles.push(triangle);
      }
    });
    
    // Create regular dome geometry
    if (regularTriangles.length > 0) {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      
      regularTriangles.forEach(triangle => {
        triangle.forEach(vertex => {
          vertices.push(vertex[0], vertex[1], vertex[2]);
        });
      });
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      
      // Solid mesh
      if (showSolid) {
        const material = new THREE.MeshPhongMaterial({
          color: 0x4da6ff,
          shininess: 30,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      }
      
      // Wireframe
      if (showWireframe) {
        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d9ff,
          wireframe: true,
          transparent: true,
          opacity: 0.9
        });
        const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
        group.add(wireframeMesh);
      }
    }
    
    // Create ventilation panels geometry
    if (ventTriangles.length > 0) {
      const ventGeometry = new THREE.BufferGeometry();
      const ventVertices = [];
      
      ventTriangles.forEach(triangle => {
        triangle.forEach(vertex => {
          ventVertices.push(vertex[0], vertex[1], vertex[2]);
        });
      });
      
      ventGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ventVertices, 3));
      ventGeometry.computeVertexNormals();
      
      // Ventilation panels (different color)
      if (showSolid) {
        const ventMaterial = new THREE.MeshPhongMaterial({
          color: 0x10b981,
          shininess: 50,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          emissive: 0x10b981,
          emissiveIntensity: 0.2
        });
        const ventMesh = new THREE.Mesh(ventGeometry, ventMaterial);
        group.add(ventMesh);
      }
      
      // Ventilation wireframe (highlighted)
      const ventWireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 1
      });
      const ventWireframeMesh = new THREE.Mesh(ventGeometry, ventWireframeMaterial);
      group.add(ventWireframeMesh);
    }

    // Add edge struts and base ring for hemisphere mode
    if (hemisphereMode) {
      // Step 1: Collect all unique vertices from triangles
      const vertexMap = new Map();
      triangles.forEach(triangle => {
        triangle.forEach(vertex => {
          // Create unique key for each vertex (x, y, z rounded to 6 decimals)
          const key = `${vertex[0].toFixed(6)},${vertex[1].toFixed(6)},${vertex[2].toFixed(6)}`;
          if (!vertexMap.has(key)) {
            vertexMap.set(key, vertex);
          }
        });
      });

      // Step 2: Find edge vertices (vertices near y=0, the bottom rim)
      const edgeVertices = [];
      Array.from(vertexMap.values()).forEach(vertex => {
        // If vertex height is close to 0, it's an edge vertex
        if (vertex[1] < 0.1 && vertex[1] > -0.1) {
          edgeVertices.push(vertex);
        }
      });

      // Step 3: Create vertical struts from edge vertices to ground
      const strutMaterial = new THREE.MeshPhongMaterial({
        color: 0x4a5568,
        shininess: 60
      });

      edgeVertices.forEach(vertex => {
        const height = Math.abs(vertex[1]); // Distance from vertex to ground
        const strutGeometry = new THREE.CylinderGeometry(0.015, 0.015, height, 8);
        const strut = new THREE.Mesh(strutGeometry, strutMaterial);

        // Position strut at vertex x,z coordinates, halfway down to ground
        strut.position.set(vertex[0], vertex[1] / 2, vertex[2]);
        group.add(strut);
      });

      // Step 4: Create base ring (circular outline at ground level)
      const baseRadius = 1; // Same as dome radius
      const ringGeometry = new THREE.RingGeometry(baseRadius * 0.95, baseRadius, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const baseRing = new THREE.Mesh(ringGeometry, ringMaterial);
      baseRing.rotation.x = -Math.PI / 2; // Rotate to lay flat
      baseRing.position.y = 0; // At ground level
      group.add(baseRing);

      // Step 5: Create triangular panels to fill gaps between struts
      const panelMaterial = new THREE.MeshPhongMaterial({
        color: 0x4da6ff,
        shininess: 30,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });

      // Sort edge vertices by angle around the circle
      const sortedEdgeVertices = edgeVertices.sort((a, b) => {
        const angleA = Math.atan2(a[2], a[0]);
        const angleB = Math.atan2(b[2], b[0]);
        return angleA - angleB;
      });

      // Create triangular panels between consecutive edge vertices
      for (let i = 0; i < sortedEdgeVertices.length; i++) {
        const v1 = sortedEdgeVertices[i];
        const v2 = sortedEdgeVertices[(i + 1) % sortedEdgeVertices.length]; // Wrap around to first

        // Create triangle from v1 -> v2 -> ground point below v1 -> back to v1
        const panelGeometry = new THREE.BufferGeometry();
        const panelVertices = new Float32Array([
          v1[0], v1[1], v1[2],  // Top vertex 1
          v2[0], v2[1], v2[2],  // Top vertex 2
          v1[0], 0, v1[2],      // Ground point below v1

          v2[0], v2[1], v2[2],  // Top vertex 2
          v2[0], 0, v2[2],      // Ground point below v2
          v1[0], 0, v1[2]       // Ground point below v1
        ]);

        panelGeometry.setAttribute('position', new THREE.BufferAttribute(panelVertices, 3));
        panelGeometry.computeVertexNormals();

        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        group.add(panel);
      }
    }

    // Add floors to the group
    if (showFloors && hemisphereMode) {
      const domeHeight = 1; // Dome radius
      
      for (let i = 0; i < numFloors; i++) {
        const floorHeight = (i + 1) * (domeHeight / (numFloors + 1)) - domeHeight;
        const radiusAtHeight = Math.sqrt(1 - floorHeight * floorHeight);
        
        // Floor platform
        const floorGeometry = new THREE.CircleGeometry(radiusAtHeight * 0.95, 32);
        const floorMaterial = new THREE.MeshPhongMaterial({
          color: 0x2d3748,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = floorHeight;
        group.add(floor);
        
        // Floor edge
        const edgeGeometry = new THREE.RingGeometry(radiusAtHeight * 0.95, radiusAtHeight * 0.97, 32);
        const edgeMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d9ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = -Math.PI / 2;
        edge.position.y = floorHeight;
        group.add(edge);
        
        // Support pillars (4 per floor)
        const pillarGeometry = new THREE.CylinderGeometry(0.02, 0.02, domeHeight / (numFloors + 1), 8);
        const pillarMaterial = new THREE.MeshPhongMaterial({
          color: 0x4a5568,
          shininess: 60
        });
        
        for (let j = 0; j < 4; j++) {
          const angle = (j * Math.PI / 2) + Math.PI / 4;
          const pillarRadius = radiusAtHeight * 0.7;
          const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
          pillar.position.set(
            Math.cos(angle) * pillarRadius,
            floorHeight - (domeHeight / (numFloors + 1)) / 2,
            Math.sin(angle) * pillarRadius
          );
          group.add(pillar);
        }
      }
    }
    
    // Add tower to the group
    if (showTower && hemisphereMode) {
      // Tower base (sits at top of dome) - minimal base
      const baseGeometry = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8);
      const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x2d3748,
        shininess: 40
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 1.04;
      group.add(base);
      
      // Tower main structure
      const towerGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8);
      const towerMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a202c,
        shininess: 50,
        transparent: true,
        opacity: 0.9
      });
      const tower = new THREE.Mesh(towerGeometry, towerMaterial);
      tower.position.y = 1.2;
      group.add(tower);
      
      // Glass panels (windows)
      const windowGeometry = new THREE.PlaneGeometry(0.15, 0.);
      const windowMaterial = new THREE.MeshPhongMaterial({
        color: 0x4da6ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        shininess: 100
      });
      
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4);
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(
          Math.cos(angle) * 0.121,
          1.4,
          Math.sin(angle) * 0.121
        );
        window.rotation.y = -angle;
        group.add(window);
        
        // Window frames
        const frameGeometry = new THREE.PlaneGeometry(0.16, 0.41);
        const frameMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d9ff,
          wireframe: true,
          transparent: true,
          opacity: 0.6
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(
          Math.cos(angle) * 0.122,
          1.4,
          Math.sin(angle) * 0.122
        );
        frame.rotation.y = -angle;
        group.add(frame);
      }
      
      // Dome top (observatory dome)
      const domeGeometry = new THREE.SphereGeometry(0.33, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.5);
      const domeMaterial = new THREE.MeshPhongMaterial({
        color: 0xff6b35,
        transparent: true,
        opacity: 0.6,
        shininess: 80
      });

      // Dome top consists of:
      // Solid, colored dome
      const observatoryDome = new THREE.Mesh(domeGeometry, domeMaterial);
      observatoryDome.position.y = 1;
      group.add(observatoryDome);

      // Dome wireframe
      const domeWireframe = new THREE.Mesh(domeGeometry, new THREE.MeshBasicMaterial({
        color: 0xff6b35,
        wireframe: true,
        transparent: true,
        opacity: 0.8
      }));
      domeWireframe.position.y = 1;
      group.add(domeWireframe);
    }
    
    sceneRef.current.add(group);
    meshRef.current = group;
    console.log('Mesh added to scene. Group children:', group.children.length);
    console.log('Camera position:', sceneRef.current && rendererRef.current ? 'Camera at z=3' : 'Camera not set');
  }, [frequency, showWireframe, showSolid, hemisphereMode, showVentilation, showFloors, numFloors, showTower]);
  
  // Toggle ground plane visibility
  useEffect(() => {
    if (groundPlaneRef.current) {
      groundPlaneRef.current.visible = hemisphereMode;
    }
  }, [hemisphereMode]);
  
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      fontFamily: '"Space Mono", "Courier New", monospace',
      background: '#0a0e1a'
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(77, 166, 255, 0.3)',
        borderRadius: '2px',
        padding: '24px',
        minWidth: '280px',
        boxShadow: '0 8px 32px rgba(0, 217, 255, 0.1)',
        color: '#e0e6ed'
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#00d9ff',
          marginBottom: '20px',
          fontWeight: '600'
        }}>
          Geodesic Dome Configurator
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '10px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px',
            color: '#8b95a6'
          }}>
            Frequency: {frequency}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '2px',
              background: 'linear-gradient(90deg, #4da6ff, #00d9ff)',
              outline: 'none',
              opacity: '0.9',
              cursor: 'pointer'
            }}
          />
        </div>
        
        <div style={{
          background: 'rgba(77, 166, 255, 0.05)',
          border: '1px solid rgba(77, 166, 255, 0.2)',
          borderRadius: '2px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '10px', color: '#8b95a6', marginBottom: '8px', letterSpacing: '1px' }}>
            TRIANGLES
          </div>
          <div style={{ fontSize: '28px', color: '#00d9ff', fontWeight: '600', fontFamily: '"JetBrains Mono", monospace' }}>
            {triangleCount}
          </div>
        </div>
        
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#e0e6ed',
            letterSpacing: '0.5px'
          }}>
            <input
              type="checkbox"
              checked={hemisphereMode}
              onChange={(e) => setHemisphereMode(e.target.checked)}
              style={{ marginRight: '10px', cursor: 'pointer' }}
            />
            Hemisphere Mode (Dome)
          </label>
        </div>
        
        {hemisphereMode && (
          <>
            <div style={{
              borderTop: '1px solid rgba(77, 166, 255, 0.15)',
              paddingTop: '16px',
              marginTop: '16px',
              marginBottom: '14px'
            }}>
              <div style={{
                fontSize: '9px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#8b95a6',
                marginBottom: '12px'
              }}>
                Architectural Features
              </div>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: '#e0e6ed',
                  letterSpacing: '0.5px'
                }}>
                  <input
                    type="checkbox"
                    checked={showFloors}
                    onChange={(e) => setShowFloors(e.target.checked)}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  Interior Floors
                </label>
              </div>
              
              {showFloors && (
                <div style={{ marginBottom: '14px', marginLeft: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '10px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                    color: '#8b95a6'
                  }}>
                    Floors: {numFloors}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={numFloors}
                    onChange={(e) => setNumFloors(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '2px',
                      background: 'linear-gradient(90deg, #4da6ff, #00d9ff)',
                      outline: 'none',
                      opacity: '0.9',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: '#e0e6ed',
                  letterSpacing: '0.5px'
                }}>
                  <input
                    type="checkbox"
                    checked={showVentilation}
                    onChange={(e) => setShowVentilation(e.target.checked)}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  Ventilation Panels
                </label>
              </div>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: '#e0e6ed',
                  letterSpacing: '0.5px'
                }}>
                  <input
                    type="checkbox"
                    checked={showTower}
                    onChange={(e) => setShowTower(e.target.checked)}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  Observatory Tower
                </label>
              </div>
            </div>
          </>
        )}
        
        <div style={{
          borderTop: '1px solid rgba(77, 166, 255, 0.15)',
          paddingTop: '16px',
          marginTop: '16px'
        }}>
          <div style={{
            fontSize: '9px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#8b95a6',
            marginBottom: '12px'
          }}>
            Display Options
          </div>
        
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#e0e6ed',
            letterSpacing: '0.5px'
          }}>
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
              style={{ marginRight: '10px', cursor: 'pointer' }}
            />
            Wireframe View
          </label>
        </div>
        
        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#e0e6ed',
            letterSpacing: '0.5px'
          }}>
            <input
              type="checkbox"
              checked={showSolid}
              onChange={(e) => setShowSolid(e.target.checked)}
              style={{ marginRight: '10px', cursor: 'pointer' }}
            />
            Solid Surface
          </label>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            cursor: 'pointer',
            color: '#e0e6ed',
            letterSpacing: '0.5px'
          }}>
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              style={{ marginRight: '10px', cursor: 'pointer' }}
            />
            Auto Rotate
          </label>
        </div>
        </div>
        
        <div style={{
          fontSize: '9px',
          color: '#5a6370',
          lineHeight: '1.6',
          borderTop: '1px solid rgba(77, 166, 255, 0.15)',
          paddingTop: '16px',
          letterSpacing: '0.5px'
        }}>
          Drag to rotate • Scroll to zoom
        </div>
      </div>
      
      {/* Info Panel */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 107, 53, 0.3)',
        borderRadius: '2px',
        padding: '20px',
        maxWidth: '340px',
        boxShadow: '0 8px 32px rgba(255, 107, 53, 0.1)',
        color: '#e0e6ed'
      }}>
        <div style={{
          fontSize: '10px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#ff6b35',
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          {hemisphereMode ? 'Architectural Features' : 'About Geodesic Domes'}
        </div>
        <div style={{
          fontSize: '11px',
          lineHeight: '1.7',
          color: '#b8c1cc',
          letterSpacing: '0.3px'
        }}>
          {hemisphereMode ? (
            <>
              <strong style={{ color: '#00d9ff' }}>Interior Floors:</strong> Multi-level platforms with support pillars for living/working spaces.
              <br /><br />
              <strong style={{ color: '#10b981' }}>Ventilation Panels:</strong> Green-highlighted triangular sections provide natural airflow and climate control.
              <br /><br />
              <strong style={{ color: '#ff6b35' }}>Observatory Tower:</strong> Elevated glass structure for greenhouse cultivation or stargazing.
            </>
          ) : (
            <>
              Geodesic domes distribute structural stress evenly across their surface, making them incredibly strong while using minimal materials. They're created by subdividing an icosahedron and projecting vertices onto a sphere.
            </>
          )}
        </div>
      </div>
    </div>
  );
}