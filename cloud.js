/* Supabase sync layer */
function recsOf(cid){const D=ALL.d[cid],o={};KINDS.forEach(k=>(D[k]||[]).forEach(x=>{if(!x.id)x.id=uid();o[x.id]={kind:k,data:x}}));o['setup_'+cid]={kind:'setup',data:D.setup};return o}
let saving=Promise.resolve();
function save(){const cid=ALL.cur;if(!cid)return;const now=recsOf(cid),ups=[],dels=[];
for(const[id,r]of Object.entries(now)){const j=JSON.stringify(r.data);if(SNAP[id]!==j){SNAP[id]=j;ups.push({id,company_id:cid,kind:r.kind,data:r.data,updated_at:new Date().toISOString()})}}
for(const id of Object.keys(SNAP))if(SNAP[id+'|c']===cid&&!now[id]){dels.push(id);delete SNAP[id];delete SNAP[id+'|c']}
ups.forEach(u=>SNAP[u.id+'|c']=cid);setSync('busy');
saving=saving.then(async()=>{let e=null;if(ups.length){const r=await sb.from('records').upsert(ups);e=r.error}if(dels.length){const r=await sb.from('records').delete().in('id',dels);e=e||r.error}
setSync(e?'err':'ok');if(e)alert('Sync error: '+e.message)})}
function setSync(s){const el=$('#sync');if(el)el.className='sync '+s}
async function saveCompany(c){const{error}=await sb.from('companies').update({name:c.name,country:c.country,logo:c.logo}).eq('id',c.id);if(error)alert(error.message);render()}
async function loadProfiles(){const{data}=await sb.from('profiles').select('*').order('username');PROFILES=(data||[]).map(p=>({id:p.id,user:p.username,name:p.full_name,role:p.role,must:p.must_change_pw}))}
function applyRec(r){const D=ALL.d[r.company_id]||(ALL.d[r.company_id]=EMPTY());SNAP[r.id]=JSON.stringify(r.data);SNAP[r.id+'|c']=r.company_id;
if(r.kind==='setup'){D.setup=r.data;return}const a=D[r.kind];if(!a)return;const i=a.findIndex(x=>x.id===r.id);if(i>=0)a[i]=r.data;else a.push(r.data)}
function removeRec(id){const cid=SNAP[id+'|c'];delete SNAP[id];delete SNAP[id+'|c'];const D=ALL.d[cid];if(!D)return;KINDS.forEach(k=>{const i=D[k].findIndex(x=>x.id===id);if(i>=0)D[k].splice(i,1)})}
async function loadAll(){const{data:cs,error}=await sb.from('companies').select('*').order('created_at');if(error)throw error;ALL.companies=cs;ALL.d={};SNAP={};cs.forEach(c=>ALL.d[c.id]=EMPTY());
let from=0;for(;;){const{data,error:e}=await sb.from('records').select('id,company_id,kind,data').range(from,from+999);if(e)throw e;data.forEach(applyRec);if(data.length<1000)break;from+=1000}
ALL.cur=cs.some(c=>c.id===localStorage.getItem(KEY+'_cur'))?localStorage.getItem(KEY+'_cur'):(cs[0]&&cs[0].id)}
let CH;function live(){if(CH)sb.removeChannel(CH);CH=sb.channel('rec').on('postgres_changes',{event:'*',schema:'public',table:'records'},p=>{
if(p.eventType==='DELETE')removeRec(p.old.id);else{if(SNAP[p.new.id]===JSON.stringify(p.new.data))return;applyRec(p.new)}softRender()})
.on('postgres_changes',{event:'*',schema:'public',table:'companies'},async()=>{const{data}=await sb.from('companies').select('*').order('created_at');ALL.companies=data;data.forEach(c=>{if(!ALL.d[c.id])ALL.d[c.id]=EMPTY()});softRender()}).subscribe(s=>setSync(s==='SUBSCRIBED'?'ok':'busy'))}
let pend=false;function softRender(){const busy=($('#dlg')&&$('#dlg').open)||(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));if(busy){pend=true;return}pend=false;const y=scrollY;render();scrollTo(0,y)}
setInterval(()=>{if(pend)softRender()},2000);
async function boot(){const{data:{session}}=await sb.auth.getSession();if(!session){ME=null;return render()}
const{data:p}=await sb.from('profiles').select('*').eq('id',session.user.id).single();if(!p||!p.active){await sb.auth.signOut();ME=null;return render()}
ME={user:p.username,name:p.full_name,role:p.role,must:p.must_change_pw,id:p.id};if(ME.must)return render();
$('#root').innerHTML='<div class="login"><div class=hero></div><div class=card style="position:relative">☁️ …</div></div>';
try{await loadAll();await loadProfiles();live()}catch(e){alert(e.message)}render()}
function pwView(forced){$('#root').innerHTML=`<div class=login><div class=hero></div><form id=pf class=card><img src="icon-192.png" class=biglogo><h1>${t('chpw')}</h1>${forced?`<p class=ed>${t('mustpw')}</p>`:''}${langBar()}
<label>${t('newpw')}<input name=a type=password minlength=8 required autocomplete=new-password></label><label>${t('reppw')}<input name=b type=password minlength=8 required autocomplete=new-password></label><p class=mut>${t('pwrule')}</p><button>${t('save')}</button>${forced?'':`<button type=button class=ghost id=pc>${t('cancel')}</button>`}<p id=err class=err></p></form></div>`;bindLang();
if($('#pc'))$('#pc').onclick=()=>render();$('#pf').onsubmit=async e=>{e.preventDefault();const a=e.target.a.value,b=e.target.b.value;if(a!==b)return $('#err').textContent=t('pwnomatch');
if(a.length<8||!/[0-9]/.test(a)||!/[A-Za-z]/.test(a))return $('#err').textContent=t('pwrule');const{error}=await sb.auth.updateUser({password:a});if(error)return $('#err').textContent=error.message;
await sb.rpc('password_changed');alert('✅ '+t('saved'));if(forced){ME.must=false;await boot()}else render()}}
function importInto(src){/* src: old per-company DB object */const D=DB;KINDS.forEach(k=>(src[k]||[]).forEach(x=>{if(!D[k].some(y=>y.id===x.id))D[k].push(x)}));
if(src.setup)Object.keys(src.setup).forEach(k=>{D.setup[k]=[...new Set([...(D.setup[k]||[]),...src.setup[k]])]});save();alert('✅ '+t('saved'));render()}
function importLocal(){let n=0;Object.keys(localStorage).filter(k=>/^ffc2_ffc-/.test(k)&&!/_cur$/.test(k)).forEach(k=>{try{const o=JSON.parse(localStorage.getItem(k));Object.values(o.d||{}).forEach(d=>{importInto(d);n++})}catch(e){}});if(!n)alert(t('empty'))}
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'){ME=null;render()}});boot();
