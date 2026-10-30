/* Base de datos local del Club de Lectura.
   Todo se guarda solo en este teléfono (localStorage). No hay datos dentro del código. */
(function(){
  const PREFIX='cl-db:';
  const COLS=['clubs','members','books','activities','movs','tasas','abonos','vincci','eventos','config'];
  const store={};
  for(const c of COLS){
    try{store[c]=JSON.parse(localStorage.getItem(PREFIX+c)||'{}')||{};}catch(e){store[c]={};}
  }
  const listeners={}; // path -> Set(fn)
  const timers={};
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
  function persist(col){
    clearTimeout(timers[col]);
    timers[col]=setTimeout(()=>{
      try{localStorage.setItem(PREFIX+col,JSON.stringify(store[col]));}
      catch(e){console.error(e);window.dispatchEvent(new CustomEvent('localdb-error',{detail:e}));}
    },150);
  }
  function flush(){for(const c of COLS){clearTimeout(timers[c]);try{localStorage.setItem(PREFIX+c,JSON.stringify(store[c]));}catch(e){}}}
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
  function merge(base,patch){
    const out=isObj(base)?{...base}:{};
    for(const [k,v] of Object.entries(patch)){
      if(isObj(v)&&v.__delete__===true){delete out[k];continue;}
      out[k]=isObj(v)?merge(out[k],v):clone(v);
    }
    return out;
  }
  function split(path){const p=path.split('/');return {col:p[0],id:p.slice(1).join('/')};}
  function colSnap(col){
    const docs=Object.entries(store[col]||{}).map(([id,data])=>({id,exists:true,data:()=>clone(data)}));
    return {docs,size:docs.length,empty:!docs.length};
  }
  function docSnap(col,id){
    const d=(store[col]||{})[id];
    return {id,exists:d!==undefined,data:()=>clone(d)};
  }
  function notify(col,id){
    queueMicrotask(()=>{
      for(const fn of (listeners[col]||[])) try{fn(colSnap(col));}catch(e){console.error(e);}
      const p=col+'/'+id;
      for(const fn of (listeners[p]||[])) try{fn(docSnap(col,id));}catch(e){console.error(e);}
    });
  }
  function ensure(col){if(!store[col]){store[col]={};if(!COLS.includes(col))COLS.push(col);}}
  const newId=()=>{const a='abcdefghijklmnopqrstuvwxyz0123456789';let s='';const r=crypto.getRandomValues(new Uint8Array(20));for(const x of r)s+=a[x%36];return s;};
  function docRef(col,id){
    return {
      id,
      async set(data){ensure(col);store[col][id]=clone(data);persist(col);notify(col,id);},
      async update(patch){ensure(col);if(store[col][id]===undefined){const e=new Error('not_found');e.code='not_found';throw e;}store[col][id]=merge(store[col][id],patch);persist(col);notify(col,id);},
      async delete(){ensure(col);delete store[col][id];persist(col);notify(col,id);},
      async get(){return docSnap(col,id);},
      onSnapshot(fn){const p=col+'/'+id;(listeners[p]||(listeners[p]=new Set())).add(fn);queueMicrotask(()=>fn(docSnap(col,id)));return ()=>listeners[p].delete(fn);}
    };
  }
  window.LocalDB={
    collection(col){
      return {
        doc(id){return docRef(col,id||newId());},
        onSnapshot(fn){(listeners[col]||(listeners[col]=new Set())).add(fn);queueMicrotask(()=>fn(colSnap(col)));return ()=>listeners[col].delete(fn);}
      };
    },
    doc(path){const {col,id}=split(path);return docRef(col,id);},
    /* respaldo */
    exportAll(){
      flush();
      const data={};for(const c of COLS)data[c]=clone(store[c]||{});
      return {app:'club-de-lectura',formato:1,exportado:new Date().toISOString(),data};
    },
    importAll(obj){
      if(!obj||typeof obj!=='object'||!obj.data||typeof obj.data!=='object') throw new Error('El archivo no es una copia de seguridad del Club de Lectura.');
      const d=obj.data;
      if(!d.members&&!d.clubs) throw new Error('El archivo no tiene chicas ni clubes.');
      for(const c of Object.keys(d)){ if(!isObj(d[c])) throw new Error('Formato no válido en "'+c+'".'); }
      for(const c of COLS){store[c]={};}
      for(const [c,docs] of Object.entries(d)){ensure(c);store[c]=clone(docs);}
      flush();
    },
    counts(){const o={};for(const c of COLS)o[c]=Object.keys(store[c]||{}).length;return o;},
    isEmpty(){return !Object.keys(store.members||{}).length&&!Object.keys(store.clubs||{}).length;}
  };
})();
