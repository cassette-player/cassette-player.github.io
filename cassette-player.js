class CassettePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = null;
    this.animationFrame = null;
    this.rotationOffset = 0; // Track rotation progress
    this.lastTime = null;
    this.DEFAULT_DURATION_SECONDS = 180; // Default 3 minutes for tape animation
    this.ROTATION_SPEED = 2; // Degrees per second
    this.MIN_ROTOR_SCALE = 0.5;
    this.MAX_ROTOR_SCALE = 1.0;
  }

  static get observedAttributes() {
    return ['src', 'img', 'title'];
  }

  connectedCallback() {
    this.render();
    this.setupAudio();
    this.setupControls();
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

  render() {
    const src = this.getAttribute('src') || '';
    const img = this.getAttribute('img') || '';
    const title = this.getAttribute('title') || 'Untitled';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 100%;
          font-family: Arial, sans-serif;
        }

        .cassette {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          aspect-ratio: 1.6 / 1;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          padding: 20px;
          box-sizing: border-box;
        }

        .label {
          position: relative;
          width: 100%;
          height: 35%;
          background: linear-gradient(to bottom, #f5f5f5 0%, #e0e0e0 100%);
          border-radius: 4px;
          padding: 8px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .label-image {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 2px;
          background: #ccc;
        }

        .label-title {
          flex: 1;
          font-size: 14px;
          font-weight: bold;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tape-window {
          position: relative;
          width: 100%;
          height: 50%;
          margin-top: 10px;
          background: rgba(139, 69, 19, 0.3);
          border-radius: 4px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .rotor-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rotor {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #f5f5f5;
          position: relative;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s linear;
        }

        .rotor-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50%;
          height: 50%;
          border-radius: 50%;
          background: #333;
        }

        .rotor-teeth {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .rotor-tooth {
          position: absolute;
          width: 2px;
          height: 40%;
          background: #999;
          top: 5%;
          left: 50%;
          transform-origin: bottom center;
        }

        .tape {
          position: absolute;
          top: 50%;
          height: 2px;
          background: #8b4513;
          transform: translateY(-50%);
        }

        .tape.left {
          right: 50%;
          width: 25%;
        }

        .tape.right {
          left: 50%;
          width: 25%;
        }

        .controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }

        button {
          background: #333;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        button:hover {
          background: #555;
        }

        button:active {
          background: #222;
        }

        button:disabled {
          background: #666;
          cursor: not-allowed;
          opacity: 0.5;
        }

        @media (max-width: 480px) {
          .cassette {
            max-width: 100%;
            padding: 15px;
          }

          .label-title {
            font-size: 12px;
          }

          .label-image {
            width: 40px;
            height: 40px;
          }

          .rotor {
            width: 50px;
            height: 50px;
          }

          button {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      </style>

      <div class="cassette">
        <div class="label">
          ${img ? `<img src="${img}" alt="${title}" class="label-image" />` : '<div class="label-image"></div>'}
          <div class="label-title">${title}</div>
        </div>
        
        <div class="tape-window">
          <div class="rotor-container">
            <div class="rotor" id="left-rotor">
              <div class="rotor-inner"></div>
              <div class="rotor-teeth">
                ${this.generateRotorTeeth()}
              </div>
            </div>
          </div>
          
          <div class="tape left"></div>
          <div class="tape right"></div>
          
          <div class="rotor-container">
            <div class="rotor" id="right-rotor">
              <div class="rotor-inner"></div>
              <div class="rotor-teeth">
                ${this.generateRotorTeeth()}
              </div>
            </div>
          </div>
        </div>

        <div class="controls">
          <button id="play-btn">▶ Play</button>
          <button id="pause-btn">⏸ Pause</button>
          <button id="stop-btn">⏹ Stop</button>
        </div>
      </div>
    `;
  }

  generateRotorTeeth() {
    let teeth = '';
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60);
      teeth += `<div class="rotor-tooth" style="transform: rotate(${angle}deg) translateX(-50%)"></div>`;
    }
    return teeth;
  }

  setupAudio() {
    const src = this.getAttribute('src');
    if (!src) return;

    if (this.audio) {
      this.audio.pause();
    }

    this.audio = new Audio(src);
    
    this.audio.addEventListener('loadedmetadata', () => {
      // Duration is set from audio metadata when available
    });

    this.audio.addEventListener('play', () => {
      this.startAnimation();
    });

    this.audio.addEventListener('pause', () => {
      this.stopAnimation();
    });

    this.audio.addEventListener('ended', () => {
      this.stopAnimation();
      this.resetRotors();
    });
  }

  setupControls() {
    const playBtn = this.shadowRoot.getElementById('play-btn');
    const pauseBtn = this.shadowRoot.getElementById('pause-btn');
    const stopBtn = this.shadowRoot.getElementById('stop-btn');

    if (playBtn) {
      playBtn.addEventListener('click', () => this.play());
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pause());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }
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
      const delta = (now - this.lastTime) / 1000; // Convert to seconds
      this.rotationOffset += delta * this.ROTATION_SPEED * 360;
    }
    this.lastTime = now;

    const rotation = this.rotationOffset % 360;

    // Calculate progress (0 to 1) based on audio currentTime
    const duration = this.audio.duration || this.DEFAULT_DURATION_SECONDS;
    const progress = duration > 0 ? Math.min(this.audio.currentTime / duration, 1) : 0;

    // Left rotor shrinks, right rotor grows
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

// Register the custom element
customElements.define('cassette-player', CassettePlayer);
