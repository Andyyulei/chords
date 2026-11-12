import {expect,it} from 'vitest';
import {newSheet} from '../src/domain/music';
import {validate} from '../src/domain/storage';
it('roundtrips actual custom snapshots and independent slots',()=>{const s=newSheet();s.slots[0].frets[0]=-1;s.slots[0].notes=[];s.slots[0].pianoEdited=true;const n=validate(JSON.parse(JSON.stringify(s)));expect(n).toEqual(s);n.slots[0].frets[0]=24;expect(s.slots[0].frets[0]).toBe(-1)});
it('rejects invalid imports rather than normalizing away user data',()=>{for(const mutate of [(s:ReturnType<typeof newSheet>)=>{s.slots[0].frets[0]=25},(s:ReturnType<typeof newSheet>)=>{s.slots[0].notes=[{midi:90,hand:'left'}]},(s:ReturnType<typeof newSheet>)=>{s.slots[1].id=s.slots[0].id},(s:ReturnType<typeof newSheet>)=>{s.slots[0].notes=[{midi:60,hand:'left'},{midi:60,hand:'right'}]}]){const s=newSheet();mutate(s);expect(()=>validate(s)).toThrow()}});
