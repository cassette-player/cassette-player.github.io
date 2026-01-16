class CassettePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = null;
    this.animationFrame = null;
    this.rotationOffset = 0;
    this.lastTime = null;
    this.isPlaying = false;
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

  createWalkmanBodySVG() {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 400 350',
      style: 'width: 100%; height: 100%;'
    });

    const defs = this.createSVGElement('defs');
    
    // Walkman body gradient
    const bodyGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-walkmanBody`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    bodyGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#3a3a3a' }),
      this.createSVGElement('stop', { offset: '50%', 'stop-color': '#2a2a2a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#1a1a1a' })
    );
    
    // Cassette window gradient
    const windowGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-window`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    windowGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': 'rgba(255, 255, 255, 0.1)' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': 'rgba(0, 0, 0, 0.3)' })
    );
    
    defs.append(bodyGradient, windowGradient);
    
    // Main Walkman body
    const body = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '400',
      height: '350',
      rx: '15',
      fill: `url(#${this.instanceId}-walkmanBody)`,
      stroke: '#000',
      'stroke-width': '3'
    });
    
    // Cassette viewing window
    const window = this.createSVGElement('rect', {
      x: '30',
      y: '30',
      width: '340',
      height: '220',
      rx: '8',
      fill: `url(#${this.instanceId}-window)`,
      stroke: '#555',
      'stroke-width': '2'
    });
    
    // Sony logo area
    const logoArea = this.createSVGElement('text', {
      x: '200',
      y: '285',
      'text-anchor': 'middle',
      fill: '#999',
      'font-family': 'Arial, sans-serif',
      'font-size': '18',
      'font-weight': 'bold',
      'letter-spacing': '3'
    });
    logoArea.textContent = 'WALKMAN';
    
    svg.append(defs, body, window, logoArea);
    return svg;
  }

  createCassetteSVG() {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 320 180',
      style: 'width: 100%; height: 100%;'
    });

    const defs = this.createSVGElement('defs');
    
    const cassetteGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-cassette`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    cassetteGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#2a2a2a' }),
      this.createSVGElement('stop', { offset: '50%', 'stop-color': '#1a1a1a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#0a0a0a' })
    );
    
    const labelGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-label`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    labelGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#e8e8e8' })
    );
    
    const tapeWindowGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-tapeWindow`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    tapeWindowGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': 'rgba(139, 69, 19, 0.2)' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': 'rgba(139, 69, 19, 0.4)' })
    );
    
    defs.append(cassetteGradient, labelGradient, tapeWindowGradient);
    
    // Cassette body
    const body = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '320',
      height: '180',
      rx: '6',
      fill: `url(#${this.instanceId}-cassette)`,
      stroke: '#000',
      'stroke-width': '2'
    });
    
    // Label area
    const label = this.createSVGElement('rect', {
      x: '20',
      y: '15',
      width: '280',
      height: '60',
      rx: '3',
      fill: `url(#${this.instanceId}-label)`,
      stroke: '#ccc',
      'stroke-width': '1'
    });
    
    // Tape viewing area
    const tapeArea = this.createSVGElement('rect', {
      x: '30',
      y: '90',
      width: '260',
      height: '70',
      rx: '3',
      fill: `url(#${this.instanceId}-tapeWindow)`,
      stroke: '#444',
      'stroke-width': '1'
    });
    
    // Screws
    const screw1 = this.createSVGElement('circle', { cx: '25', cy: '25', r: '3', fill: '#777' });
    const screw2 = this.createSVGElement('circle', { cx: '295', cy: '25', r: '3', fill: '#777' });
    const screw3 = this.createSVGElement('circle', { cx: '25', cy: '155', r: '3', fill: '#777' });
    const screw4 = this.createSVGElement('circle', { cx: '295', cy: '155', r: '3', fill: '#777' });
    
    svg.append(defs, body, label, tapeArea, screw1, screw2, screw3, screw4);
    return svg;
  }

  createRotorSVG(id) {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 100 100',
      style: 'width: 55px; height: 55px; transition: transform 0.1s linear;',
      id: id
    });

    const defs = this.createSVGElement('defs');
    const rotorGradient = this.createSVGElement('radialGradient', { 
      id: `${this.instanceId}-${id}-gradient` 
    });
    rotorGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      this.createSVGElement('stop', { offset: '70%', 'stop-color': '#f0f0f0' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#d0d0d0' })
    );
    defs.append(rotorGradient);

    const outer = this.createSVGElement('circle', {
      cx: '50',
      cy: '50',
      r: '48',
      fill: `url(#${this.instanceId}-${id}-gradient)`,
      stroke: '#999',
      'stroke-width': '2'
    });

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

    const centerHub = this.createSVGElement('circle', {
      cx: '50',
      cy: '50',
      r: '20',
      fill: '#333',
      stroke: '#222',
      'stroke-width': '1'
    });

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

    this.shadowRoot.innerHTML = '';

    const style = this.createElement('style');
    style.textContent = ''
      + ':host {'
      + '  display: block;'
      + '  max-width: 100%;'
      + '  font-family: Arial, sans-serif;'
      + '}'
      + '.walkman {'
      + '  position: relative;'
      + '  width: 100%;'
      + '  max-width: 400px;'
      + '  margin: 0 auto;'
      + '}'
      + '.walkman-body {'
      + '  position: relative;'
      + '  width: 100%;'
      + '}'
      + '.cassette-window {'
      + '  position: absolute;'
      + '  top: 8.5%;'
      + '  left: 7.5%;'
      + '  right: 7.5%;'
      + '  height: 63%;'
      + '  display: flex;'
      + '  flex-direction: column;'
      + '}'
      + '.cassette-container {'
      + '  position: relative;'
      + '  width: 100%;'
      + '  height: 100%;'
      + '}'
      + '.label-overlay {'
      + '  position: absolute;'
      + '  top: 8.3%;'
      + '  left: 6.25%;'
      + '  right: 6.25%;'
      + '  height: 33.3%;'
      + '  display: flex;'
      + '  align-items: center;'
      + '  gap: 8px;'
      + '  padding: 6px;'
      + '  box-sizing: border-box;'
      + '}'
      + '.label-image {'
      + '  width: 40px;'
      + '  height: 40px;'
      + '  object-fit: cover;'
      + '  border-radius: 2px;'
      + '  background: #ccc;'
      + '}'
      + '.label-title {'
      + '  flex: 1;'
      + '  font-size: 12px;'
      + '  font-weight: bold;'
      + '  color: #333;'
      + '  overflow: hidden;'
      + '  text-overflow: ellipsis;'
      + '  white-space: nowrap;'
      + '}'
      + '.rotors-area {'
      + '  position: absolute;'
      + '  top: 50%;'
      + '  left: 9.4%;'
      + '  right: 9.4%;'
      + '  height: 38.9%;'
      + '  display: flex;'
      + '  justify-content: space-between;'
      + '  align-items: center;'
      + '  padding: 0 15px;'
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
      + '  width: 70px;'
      + '  margin-right: -8px;'
      + '}'
      + '.tape-right {'
      + '  left: 100%;'
      + '  width: 70px;'
      + '  margin-left: -8px;'
      + '}'
      + '.controls {'
      + '  position: absolute;'
      + '  bottom: 10%;'
      + '  left: 10%;'
      + '  right: 10%;'
      + '  display: flex;'
      + '  justify-content: center;'
      + '  gap: 8px;'
      + '}'
      + '.control-btn {'
      + '  width: 50px;'
      + '  height: 50px;'
      + '  background: linear-gradient(135deg, #555 0%, #333 100%);'
      + '  color: white;'
      + '  border: 2px solid #222;'
      + '  border-radius: 50%;'
      + '  cursor: pointer;'
      + '  font-size: 16px;'
      + '  transition: all 0.2s;'
      + '  display: flex;'
      + '  align-items: center;'
      + '  justify-content: center;'
      + '  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);'
      + '}'
      + '.control-btn:hover {'
      + '  background: linear-gradient(135deg, #666 0%, #444 100%);'
      + '  transform: translateY(-1px);'
      + '  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);'
      + '}'
      + '.control-btn:active {'
      + '  transform: translateY(1px);'
      + '  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);'
      + '}'
      + '.control-btn.play-pause {'
      + '  width: 60px;'
      + '  height: 60px;'
      + '  font-size: 20px;'
      + '  background: linear-gradient(135deg, #666 0%, #444 100%);'
      + '}'
      + '@media (max-width: 480px) {'
      + '  .label-image {'
      + '    width: 35px;'
      + '    height: 35px;'
      + '  }'
      + '  .label-title {'
      + '    font-size: 11px;'
      + '  }'
      + '  .control-btn {'
      + '    width: 45px;'
      + '    height: 45px;'
      + '    font-size: 14px;'
      + '  }'
      + '  .control-btn.play-pause {'
      + '    width: 55px;'
      + '    height: 55px;'
      + '    font-size: 18px;'
      + '  }'
      + '}';

    const walkman = this.createElement('div', { className: 'walkman' });
    
    const walkmanBody = this.createElement('div', { className: 'walkman-body' });
    walkmanBody.append(this.createWalkmanBodySVG());
    
    const cassetteWindow = this.createElement('div', { className: 'cassette-window' });
    
    const cassetteContainer = this.createElement('div', { className: 'cassette-container' });
    cassetteContainer.append(this.createCassetteSVG());
    
    const labelOverlay = this.createElement('div', { className: 'label-overlay' });
    
    if (img) {
      const labelImage = this.createElement('img', {
        src: img,
        alt: title,
        className: 'label-image'
      });
      labelOverlay.append(labelImage);
    } else {
      labelOverlay.append(this.createElement('div', { className: 'label-image' }));
    }
    
    labelOverlay.append(this.createElement('div', {
      className: 'label-title',
      textContent: title
    }));
    
    const rotorsArea = this.createElement('div', { className: 'rotors-area' });
    
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
    
    rotorsArea.append(leftRotorWrapper, rightRotorWrapper);
    
    cassetteContainer.append(labelOverlay, rotorsArea);
    cassetteWindow.append(cassetteContainer);
    
    const controls = this.createElement('div', { className: 'controls' });
    
    const rewindBtn = this.createElement('button', { 
      className: 'control-btn',
      textContent: '⏪',
      title: 'Rewind'
    });
    rewindBtn.onclick = () => this.rewind();
    
    const playPauseBtn = this.createElement('button', { 
      className: 'control-btn play-pause',
      textContent: '▶',
      title: 'Play/Pause',
      id: 'play-pause-btn'
    });
    playPauseBtn.onclick = () => this.togglePlayPause();
    
    const forwardBtn = this.createElement('button', { 
      className: 'control-btn',
      textContent: '⏩',
      title: 'Forward'
    });
    forwardBtn.onclick = () => this.forward();
    
    const stopBtn = this.createElement('button', { 
      className: 'control-btn',
      textContent: '⏹',
      title: 'Stop'
    });
    stopBtn.onclick = () => this.stop();
    
    controls.append(rewindBtn, playPauseBtn, forwardBtn, stopBtn);
    
    walkmanBody.append(cassetteWindow, controls);
    walkman.append(walkmanBody);
    this.shadowRoot.append(style, walkman);
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
    this.audio.onplay = () => {
      this.isPlaying = true;
      this.updatePlayPauseButton();
      this.startAnimation();
    };
    this.audio.onpause = () => {
      this.isPlaying = false;
      this.updatePlayPauseButton();
      this.stopAnimation();
    };
    this.audio.onended = () => {
      this.isPlaying = false;
      this.updatePlayPauseButton();
      this.stopAnimation();
      this.resetRotors();
    };
  }

  updatePlayPauseButton() {
    const btn = this.shadowRoot.getElementById('play-pause-btn');
    if (btn) {
      btn.textContent = this.isPlaying ? '⏸' : '▶';
      btn.title = this.isPlaying ? 'Pause' : 'Play';
    }
  }

  togglePlayPause() {
    if (this.audio) {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        this.audio.play();
      }
    }
  }

  rewind() {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
    }
  }

  forward() {
    if (this.audio) {
      this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + 10);
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.updatePlayPauseButton();
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
