class CassettePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = null;
    this.animationFrame = null;
    this.rotationOffset = 0;
    this.lastTime = null;
    this.DEFAULT_DURATION_SECONDS = 180;
    this.ROTATION_SPEED = 2;
    this.MIN_ROTOR_SCALE = 0.5;
    this.MAX_ROTOR_SCALE = 1.0;
    this.instanceId = `cassette-${Math.random().toString(36).substr(2, 9)}`;
  }

  static get observedAttributes() {
    return ['src', 'img', 'title'];
  }

  connectedCallback() {
    this.render();
    this.setupAudio();
  }

  disconnectedCallback() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      if (name === 'src') {
        this.setupAudio();
      }
    }
  }

  createElement(tag, props = {}) {
    return Object.assign(document.createElement(tag), props);
  }

  createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  createCassetteBodySVG() {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 400 250',
      style: 'width: 100%; height: 100%;'
    });

    // Main cassette body with realistic gradient
    const defs = this.createSVGElement('defs');
    
    const bodyGradient = this.createSVGElement('linearGradient', { id: `${this.instanceId}-bodyGradient`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    bodyGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#1a1a1a' }),
      this.createSVGElement('stop', { offset: '50%', 'stop-color': '#2a2a2a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#1a1a1a' })
    );
    
    const labelGradient = this.createSVGElement('linearGradient', { id: `${this.instanceId}-labelGradient`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    labelGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      this.createSVGElement('stop', { offset: '50%', 'stop-color': '#f5f5f5' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#e0e0e0' })
    );
    
    const windowGradient = this.createSVGElement('linearGradient', { id: `${this.instanceId}-windowGradient`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    windowGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': 'rgba(139, 69, 19, 0.2)' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': 'rgba(139, 69, 19, 0.4)' })
    );
    
    defs.append(bodyGradient, labelGradient, windowGradient);
    
    // Main body
    const body = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '400',
      height: '250',
      rx: '8',
      fill: `url(#${this.instanceId}-bodyGradient)`,
      stroke: '#000',
      'stroke-width': '2'
    });
    
    // Top label area
    const label = this.createSVGElement('rect', {
      x: '20',
      y: '20',
      width: '360',
      height: '80',
      rx: '4',
      fill: `url(#${this.instanceId}-labelGradient)`,
      stroke: '#ccc',
      'stroke-width': '1'
    });
    
    // Tape window
    const window = this.createSVGElement('rect', {
      x: '30',
      y: '120',
      width: '340',
      height: '100',
      rx: '4',
      fill: `url(#${this.instanceId}-windowGradient)`,
      stroke: '#555',
      'stroke-width': '1'
    });
    
    // Screws for realism
    const screw1 = this.createSVGElement('circle', { cx: '30', cy: '30', r: '4', fill: '#888' });
    const screw2 = this.createSVGElement('circle', { cx: '370', cy: '30', r: '4', fill: '#888' });
    const screw3 = this.createSVGElement('circle', { cx: '30', cy: '220', r: '4', fill: '#888' });
    const screw4 = this.createSVGElement('circle', { cx: '370', cy: '220', r: '4', fill: '#888' });
    
    // Screw grooves
    const groove1 = this.createSVGElement('line', { x1: '28', y1: '30', x2: '32', y2: '30', stroke: '#333', 'stroke-width': '1' });
    const groove2 = this.createSVGElement('line', { x1: '368', y1: '30', x2: '372', y2: '30', stroke: '#333', 'stroke-width': '1' });
    const groove3 = this.createSVGElement('line', { x1: '28', y1: '220', x2: '32', y2: '220', stroke: '#333', 'stroke-width': '1' });
    const groove4 = this.createSVGElement('line', { x1: '368', y1: '220', x2: '372', y2: '220', stroke: '#333', 'stroke-width': '1' });
    
    svg.append(
      defs,
      body,
      label,
      window,
      screw1,
      screw2,
      screw3,
      screw4,
      groove1,
      groove2,
      groove3,
      groove4
    );
    
    return svg;
  }

  createRotorSVG(id) {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 100 100',
      style: 'width: 60px; height: 60px; transition: transform 0.1s linear;',
      id: id
    });

    const defs = this.createSVGElement('defs');
    const rotorGradient = this.createSVGElement('radialGradient', { id: `${this.instanceId}-${id}-gradient` });
    rotorGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      this.createSVGElement('stop', { offset: '70%', 'stop-color': '#f0f0f0' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#d0d0d0' })
    );
    defs.append(rotorGradient);

    // Outer ring
    const outer = this.createSVGElement('circle', {
      cx: '50',
      cy: '50',
      r: '48',
      fill: `url(#${this.instanceId}-${id}-gradient)`,
      stroke: '#999',
      'stroke-width': '2'
    });

    // Teeth around the edge
    const teethGroup = this.createSVGElement('g');
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) - 90;
      const rad = (angle * Math.PI) / 180;
      const x1 = 50 + Math.cos(rad) * 35;
      const y1 = 50 + Math.sin(rad) * 35;
      const x2 = 50 + Math.cos(rad) * 45;
      const y2 = 50 + Math.sin(rad) * 45;
      const tooth = this.createSVGElement('line', {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        stroke: '#666',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      });
      teethGroup.append(tooth);
    }

    // Center hub
    const centerHub = this.createSVGElement('circle', {
      cx: '50',
      cy: '50',
      r: '20',
      fill: '#333',
      stroke: '#222',
      'stroke-width': '1'
    });

    // Inner details
    const innerRing = this.createSVGElement('circle', {
      cx: '50',
      cy: '50',
      r: '12',
      fill: 'none',
      stroke: '#555',
      'stroke-width': '1'
    });

    svg.append(defs, outer, teethGroup, centerHub, innerRing);
    return svg;
  }

  render() {
    const img = this.getAttribute('img') || '';
    const title = this.getAttribute('title') || 'Untitled';

    // Clear shadow root
    this.shadowRoot.innerHTML = '';

    // Create style element
    const style = this.createElement('style');
    style.textContent = ''
      + ':host {'
      + '  display: block;'
      + '  max-width: 100%;'
      + '  font-family: Arial, sans-serif;'
      + '}'
      + '.cassette {'
      + '  position: relative;'
      + '  width: 100%;'
      + '  max-width: 400px;'
      + '  margin: 0 auto;'
      + '}'
      + '.svg-container {'
      + '  position: relative;'
      + '  width: 100%;'
      + '}'
      + '.label-content {'
      + '  position: absolute;'
      + '  top: 8%;'
      + '  left: 5%;'
      + '  right: 5%;'
      + '  height: 32%;'
      + '  display: flex;'
      + '  align-items: center;'
      + '  gap: 10px;'
      + '  padding: 8px;'
      + '  box-sizing: border-box;'
      + '}'
      + '.label-image {'
      + '  width: 50px;'
      + '  height: 50px;'
      + '  object-fit: cover;'
      + '  border-radius: 2px;'
      + '  background: #ccc;'
      + '}'
      + '.label-title {'
      + '  flex: 1;'
      + '  font-size: 14px;'
      + '  font-weight: bold;'
      + '  color: #333;'
      + '  overflow: hidden;'
      + '  text-overflow: ellipsis;'
      + '  white-space: nowrap;'
      + '}'
      + '.tape-area {'
      + '  position: absolute;'
      + '  top: 48%;'
      + '  left: 7.5%;'
      + '  right: 7.5%;'
      + '  height: 40%;'
      + '  display: flex;'
      + '  justify-content: space-between;'
      + '  align-items: center;'
      + '  padding: 0 20px;'
      + '  box-sizing: border-box;'
      + '}'
      + '.rotor-wrapper {'
      + '  position: relative;'
      + '}'
      + '.tape-strip {'
      + '  position: absolute;'
      + '  top: 50%;'
      + '  height: 3px;'
      + '  background: linear-gradient(to bottom, #5c3317, #8b4513, #5c3317);'
      + '  transform: translateY(-50%);'
      + '}'
      + '.tape-left {'
      + '  right: 100%;'
      + '  width: 80px;'
      + '  margin-right: -10px;'
      + '}'
      + '.tape-right {'
      + '  left: 100%;'
      + '  width: 80px;'
      + '  margin-left: -10px;'
      + '}'
      + '.controls {'
      + '  display: flex;'
      + '  justify-content: center;'
      + '  gap: 10px;'
      + '  margin-top: 15px;'
      + '}'
      + 'button {'
      + '  background: #333;'
      + '  color: white;'
      + '  border: none;'
      + '  border-radius: 4px;'
      + '  padding: 8px 16px;'
      + '  cursor: pointer;'
      + '  font-size: 14px;'
      + '  transition: background 0.2s;'
      + '}'
      + 'button:hover {'
      + '  background: #555;'
      + '}'
      + 'button:active {'
      + '  background: #222;'
      + '}'
      + '@media (max-width: 480px) {'
      + '  .label-image {'
      + '    width: 40px;'
      + '    height: 40px;'
      + '  }'
      + '  .label-title {'
      + '    font-size: 12px;'
      + '  }'
      + '  button {'
      + '    padding: 6px 12px;'
      + '    font-size: 12px;'
      + '  }'
      + '}';

    // Create main container
    const cassette = this.createElement('div', { className: 'cassette' });
    
    // Create SVG container
    const svgContainer = this.createElement('div', { className: 'svg-container' });
    svgContainer.append(this.createCassetteBodySVG());
    
    // Create label content overlay
    const labelContent = this.createElement('div', { className: 'label-content' });
    
    if (img) {
      const labelImage = this.createElement('img', {
        src: img,
        alt: title,
        className: 'label-image'
      });
      labelContent.append(labelImage);
    } else {
      labelContent.append(this.createElement('div', { className: 'label-image' }));
    }
    
    labelContent.append(this.createElement('div', {
      className: 'label-title',
      textContent: title
    }));
    
    // Create tape area with rotors
    const tapeArea = this.createElement('div', { className: 'tape-area' });
    
    const leftRotorWrapper = this.createElement('div', { className: 'rotor-wrapper' });
    const leftRotor = this.createRotorSVG('left-rotor');
    leftRotorWrapper.append(
      leftRotor,
      this.createElement('div', { className: 'tape-strip tape-left' })
    );
    
    const rightRotorWrapper = this.createElement('div', { className: 'rotor-wrapper' });
    const rightRotor = this.createRotorSVG('right-rotor');
    rightRotorWrapper.append(
      this.createElement('div', { className: 'tape-strip tape-right' }),
      rightRotor
    );
    
    tapeArea.append(leftRotorWrapper, rightRotorWrapper);
    
    // Create controls
    const controls = this.createElement('div', { className: 'controls' });
    
    const playBtn = this.createElement('button', { textContent: '▶ Play' });
    playBtn.onclick = () => this.play();
    
    const pauseBtn = this.createElement('button', { textContent: '⏸ Pause' });
    pauseBtn.onclick = () => this.pause();
    
    const stopBtn = this.createElement('button', { textContent: '⏹ Stop' });
    stopBtn.onclick = () => this.stop();
    
    controls.append(playBtn, pauseBtn, stopBtn);
    
    // Assemble everything
    svgContainer.append(labelContent, tapeArea);
    cassette.append(svgContainer, controls);
    this.shadowRoot.append(style, cassette);
  }

  setupAudio() {
    const src = this.getAttribute('src');
    if (!src) return;

    if (this.audio) {
      this.audio.pause();
    }

    this.audio = new Audio(src);
    this.audio.onloadedmetadata = () => {
      // Duration is available
    };
    this.audio.onplay = () => this.startAnimation();
    this.audio.onpause = () => this.stopAnimation();
    this.audio.onended = () => {
      this.stopAnimation();
      this.resetRotors();
    };
  }

  play() {
    if (this.audio) {
      this.audio.play();
    }
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.stopAnimation();
      this.resetRotors();
    }
  }

  startAnimation() {
    this.lastTime = performance.now();
    this.animate();
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.lastTime = null;
  }

  animate() {
    const leftRotor = this.shadowRoot.getElementById('left-rotor');
    const rightRotor = this.shadowRoot.getElementById('right-rotor');

    if (!leftRotor || !rightRotor || !this.audio) return;

    const now = performance.now();
    if (this.lastTime) {
      const delta = (now - this.lastTime) / 1000;
      this.rotationOffset += delta * this.ROTATION_SPEED * 360;
    }
    this.lastTime = now;

    const rotation = this.rotationOffset % 360;
    const duration = this.audio.duration || this.DEFAULT_DURATION_SECONDS;
    const progress = duration > 0 ? Math.min(this.audio.currentTime / duration, 1) : 0;

    const leftScale = this.MAX_ROTOR_SCALE - (progress * this.MIN_ROTOR_SCALE);
    const rightScale = this.MIN_ROTOR_SCALE + (progress * this.MIN_ROTOR_SCALE);

    leftRotor.style.transform = `rotate(${rotation}deg) scale(${leftScale})`;
    rightRotor.style.transform = `rotate(${rotation}deg) scale(${rightScale})`;

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  resetRotors() {
    const leftRotor = this.shadowRoot.getElementById('left-rotor');
    const rightRotor = this.shadowRoot.getElementById('right-rotor');

    if (leftRotor) {
      leftRotor.style.transform = `rotate(0deg) scale(${this.MAX_ROTOR_SCALE})`;
    }
    if (rightRotor) {
      rightRotor.style.transform = `rotate(0deg) scale(${this.MIN_ROTOR_SCALE})`;
    }

    this.rotationOffset = 0;
    this.lastTime = null;
  }
}

customElements.define('cassette-player', CassettePlayer);
