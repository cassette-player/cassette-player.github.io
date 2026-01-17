class CassettePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = null;
    this.animationFrame = null;
    this.rotationOffset = 0;
    this.lastTime = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.DEFAULT_DURATION_SECONDS = 180;
    this.ROTATION_SPEED = 0.25; // 360 degrees in 4 seconds
    this.MIN_TAPE_SIZE = 20;
    this.MAX_TAPE_SIZE = 50;
    this.INSERT_ANIMATION_DURATION = 3000; // 3 seconds default
    this.FAST_ROTATION_SPEED = 2.0; // 8x normal speed (2.0 vs 0.25 rotations/sec) for rewind/forward
    this.FAST_ROTATION_DURATION = 1000; // Duration of fast rotation in ms
    this.fastRotationMode = null; // null, 'forward', or 'rewind'
    this.fastRotationTimeout = null; // Track timeout to prevent race conditions
    this.LID_HEIGHT_PERCENT = 71.4; // 250px / 350px - covers from top to just below cassette window
    this.CASSETTE_START_POSITION_PERCENT = -150; // Start position above the window
    this.instanceId = `cassette-${Math.random().toString(36).substring(2, 11)}`;
  }

  static get observedAttributes() {
    return ['src', 'title', 'artist', 'rotation-speed', 'insert-animation-duration'];
  }

  connectedCallback() {
    this.render();
    this.setupAudio();
  }

  disconnectedCallback() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.fastRotationTimeout) {
      clearTimeout(this.fastRotationTimeout);
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'rotation-speed') {
        const speed = parseFloat(newValue);
        if (!isNaN(speed) && speed > 0) {
          this.ROTATION_SPEED = speed;
        } else {
          console.warn(`Invalid rotation-speed value: "${newValue}". Must be a positive number. Using current value: ${this.ROTATION_SPEED}`);
        }
      } else if (name === 'insert-animation-duration') {
        const duration = parseFloat(newValue);
        if (!isNaN(duration) && duration > 0) {
          this.INSERT_ANIMATION_DURATION = duration;
          // Update CSS variable if element is already rendered
          const walkman = this.shadowRoot.querySelector('.walkman');
          if (walkman) {
            walkman.style.setProperty('--insert-duration', `${duration}ms`);
          }
        } else {
          console.warn(`Invalid insert-animation-duration value: "${newValue}". Must be a positive number. Using current value: ${this.INSERT_ANIMATION_DURATION}`);
        }
      } else {
        this.render();
        if (name === 'src') {
          this.setupAudio();
        }
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

  createLidSVG() {
    const svg = this.createSVGElement('svg', {
      viewBox: '0 0 400 250',
      style: 'width: 100%; height: 100%;'
    });

    const defs = this.createSVGElement('defs');
    
    // Lid gradient - slightly darker than body
    const lidGradient = this.createSVGElement('linearGradient', { 
      id: `${this.instanceId}-lid`, 
      x1: '0%', 
      y1: '0%', 
      x2: '0%', 
      y2: '100%' 
    });
    lidGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#4a4a4a' }),
      this.createSVGElement('stop', { offset: '50%', 'stop-color': '#3a3a3a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#2a2a2a' })
    );
    
    defs.append(lidGradient);
    
    // Lid body
    const lid = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '400',
      height: '250',
      rx: '15',
      fill: `url(#${this.instanceId}-lid)`,
      stroke: '#000',
      'stroke-width': '3'
    });
    
    // Hinge line
    const hinge = this.createSVGElement('line', {
      x1: '0',
      y1: '240',
      x2: '400',
      y2: '240',
      stroke: '#555',
      'stroke-width': '2'
    });
    
    svg.append(defs, lid, hinge);
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
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#2b2b2d' }),
      this.createSVGElement('stop', { offset: '60%', 'stop-color': '#1b1b1d' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#0f0f10' })
    );

    const labelGradient = this.createSVGElement('linearGradient', {
      id: `${this.instanceId}-label`,
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%'
    });
    labelGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#fafafa' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#e6e6e6' })
    );

    const beigeStripGradient = this.createSVGElement('linearGradient', {
      id: `${this.instanceId}-beige-strip`,
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%'
    });
    beigeStripGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#e7c9a5' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#d8b38a' })
    );

    const ribPattern = this.createSVGElement('pattern', {
      id: `${this.instanceId}-rib`,
      width: '4',
      height: '4',
      patternUnits: 'userSpaceOnUse'
    });
    ribPattern.append(
      this.createSVGElement('rect', { x: '0', y: '0', width: '4', height: '4', fill: '#141414' }),
      this.createSVGElement('rect', { x: '0', y: '0', width: '4', height: '1', fill: '#222' })
    );

    const windowGradient = this.createSVGElement('linearGradient', {
      id: `${this.instanceId}-window`,
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%'
    });
    windowGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#2a2a2a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#0f0f0f' })
    );

    const reelGradient = this.createSVGElement('radialGradient', {
      id: `${this.instanceId}-reel`,
      cx: '50%',
      cy: '50%',
      r: '50%'
    });
    reelGradient.append(
      this.createSVGElement('stop', { offset: '0%', 'stop-color': '#3a3a3a' }),
      this.createSVGElement('stop', { offset: '100%', 'stop-color': '#121212' })
    );

    defs.append(
      cassetteGradient,
      labelGradient,
      beigeStripGradient,
      ribPattern,
      windowGradient,
      reelGradient
    );

    const body = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '320',
      height: '180',
      rx: '8',
      fill: `url(#${this.instanceId}-cassette)`,
      stroke: '#050505',
      'stroke-width': '2'
    });

    const topRib = this.createSVGElement('rect', {
      x: '0',
      y: '0',
      width: '320',
      height: '24',
      fill: `url(#${this.instanceId}-rib)`
    });

    const bottomRib = this.createSVGElement('rect', {
      x: '0',
      y: '152',
      width: '320',
      height: '28',
      fill: `url(#${this.instanceId}-rib)`
    });

    const label = this.createSVGElement('rect', {
      x: '20',
      y: '16',
      width: '280',
      height: '54',
      rx: '4',
      fill: `url(#${this.instanceId}-label)`,
      stroke: '#c7c7c7',
      'stroke-width': '1'
    });

    const labelStrip = this.createSVGElement('rect', {
      x: '20',
      y: '58',
      width: '280',
      height: '12',
      fill: `url(#${this.instanceId}-beige-strip)`
    });

    const windowFrame = this.createSVGElement('rect', {
      x: '36',
      y: '78',
      width: '248',
      height: '68',
      rx: '4',
      fill: '#0c0c0c',
      stroke: '#2a2a2a',
      'stroke-width': '1'
    });

    const windowGlass = this.createSVGElement('rect', {
      x: '44',
      y: '86',
      width: '232',
      height: '52',
      rx: '3',
      fill: `url(#${this.instanceId}-window)`,
      stroke: '#1d1d1d',
      'stroke-width': '1'
    });

    const leftReel = this.createSVGElement('circle', {
      cx: '98',
      cy: '112',
      r: '22',
      fill: `url(#${this.instanceId}-reel)`,
      stroke: '#3a3a3a',
      'stroke-width': '2'
    });

    const rightReel = this.createSVGElement('circle', {
      cx: '222',
      cy: '112',
      r: '22',
      fill: `url(#${this.instanceId}-reel)`,
      stroke: '#3a3a3a',
      'stroke-width': '2'
    });

    const centerWindow = this.createSVGElement('rect', {
      x: '134',
      y: '96',
      width: '52',
      height: '32',
      rx: '3',
      fill: '#151515',
      stroke: '#2f2f2f',
      'stroke-width': '1'
    });

    const centerSlit1 = this.createSVGElement('rect', {
      x: '146',
      y: '104',
      width: '4',
      height: '16',
      rx: '2',
      fill: '#303030'
    });

    const centerSlit2 = this.createSVGElement('rect', {
      x: '158',
      y: '104',
      width: '4',
      height: '16',
      rx: '2',
      fill: '#303030'
    });

    const centerSlit3 = this.createSVGElement('rect', {
      x: '170',
      y: '104',
      width: '4',
      height: '16',
      rx: '2',
      fill: '#303030'
    });

    const screw1 = this.createSVGElement('circle', { cx: '24', cy: '26', r: '3', fill: '#6f6f6f' });
    const screw2 = this.createSVGElement('circle', { cx: '296', cy: '26', r: '3', fill: '#6f6f6f' });
    const screw3 = this.createSVGElement('circle', { cx: '30', cy: '146', r: '3', fill: '#6f6f6f' });
    const screw4 = this.createSVGElement('circle', { cx: '290', cy: '146', r: '3', fill: '#6f6f6f' });

    const labelTextB = this.createSVGElement('text', {
      x: '32',
      y: '48',
      fill: '#333',
      'font-size': '20',
      'font-family': 'Arial, sans-serif',
      'font-weight': '700'
    });
    labelTextB.textContent = 'B';

    const labelTextTDK = this.createSVGElement('text', {
      x: '36',
      y: '136',
      fill: '#111',
      'font-size': '14',
      'font-family': 'Arial, sans-serif',
      'font-weight': '700'
    });
    labelTextTDK.textContent = 'TDK';

    const labelTextSA = this.createSVGElement('text', {
      x: '212',
      y: '136',
      fill: '#f3f3f3',
      'font-size': '16',
      'font-family': 'Arial, sans-serif',
      'font-weight': '700'
    });
    labelTextSA.textContent = 'SA';

    const labelText90 = this.createSVGElement('text', {
      x: '258',
      y: '126',
      fill: '#b6e21a',
      'font-size': '18',
      'font-family': 'Arial, sans-serif',
      'font-weight': '700'
    });
    labelText90.textContent = '90';

    const highBiasText = this.createSVGElement('text', {
      x: '72',
      y: '136',
      fill: '#1f1f1f',
      'font-size': '9',
      'font-family': 'Arial, sans-serif'
    });
    highBiasText.textContent = 'High Bias 70μs EQ';

    svg.append(
      defs,
      body,
      topRib,
      bottomRib,
      label,
      labelStrip,
      windowFrame,
      windowGlass,
      leftReel,
      rightReel,
      centerWindow,
      centerSlit1,
      centerSlit2,
      centerSlit3,
      screw1,
      screw2,
      screw3,
      screw4,
      labelTextB,
      labelTextTDK,
      highBiasText,
      labelTextSA,
      labelText90
    );

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
    const title = this.getAttribute('title') || 'Untitled';
    const artist = this.getAttribute('artist') || 'Unknown Artist';

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
      + '  overflow: hidden;'
      + '}'
      + '.walkman-body {'
      + '  position: relative;'
      + '  width: 100%;'
      + '}'
      + '.lid {'
      + '  position: absolute;'
      + '  top: 0;'
      + '  left: 0;'
      + '  right: 0;'
      + `  height: ${this.LID_HEIGHT_PERCENT}%;`
      + '  transform-origin: bottom center;'
      + '  z-index: 10;'
      + '  display: none;'
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
      + '  animation: cassette-insert var(--insert-duration) ease-out forwards;'
      + '}'
      + '@keyframes cassette-insert {'
      + '  0% {'
      + `    transform: translateY(${this.CASSETTE_START_POSITION_PERCENT}%);`
      + '  }'
      + '  100% {'
      + '    transform: translateY(0);'
      + '  }'
      + '}'
      + '.label-overlay {'
      + '  position: absolute;'
      + '  top: 8.3%;'
      + '  left: 6.25%;'
      + '  right: 6.25%;'
      + '  height: 33.3%;'
      + '  display: flex;'
      + '  flex-direction: column;'
      + '  justify-content: center;'
      + '  padding: 6px 10px;'
      + '  box-sizing: border-box;'
      + '}'
      + '.label-title, .label-artist {'
      + '  font-family: "Brush Script MT", "Comic Sans MS", cursive;'
      + '  overflow: hidden;'
      + '  text-overflow: ellipsis;'
      + '  white-space: nowrap;'
      + '}'
      + '.label-title {'
      + '  font-size: 16px;'
      + '  color: #333;'
      + '  margin-bottom: 2px;'
      + '}'
      + '.label-artist {'
      + '  font-size: 13px;'
      + '  color: #666;'
      + '}'
      + '.rotors-area {'
      + '  position: absolute;'
      + '  top: 50%;'
      + '  left: 50%;'
      + '  transform: translateX(-50%);'
      + '  height: 38.9%;'
      + '  display: flex;'
      + '  justify-content: center;'
      + '  align-items: center;'
      + '  gap: 98px;'
      + '  box-sizing: border-box;'
      + '}'
      + '.rotor-wrapper {'
      + '  position: relative;'
      + '  display: flex;'
      + '  align-items: center;'
      + '}'
      + '.tape-circle {'
      + '  position: absolute;'
      + '  border-radius: 50%;'
      + '  border: 3px solid #8b4513;'
      + '  transition: width 0.1s linear, height 0.1s linear;'
      + '  pointer-events: none;'
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
      + '@media (max-width: 480px) {'
      + '  .label-title {'
      + '    font-size: 14px;'
      + '  }'
      + '  .label-artist {'
      + '    font-size: 11px;'
      + '  }'
      + '  .control-btn {'
      + '    width: 45px;'
      + '    height: 45px;'
      + '    font-size: 14px;'
      + '  }'
      + '}';

    const walkman = this.createElement('div', { className: 'walkman' });
    walkman.style.setProperty('--insert-duration', `${this.INSERT_ANIMATION_DURATION}ms`);
    
    const walkmanBody = this.createElement('div', { className: 'walkman-body' });
    walkmanBody.append(this.createWalkmanBodySVG());
    
    const lid = this.createElement('div', { className: 'lid' });
    lid.append(this.createLidSVG());
    
    const cassetteWindow = this.createElement('div', { className: 'cassette-window' });
    
    const cassetteContainer = this.createElement('div', { className: 'cassette-container' });
    cassetteContainer.append(this.createCassetteSVG());
    
    const labelOverlay = this.createElement('div', { className: 'label-overlay' });
    
    labelOverlay.append(
      this.createElement('div', {
        className: 'label-title',
        textContent: title
      }),
      this.createElement('div', {
        className: 'label-artist',
        textContent: artist
      })
    );
    
    const rotorsArea = this.createElement('div', { className: 'rotors-area' });
    
    const leftRotorWrapper = this.createElement('div', { className: 'rotor-wrapper' });
    const leftRotor = this.createRotorSVG('left-rotor');
    const leftTapeCircle = this.createElement('div', { 
      className: 'tape-circle',
      id: 'left-tape-circle'
    });
    this.initTapeCircle(leftTapeCircle);
    leftRotorWrapper.append(leftRotor, leftTapeCircle);
    
    const rightRotorWrapper = this.createElement('div', { className: 'rotor-wrapper' });
    const rightRotor = this.createRotorSVG('right-rotor');
    const rightTapeCircle = this.createElement('div', { 
      className: 'tape-circle',
      id: 'right-tape-circle'
    });
    this.initTapeCircle(rightTapeCircle);
    rightRotorWrapper.append(rightRotor, rightTapeCircle);
    
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
      className: 'control-btn',
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
    
    const muteBtn = this.createElement('button', { 
      className: 'control-btn',
      textContent: '🔊',
      title: 'Mute/Unmute',
      id: 'mute-btn'
    });
    muteBtn.onclick = () => this.toggleMute();
    
    controls.append(rewindBtn, playPauseBtn, forwardBtn, stopBtn, muteBtn);
    
    walkmanBody.append(lid, cassetteWindow, controls);
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
      if (this.audio.paused) {
        this.audio.play();
      } else {
        this.audio.pause();
      }
    }
  }

  triggerFastRotation(mode) {
    // Clear any existing fast rotation timeout to prevent race conditions
    if (this.fastRotationTimeout) {
      clearTimeout(this.fastRotationTimeout);
      this.fastRotationTimeout = null;
    }
    // Enable fast rotation mode
    this.fastRotationMode = mode;
    if (!this.isPlaying) {
      // If not playing, start animation temporarily for visual feedback
      this.startAnimation();
    }
    // Stop fast rotation after duration
    this.fastRotationTimeout = setTimeout(() => {
      this.fastRotationMode = null;
      this.fastRotationTimeout = null;
      if (!this.isPlaying) {
        this.stopAnimation();
      }
    }, this.FAST_ROTATION_DURATION);
  }

  rewind() {
    if (this.audio) {
      const newTime = Math.max(0, this.audio.currentTime - 10);
      if (newTime !== this.audio.currentTime) {
        this.audio.currentTime = newTime;
        this.triggerFastRotation('rewind');
      }
    }
  }

  forward() {
    if (this.audio) {
      const maxTime = isNaN(this.audio.duration) ? this.audio.currentTime + 10 : this.audio.duration;
      const newTime = Math.min(maxTime, this.audio.currentTime + 10);
      if (newTime !== this.audio.currentTime) {
        this.audio.currentTime = newTime;
        this.triggerFastRotation('forward');
      }
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

  toggleMute() {
    if (this.audio) {
      this.isMuted = !this.isMuted;
      this.audio.muted = this.isMuted;
      this.updateMuteButton();
    }
  }

  updateMuteButton() {
    const btn = this.shadowRoot.getElementById('mute-btn');
    if (btn) {
      btn.textContent = this.isMuted ? '🔇' : '🔊';
      btn.title = this.isMuted ? 'Unmute' : 'Mute';
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

  setTapeCircleSize(element, size) {
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
  }

  initTapeCircle(element) {
    element.style.left = '50%';
    element.style.top = '50%';
    element.style.transform = 'translate(-50%, -50%)';
  }

  animate() {
    const leftRotor = this.shadowRoot.getElementById('left-rotor');
    const rightRotor = this.shadowRoot.getElementById('right-rotor');
    const leftTapeCircle = this.shadowRoot.getElementById('left-tape-circle');
    const rightTapeCircle = this.shadowRoot.getElementById('right-tape-circle');

    if (!leftRotor || !rightRotor || !leftTapeCircle || !rightTapeCircle || !this.audio) return;

    const now = performance.now();
    if (this.lastTime) {
      const delta = (now - this.lastTime) / 1000;
      // Use faster rotation speed when in fast rotation mode
      let rotationSpeed = this.ROTATION_SPEED;
      let rotationDirection = 1; // 1 for forward, -1 for backward
      
      if (this.fastRotationMode === 'forward') {
        rotationSpeed = this.FAST_ROTATION_SPEED;
        rotationDirection = 1;
      } else if (this.fastRotationMode === 'rewind') {
        rotationSpeed = this.FAST_ROTATION_SPEED;
        rotationDirection = -1;
      }
      
      this.rotationOffset += delta * rotationSpeed * 360 * rotationDirection;
    }
    this.lastTime = now;

    const rotation = this.rotationOffset % 360;
    const duration = this.audio.duration || this.DEFAULT_DURATION_SECONDS;
    const progress = duration > 0 ? Math.min(this.audio.currentTime / duration, 1) : 0;

    // Rotors stay the same size and just rotate
    leftRotor.style.transform = `rotate(${rotation}deg)`;
    rightRotor.style.transform = `rotate(${rotation}deg)`;

    // Tape circles grow and shrink
    const leftTapeSize = this.MAX_TAPE_SIZE - (progress * (this.MAX_TAPE_SIZE - this.MIN_TAPE_SIZE));
    const rightTapeSize = this.MIN_TAPE_SIZE + (progress * (this.MAX_TAPE_SIZE - this.MIN_TAPE_SIZE));
    
    this.setTapeCircleSize(leftTapeCircle, leftTapeSize);
    this.setTapeCircleSize(rightTapeCircle, rightTapeSize);

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  resetRotors() {
    const leftRotor = this.shadowRoot.getElementById('left-rotor');
    const rightRotor = this.shadowRoot.getElementById('right-rotor');
    const leftTapeCircle = this.shadowRoot.getElementById('left-tape-circle');
    const rightTapeCircle = this.shadowRoot.getElementById('right-tape-circle');

    if (leftRotor) {
      leftRotor.style.transform = 'rotate(0deg)';
    }
    if (rightRotor) {
      rightRotor.style.transform = 'rotate(0deg)';
    }
    
    if (leftTapeCircle) {
      this.setTapeCircleSize(leftTapeCircle, this.MAX_TAPE_SIZE);
    }
    
    if (rightTapeCircle) {
      this.setTapeCircleSize(rightTapeCircle, this.MIN_TAPE_SIZE);
    }

    this.rotationOffset = 0;
    this.lastTime = null;
  }
}

customElements.define('cassette-player', CassettePlayer);
