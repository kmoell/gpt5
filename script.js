// Enhanced 3D liquid glass interface with advanced animations
// Technologies: GSAP, Three.js, Lenis smooth scroll

// ===== SMOOTH SCROLL SETUP =====
const lenis = new Lenis({
  smoothWheel: true,
  wheelMultiplier: 0.8,
  infinite: false,
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  normalizeWheel: true,
  smoothTouch: false
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ===== GSAP + SCROLLTRIGGER INTEGRATION =====
gsap.registerPlugin(ScrollTrigger);

// Sync Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ===== THREE.JS ENHANCED SCENE =====
class LiquidGlassScene {
  constructor() {
    this.canvas = document.getElementById('bg');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.scroll = 0;
    this.time = 0;
    
    this.init();
  }

  init() {
    // Enhanced renderer settings
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x040711, 0);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Camera positioning
    this.camera.position.set(0, 0, 15);
    
    this.createParticleField();
    this.createFloatingOrbs();
    this.createWaveGeometry();
    this.setupLighting();
    this.setupEventListeners();
    this.resize();
    this.animate();
  }

  createParticleField() {
    const particleCount = window.innerWidth < 768 ? 1500 : 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacity = new Float32Array(particleCount);
    const speed = new Float32Array(particleCount);

    const colorPalette = [
      new THREE.Color(0x6d8bff), // Brand blue
      new THREE.Color(0x5affe6), // Accent cyan
      new THREE.Color(0xa855f7), // Purple
      new THREE.Color(0xf0f4ff)  // Light
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Positions in spherical distribution
      const radius = Math.random() * 25 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Colors
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Properties
      sizes[i] = Math.random() * 0.03 + 0.01;
      opacity[i] = Math.random() * 0.8 + 0.2;
      speed[i] = Math.random() * 0.3 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacity, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speed, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float opacity;
        attribute float speed;
        varying float vOpacity;
        varying vec3 vColor;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uScroll;
        
        void main() {
          vOpacity = opacity;
          vColor = color;
          
          vec3 pos = position;
          
          // Gentle floating animation
          pos.y += sin(uTime * speed + position.x * 0.1) * 0.3;
          pos.x += cos(uTime * speed * 0.7 + position.y * 0.1) * 0.2;
          
          // Mouse interaction
          vec2 mouseInfluence = uMouse * 0.5;
          pos.xy += mouseInfluence * (1.0 / (length(pos.xy) + 1.0));
          
          // Scroll displacement
          pos.z += uScroll * 0.1;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * 300.0 / -mvPosition.z;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        varying vec3 vColor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          gl_FragColor = vec4(vColor, alpha * vOpacity * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uScroll: { value: 0 }
      }
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createFloatingOrbs() {
    this.orbs = new THREE.Group();
    const orbCount = window.innerWidth < 768 ? 3 : 6;
    
    for (let i = 0; i < orbCount; i++) {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x6d8bff : 0x5affe6,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      
      const orb = new THREE.Mesh(geometry, material);
      orb.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 15
      );
      
      orb.userData = {
        initialPosition: orb.position.clone(),
        speed: Math.random() * 0.5 + 0.3,
        amplitude: Math.random() * 2 + 1
      };
      
      this.orbs.add(orb);
    }
    
    this.scene.add(this.orbs);
  }

  createWaveGeometry() {
    const geometry = new THREE.PlaneGeometry(40, 40, 50, 50);
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Wave distortion
          pos.z += sin(pos.x * 0.3 + uTime) * 0.5;
          pos.z += sin(pos.y * 0.2 + uTime * 0.7) * 0.3;
          
          // Mouse ripple effect
          vec2 mousePos = uMouse * 10.0;
          float dist = distance(pos.xy, mousePos);
          pos.z += sin(dist * 0.5 - uTime * 2.0) * exp(-dist * 0.1) * 2.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        
        void main() {
          vec3 color1 = vec3(0.427, 0.545, 1.0); // Brand blue
          vec3 color2 = vec3(0.353, 1.0, 0.902); // Accent cyan
          
          float noise = sin(vUv.x * 10.0 + uTime) * sin(vUv.y * 10.0 + uTime * 0.7);
          vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
          
          float alpha = 0.03 + noise * 0.02;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() }
      }
    });

    this.wave = new THREE.Mesh(geometry, material);
    this.wave.rotation.x = -Math.PI / 2;
    this.wave.position.z = -10;
    this.scene.add(this.wave);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x6d8bff, 0.3);
    this.scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x5affe6, 0.8, 50);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());
    
    // Enhanced mouse tracking
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Touch support
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.targetMouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    });

    // Scroll tracking
    lenis.on('scroll', (e) => {
      this.scroll = e.scroll;
    });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    this.time += 0.01;
    
    // Smooth mouse following
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Update particle system
    if (this.particles) {
      this.particles.material.uniforms.uTime.value = this.time;
      this.particles.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      this.particles.material.uniforms.uScroll.value = this.scroll * 0.001;
      
      // Gentle rotation
      this.particles.rotation.y += 0.001;
    }

    // Animate floating orbs
    if (this.orbs) {
      this.orbs.children.forEach((orb, i) => {
        const data = orb.userData;
        orb.position.copy(data.initialPosition);
        orb.position.x += Math.sin(this.time * data.speed + i) * data.amplitude;
        orb.position.y += Math.cos(this.time * data.speed * 0.7 + i) * data.amplitude * 0.5;
      });
    }

    // Update wave
    if (this.wave) {
      this.wave.material.uniforms.uTime.value = this.time;
      this.wave.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
    }

    // Camera parallax
    this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouse.y * 1 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }
}

