# nanoKONTROL2 interactive 3D prototype

Self-contained static HTML / Three.js preview. No build step; browser assets are served locally with the site.

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
Controls can simulate local values or mirror a connected USB nanoKONTROL2. There is no audio output.

## GitHub Pages

Live preview: https://adrian3.github.io/nanoKONTROL2-3d-model/

GitHub Actions checks out the MIDI submodule, runs the integration tests, and publishes the static site to GitHub Pages.
All scripts and assets use relative URLs, so the preview works under the repository path.
Push changes to `main` to update the published site.

## USB nanoKONTROL2

1. Connect the controller with a USB data cable.
2. Use its default CC mode and factory CC assignments. To select CC mode, hold SET MARKER and CYCLE while connecting USB (see the Korg owner’s manual). Custom CC assignments require corresponding mapping changes.
3. Open the live site in Chrome or Edge, click **Connect nanoKONTROL2**, and allow MIDI access. The unchanged bridge requests SysEx permission first and falls back to basic MIDI; this app only receives control events and sends no MIDI or SysEx.
4. Move each fader and knob and press the buttons. Each incoming event updates the matching 3D control, selector and value display, and stops the demo.

All 51 controls are mapped: eight faders, eight knobs, 24 channel buttons, and 11 track/marker/transport buttons. Buttons mirror press/release (or device toggle values), rather than triggering browser demo playback. The page reconnects after unplugging/replugging. With MIDI permission already granted, it attempts to connect on subsequent visits.

Initial hardware positions are unknown until controls send messages; move each control once to synchronize. On-screen edits remain local: faders are not motorized, and this integration does not send LED updates. MIDI data stays in the browser. Safari and the Codex in-app browser may lack Web MIDI support.

Clone with `git clone --recurse-submodules https://github.com/adrian3/nanoKONTROL2-3d-model.git`, or run `git submodule update --init --recursive` in an existing checkout. The bridge is pinned to a commit and has no local modifications.

Run `node --test tests/*.test.mjs` with Node 24. Tests send simulated MIDI bytes through the actual bridge and verify all 51 mappings, releases, reconnects, permission failures and device selection. They do not replace a physical-device test.
