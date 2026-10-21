const $=s=>document.querySelector(s);const KEY='ffc_'+CFG.id;
let L=localStorage.getItem('ffc_lang')||'es';const t=k=>(I18N[L]&&I18N[L][k])||I18N.en[k]||k;
let DB=JSON.parse(localStorage.getItem(KEY)||'null')||{units:[],drivers:[],tanks:[],fuel:[],delivery:[],maint:[],checklist:[],expenses:[],users:[]};
const save=()=>localStorage.setItem(KEY,JSON.stringify(DB));
let ME=JSON.parse(sessionStorage.getItem(KEY+'_me')||'null');let VIEW='dash';
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>new Date().toISOString().slice(0,10);
const num=v=>parseFloat(v)||0;const f2=v=>(Math.round(v*100)/100).toLocaleString();
const isAdmin=()=>ME&&ME.role==='admin';
const unitName=id=>{const u=DB.units.find(x=>x.id===id);return u?u.code+' '+(u.name||''):''};
const opts=(arr,lab)=>arr.map(x=>({v:x.id,l:lab(x)}));
const PRODUCTS=['Diesel','Petrol','AdBlue/DEF','Engine oil','Hydraulic oil','Gear oil','Grease','Coolant'];
const S={
units:{f:[['code','text',1],['name','text',1],['kind','sel',1,()=>[{v:'vehicle',l:t('vehicle')},{v:'machine',l:t('machine')}]],['meter','sel',1,()=>[{v:'km',l:t('km')},{v:'hr',l:t('hr')}]],['reading','number'],['tank','number'],['fueltype','sel',0,()=>PRODUCTS.slice(0,2).map(p=>({v:p,l:p}))],['site','text'],['notes','text']],adm:1},
drivers:{f:[['name','text',1],['license','text'],['licexp','date'],['phone','text'],['site','text']],adm:1},
tanks:{f:[['name','text',1],['product','sel',1,()=>PRODUCTS.map(p=>({v:p,l:p}))],['cap','number'],['stock','number'],['site','text']],adm:1},
fuel:{f:[['date','date',1],['shift','sel',0,()=>['Day','Night','A','B','C'].map(p=>({v:p,l:p}))],['unit','sel',1,()=>opts(DB.units,x=>x.code+' '+x.name)],['driver','sel',0,()=>opts(DB.drivers,x=>x.name)],['source','sel',0,()=>[{v:'',l:'—'},...opts(DB.tanks,x=>x.name)]],['product','sel',1,()=>PRODUCTS.map(p=>({v:p,l:p}))],['liters','number',1],['price','number'],['reading','number',1],['station','text'],['receipt','text'],['notes','text']]},
delivery:{f:[['date','date',1],['source','sel',1,()=>opts(DB.tanks,x=>x.name)],['liters','number',1],['price','number'],['station','text'],['receipt','text']],adm:1},
maint:{f:[['unit','sel',1,()=>opts(DB.units,x=>x.code+' '+x.name)],['task','text',1],['duedate','date'],['duemeter','number'],['cost','number'],['done','sel',0,()=>[{v:'',l:t('pending')},{v:'1',l:t('done')}]],['notes','text']]},
checklist:{f:[['date','date',1],['unit','sel',1,()=>opts(DB.units,x=>x.code+' '+x.name)],['driver','sel',0,()=>opts(DB.drivers,x=>x.name)],['item','text',1],['result','sel',1,()=>[{v:'ok',l:t('ok')},{v:'fail',l:t('fail')}]],['notes','text']]},
expenses:{f:[['date','date',1],['unit','sel',1,()=>opts(DB.units,x=>x.code+' '+x.name)],['category','text',1],['amount','number',1],['receipt','text'],['notes','text']]},
users:{f:[['user','text',1],['pass','text',1],['role','sel',1,()=>[{v:'admin',l:t('admin')},{v:'operator',l:t('operator')}]]],adm:1}};
const NAV=[['dash','📊'],['units','🚛'],['fuel','⛽'],['tanks','🛢️'],['delivery','📥'],['drivers','👷'],['maint','🔧'],['checklist','✅'],['expenses','💵'],['alerts','🔔'],['reports','📈'],['data','💾'],['users','👥'],['share','🔗']];
function langSel(){return `<select id=lang>${Object.entries({es:'Español',en:'English',pt:'Português',fr:'Français',sw:'Kiswahili'}).map(([k,v])=>`<option value=${k} ${k===L?'selected':''}>${v}</option>`).join('')}</select>`}
function bindLang(){const s=$('#lang');if(s)s.onchange=e=>{L=e.target.value;localStorage.setItem('ffc_lang',L);render()}}
function render(){document.documentElement.lang=L;if(!ME)return loginView();
$('#root').innerHTML=`<header><img src="icon-192.png" class=logo><div class=ttl>${t('app')}<small>${CFG.edition}</small></div><div class=sp></div>${langSel()}<span class=who>${ME.user} · ${t(ME.role)}</span><button id=out class=ghost>${t('logout')}</button></header>
<nav>${NAV.filter(n=>n[0]!=='users'||isAdmin()).map(n=>`<a data-v=${n[0]} class="${VIEW===n[0]?'on':''}">${n[1]} <span>${t(n[0]==='delivery'?'delivery':n[0]==='users'?'usersT':n[0])}</span></a>`).join('')}</nav><main id=main></main>`;
bindLang();$('#out').onclick=()=>{ME=null;sessionStorage.removeItem(KEY+'_me');render()};
document.querySelectorAll('nav a').forEach(a=>a.onclick=()=>{VIEW=a.dataset.v;render()});
({dash,alerts:alertsV,reports,data:dataV,share:shareV}[VIEW]||listV)(VIEW)}
function loginView(){$('#root').innerHTML=`<div class=login><div class=hero></div><form id=lf class=card><img src="icon-192.png" class=biglogo><h1>${t('app')}</h1><p class=ed>${CFG.edition}</p>${langSel()}<label>${t('user')}<input name=u autocomplete=username required></label><label>${t('pass')}<input name=p type=password autocomplete=current-password required></label><button>${t('enter')}</button><p id=err class=err></p><button type=button id=inst class="ghost" hidden>📲 ${t('install')}</button></form></div>`;
bindLang();setupInstall();$('#lf').onsubmit=async e=>{e.preventDefault();const u=e.target.u.value.trim().toLowerCase(),h=await sha(e.target.p.value);
const all=[...CFG.users,...DB.users.map(x=>({u:x.user.toLowerCase(),h:x.h,role:x.role}))];const m=all.find(x=>x.u===u&&x.h===h);
if(!m){$('#err').textContent=t('bad');return}ME={user:u,role:m.role};sessionStorage.setItem(KEY+'_me',JSON.stringify(ME));VIEW='dash';render()}}
function cons(){/* per fuel load consumption vs previous load of same unit */const out={};const byU={};
[...DB.fuel].filter(f=>/Diesel|Petrol/.test(f.product)).sort((a,b)=>(a.date+num(a.reading)).localeCompare(b.date+num(b.reading))||num(a.reading)-num(b.reading)).forEach(f=>{const p=byU[f.unit];const u=DB.units.find(x=>x.id===f.unit);
if(p&&u){const d=num(f.reading)-num(p.reading);if(d>0)out[f.id]=u.meter==='hr'?num(f.liters)/d:d/num(f.liters)}byU[f.unit]=f});return out}
function unitStats(){const c=cons();return DB.units.map(u=>{const fs=DB.fuel.filter(f=>f.unit===u.id);const L_=fs.reduce((s,f)=>s+num(f.liters),0);const cost=fs.reduce((s,f)=>s+num(f.liters)*num(f.price),0)+DB.expenses.filter(e=>e.unit===u.id).reduce((s,e)=>s+num(e.amount),0)+DB.maint.filter(m=>m.unit===u.id).reduce((s,m)=>s+num(m.cost),0);
const rs=fs.map(f=>num(f.reading)).filter(x=>x);const dist=rs.length>1?Math.max(...rs)-Math.min(...rs):0;const vals=fs.map(f=>c[f.id]).filter(x=>x);const avg=vals.length?vals.reduce((a,b)=>a+b)/vals.length:0;
return{u,L:L_,cost,dist,avg,unitLbl:u.meter==='hr'?'L/h':'km/L',cpu:dist?cost/dist:0}})}
function getAlerts(){const a=[];const now=new Date();const soon=new Date(Date.now()+15*864e5);
DB.maint.filter(m=>!m.done).forEach(m=>{const u=DB.units.find(x=>x.id===m.unit);if((m.duedate&&new Date(m.duedate)<=soon)||(m.duemeter&&u&&num(u.reading)>=num(m.duemeter)*0.95))a.push(['🔧',t('alMaint'),unitName(m.unit)+' – '+m.task+' '+(m.duedate||'')+' '+(m.duemeter||'')])});
DB.drivers.forEach(d=>{if(d.licexp&&new Date(d.licexp)<=new Date(Date.now()+30*864e5))a.push(['🪪',t('alLic'),d.name+' – '+d.licexp])});
DB.tanks.forEach(k=>{if(num(k.cap)&&num(k.stock)<num(k.cap)*0.15)a.push(['🛢️',t('lowStock'),k.name+' – '+f2(num(k.stock))+' L'])});
const c=cons();unitStats().forEach(s=>{if(!s.avg)return;DB.fuel.filter(f=>f.unit===s.u.id&&c[f.id]).forEach(f=>{const r=c[f.id]/s.avg;const bad=s.u.meter==='hr'?r>1.3:r<0.7;if(bad)a.push(['⚠️',t('alCons'),s.u.code+' – '+f.date+': '+f2(c[f.id])+' '+s.unitLbl+' (avg '+f2(s.avg)+')'])})});
DB.checklist.filter(c=>c.result==='fail').slice(-10).forEach(c=>a.push(['❌',t('checklist')+': '+t('fail'),unitName(c.unit)+' – '+c.item+' '+c.date]));return a}
function dash(){const tl=DB.fuel.reduce((s,f)=>s+num(f.liters),0),tc=DB.fuel.reduce((s,f)=>s+num(f.liters)*num(f.price),0),al=getAlerts();
$('#main').innerHTML=`<div class=banner><div><h2>${t('app')}</h2><p>${CFG.edition}</p></div></div><div class=kpis>
<div class=kpi><b>${DB.units.length}</b><span>${t('nUnits')}</span></div><div class=kpi><b>${f2(tl)}</b><span>${t('nLiters')}</span></div><div class=kpi><b>${f2(tc)}</b><span>${t('nCost')}</span></div><div class=kpi><b>${al.length}</b><span>${t('nAlerts')}</span></div></div>
<div class=grid2><div class=card><h3>⛽ ${t('fuel')}</h3>${table(DB.fuel.slice(-8).reverse(),['date','unit','product','liters','reading'])}</div><div class=card><h3>🛢️ ${t('tanks')}</h3>${DB.tanks.map(k=>`<div class=bar><span>${k.name} (${k.product})</span><i style="width:${Math.min(100,num(k.cap)?num(k.stock)/num(k.cap)*100:0)}%"></i><em>${f2(num(k.stock))}/${f2(num(k.cap))} L</em></div>`).join('')||`<p class=mut>${t('empty')}</p>`}</div></div>`}
function cell(k,v){if(k==='unit')return unitName(v);if(k==='driver'){const d=DB.drivers.find(x=>x.id===v);return d?d.name:''}if(k==='source'){const d=DB.tanks.find(x=>x.id===v);return d?d.name:''}if(k==='kind'||k==='role')return t(v);if(k==='meter')return v==='hr'?'h':'km';if(k==='done')return v?'✅':'⏳';if(k==='result')return v==='ok'?'✅':'❌';if(k==='pass')return '••••';return v??''}
function table(rows,cols,actions){if(!rows.length)return`<p class=mut>${t('empty')}</p>`;return`<div class=tw><table><tr>${cols.map(c=>`<th>${t(c)}</th>`).join('')}${actions?'<th></th>':''}</tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${cell(c,r[c])}</td>`).join('')}${actions?`<td class=act>${actions(r)}</td>`:''}</tr>`).join('')}</table></div>`}
function listV(v){const s=S[v];const can=!s.adm||isAdmin();const cols=s.f.map(x=>x[0]).filter(c=>c!=='notes').slice(0,8);const c=v==='fuel'?cons():{};
const rows=[...DB[v]].reverse().map(r=>v==='fuel'?{...r,total:f2(num(r.liters)*num(r.price)),cons:c[r.id]?f2(c[r.id]):''}:r);
$('#main').innerHTML=`<div class=card><div class=row><h2>${t(v==='users'?'usersT':v)}</h2><div class=sp></div>${can?`<button id=add>＋ ${t('add')}</button>`:`<span class=mut>${t('onlyAdmin')}</span>`}</div>
${table(rows,v==='fuel'?[...cols,'total','cons']:cols,can||v==='fuel'?r=>`${can?`<button class=ghost data-e=${r.id}>✏️</button>`:''}${isAdmin()?`<button class=ghost data-d=${r.id}>🗑️</button>`:''}`:null)}</div><dialog id=dlg></dialog>`;
if(can&&$('#add'))$('#add').onclick=()=>form(v);document.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>form(v,DB[v].find(x=>x.id===b.dataset.e)));
document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(confirm(t('confirm'))){DB[v]=DB[v].filter(x=>x.id!==b.dataset.d);save();render()}})}
function form(v,rec){const s=S[v],d=$('#dlg');rec=rec||{};d.innerHTML=`<form method=dialog class=frm><h3>${t(v==='users'?'usersT':v)}</h3>${s.f.map(([k,ty,req,o])=>`<label>${t(k)}${ty==='sel'?`<select name=${k} ${req?'required':''}>${o().map(x=>`<option value="${x.v}" ${String(rec[k]??'')===String(x.v)?'selected':''}>${x.l}</option>`).join('')}</select>`:`<input name=${k} type=${ty} step=any ${req?'required':''} value="${k==='pass'?'':(rec[k]??(ty==='date'?today():''))}">`}</label>`).join('')}<div class=row><button value=c class=ghost formnovalidate>${t('cancel')}</button><div class=sp></div><button value=s>${t('save')}</button></div></form>`;
d.showModal();d.querySelector('form').onsubmit=async e=>{if(e.submitter&&e.submitter.value==='c')return;const fd=Object.fromEntries(new FormData(e.target));
if(v==='users'){fd.h=await sha(fd.pass);delete fd.pass;fd.user=fd.user.toLowerCase()}
if(v==='fuel'&&!rec.id){const u=DB.units.find(x=>x.id===fd.unit);if(u&&num(fd.reading)>num(u.reading))u.reading=fd.reading;const k=DB.tanks.find(x=>x.id===fd.source);if(k)k.stock=num(k.stock)-num(fd.liters)}
if(v==='delivery'&&!rec.id){const k=DB.tanks.find(x=>x.id===fd.source);if(k)k.stock=num(k.stock)+num(fd.liters)}
if(rec.id)Object.assign(rec,fd);else DB[v].push({id:uid(),by:ME.user,...fd});save();render()}}
function alertsV(){const a=getAlerts();$('#main').innerHTML=`<div class=card><h2>🔔 ${t('alerts')}</h2>${a.length?a.map(x=>`<div class=alert><span>${x[0]}</span><div><b>${x[1]}</b><p>${x[2]}</p></div></div>`).join(''):`<p class=mut>${t('noAlerts')}</p>`}</div>`}
function reports(){const st=unitStats();$('#main').innerHTML=`<div class=card><h2>📈 ${t('reports')}</h2>${table(st.map(s=>({unit:s.u.id,kind:s.u.kind,liters:f2(s.L),cost:f2(s.cost),reading:f2(s.dist)+' '+(s.u.meter==='hr'?'h':'km'),cons:s.avg?f2(s.avg)+' '+s.unitLbl:'',costKm:s.cpu?f2(s.cpu):''})),['unit','kind','liters','cost','reading','cons','costKm'])}<div class=row><button id=csv>⬇️ ${t('exportCSV')}</button><button class=ghost onclick=print()>🖨️ PDF</button></div></div>`;$('#csv').onclick=()=>dl('report.csv',toCSV(st.map(s=>({code:s.u.code,name:s.u.name,kind:s.u.kind,liters:s.L,cost:s.cost,distance:s.dist,consumption:s.avg,unit:s.unitLbl,costPerUnit:s.cpu}))))}
function toCSV(r){if(!r.length)return'';const k=Object.keys(r[0]);return k.join(',')+'\n'+r.map(x=>k.map(c=>'"'+String(x[c]??'').replace(/"/g,'""')+'"').join(',')).join('\n')}
function dl(n,c,ty='text/csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:ty}));a.download=n;a.click()}
function dataV(){$('#main').innerHTML=`<div class=card><h2>💾 ${t('data')}</h2><div class=btns>${['units','fuel','delivery','tanks','drivers','maint','checklist','expenses'].map(k=>`<button class=ghost data-c=${k}>⬇️ CSV · ${t(k)}</button>`).join('')}</div><div class=btns><button id=bj>💾 ${t('exportJSON')}</button>${isAdmin()?`<label class=filebtn>📂 ${t('importJSON')}<input type=file id=ij accept=.json hidden></label><button id=rs class=danger>🗑️ ${t('reset')}</button>`:''}</div></div>`;
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>dl(b.dataset.c+'.csv',toCSV(DB[b.dataset.c])));$('#bj').onclick=()=>dl('fleet-backup-'+today()+'.json',JSON.stringify(DB,null,1),'application/json');
if($('#ij'))$('#ij').onchange=e=>{const r=new FileReader();r.onload=()=>{try{DB=JSON.parse(r.result);save();render()}catch(x){alert(x)}};r.readAsText(e.target.files[0])};if($('#rs'))$('#rs').onclick=()=>{if(confirm(t('confirm'))){localStorage.removeItem(KEY);location.reload()}}}
function shareV(){const url=CFG.url;$('#main').innerHTML=`<div class="card center"><h2>🔗 ${t('share')}</h2><p>${t('shareTxt')}</p><img src="qr.png" class=qr alt=QR><input id=lnk readonly value="${url}"><div class=row style="justify-content:center"><button id=cp>📋 ${t('copy')}</button>${navigator.share?`<button id=sh class=ghost>📤 ${t('share')}</button>`:''}<a class=btn href="https://wa.me/?text=${encodeURIComponent(t('app')+' '+url)}" target=_blank>WhatsApp</a><button id=inst class=ghost hidden>📲 ${t('install')}</button></div></div>`;
$('#cp').onclick=()=>{navigator.clipboard.writeText(url);$('#cp').textContent='✅ '+t('copied')};if($('#sh'))$('#sh').onclick=()=>navigator.share({title:t('app'),url});setupInstall()}
let DP;addEventListener('beforeinstallprompt',e=>{e.preventDefault();DP=e;setupInstall()});
function setupInstall(){const b=$('#inst');if(b&&DP){b.hidden=false;b.onclick=()=>DP.prompt()}}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');render();
