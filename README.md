# nanoKONTROL2 interactive 3D prototype

Self-contained static HTML / Three.js preview. No build step or external asset requests.

From the repository root, run `python3 -m http.server 8000`, then open
http://localhost:8000/.

Features:
- Orbit with mouse or touch; scroll / pinch to zoom.
- Perspective, top and underside camera presets.
- Eight movable faders, eight rotary knobs, and all channel and transport buttons.
- Select controls directly on the model, or use the accessible selector and value slider.
- Animated control demo, automatic rotation, exploded view, black / white finish, PNG capture and reset.

The geometry is generated in `app.js`. Screen printing is drawn locally onto canvas textures.
Three.js r170 and OrbitControls are vendored in `vendor/`, including the MIT license.
The preview requires WebGL and an HTTP server (ES modules do not run reliably from `file://`).

## References and fidelity

Based on Korg's [official product photography and control descriptions](https://www.korg.com/us/products/computergear/nanokontrol2/index.php)
and [specifications](https://www.korg.com/us/products/computergear/nanokontrol2/page_1.php).
Overall width/depth follow the published 325 × 83 mm footprint; knob height is approximately 30 mm.
Positions and details are approximated from the official black top-view photograph. This is a procedural visual model,
not a manufacturer CAD model. The underside label, assembly separation and demo motion are illustrative.
Controls simulate local values; there is no MIDI connection or audio output.

## GitHub Pages

Live preview: https://adrian3.github.io/nanoKONTROL2-3d-model/

GitHub Pages publishes directly from the root of the `main` branch.
All scripts and assets use relative URLs, so the preview works under the repository path.
Push changes to `main` to update the published site.
