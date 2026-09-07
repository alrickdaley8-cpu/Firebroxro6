# AETHER
### Beyond the known.

A cinematic, interactive orbital observatory built with **Three.js, TypeScript, and Vite**. Explore four imagined worlds, find your own camera angle, and turn a closer look into a lasting discovery.

This is an atmospheric exploration experience, not a combat game or an astronomical simulator. World names, coordinates, distances, and scientific readings are fictional.

## Quick start

Use **Node.js 20.19+ or 22.12+**; Node 22 is recommended. Run every command from the repository root.

```bash
npm install
npm run dev
```

Vite prints the development URL. The server binds to `0.0.0.0:5173`, supports Arena's `.e2b.app` preview host, and needs no backend or global packages. `npm start` is an alias for `npm run dev`.

**In Arena, keep `npm run dev` running for the live preview.** It serves the persisted source files, rather than depending on a generated `dist/` folder that may be absent after a workspace restart. Ports are strict so Vite does not silently move the preview to another port.

### Production

```bash
npm run build
npm run preview
```

`npm run build` first runs strict TypeScript checking, then creates the complete static site in **`dist/`**. `npm run preview` automatically builds fresh output through its `prepreview` hook, then serves it on `0.0.0.0:4173`. This also works after generated build files have been cleared. Use an HTTP server, not a `file://` URL.

**No environment variables, accounts, secrets, API keys, or external asset services are required.** All runtime assets and fonts are included locally.

## The experience

1. Choose **Aurelia**, **Pelagos**, **Vesper**, or **Nix** in the destination strip or celestial atlas.
2. Select **Begin exploration**, click the planet, or press **E** to enter orbit.
3. Drag to look around; scroll or pinch to zoom.
4. **Scan this world** to resolve its readings and reveal its story.
5. Revisit, export, or clear your discoveries in the **Mission log**.

A scan takes about 3.6 seconds. Opening a dialog, pausing, hiding the tab, or losing the graphics context pauses it. Changing worlds or returning to the observatory cancels an unfinished scan. A completed observation is recorded once per world.

Preferences and discoveries are stored on the current browser/device. If storage is blocked, exploration continues in memory and the interface explains that changes will last only for the session. Audio always starts off, even when other preferences are restored.

## Features

- **An authored 3D composition:** detailed rocky, oceanic, gaseous, and icy planetary surfaces; a ring system; orbiting moons; distant stars; and a cinematic nebula backdrop.
- **PBR rendering:** physically based roughness, surface bump detail, image-based lighting from a procedurally generated environment, warm directional light, and a cool rim light.
- **Purpose-built GLSL:** atmospheric Fresnel scattering, layered radial rings with analytic planetary occlusion, star twinkle, and an interactive latitude-scanning effect.
- **Selective post-processing:** HDR targets, subtle bloom, ACES filmic tone mapping, vignette, and restrained grain. The low tier bypasses the entire post-processing stack.
- **Efficient scenery:** a single buffered star field, buffered ring debris, three instanced moons, shared scene resources, and bounded drawing-buffer budgets.
- **A damped orbital camera:** a gentle opening move, close-observation framing, drag/pinch control, bounded zoom, reset, and adjustable sensitivity.
- **A complete interface:** progressive loading, destination selection, planetary profiles, atlas, persistent mission log, JSON export, confirmation before clearing observations, settings, notifications, and fullscreen where permitted.
- **Original generative audio:** a quiet Web Audio drone and wind bed, UI tones, scan sweep, and discovery chime. No audio downloads and no autoplay.
- **Accessibility:** semantic HTML controls, native dialog focus trapping, Escape dismissal, visible keyboard focus, a skip link, reduced-motion support, touch handling, configurable letter shortcuts, and an illustrated non-WebGL fallback.
- **Resilience:** optional texture fallbacks, stale-loading-request protection, context-loss recovery, bounded device pixel ratios, and no rendering work while the document is hidden.

## Controls

| Input | Action |
| --- | --- |
| Drag with mouse / one finger | Orbit the selected world |
| Scroll / pinch with two fingers | Zoom |
| **E** | Enter orbit |
| **S** | Scan; open the discovery if already charted |
| **← / →** or **1–4** | Select a world |
| **R** | Reset the camera |
| **M** | Enable/mute sound |
| **Space** | Pause/resume motion and scanning |
| **Esc** | Close a dialog; otherwise return to the observatory |

In **Settings**, click the letter keys to reassign E/S/R/M. Press a distinct letter, or Escape to cancel. Mouse/touch sensitivity, automatic orbit, orbital guides, motion reduction, volume, and rendering quality are also configurable. The interface and accessible control hints reflect reassigned keys.

On mobile, swipe the destination strip horizontally. A book icon opens the mission log; sound controls are available in Settings. Very short landscape screens allow vertical scrolling rather than hiding controls.

## Rendering and performance

