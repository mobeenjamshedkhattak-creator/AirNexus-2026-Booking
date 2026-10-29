import {clone, freshDocument, validateDocument} from './core.js';

export class CampusStore {
  constructor(config,onStatus){
    this.config=config;this.cloud=Boolean(config.supabaseUrl&&config.supabaseKey);this.onStatus=onStatus;this.records={};this.session=null;this.refreshing=null;this.inflight=null;this.timer=null;this.blocked=false;this.error='';this.loaded=false;
    this.scope=this.cloud?new URL(config.supabaseUrl).hostname:'offline';
    try{this.session=JSON.parse(sessionStorage.getItem('an-session-'+this.scope)||'null');}catch{}
  }
  key(id){return `airnexus-v1-${this.scope}-${this.cloud?(this.session?.user?.id||'signed-out'):'local'}-${id}`;}
  status(message,kind='ok'){this.onStatus?.(message,kind);}
  saveSession(s){this.session=s;try{if(s)sessionStorage.setItem('an-session-'+this.scope,JSON.stringify(s));else sessionStorage.removeItem('an-session-'+this.scope);}catch{}}
  async raw(path,options={}){
    const response=await fetch(this.config.supabaseUrl.replace(/\/$/,'')+path,{...options,signal:AbortSignal.timeout(20000),headers:{apikey:this.config.supabaseKey,'Content-Type':'application/json',...(options.headers||{})}});
    const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
    if(!response.ok){const error=Error(data?.message||data?.msg||data?.error_description||data?.error||`Connection failed (${response.status})`);error.code=data?.code;error.http=response.status;throw error;}return data;
  }
  async token(){
    if(!this.session)throw Error('Please sign in again.');
    if((this.session.expires_at||0)>Date.now()/1000+60)return this.session.access_token;
    if(!this.refreshing)this.refreshing=this.raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:this.session.refresh_token})}).then(s=>{s.expires_at=s.expires_at||Date.now()/1000+s.expires_in;this.saveSession(s);return s.access_token;}).finally(()=>this.refreshing=null);
    return this.refreshing;
  }
  async api(path,options={}){const token=await this.token();return this.raw('/rest/v1/'+path,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+token}});}
  async signIn(email,password){const s=await this.raw('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});s.expires_at=s.expires_at||Date.now()/1000+s.expires_in;this.saveSession(s);try{await this.load();}catch(e){this.saveSession(null);throw e;}}
  async signOut(){clearTimeout(this.timer);if(this.session)try{await this.raw('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+this.session.access_token}});}catch{}this.saveSession(null);this.records={};this.loaded=false;}
  localRecord(id,fallback){let saved;try{saved=JSON.parse(localStorage.getItem(this.key(id))||'null');if(saved)validateDocument(saved.doc,id);}catch{saved=null;}return saved||{doc:clone(fallback||freshDocument(id)),revision:0,dirty:false,generation:0};}
  async load(snapshot=null){
    clearTimeout(this.timer);this.blocked=false;this.error='';
    if(!this.cloud){for(const id of ['e9','h11']){this.records[id]=this.localRecord(id,snapshot?.[id]?validateDocument(clone(snapshot[id]),id):null);this.records[id].dirty=false;}this.loaded=true;this.status('Local draft · this browser','local');return;}
    const rows=await this.api('an_campuses?select=campus_id,document,revision,updated_at');
    if(rows.length!==2)throw Error('Organizer access is missing, or setup.sql has not been run. Add your email using add-organizer.sql.');
    this.records={};
    for(const row of rows){const id=row.campus_id;if(!['e9','h11'].includes(id))continue;validateDocument(row.document,id);const cached=this.localRecord(id,row.document);if(cached.dirty&&cached.revision===row.revision){this.records[id]=cached;}else{if(cached.dirty)this.archive(id,cached.doc);this.records[id]={doc:row.document,revision:row.revision,dirty:false,generation:0};}}
    this.loaded=true;this.status('Saved in Supabase');if(this.isDirty())this.queue();
  }
  archive(id,doc){try{localStorage.setItem(this.key(id)+'-recovery',JSON.stringify({savedAt:new Date().toISOString(),doc}));}catch{}}
  doc(id){return this.records[id]?.doc;}
  isDirty(){return Object.values(this.records).some(r=>r.dirty);}
  persist(id){try{localStorage.setItem(this.key(id),JSON.stringify(this.records[id]));return true;}catch{this.status('Browser backup unavailable','error');return false;}}
  changed(id){const r=this.records[id];r.generation=(r.generation||0)+1;r.dirty=this.cloud;const ok=this.persist(id);if(this.cloud){this.status(this.blocked?'Save paused · resolve conflict':'Saving changes…',this.blocked?'error':'saving');this.queue();}else this.status(ok?'Saved locally · this browser':'Local save failed · export a backup',ok?'local':'error');}
  queue(){clearTimeout(this.timer);if(!this.blocked)this.timer=setTimeout(()=>this.flush().catch(()=>{}),900);}
  async flush(){
    clearTimeout(this.timer);if(!this.cloud){for(const id of Object.keys(this.records))this.persist(id);return;}
    if(this.blocked)throw Error(this.error||'Cloud saving is paused.');
    if(this.inflight){await this.inflight;if(this.isDirty())return this.flush();return;}
    this.inflight=(async()=>{
      try{for(const [id,r] of Object.entries(this.records)){if(!r.dirty)continue;const generation=r.generation;const document=clone(r.doc);validateDocument(document,id);const result=await this.api('rpc/an_save_campus',{method:'POST',body:JSON.stringify({p_campus_id:id,p_document:document,p_expected_revision:r.revision})});const saved=Array.isArray(result)?result[0]:result;r.revision=Number(saved.revision);r.dirty=r.generation!==generation;this.persist(id);}this.error='';this.status(this.isDirty()?'Saving changes…':'Saved in Supabase',this.isDirty()?'saving':'ok');}
      catch(e){this.error=e.message;if(e.code==='40001'){this.blocked=true;this.status('Another editor saved · resolve conflict','error');}else this.status('Cloud save failed · retry','error');throw e;}
    })();
    try{await this.inflight;}finally{this.inflight=null;}
    if(this.isDirty())this.queue();
  }
  async refresh(){
    if(!this.cloud)return;const rows=await this.api('an_campuses?select=campus_id,document,revision,updated_at');
    if(rows.length!==2)throw Error('Organizer access has been removed or campus records are missing.');
    let changed=false;for(const row of rows){const r=this.records[row.campus_id];if(r&&r.revision!==row.revision){if(r.dirty){this.blocked=true;this.error='Another editor changed this campus. Export a backup, then reload the latest cloud plan.';this.status('Another editor saved · resolve conflict','error');}else{validateDocument(row.document,row.campus_id);this.records[row.campus_id]={doc:row.document,revision:row.revision,dirty:false,generation:0};this.persist(row.campus_id);changed=true;}}}return changed;
  }
  recovery(id){try{return JSON.parse(localStorage.getItem(this.key(id)+'-recovery')||'null');}catch{return null;}}
  snapshot(){return Object.fromEntries(Object.entries(this.records).map(([id,r])=>[id,clone(r.doc)]));}
}
