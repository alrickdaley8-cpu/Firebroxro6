import { WORLDS } from '../config/worlds';
import { assetUrl } from '../utils/math';
import { icon, logo } from './icons';

export function template(): string {
  return `
    <div class="scene-layer" id="scene-layer">
      <canvas id="universe" tabindex="0" aria-label="Interactive planet. Drag to orbit, scroll or pinch to zoom. Press E to explore, S to scan, or R to reset." aria-describedby="controls-hint"></canvas>
      <div class="fallback-planet" id="fallback-planet" hidden><img src="${assetUrl('assets/worlds/aurelia.webp')}" alt="An artist’s impression of Aurelia, a copper-colored ringed planet" /></div>
      <div class="scene-shade"></div>
      <div class="scene-grain"></div>
    </div>
    <div class="ui-shell">
      <header class="site-header">
        <button class="brand" data-action="home" aria-label="Aether observatory home">${logo()}<span class="wordmark">AETHER<span>DEEP SPACE OBSERVATORY</span></span></button>
        <nav class="main-nav" aria-label="Main navigation">
          <button class="nav-link is-active" data-action="home" data-nav="home">Observatory<span class="nav-dot"></span></button>
          <button class="nav-link" data-dialog="atlas" data-nav="atlas">The atlas</button>
          <button class="nav-link" data-dialog="journal" data-nav="journal" aria-label="Open mission log"><span class="nav-text">Mission log</span>${icon('book', 'mobile-nav-icon')}<span class="log-count" id="log-count" hidden>0</span></button>
        </nav>
        <div class="header-actions">
          <span class="system-status"><i></i> SYSTEM ONLINE</span>
          <span class="header-divider"></span>
          <button class="icon-button sound-button" id="sound-button" data-action="sound" aria-label="Enable ambient sound" aria-pressed="false" title="Enable ambient sound (M)">${icon('muted')}</button>
          <button class="icon-button" data-dialog="settings" aria-label="Open settings" title="Settings">${icon('settings')}</button>
        </div>
      </header>
      <main class="observatory" id="main">
        <div class="observation-topline">
          <span class="expedition-label"><span class="tiny-cross">+</span> EXPEDITION 001 <span class="slash">/</span> THE OUTER REACHES</span>
          <div class="live-status"><span class="live-dot"></span> LIVE OBSERVATION <span class="time-divider">/</span> <time id="session-clock">00:00:00</time></div>
        </div>
        <section class="hero-copy" id="hero-overview" aria-labelledby="hero-title">
          <div class="eyebrow"><span class="eyebrow-line"></span> AN INVITATION TO WANDER</div>
          <h1 id="hero-title">Beyond the<br><em>known.</em></h1>
          <p class="hero-description">Somewhere, something incredible is waiting.<br>Take a moment. See what’s out there.</p>
          <div class="hero-actions"><button class="primary-button" id="begin-button" data-action="explore">Begin exploration <span class="button-arrow">${icon('arrow')}</span></button></div>
          <button class="story-link" data-dialog="about">The story behind Aether ${icon('northeast')}</button>
        </section>
        <section class="orbit-panel" id="orbit-panel" aria-labelledby="orbit-name" hidden>
          <button class="back-link" data-action="home">${icon('back')} Back to the observatory</button>
          <div class="eyebrow" id="orbit-classification">01 / RINGED SUPER-EARTH</div>
          <h1 id="orbit-name">Aurelia<span>.</span></h1>
          <p class="orbit-description" id="orbit-description"></p>
          <div class="planet-stats">
            <div><span>DISTANCE</span><strong id="stat-distance">1,402 <small>ly</small></strong></div>
            <div><span>RADIUS</span><strong id="stat-radius">— <small>R⊕</small></strong></div>
            <div><span>SURFACE TEMP.</span><strong id="stat-temperature">— <small>°C</small></strong></div>
          </div>
          <button class="primary-button scan-button" id="scan-button" data-action="scan">${icon('scan')} <span id="scan-button-label">Scan this world</span> <span class="key-hint">S</span></button>
          <div class="scan-progress" id="scan-progress" hidden>
            <div class="scan-progress-top"><span id="scan-stage">Mapping atmosphere</span><span id="scan-percent">0%</span></div>
            <div class="scan-progress-track" role="progressbar" aria-label="Planetary scan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="scan-meter"><span id="scan-fill"></span></div>
          </div>
          <p class="scan-note" id="scan-note">A closer look reveals a different kind of wonder.</p>
        </section>
        <div class="view-telemetry" aria-hidden="true"><span>DEEP FIELD ARRAY</span><strong>SECTOR <span id="sector-number">07</span> <span class="telemetry-cross">${icon('scan')}</span></strong><span id="coordinates">19h 41m 22s / +44° 58′ 18″</span></div>
        <div class="world-annotation" id="world-annotation"><span class="annotation-stem"><i></i></span><div><div class="annotation-index">OBJECT <span id="object-index">01</span> <span class="annotation-separator">/</span> <span id="object-distance">1,402 LY FROM HOME</span></div><button class="annotation-name" id="annotation-name" data-action="explore">Aurelia ${icon('northeast')}</button><span class="annotation-type" id="annotation-type">THE RINGED WONDER</span></div></div>
        <div class="controls-hint" id="controls-hint">${icon('mouse')}<span>Drag to orbit</span><i></i><span class="desktop-hint">Scroll to zoom</span><span class="touch-hint">Pinch to zoom</span></div>
        <div class="view-controls" role="group" aria-label="Camera controls">
          <span class="camera-mode" id="camera-mode">FREE ORBIT</span>
          <button class="view-button" data-action="zoom-in" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button>
          <button class="view-button" data-action="zoom-out" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button>
          <span class="control-divider"></span>
          <button class="view-button" data-action="reset-camera" aria-label="Reset camera" title="Reset camera (R)">${icon('reset')}</button>
          <button class="view-button" id="pause-button" data-action="pause" aria-label="Pause motion" aria-pressed="false" title="Pause motion (Space)">${icon('pause')}</button>
        </div>
        <div class="pause-notice" id="pause-notice" hidden>${icon('pause')} A moment of stillness. <button data-action="pause">Resume ${icon('play')}</button></div>
        <div class="context-notice" id="context-notice" hidden><span>The observatory is reconnecting.</span><button data-action="reload">Reload view ${icon('reset')}</button></div>
      </main>
      <section class="destination-dock" id="worlds" aria-labelledby="destinations-heading" tabindex="-1">
        <div class="dock-heading"><h2 id="destinations-heading">A FEW PLACES TO GET LOST</h2><span><span class="dock-heading-line"></span> FOUR WORLDS. INFINITE PERSPECTIVE.</span></div>
        <div class="world-list">${WORLDS.map(world => `
          <button class="world-card ${world.index === '01' ? 'is-selected' : ''}" data-world="${world.id}" aria-pressed="${world.index === '01'}" aria-label="Select ${world.name}, ${world.classification}">
            <span class="card-number">${world.index}</span>
            <img class="card-planet" src="${assetUrl(`assets/worlds/${world.id}.webp`)}" alt="" width="110" height="110" />
            <span class="card-content"><span class="card-type">${world.classification}</span><span class="card-name">${world.name}</span><span class="card-subtitle">${world.subtitle}</span></span>
            <span class="card-selected-mark"><i></i></span><span class="card-discovered" aria-label="Observed" hidden>${icon('check')}</span><span class="card-arrow">${icon('northeast')}</span>
          </button>`).join('')}
        </div>
      </section>
      <footer class="site-footer"><span class="footer-motto">${icon('star')} A LITTLE PERSPECTIVE CHANGES EVERYTHING.</span><span class="footer-center">IMAGINED WORLDS. REAL CURIOSITY.</span><button class="immersive-button" data-action="fullscreen">IMMERSIVE MODE ${icon('scan')}</button></footer>
    </div>
    <div class="loader" id="loader" role="status" aria-live="polite">
      <div class="loader-content"><div class="loader-orbit">${logo()}<span></span></div><span class="loader-wordmark">AETHER</span><p>Good things are a little further out.</p><div class="loader-track"><span id="loader-fill"></span></div><div class="loader-meta"><span id="loader-stage">Establishing deep-space link</span><span id="loader-percent">0%</span></div></div><span class="loader-bottom">AN INTERSTELLAR EXPERIENCE</span>
    </div>
    <dialog class="modal" id="app-dialog" aria-labelledby="dialog-title"><div id="dialog-content"></div></dialog>
    <div class="toast" id="toast" role="status" aria-live="polite">${icon('check')}<span id="toast-text"></span></div>
    <div class="debug-panel" id="debug-panel" hidden></div>
  `;
}
