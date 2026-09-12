import{parseSave,serialize}from'./model.mjs?v=pages-5';

export const SAVE='nacar-save-v1',BACKUP='nacar-save-backup-v1';
export const MAX_JOURNEY_SIZE=256*1024;

export function readJourney(raw){
 if(typeof raw!=='string'||raw.length>MAX_JOURNEY_SIZE)return null;
 return parseSave(raw);
}

export function exportJourney(state){
 const raw=serialize(state);
 if(!readJourney(raw))throw Error('No se pudo preparar la copia de la partida.');
 return raw;
}

// Validate before any writes; keep the previous local save as a recovery copy.
export function restoreJourney(storage,raw){
 const state=readJourney(raw);
 if(!state)throw Error('Este archivo no contiene una partida válida de Nácar.');
 const previous=storage.getItem(SAVE);
 if(readJourney(previous))storage.setItem(BACKUP,previous);
 storage.setItem(SAVE,serialize(state));
 return state;
}