**Automatic** starts at a sensible tier based on screen size, available memory, and CPU concurrency. Known software rasterizers start at Low. A time-windowed frame monitor steps down after sustained slow performance and recovers conservatively, with cooldowns to avoid oscillation. Manual quality choices disable this adaptation.

| Tier | Maximum DPR¹ | Drawing-buffer budget | Bloom / grading | Shadow map | Stars / debris |
| --- | ---: | ---: | --- | ---: | ---: |
| Low | 1.0 | 1.3 MP | Single-pass fallback | Off | 450 / 100 |
| Medium | 1.25 | 2.3 MP | On | Off | 900 / 250 |
| High | 1.65 | 4.0 MP | On | 1024² | 1500 / 450 |
| Ultra | 2.0 | 6.0 MP | On | 2048² | 2400 / 750 |

¹ Actual DPR is also limited by the device DPR, drawing-buffer budget, and maximum texture dimension. HTML text stays crisp independently of 3D resolution.

The interface targets smooth 60 FPS where hardware permits; it does not promise identical performance on every GPU. The renderer avoids transient per-frame scene objects, stops automatic animation for reduced-motion users, and uses on-demand drawing when motion is paused. Low-tier rendering retains PBR surfaces, atmospheric shaders, rings, and the background composition. Devices without floating-point color-buffer support use the direct-rendering path and direct lighting instead of HDR post-processing/IBL.

The hero surface and sky are loaded first. Other full planetary textures are loaded on demand and cached; destination portraits are small local WebP images. Failed textures are replaced with deterministic generated surfaces. WebGL 2 failure switches to illustrated exploration while keeping scanning, settings, the atlas, and the journal usable.

Add **`?debug=1`** to the page URL for actual rendered FPS, draw calls, triangle count, pixel ratio, and the active quality tier. Diagnostics are otherwise hidden, including in production.

Depth of field, motion blur, screen-space AO, character animation, collision physics, and WebGPU are deliberately not included: this scene has no walking character or collision environment, and obscuring distant objects would work against its visual clarity. All meshes are authored procedurally; there are no external GLB files or unnecessary model-decoder dependencies.

## Architecture

```text
src/
├── main.ts                    # Entry point and hot-reload lifecycle
├── app/Observatory.ts          # Application orchestration, scan loop, recovery
├── core/                      # Typed state store and resilient asset cache
├── config/                    # World data, quality budgets, key bindings
├── rendering/                 # Renderer, HDR passes, resize and context targets
├── camera/                    # Damped orbit camera and responsive composition
├── lighting/                  # Key/rim lights, shadow and environment setup
├── scene/                     # Planet, rings, instanced moons, buffered stars
├── shaders/                   # Standalone GLSL sources
├── input/                     # Keyboard mapping and robust touch buttons
├── audio/                     # Gesture-unlocked Web Audio synthesis
├── ui/                        # Semantic templates, dialogs, DOM binding, styling
└── utils/                     # Deterministic math and validated local persistence
public/
├── assets/                    # Nebula, favicon, four destination portraits
├── textures/                  # Planetary surface maps
└── licenses/                  # Bundled font licenses
scripts/generate-art.mjs        # Offline deterministic texture/portrait pipeline
```

The store is the boundary between UI and simulation. Audio, input, rendering, the camera, and assets have explicit lifecycles. Three.js and post-processing are separated into production chunks; shaders are imported as build-time strings. No frontend code calls a development API or another local service.

## Deployment

The site has **no client-side URL routes**. Panels are application state, so no SPA rewrite rules or backend are needed. Vite uses `base: './'`; the same build can be served at a domain root or a nested project path.

| Platform | Configuration |
| --- | --- |
| **Vercel** | Import the repository. The included `vercel.json` sets Vite, `npm run build`, and `dist`. |
| **Netlify** | Import the repository. `netlify.toml` supplies the build, publish directory, Node version, and basic response headers. |
| **Cloudflare Pages** | Build command: `npm run build`; output directory: `dist`; Node 22. |
| **GitHub Pages** | Activate the workflow template in `docs/github-actions/ci.yml`. It builds, tests, uploads `dist`, and deploys through the official Pages actions after its configuration preflight succeeds. Select **GitHub Actions** as the Pages source and permit the deploying branch. See the owner setup below. |
| **Nginx / Apache / static hosting** | Copy the contents of `dist` to the desired public directory and serve over HTTP(S). Serve the directory URL with its trailing slash. |

Do not deploy `src/`, `node_modules/`, or the development server as the production application. HTTPS is recommended for normal browser security and device behavior. Fullscreen may be denied by an embedding site's permissions policy; the application reports this without interrupting exploration.

### GitHub Pages owner setup

The existing Pages site publishes a different Arena branch. Publishing raw Vite source from a branch root does not build this application. The connected GitHub App currently rejects workflow-file updates and Pages-setting changes. The workflow is therefore supplied as an **inactive, owner-activated template**, not represented as running CI or a successful deployment.

