import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMidiLink, createControlMap } from '../midi.js';

const items = [];
for (let i = 1; i <= 8; i++) for (const label of ['Volume', 'Pan', 'Solo', 'Mute', 'Record']) items.push({name:`Channel ${i} · ${label}`,value:0});
for (const name of ['Track · Previous','Track · Next','Cycle','Marker · Set','Marker · Previous','Marker · Next','Transport · Rewind','Transport · Fast forward','Transport · Stop','Transport · Play','Transport · Record']) items.push({name,value:0});
class Port extends EventTarget {
  constructor(name) {super();this.name=name;this.state='connected';}
  message(data) {const event=new Event('midimessage');event.data=new Uint8Array(data);this.dispatchEvent(event);}
}
const access = new EventTarget();
const port = new Port('nanoKONTROL2 SLIDER/KNOB');
access.inputs = new Map([['korg',port]]);access.outputs=new Map();
let deny=false;
const nav={requestMIDIAccess:async()=>{if(deny)throw new Error('denied');return access;},permissions:{query:async()=>({state:'granted'})}};
Object.defineProperty(globalThis,'navigator',{value:nav,configurable:true});
const updates=[];const statuses=[];
const link=createMidiLink({items,onValue:(item,value)=>{item.value=value;updates.push(item);},onStatus:(message,connected)=>statuses.push({message,connected})});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('all 51 physical controls pass through the unchanged bridge into model values',async()=>{
  assert.equal(createControlMap(items).size,51);
  await link.connect();
  for(let i=0;i<8;i++) {
    for(const [cc,label] of [[i,'Volume'],[16+i,'Pan']]) {
      for(const value of [0,64,127]) {port.message([0xb0,cc,value]);assert.equal(items.find(x=>x.name===`Channel ${i+1} · ${label}`).value,value);}
    }
    for(const [cc,label] of [[32+i,'Solo'],[48+i,'Mute'],[64+i,'Record']]) {
      const item=items.find(x=>x.name===`Channel ${i+1} · ${label}`);
      port.message([0xb0,cc,127]);assert.equal(item.value,127);
      port.message([0xb0,cc,0]);assert.equal(item.value,0);
    }
  }
  for(const [cc,name] of [[41,'Play'],[42,'Stop'],[43,'Rewind'],[44,'Fast forward'],[45,'Record'],[46,'Cycle'],[58,'Track · Previous'],[59,'Track · Next'],[60,'Marker · Set'],[61,'Marker · Previous'],[62,'Marker · Next']]) {
    const item=items.find(x=>x.name===(cc<46?`Transport · ${name}`:name));
    port.message([0xb0,cc,127]);assert.equal(item.value,127);
    port.message([0xb0,cc,0]);assert.equal(item.value,0);
  }
  assert.equal(new Set(updates).size,51);
  const count=updates.length;port.message([0xf8]);port.message([0xb0,99,127]);assert.equal(updates.length,count);
});
test('unplug, hot plug and reconnect do not duplicate listeners',async()=>{
  port.state='disconnected';access.dispatchEvent(new Event('statechange'));await settle();
  assert.equal(statuses.at(-1).connected,false);
  port.state='connected';access.dispatchEvent(new Event('statechange'));await settle();
  assert.equal(statuses.at(-1).connected,true);
  await link.connect();const count=updates.length;port.message([0xb0,0,37]);assert.equal(updates.length,count+1);
  link.destroy();port.message([0xb0,0,38]);assert.equal(updates.length,count+1);
});
test('unsupported browsers and denied permission leave visualization usable',async()=>{
  const status=[];
  const unsupported=createMidiLink({items,onValue:()=>{},onStatus:m=>status.push(m),midiNavigator:{}});
  await unsupported.autoConnect();assert.match(status.at(-1),/unavailable/);
  deny=true;const rejected=createMidiLink({items,onValue:()=>{},onStatus:m=>status.push(m)});
  await rejected.connect();assert.match(status.at(-1),/MIDI access failed/);deny=false;
});
test('only Korg is selected when an AKAI is also connected',async()=>{
  const akai=new Port('MIDI Mix');access.inputs.set('akai',akai);
  const changes=[];const korg=createMidiLink({items,onValue:(i,v)=>changes.push(v),onStatus:()=>{}});
  await korg.connect();akai.message([0xb0,16,127]);assert.equal(changes.length,0);
  port.message([0xb0,16,42]);assert.deepEqual(changes,[42]);korg.destroy();access.inputs.delete('akai');
});
