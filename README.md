# nanoKONTROL2 interactive 3D prototype

An interactive 3D model that mirrors a real USB Korg nanoKONTROL2 in your browser. Move a physical fader, turn a knob, or press a button and watch its matching control respond on the model.

**[Try the live demo](https://adrian3.github.io/nanoKONTROL2-3d-model/)** — no installation required. You can also explore the model without a controller.

## Try it with your nanoKONTROL2

1. Plug your nanoKONTROL2 into your computer with a USB data cable. Use default CC mode and factory control assignments (see details below).
2. Open the **[live demo](https://adrian3.github.io/nanoKONTROL2-3d-model/)** in Chrome or Edge.
3. Click **Connect nanoKONTROL2** and allow the browser’s MIDI permission request.
4. The small indicator at the upper-left of the model lights **red** when connected and turns off when disconnected.
5. Move a fader, turn a knob, and press a channel or transport button. The matching control moves on screen, and its name and value appear below the model. Knob rotation follows the physical controller’s direction.

Move every fader and knob once to synchronize their positions. The controller sends values as you use it; the page cannot read all physical positions on connection. If the demo animation is running, a hardware input stops it so you can take control.

If it does not connect, check your USB cable, browser MIDI permission, and the controller’s CC mode. A custom MIDI configuration may need mapping changes.

## Play with the view

**Control the view with MIDI** is enabled by default. Physical controls still animate their matching parts on the model. Turn this mode off for simple hardware mirroring.

| Control | Visual effect |
| --- | --- |
| Track previous / next | Black / white finish |
| Slider 1 | Zoom out / in |
| Knob 1 | Model yaw (Y rotation) |
| Knob 2 | Model pitch (X rotation) |
| Knob 3 | Model roll (Z rotation) |
| Knob 4 | Camera orbit around the model |
| Knob 5 | Camera elevation, including underside |
| Knob 6 | Light direction |
| Knob 7 | Light brightness |
| Knob 8 | Exposure |
| Cycle | Toggle auto rotation |
| Play | Toggle Play Demo on / off |
| Stop | Stop auto rotation (and any playing demo) |
| Set Marker | Reset model rotation, camera, lighting and control values |
| Marker next | Toggle exploded view |

These are absolute controls, so moving a knob or slider can jump to its physical setting. Button actions happen on press, not release. The on-screen **Reset** button restores model rotation, camera, and lighting. Other hardware controls continue to mirror their model controls.

## Run locally

Static HTML and Three.js; no build step. Initialize the MIDI submodule as described below before serving the project.

From the repository root, run `python3 -m http.server 8000`, then open
http://localhost:8000/.

Features:
- Orbit with mouse or touch; scroll / pinch to zoom.
- Perspective, top and underside camera presets.
- Eight movable sliders, eight rotary knobs, and 35 channel and transport buttons.
- Live USB MIDI input for all 51 controls, with physical knob direction and a red connection indicator.
- Select controls directly on the model, or use the accessible selector and value slider.
- Animated control demo, automatic rotation, exploded view, black / white finish, PNG capture and reset.

The geometry is generated in `app.js`. The shell includes an inward lower bevel and a concave upper shoulder without a raised lip; knobs have slimmer tapered bodies, rounded edges and fine grip ridges. Screen printing is drawn locally onto canvas textures. Shadows remain on the device itself; there is no invisible ground plane receiving a floating shadow.
Three.js r170 and OrbitControls are vendored in `vendor/`, including the MIT license.
The preview requires WebGL and an HTTP server (ES modules do not run reliably from `file://`).

## References and fidelity

Based on Korg's [official product photography and control descriptions](https://www.korg.com/us/products/computergear/nanokontrol2/index.php)
and [specifications](https://www.korg.com/us/products/computergear/nanokontrol2/page_1.php).
Overall width/depth follow the published 325 × 83 mm footprint; overall height including knobs is approximately 30 mm.
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

All 51 controls are mapped: **35 buttons, 8 sliders, and 8 knobs**. The buttons comprise 24 channel buttons and 11 track/marker/transport buttons. Buttons mirror press/release (or device toggle values); when view control is enabled, selected buttons also trigger the scene shortcuts listed above. The page reconnects after unplugging/replugging. With MIDI permission already granted, it attempts to connect on subsequent visits.

Initial hardware positions are unknown until controls send messages; move each control once to synchronize. On-screen edits remain local: faders are not motorized, and this integration does not send LED updates. MIDI data stays in the browser. Safari and the Codex in-app browser may lack Web MIDI support.

Clone with `git clone --recurse-submodules https://github.com/adrian3/nanoKONTROL2-3d-model.git`, or run `git submodule update --init --recursive` in an existing checkout. The bridge is pinned to a commit and has no local modifications.

Run `node --test tests/*.test.mjs` with Node 24. Tests send simulated MIDI bytes through the actual bridge and verify all 51 mappings, releases, reconnects, permission failures and device selection. They do not replace a physical-device test.

Physical verification: a USB nanoKONTROL2 on the development Mac updated the visualization in Chrome. Knob and transport events were observed directly; the operator confirmed physical controls changed the UI and verified the corrected knob rotation direction. All 51 mappings are covered separately by simulated-message tests.
