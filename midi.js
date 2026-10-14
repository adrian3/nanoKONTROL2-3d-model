import { MidiController } from './midi-web-controller/src/midi-controller.js';

export function createControlMap(items) {
  const names = new Map(items.map(item => [item.name, item]));
  const map = new Map();
  for (let i = 1; i <= 8; i++) {
    for (const [code, label] of [['s', 'Volume'], ['c', 'Pan'], ['solo', 'Solo'], ['m', 'Mute'], ['r', 'Record']]) {
      map.set(`${code}${i}`, names.get(`Channel ${i} · ${label}`));
    }
  }
  for (const [code, name] of Object.entries({
    track_prev: 'Track · Previous', track_next: 'Track · Next', cycle: 'Cycle',
    marker_set: 'Marker · Set', marker_prev: 'Marker · Previous', marker_next: 'Marker · Next',
    prev: 'Transport · Rewind', next: 'Transport · Fast forward', stop: 'Transport · Stop',
    play: 'Transport · Play', rec: 'Transport · Record',
  })) map.set(code, names.get(name));
  return map;
}

// App-owned adapter: the MIDI library remains an unchanged submodule.
export function createMidiLink({ items, onValue, onStatus, midiNavigator = navigator }) {
  const map = createControlMap(items);
  let controller, access, connecting = false, enabled = false, pendingScan = false, topology = '';
  const inputTopology = () => JSON.stringify(Array.from(access.inputs.values(), port => [port.id, port.name, port.state]));
  const receive = event => {
    const item = map.get(event.code);
    if (!item) return;
    const value = event.type === 'cc' ? Math.round(event.val * 127)
      : event.type === 'keyup' || event.forceState === false ? 0 : 127;
    onValue(item, value);
    onStatus(`${item.name} · ${value}`, true);
  };
  const scan = async () => {
    if (connecting || !enabled) return;
    connecting = true;
    try {
      controller?.destroy();
      controller = null;
      // Unlike preferredDevice, connectAll never falls back to an AKAI.
      const devices = await MidiController.connectAll({ includeAkai: false });
      controller = devices.find(device => device.connected);
      devices.filter(device => device !== controller).forEach(device => device.destroy());
      if (!controller) {
        onStatus('Waiting for nanoKONTROL2. Plug it in with a USB data cable.', false);
        return;
      }
      for (const type of ['cc', 'keydown', 'keyup']) controller.addEventListener(type, receive);
      onStatus('Connected. Move a control to sync its value.', true);
    } finally {
      connecting = false;
      if (pendingScan) { pendingScan = false; statechange(true); }
    }
  };
  const statechange = (force = false) => {
    const next = inputTopology();
    // Opening a port changes its connection field, but is not a plug/unplug.
    if (force !== true && next === topology) return;
    topology = next;
    if (connecting) { pendingScan = true; return; }
    scan().catch(() => onStatus('MIDI connection interrupted. Try connecting again.', false));
  };
  const connect = async () => {
    if (connecting) return;
    if (typeof midiNavigator.requestMIDIAccess !== 'function') {
      onStatus('Web MIDI is unavailable. Open this page in Chrome or Edge.', false);
      return;
    }
    onStatus('Requesting MIDI access…', false);
    try {
      if (!access) {
        // Match the unchanged library: try SysEx permission, then basic MIDI.
        // This adapter never sends MIDI or SysEx messages to the device.
        try { access = await midiNavigator.requestMIDIAccess({ sysex: true }); }
        catch { access = await midiNavigator.requestMIDIAccess(); }
        topology = inputTopology();
        access.addEventListener('statechange', statechange);
      }
      enabled = true;
      await scan();
    } catch {
      onStatus('MIDI access failed. Allow MIDI in your browser’s site settings and try again.', false);
    }
  };
  const autoConnect = async () => {
    if (typeof midiNavigator.requestMIDIAccess !== 'function') {
      onStatus('Web MIDI is unavailable. Open this page in Chrome or Edge.', false);
      return;
    }
    try {
      const permission = await midiNavigator.permissions.query({ name: 'midi', sysex: true });
      if (permission.state === 'granted') await connect();
    } catch { /* Without permission queries, use the connect button. */ }
  };
  return { connect, autoConnect, destroy() {
    enabled = false;
    access?.removeEventListener('statechange', statechange);
    controller?.destroy();
  } };
}