1. With an account/connection authorized to edit Actions workflows, copy **`docs/github-actions/ci.yml`** to **`.github/workflows/ci.yml`** and commit it to the deploying branch. This can be done in GitHub's file editor, or after reconnecting GitHub in Arena with workflow permission.
2. [Settings → Pages](https://github.com/alrickdaley8-cpu/Firebroxro6/settings/pages): under **Build and deployment**, set **Source** to **GitHub Actions**.
3. [Settings → Environments](https://github.com/alrickdaley8-cpu/Firebroxro6/settings/environments) → **github-pages** → **Deployment branches and tags**: add the exact branch **`arena/01a07d35-firebroxro6`**. Also permit **`main`** if publishing after merging the pull request. Keep other protection rules intact.
4. Re-run **Quality checks** in the [Actions tab](https://github.com/alrickdaley8-cpu/Firebroxro6/actions), or push another commit to an allowed deployment branch.

Once activated, the workflow runs on pushes to `main` and this session branch, plus pull requests. Pull requests are tested but never deployed. A read-only preflight checks Pages' build source and environment branch policies. If owner configuration is missing, build tests still run, the Pages artifact is retained, and publishing is explicitly **skipped with setup instructions**. A green build alone is **not** a claim that the website was published.

Once the **Publish GitHub Pages** job succeeds, the site is served at **https://alrickdaley8-cpu.github.io/Firebroxro6/**. The existing site is not changed while publication is blocked. The GitHub connection must have the appropriate settings permissions to make the owner changes through Arena; reconnect it if those operations return `Resource not accessible by integration`.

## Testing

```bash
npm test                 # Deterministic unit and asset-integrity tests
npm run typecheck        # Strict TypeScript check
npm run build            # Verify and build the production site

# One-time setup for browser regression tests:
npx playwright install --with-deps chromium
npm run test:e2e          # Builds, serves, and tests the production site
```

Unit tests cover storage rejection/corruption, validation, duplicate observations, key bindings, state subscriptions, seeded art, frame-independent damping, adaptive quality, and all referenced assets.

Browser tests exercise real WebGL rendering, visual changes from camera controls, scanning, persistence, export, deletion confirmation, native dialog focus, sound controls, rebinding, every rendering tier, resizing, mobile touch, the atlas, missing textures, unsupported WebGL, and graphics-context restoration.

`E2E_BASE_URL` can point the tests at an already-running development, production, or nested-path server. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing Chromium binary in constrained CI environments. These are **test-only** options, not application requirements. After owner activation, the GitHub Actions template runs installation, unit tests, a production build, and Chromium regression tests on pushes, pull requests, and manual dispatch. Push/manual runs also upload the production artifact and check whether Pages is configured to publish it. Until activation, these checks can be run locally with the commands above; no remote CI run is implied.

### Verified implementation checkpoint

On **7 September 2026**, verification included a clean `npm ci`, the development server, strict type checking, **26 passing unit tests**, a successful production build, **8 passing Chromium browser tests**, and the complete discovery/export/persistence flow served from `/observatory/` by a plain static HTTP server. Runtime asset requests resolved at both root and nested deployment paths. `npm audit` reported **0 vulnerabilities**, and the optional art-generation command reproduced identical assets.

### Editing the art

```bash
npm run assets
```

Regenerates the three procedural surface maps and all four shaded portraits from the committed Aurelia source albedo and deterministic spherical noise. This is an optional, offline authoring step using Sharp; normal installation, development, and production builds use the committed images directly.

## Asset and license notes

- The Aurelia source albedo and nebula image were AI-generated for this project, not taken from NASA or a third-party model library.
- Pelagos, Vesper, and Nix surface maps, destination portraits, geometry, ring patterns, shaders, icon artwork, and synthesized sound are authored/generated within this project. No external asset URLs are required at runtime.
- **DM Sans** and **Instrument Serif** are locally bundled from Fontsource and licensed under the **SIL Open Font License**. Their notices are retained in `public/licenses/`.
- Three.js is MIT-licensed. Three.js and Vite notices are also copied to `public/licenses/` for inclusion in the static deployment. Other dependency licenses are retained in their packages.

## Practical limitations

This is a compact, art-directed observatory with four fixed worlds—not a physically accurate universe, open-world game, or photogrammetry asset pack. Discovery data does not sync between devices. Audio and fullscreen remain subject to browser permissions. Local persistence can be cleared by the browser. Reduced motion and low-quality rendering intentionally trade effects for clarity and responsiveness.

The automated browser suite uses Chromium, including touch and software-WebGL configurations. Exhaustive testing on physical phones, Safari, Firefox, every driver, and sustained hardware performance is outside this repository's automated coverage. Modern browsers with WebGL 2, ES2022, native dialogs, and pointer events are the intended target; unsupported graphics have an explicit fallback.
