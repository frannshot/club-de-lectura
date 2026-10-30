/* Base de datos en la nube (Firebase) del Club de Lectura.
   Los datos NO están en este código: viven en tu proyecto privado de Firebase
   y solo las cuentas autorizadas en las reglas de seguridad pueden leerlos. */
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyATzo08LAcmCFm1cb1tSZio3En1tw6-nRI",
    authDomain: "club-de-lectura-0911.firebaseapp.com",
    projectId: "club-de-lectura-0911",
    storageBucket: "club-de-lectura-0911.firebasestorage.app",
    messagingSenderId: "666203146677",
    appId: "1:666203146677:web:6e073394fd7706b4eb31fc"
  };
  const COLS=['clubs','members','books','activities','movs','tasas','abonos','vincci','eventos','config'];
  const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));

  firebase.initializeApp(firebaseConfig);
  const auth=firebase.auth();
  const fs=firebase.firestore();
  try{fs.settings({experimentalAutoDetectLongPolling:true,merge:true});}catch(e){}
  const persisted=fs.enablePersistence({synchronizeTabs:true}).catch(e=>console.warn('Sin caché sin conexión',e&&e.code));

  const cache={}; for(const c of COLS) cache[c]={};
  const loaded={}; const unsubs=[];
  const errFn=e=>{console.error(e);window.dispatchEvent(new CustomEvent('firedb-error',{detail:e}));};
  // Firestore espera al servidor antes de resolver; sin internet eso nunca pasa.
  // La app no debe quedarse esperando: el cambio ya se ve al instante y se sube solo después.
  const fire=p=>{p.catch(errFn);return Promise.resolve();};
  const toFs=v=>{ // convierte {__delete__:true} y deja null tal cual
    if(isObj(v)){if(v.__delete__===true)return firebase.firestore.FieldValue.delete();const o={};for(const [k,x] of Object.entries(v))o[k]=toFs(x);return o;}
    return v;
  };
  function docRef(col,id){
    const r=fs.collection(col).doc(id);
    return {
      id:r.id,
      set(data){return fire(r.set(clone(data)));},
      update(patch){return fire(r.set(toFs(clone(patch)),{merge:true}));},
      delete(){return fire(r.delete());},
      async get(){const s=await r.get();return {id:s.id,exists:s.exists,data:()=>s.data()};},
      onSnapshot(fn,err){return r.onSnapshot(s=>fn({id:s.id,exists:s.exists,data:()=>s.data()}),err||errFn);}
    };
  }
  const FireDB={
    collection(col){
      const c=fs.collection(col);
      return {
        doc(id){return docRef(col,id||c.doc().id);},
        onSnapshot(fn,err){return c.onSnapshot(s=>fn({docs:s.docs.map(d=>({id:d.id,exists:true,data:()=>d.data()})),size:s.size,empty:s.empty}),err||errFn);}
      };
    },
    doc(path){const i=path.indexOf('/');return docRef(path.slice(0,i),path.slice(i+1));},
    user(){return auth.currentUser;},
    signOut(){return auth.signOut().then(()=>location.reload());},
    counts(){const o={};for(const c of COLS)o[c]=Object.keys(cache[c]).length;return o;},
    isEmpty(){return !Object.keys(cache.members).length&&!Object.keys(cache.clubs).length;},
    exportAll(){const data={};for(const c of COLS)data[c]=clone(cache[c]);return {app:'club-de-lectura',formato:1,exportado:new Date().toISOString(),data};},
    async importAll(obj,onProgress){
      if(!obj||typeof obj!=='object'||!isObj(obj.data)) throw new Error('El archivo no es una copia de seguridad del Club de Lectura.');
      const d=obj.data; if(!d.members&&!d.clubs) throw new Error('El archivo no tiene chicas ni clubes.');
      for(const c of Object.keys(d)) if(!isObj(d[c])) throw new Error('Formato no válido en "'+c+'".');
      const ops=[];
      for(const c of COLS){
        const inc=d[c]||{};
        for(const id of Object.keys(cache[c])) if(!(id in inc)) ops.push(b=>b.delete(fs.collection(c).doc(id)));
        for(const [id,doc] of Object.entries(inc)) ops.push(b=>b.set(fs.collection(c).doc(id),clone(doc)));
      }
      let done=0;
      for(let i=0;i<ops.length;i+=400){
        const b=fs.batch(); ops.slice(i,i+400).forEach(f=>f(b));
        await b.commit(); done=Math.min(ops.length,i+400); if(onProgress)onProgress(done,ops.length);
      }
    },
    /* Espera a que haya sesión iniciada y los datos cargados */
    ready(){
      return new Promise(resolve=>{
        let started=false;
        auth.onAuthStateChanged(async u=>{
          if(!u){showLogin();return;}
          if(started)return; started=true;
          hideLogin();
          await persisted;
          let n=0; const done=()=>{if(++n===COLS.length)resolve(FireDB);};
          for(const c of COLS){
            let first=true;
            unsubs.push(fs.collection(c).onSnapshot(s=>{
              const o={};s.forEach(dd=>o[dd.id]=dd.data());cache[c]=o;
              if(first){first=false;loaded[c]=true;done();}
            },e=>{errFn(e);if(first){first=false;done();}}));
          }
        });
      });
    }
  };
  /* ---------- pantalla de inicio de sesión ---------- */
  let box=null;
  function showLogin(){
    if(box)return;
    box=document.createElement('div');box.className='login-wrap';
    box.innerHTML=`<form class="login panel" novalidate>
      <img src="icons/icon-192.png" alt="" width="72" height="72">
      <h1>Club de Lectura</h1>
      <p class="hint">Inicia sesión para ver y sincronizar tus datos en todos tus dispositivos.</p>
      <label>Correo<input type="email" id="lg-mail" autocomplete="username" inputmode="email" autocapitalize="off" required></label>
      <label>Contraseña<input type="password" id="lg-pass" autocomplete="current-password" required></label>
      <p class="formerr" id="lg-err" hidden></p>
      <button class="btn primary big" type="submit" id="lg-btn">Entrar</button>
      <button class="link" type="button" id="lg-forgot">Olvidé mi contraseña</button>
    </form>`;
    document.body.appendChild(box);
    const err=m=>{const e=box.querySelector('#lg-err');e.hidden=!m;e.textContent=m||'';};
    const msg=c=>({'auth/invalid-credential':'Correo o contraseña incorrectos.','auth/wrong-password':'Correo o contraseña incorrectos.','auth/user-not-found':'Ese correo no tiene cuenta.','auth/invalid-email':'Escribe un correo válido.','auth/too-many-requests':'Demasiados intentos. Espera unos minutos.','auth/network-request-failed':'Sin conexión. Necesitas internet para iniciar sesión la primera vez.'})[c]||'No se pudo iniciar sesión ('+c+').';
    box.querySelector('form').onsubmit=async ev=>{ev.preventDefault();err('');
      const m=box.querySelector('#lg-mail').value.trim(),p=box.querySelector('#lg-pass').value;
      if(!m||!p){err('Escribe tu correo y tu contraseña.');return;}
      const b=box.querySelector('#lg-btn');b.disabled=true;b.textContent='Entrando…';
      try{await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);await auth.signInWithEmailAndPassword(m,p);}
      catch(e){err(msg(e.code));b.disabled=false;b.textContent='Entrar';}
    };
    box.querySelector('#lg-forgot').onclick=async()=>{const m=box.querySelector('#lg-mail').value.trim();
      if(!m){err('Escribe tu correo arriba y vuelve a tocar “Olvidé mi contraseña”.');return;}
      try{await auth.sendPasswordResetEmail(m);err('');alert('Te enviamos un correo para cambiar la contraseña.');}catch(e){err(msg(e.code));}};
    setTimeout(()=>box.querySelector('#lg-mail').focus(),50);
  }
  function hideLogin(){if(box){box.remove();box=null;}}
  window.FireDB=FireDB;
})();
