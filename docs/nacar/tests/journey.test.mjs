import test from'node:test';
import assert from'node:assert/strict';
import{freshState,serialize}from'../model.mjs?v=pages-5';
import{SAVE,BACKUP,readJourney,exportJourney,restoreJourney}from'../journey.mjs?v=pages-5';

const memory=entries=>{const values=new Map(entries);return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};

test('a copied journey keeps inventory, skills, choices, clues and tutorial when moved to a new browser',()=>{
 const state=freshState();state.xp=130;state.bag.scrap=9;state.bag.fiber=3;
 state.flags={started:true,clinic:true,parcel:true,coil:true,filter:true,choice:'discreet'};
 state.skills.engineering=85;state.clues=['water','counter'];state.looted=['plaza_cache'];
 state.tutorial.done={move:true,interact:true,craft:true};state.tutorial.distance=120;state.time=310;
 const otherJourney='aethoria-progress-unchanged',otherPrefs='aethoria-settings-unchanged';
 const storage=memory([['aethoria-adventure-v1',otherJourney],['aethoria-preferences-v1',otherPrefs]]),raw=exportJourney(state),restored=restoreJourney(storage,raw);
 assert.deepEqual(restored,state);assert.deepEqual(readJourney(storage.getItem(SAVE)),state);
 assert.notEqual(restored,state);
 assert.equal(storage.getItem('aethoria-adventure-v1'),otherJourney);assert.equal(storage.getItem('aethoria-preferences-v1'),otherPrefs);
});

test('import validates before changing existing progress and keeps the previous valid save',()=>{
 const old=serialize(freshState()),storage=memory([[SAVE,old]]);
 for(const raw of['bad json','{}','{"version":99}','x'.repeat(300000)]){
  assert.throws(()=>restoreJourney(storage,raw));assert.equal(storage.getItem(SAVE),old);
 }
 const incoming=freshState();incoming.xp=210;
 restoreJourney(storage,exportJourney(incoming));
 assert.equal(storage.getItem(BACKUP),old);assert.equal(readJourney(storage.getItem(SAVE)).xp,210);
 const broken=memory([[SAVE,old]]);broken.setItem=()=>{throw Error('Storage full')};
 assert.throws(()=>restoreJourney(broken,exportJourney(incoming)));assert.equal(broken.getItem(SAVE),old);
});

test('a legacy journey migrates its tutorial without losing campaign materials',()=>{
 const state=freshState();delete state.tutorial;state.flags={started:true,coil:true};state.bag.fiber=1;
 const restored=restoreJourney(memory([]),serialize(state));
 assert.equal(restored.tutorial.version,2);assert.equal(restored.bag.fiber,1);assert.equal(restored.flags.coil,true);
});
