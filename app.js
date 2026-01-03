/**
 * DJ Mixer - Kova Portfolio
 * WebAudio API + Canvas Implementation
 */

// ============================================
// Audio Generation (Synthesized Loops)
// ============================================

function generateKickLoop(ctx, duration = 1) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const beatsPerLoop = 4;
    const beatLength = length / beatsPerLoop;
    
    for (let beat = 0; beat < beatsPerLoop; beat++) {
        const beatStart = Math.floor(beat * beatLength);
        const kickLength = Math.floor(sampleRate * 0.15);
        
        for (let i = 0; i < kickLength; i++) {
            const t = i / sampleRate;
            const freq = 150 * Math.exp(-t * 30);
            const amp = Math.exp(-t * 15);
            data[beatStart + i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.8;
        }
    }
    return buffer;
}

function generateBassLoop(ctx, duration = 2) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const notes = [55, 55, 73.42, 82.41]; // A1, A1, D2, E2
    const noteLength = length / notes.length;
    
    for (let n = 0; n < notes.length; n++) {
        const noteStart = Math.floor(n * noteLength);
        const freq = notes[n];
        
        for (let i = 0; i < noteLength; i++) {
            const t = i / sampleRate;
            const env = Math.exp(-t * 2) * (1 - Math.exp(-t * 50));
            const wave = Math.sin(2 * Math.PI * freq * t) + 
                        0.5 * Math.sin(4 * Math.PI * freq * t);
            data[noteStart + i] = wave * env * 0.4;
        }
    }
    return buffer;
}

function generateHihatLoop(ctx, duration = 1) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const hitsPerLoop = 8;
    const hitLength = length / hitsPerLoop;
    
    for (let hit = 0; hit < hitsPerLoop; hit++) {
        const hitStart = Math.floor(hit * hitLength);
        const hatLength = Math.floor(sampleRate * 0.05);
        
        for (let i = 0; i < hatLength; i++) {
            const t = i / sampleRate;
            const noise = Math.random() * 2 - 1;
            const env = Math.exp(-t * 80);
            data[hitStart + i] = noise * env * 0.3;
        }
    }
    return buffer;
}

function generateSynthLoop(ctx, duration = 2) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const notes = [261.63, 329.63, 392.00, 329.63]; // C4, E4, G4, E4
    const noteLength = length / notes.length;
    
    for (let n = 0; n < notes.length; n++) {
        const noteStart = Math.floor(n * noteLength);
        const freq = notes[n];
        
        for (let i = 0; i < noteLength; i++) {
            const t = i / sampleRate;
            const localT = i / noteLength;
            const env = Math.sin(localT * Math.PI);
            
            // Saw wave with filtering effect
            let wave = 0;
            for (let h = 1; h <= 8; h++) {
                wave += Math.sin(2 * Math.PI * freq * h * t) / h;
            }
            data[noteStart + i] = wave * env * 0.2;
        }
    }
    return buffer;
}

// ============================================
// Deck Class
// ============================================

class Deck {
    constructor(ctx, name, masterGain, analyser) {
        this.ctx = ctx;
        this.name = name;
        this.masterGain = masterGain;
        this.analyser = analyser;
        this.isPlaying = false;
        this.buffer = null;
        this.source = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.rotation = 0;
        
        // Create audio nodes
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0.8;
        
        // 3-band EQ
        this.lowEQ = ctx.createBiquadFilter();
        this.lowEQ.type = 'lowshelf';
        this.lowEQ.frequency.value = 320;
        this.lowEQ.gain.value = 0;
        
        this.midEQ = ctx.createBiquadFilter();
        this.midEQ.type = 'peaking';
        this.midEQ.frequency.value = 1000;
        this.midEQ.Q.value = 0.5;
        this.midEQ.gain.value = 0;
        
        this.highEQ = ctx.createBiquadFilter();
        this.highEQ.type = 'highshelf';
        this.highEQ.frequency.value = 3200;
        this.highEQ.gain.value = 0;
        
        // Connect: gain -> lowEQ -> midEQ -> highEQ -> master
        this.gainNode.connect(this.lowEQ);
        this.lowEQ.connect(this.midEQ);
        this.midEQ.connect(this.highEQ);
        this.highEQ.connect(this.masterGain);
        this.highEQ.connect(this.analyser);
        
        this.playbackRate = 1.0;
    }
    
