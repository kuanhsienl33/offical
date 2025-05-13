// VANTA WAVES Effect - Organized Copy-Pastable Version
// Module Boilerplate (UMD)
(function (global, factory) {
    if (typeof exports === "object" && typeof module === "object") {
      module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
      define([], factory);
    } else if (typeof exports === "object") {
      exports._vantaEffect = factory();
    } else {
      global._vantaEffect = factory();
    }
  })(typeof self !== "undefined" ? self : this, function() {
    "use strict";
  
    // Utility Functions
    function randInt(min = 0, max = 1) {
      return Math.floor(min + Math.random() * (max - min + 1));
    }
  
    Number.prototype.clamp = function(min, max) {
      return Math.min(Math.max(this, min), max);
    };
  
    // ThreeJS cleanup helper
    function disposeObject(obj) {
      while (obj.children && obj.children.length) {
        disposeObject(obj.children[0]);
        obj.remove(obj.children[0]);
      }
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        Object.values(obj.material).forEach(mat => {
          if (mat && typeof mat.dispose === 'function') mat.dispose();
        });
        obj.material.dispose();
      }
    }
  
    // VANTA Namespace Setup
    var useWindow = typeof window !== "undefined";
    var THREE = useWindow && window.THREE || {};
    if (useWindow && !window.VANTA) window.VANTA = {};
    var VANTA = useWindow && window.VANTA || {};
  
    // Register API
    VANTA.register = function(name, Constructor) {
      VANTA[name] = function(options) {
        return new Constructor(options);
      };
    };
    VANTA.version = "0.5.24";
  
    // Base Class
    class VantaBase {
      constructor(opts = {}) {
        if (!useWindow) return false;
        VANTA.current = this;
        // Bindings
        this._onResize = this._resize.bind(this);
        this._onAnim = this._animationLoop.bind(this);
        this._onMouse = this._mouseMove.bind(this);
        this._onTouch = this._touchMove.bind(this);
        this._onGyro = this._gyroMove.bind(this);
  
        // Default Options
        const defaults = this.getDefaultOptions ? this.getDefaultOptions() : {};
        this.options = Object.assign({
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1
        }, defaults, opts);
  
        // Container Element
        let el = opts.el;
        if (!el) console.error('[VANTA] Instance needs "el" param!');
        this.el = (typeof el === 'string') ? document.querySelector(el) : el;
        if (!this.el) return console.error('[VANTA] Cannot find element', el);
  
        // Init
        this._prepareContainer();
        this._initThree();
        this._resize();
        try {
          this.init();
        } catch (e) {
          console.error('[VANTA] Init error', e);
          this._fallbackBackground();
          return;
        }
        this._initEvents();
        this._onAnim();
      }
  
      // ... (Other base methods: _prepareContainer, _initThree, initMouse, _resize, _animationLoop, etc.)
  
      // Must be overridden
      init() {}
      destroy() {}
    }
  
    // WAVES Effect Class
    class WavesEffect extends VantaBase {
      static defaultOptions = {
        color: 0x21896,
        shininess: 30,
        waveHeight: 15,
        waveSpeed: 1,
        zoom: 1
      };
  
      getDefaultOptions() {
        return {
          waveNoise: 4,
          ww: 100,
          hh: 80
        };
      }
  
      init() {
        // Material Setup
        this.material = new THREE.MeshPhongMaterial({
          color: this.options.color,
          shininess: this.options.shininess,
          flatShading: true,
          side: THREE.DoubleSide
        });
  
        // Geometry Construction
        const geometry = new THREE.BufferGeometry();
        const points = [];
        this.indices = [];
        this.grid = [];
  
        for (let x = 0; x <= this.options.ww; x++) {
          this.grid[x] = [];
          for (let y = 0; y <= this.options.hh; y++) {
            const idx = points.length;
            const vx = 18 * (x - this.options.ww / 2);
            const vz = 18 * (this.options.hh / 2 - y);
            const vy = (0 + Math.random() * this.options.waveNoise) - 10;
            points.push(new THREE.Vector3(vx, vy, vz));
            this.grid[x][y] = idx;
          }
        }
        geometry.setFromPoints(points);
  
        // Indexing Triangles
        for (let x = 1; x <= this.options.ww; x++) {
          for (let y = 1; y <= this.options.hh; y++) {
            const a = this.grid[x][y];
            const b = this.grid[x][y-1];
            const c = this.grid[x-1][y];
            const d = this.grid[x-1][y-1];
            if (randInt(0,1)) {
              this.indices.push(d, b, c, b, c, a);
            } else {
              this.indices.push(d, b, a, d, c, a);
            }
          }
        }
        geometry.setIndex(this.indices);
  
        // Mesh and Scene
        this.plane = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.plane);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const pointLight = new THREE.PointLight(0xffffff, 0.9);
        pointLight.position.set(-100, 250, -100);
        this.scene.add(pointLight);
  
        // Camera
        this.camera = new THREE.PerspectiveCamera(
          35,
          this.width / this.height,
          50,
          10000
        );
        this.camera.position.set(240, 200, 390);
        this.scene.add(this.camera);
      }
  
      // Animation Update
      onUpdate() {
        // Animate vertices
        const positions = this.plane.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          const oy = positions[i+1];
          const t = this.t;
          const waveSpeed = this.options.waveSpeed;
          const offset = Math.pow(Math.sin(waveSpeed*t*0.02 - waveSpeed*positions[i]*0.025 + positions[i+2]*0.015), 2) / 4;
          positions[i+1] = oy + offset * this.options.waveHeight;
        }
        this.plane.geometry.attributes.position.needsUpdate = true;
        this.plane.geometry.computeVertexNormals();
      }
  
      // Mouse Movement Handler
      onMouseMove(mx, my) {
        const nx = mx - 0.5;
        const ny = my - 0.5;
        this.camera.position.x += (100 * nx - this.camera.position.x) * 0.02;
        this.camera.position.y += (-100 * ny - this.camera.position.y) * 0.02;
        this.camera.lookAt(this.scene.position);
      }
    }
  
    // Register WAVES as VANTA effect
    VANTA.register('WAVES', WavesEffect);
  
    return VANTA;
  });
  