// ===== GSAP ANIMATIONS =====
class AnimationController {
  constructor() {
    this.init();
  }

  init() {
    this.setupInitialAnimations();
    this.setupScrollAnimations();
    this.setupInteractiveEffects();
  }

  setupInitialAnimations() {
    // Set initial states
    gsap.set(['.headline', '.subtitle', '.hero-badge', '.cta-group'], {
      y: 60,
      opacity: 0
    });

    gsap.set('.feature-card', {
      y: 80,
      opacity: 0,
      rotationX: 15
    });

    gsap.set('.gallery', {
      y: 100,
      opacity: 0
    });

    // Hero entrance animation
    const heroTl = gsap.timeline({ delay: 0.3 });
    heroTl
      .to('.hero-badge', {
        duration: 1,
        y: 0,
        opacity: 1,
        ease: 'power3.out'
      })
      .to('.headline', {
        duration: 1.2,
        y: 0,
        opacity: 1,
        ease: 'power3.out'
      }, '-=0.6')
      .to('.subtitle', {
        duration: 1,
        y: 0,
        opacity: 1,
        ease: 'power2.out'
      }, '-=0.8')
      .to('.cta-group', {
        duration: 1,
        y: 0,
        opacity: 1,
        ease: 'back.out(1.4)'
      }, '-=0.6');

    // Header animation
    gsap.from('header', {
      duration: 1.5,
      y: -100,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.1
    });
  }

  setupScrollAnimations() {
    // Feature cards staggered entrance
    gsap.utils.toArray('.feature-card').forEach((card, i) => {
      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        },
        duration: 1.2,
        y: 0,
        opacity: 1,
        rotationX: 0,
        ease: 'power3.out',
        delay: i * 0.1
      });
    });

    // Gallery section
    gsap.to('.gallery', {
      scrollTrigger: {
        trigger: '.gallery',
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse'
      },
      duration: 1.5,
      y: 0,
      opacity: 1,
      ease: 'power3.out'
    });

    // Parallax effects for liquid glass elements
    gsap.utils.toArray('.liquid-glass').forEach(element => {
      gsap.to(element, {
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: -50,
        ease: 'none'
      });
    });
  }

  setupInteractiveEffects() {
    // Button hover animations
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, {
          duration: 0.3,
          scale: 1.05,
          ease: 'power2.out'
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          duration: 0.3,
          scale: 1,
          ease: 'power2.out'
        });
      });
    });

    // Feature card tilt effect
    document.querySelectorAll('.feature-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(card, {
          duration: 0.3,
          rotationY: x / rect.width * 10,
          rotationX: -y / rect.height * 10,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          duration: 0.5,
          rotationY: 0,
          rotationX: 0,
          ease: 'power2.out'
        });
      });
    });

    // Smooth anchor scrolling
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          lenis.scrollTo(target, {
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          });
        }
      });
    });
  }
}

// ===== PERFORMANCE OPTIMIZATION =====
class PerformanceManager {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isLowEnd = this.detectLowEndDevice();
    this.init();
  }

  detectLowEndDevice() {
    // Simple heuristic for low-end device detection
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return !renderer || 
           renderer.includes('Intel') && renderer.includes('HD') ||
           navigator.hardwareConcurrency < 4;
  }

  init() {
    if (this.isReducedMotion) {
      // Disable animations for users who prefer reduced motion
      gsap.globalTimeline.timeScale(0.01);
      document.body.classList.add('reduced-motion');
    }

    if (this.isLowEnd) {
      // Reduce particle count and effects for low-end devices
      document.body.classList.add('low-end-device');
    }

    // Throttle resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Resize handler
      }, 100);
    });
  }
}

// ===== INITIALIZATION =====
class App {
  constructor() {
    this.init();
  }

  init() {
    // Initialize performance manager first
    this.performanceManager = new PerformanceManager();
    
    // Initialize 3D scene
    this.scene = new LiquidGlassScene();
    
    // Initialize animations
    this.animations = new AnimationController();
    
    console.log('🌟 Nova - Liquid Glass Interface initialized');
  }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
  new App();
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause animations when tab is not visible
    gsap.globalTimeline.pause();
  } else {
    gsap.globalTimeline.play();
  }
});

// Export for debugging
if (typeof window !== 'undefined') {
  window.NovaApp = { App, LiquidGlassScene, AnimationController, PerformanceManager };
}