    loadBuffer(buffer) {
        this.stop();
        this.buffer = buffer;
        this.pauseTime = 0;
    }
    
    play() {
        if (!this.buffer || this.isPlaying) return;
        
        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.playbackRate.value = this.playbackRate;
        this.source.connect(this.gainNode);
        
        const offset = this.pauseTime % this.buffer.duration;
        this.source.start(0, offset);
        this.startTime = this.ctx.currentTime - offset;
        this.isPlaying = true;
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.pauseTime = (this.ctx.currentTime - this.startTime) * this.playbackRate;
        this.source.stop();
        this.source.disconnect();
        this.source = null;
        this.isPlaying = false;
    }
    
    stop() {
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
            this.source = null;
        }
        this.isPlaying = false;
        this.pauseTime = 0;
    }
    
    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }
    
    setVolume(value) {
        this.gainNode.gain.value = value;
    }
    
    setPitch(cents) {
        this.playbackRate = 1 + (cents / 100);
        if (this.source) {
            this.source.playbackRate.value = this.playbackRate;
        }
    }
    
    setEQ(band, value) {
        const eq = { low: this.lowEQ, mid: this.midEQ, high: this.highEQ }[band];
        if (eq) eq.gain.value = value;
    }
    
    getPlaybackPosition() {
        if (!this.buffer) return 0;
        if (this.isPlaying) {
            return ((this.ctx.currentTime - this.startTime) * this.playbackRate) % this.buffer.duration;
        }
        return this.pauseTime % this.buffer.duration;
    }
}

// ============================================
// Main Application
// ============================================

class DJMixer {
    constructor() {
        this.audioCtx = null;
        this.deckA = null;
        this.deckB = null;
        this.masterGain = null;
        this.crossfaderValue = 0.5;
        this.samples = {};
        this.analyser = null;
        this.analyserData = null;
        
        // Animation state
        this.animationId = null;
        this.isAnimating = false;
        this.isTabVisible = true;
        
        // Waveform caches (pre-rendered ImageData)
        this.waveformCacheA = null;
        this.waveformCacheB = null;
        
        this.vinylCanvasA = document.getElementById('vinyl-a');
        this.vinylCanvasB = document.getElementById('vinyl-b');
        this.waveformCanvasA = document.getElementById('waveform-a');
        this.waveformCanvasB = document.getElementById('waveform-b');
        this.spectrumCanvas = document.getElementById('spectrum');
        
        this.init();
    }
    
    async init() {
        // Setup HiDPI canvas scaling
        this.setupHiDPICanvas(this.vinylCanvasA, 200, 200);
        this.setupHiDPICanvas(this.vinylCanvasB, 200, 200);
        this.setupHiDPICanvas(this.waveformCanvasA, 280, 60);
        this.setupHiDPICanvas(this.waveformCanvasB, 280, 60);
        this.setupHiDPICanvas(this.spectrumCanvas, 200, 150);
        
        // Setup event listeners first (before audio context)
        this.setupEventListeners();
        this.setupVisibilityHandler();
        
        // Draw initial states
        this.drawVinyl(this.vinylCanvasA, 0, false);
        this.drawVinyl(this.vinylCanvasB, 0, false);
        this.drawWaveformEmpty(this.waveformCanvasA);
        this.drawWaveformEmpty(this.waveformCanvasB);
        this.drawSpectrum(new Uint8Array(64));
    }
    
    // HiDPI/Retina canvas support
    setupHiDPICanvas(canvas, displayWidth, displayHeight) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        // Store display dimensions for drawing
        canvas.displayWidth = displayWidth;
        canvas.displayHeight = displayHeight;
    }
    
    // Visibility change handler - pause animation when tab hidden
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            this.isTabVisible = !document.hidden;
            if (this.isTabVisible && this.shouldAnimate()) {
                this.startAnimation();
            } else if (!this.isTabVisible) {
                this.stopAnimation();
            }
        });
    }
    
    // Check if animation should be running
    shouldAnimate() {
        const deckAPlaying = this.deckA && this.deckA.isPlaying;
        const deckBPlaying = this.deckB && this.deckB.isPlaying;
        return deckAPlaying || deckBPlaying;
    }
    
    // Start animation loop (only if not already running)
    startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.animate();
    }
    
    // Stop animation loop
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isAnimating = false;
    }
    
    // Update animation state when play state changes
    updateAnimationState() {
        if (this.shouldAnimate() && this.isTabVisible) {
            this.startAnimation();
        } else if (!this.shouldAnimate()) {
            // Do one final render then stop
            this.renderFrame();
            this.stopAnimation();
        }
    }
    
    initAudio() {
        if (this.audioCtx) {
            // Resume if suspended (mobile Safari/Chrome autoplay policy)
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            return;
        }
        
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume if suspended (mobile Safari/Chrome autoplay policy)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        // Master gain
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.audioCtx.destination);
        
        // Analyser for spectrum
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.connect(this.masterGain);
        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
        
        // Create gain nodes for crossfader
        this.gainA = this.audioCtx.createGain();
        this.gainB = this.audioCtx.createGain();
        this.gainA.connect(this.analyser);
        this.gainB.connect(this.analyser);
        
        // Create decks
        this.deckA = new Deck(this.audioCtx, 'A', this.gainA, this.analyser);
        this.deckB = new Deck(this.audioCtx, 'B', this.gainB, this.analyser);
        
        // Generate samples
        this.samples = {
            kick: generateKickLoop(this.audioCtx),
            bass: generateBassLoop(this.audioCtx),
            hihat: generateHihatLoop(this.audioCtx),
            synth: generateSynthLoop(this.audioCtx)
        };
        
        // Load default samples
        this.deckA.loadBuffer(this.samples.kick);
        this.deckB.loadBuffer(this.samples.bass);
        
        // Pre-render waveforms
        this.cacheWaveform('a', this.deckA.buffer);
        this.cacheWaveform('b', this.deckB.buffer);
        
        // Draw initial waveforms from cache
        this.drawWaveformFromCache(this.waveformCanvasA, this.waveformCacheA);
        this.drawWaveformFromCache(this.waveformCanvasB, this.waveformCacheB);
        
        // Apply crossfader
        this.updateCrossfader(50);
    }
    
    setupEventListeners() {
        // Play buttons
        document.getElementById('play-a').addEventListener('click', () => {
            this.initAudio();
            const playing = this.deckA.toggle();
            document.getElementById('play-a').textContent = playing ? '⏸ PAUSE' : '▶ PLAY';
            document.getElementById('play-a').classList.toggle('playing', playing);
            this.updateAnimationState();
        });
        
        document.getElementById('play-b').addEventListener('click', () => {
            this.initAudio();
            const playing = this.deckB.toggle();
            document.getElementById('play-b').textContent = playing ? '⏸ PAUSE' : '▶ PLAY';
            document.getElementById('play-b').classList.toggle('playing', playing);
            this.updateAnimationState();
        });
        
        // Load buttons
        document.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.initAudio();
                const deck = btn.dataset.deck;
                const select = document.getElementById(`track-select-${deck}`);
                const sample = this.samples[select.value];
                if (deck === 'a') {
                    this.deckA.loadBuffer(sample);
                    this.cacheWaveform('a', sample);
                    this.drawWaveformFromCache(this.waveformCanvasA, this.waveformCacheA);
                    document.getElementById('play-a').textContent = '▶ PLAY';
                    document.getElementById('play-a').classList.remove('playing');
                } else {
                    this.deckB.loadBuffer(sample);
                    this.cacheWaveform('b', sample);
                    this.drawWaveformFromCache(this.waveformCanvasB, this.waveformCacheB);
                    document.getElementById('play-b').textContent = '▶ PLAY';
                    document.getElementById('play-b').classList.remove('playing');
                }
                this.updateAnimationState();
            });
        });
        
        // Volume sliders
        this.setupSlider('volume-a', (v) => {
            if (this.deckA) this.deckA.setVolume(v / 100);
        });
        this.setupSlider('volume-b', (v) => {
            if (this.deckB) this.deckB.setVolume(v / 100);
        });
        
        // Pitch sliders
        this.setupSlider('pitch-a', (v) => {
            document.getElementById('pitch-val-a').textContent = (v > 0 ? '+' : '') + v + '%';
            if (this.deckA) this.deckA.setPitch(v);
        });
        this.setupSlider('pitch-b', (v) => {
            document.getElementById('pitch-val-b').textContent = (v > 0 ? '+' : '') + v + '%';
            if (this.deckB) this.deckB.setPitch(v);
        });
        
        // EQ sliders
        ['a', 'b'].forEach(deck => {
            ['low', 'mid', 'high'].forEach(band => {
                this.setupSlider(`eq-${band}-${deck}`, (v) => {
                    const d = deck === 'a' ? this.deckA : this.deckB;
                    if (d) d.setEQ(band, v);
                });
            });
        });
        
        // Crossfader
        this.setupSlider('crossfader', (v) => this.updateCrossfader(v));
        
        // Master volume
        this.setupSlider('master-volume', (v) => {
            if (this.masterGain) this.masterGain.gain.value = v / 100;
        });
    }
    
    setupSlider(id, callback) {
        const slider = document.getElementById(id);
        if (!slider) return;
        
        const handleInput = () => callback(parseFloat(slider.value));
        slider.addEventListener('input', handleInput);
        
        // Touch support
        slider.addEventListener('touchstart', (e) => {
            this.initAudio();
        }, { passive: true });
    }
    
    updateCrossfader(value) {
        this.crossfaderValue = value / 100;
        if (this.gainA && this.gainB) {
            // Equal power crossfade
            this.gainA.gain.value = Math.cos(this.crossfaderValue * Math.PI / 2);
            this.gainB.gain.value = Math.sin(this.crossfaderValue * Math.PI / 2);
        }
    }
    
    // ============================================
    // Waveform Caching
    // ============================================
    
    cacheWaveform(deck, buffer) {
        const canvas = deck === 'a' ? this.waveformCanvasA : this.waveformCanvasB;
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        
        // Create offscreen canvas for caching
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        
        // Draw background
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, w, h);
        
        if (!buffer) {
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No track loaded', w/2, h/2 + 4);
        } else {
            const data = buffer.getChannelData(0);
            const step = Math.ceil(data.length / w);
            const mid = h / 2;
            
            for (let i = 0; i < w; i++) {
                let min = 1.0;
                let max = -1.0;
                
                for (let j = 0; j < step; j++) {
                    const idx = (i * step) + j;
                    if (idx < data.length) {
                        const val = data[idx];
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                }
                
                const y1 = mid + (min * mid * 0.9);
                const y2 = mid + (max * mid * 0.9);
                
                ctx.fillStyle = '#bf5af2';
                ctx.fillRect(i, y1, 1, y2 - y1);
            }
            
            // Center line
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(0, mid);
            ctx.lineTo(w, mid);
            ctx.stroke();
        }
        
        // Store the cached image
        if (deck === 'a') {
            this.waveformCacheA = offscreen;
        } else {
            this.waveformCacheB = offscreen;
        }
    }
    
    drawWaveformFromCache(canvas, cache) {
        const ctx = canvas.getContext('2d');
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        
        ctx.clearRect(0, 0, w, h);
        if (cache) {
            ctx.drawImage(cache, 0, 0);
        }
    }
    
    drawWaveformEmpty(canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No track loaded', w/2, h/2 + 4);
    }
    
    // ============================================
    // Canvas Drawing
    // ============================================
    
    drawVinyl(canvas, rotation, isPlaying) {
        const ctx = canvas.getContext('2d');
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) / 2 - 5;
        
        ctx.clearRect(0, 0, w, h);
        
        // Outer ring (glow when playing)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        if (isPlaying) {
            ctx.shadowColor = '#bf5af2';
            ctx.shadowBlur = 20;
        }
        ctx.strokeStyle = isPlaying ? '#bf5af2' : '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Grooves
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        
        for (let r = 20; r < radius - 10; r += 8) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = r % 16 === 0 ? '#2a2a2a' : '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Label
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = isPlaying ? '#9b4dca' : '#4a4a4a';
        ctx.fill();
        ctx.strokeStyle = '#bf5af2';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        // Marker line
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(radius - 15, 0);
        ctx.strokeStyle = isPlaying ? '#bf5af2' : '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawSpectrum(data) {
        const canvas = this.spectrumCanvas;
        const ctx = canvas.getContext('2d');
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, w, h);
        
        const barCount = 32;
        const barWidth = (w / barCount) - 2;
        const step = Math.floor(data.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
            // Average a few bins for each bar
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += data[i * step + j];
            }
            const avg = sum / step;
            const barHeight = (avg / 255) * h * 0.9;
            
            const x = i * (barWidth + 2) + 2;
            const y = h - barHeight;
            
            // Gradient color based on height
            const hue = 280 + (i / barCount) * 40;
            const gradient = ctx.createLinearGradient(x, h, x, y);
            gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 1)`);
            gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, 1)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Glow effect
            ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
            ctx.shadowBlur = 5;
        }
        ctx.shadowBlur = 0;
    }
    
    drawPlayhead(canvas, position, duration) {
        if (!duration) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.displayWidth;
        const h = canvas.displayHeight;
        const x = (position / duration) * w;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    
    // ============================================
    // Animation Loop (optimized)
    // ============================================
    
    renderFrame() {
        // Update vinyl rotations
        if (this.deckA && this.deckA.isPlaying) {
            this.deckA.rotation += 0.03 * this.deckA.playbackRate;
        }
        if (this.deckB && this.deckB.isPlaying) {
            this.deckB.rotation += 0.03 * this.deckB.playbackRate;
        }
        
        // Draw vinyls
        this.drawVinyl(this.vinylCanvasA, 
            this.deckA ? this.deckA.rotation : 0, 
            this.deckA ? this.deckA.isPlaying : false);
        this.drawVinyl(this.vinylCanvasB, 
            this.deckB ? this.deckB.rotation : 0, 
            this.deckB ? this.deckB.isPlaying : false);
        
        // Draw waveforms from cache + playhead overlay
        if (this.deckA && this.deckA.buffer) {
            this.drawWaveformFromCache(this.waveformCanvasA, this.waveformCacheA);
            if (this.deckA.isPlaying) {
                this.drawPlayhead(this.waveformCanvasA, 
                    this.deckA.getPlaybackPosition(), 
                    this.deckA.buffer.duration);
            }
        }
        if (this.deckB && this.deckB.buffer) {
            this.drawWaveformFromCache(this.waveformCanvasB, this.waveformCacheB);
            if (this.deckB.isPlaying) {
                this.drawPlayhead(this.waveformCanvasB, 
                    this.deckB.getPlaybackPosition(), 
                    this.deckB.buffer.duration);
            }
        }
        
        // Draw spectrum
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.analyserData);
            this.drawSpectrum(this.analyserData);
        }
    }
    
    animate() {
        if (!this.isAnimating || !this.isTabVisible) return;
        
        this.renderFrame();
        
        // Only continue if something is playing
        if (this.shouldAnimate()) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.isAnimating = false;
        }
    }
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    window.djMixer = new DJMixer();
});
