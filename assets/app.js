const state={data:null,period:null,direction:"up",authority:"Todos",driver:null};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const bandColors={free:"#c9cfbf",low:"#9eaf99",medium:"#708f7d",standard:"#3f7061",high:"#a86a4c",very_high:"#7b2f19",extreme:"#3d1c13",unmatched:"#e7dfd1"};
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1}).format(v||0);
const pct=v=>v==null?"—":new Intl.NumberFormat("pt-BR",{style:"percent",maximumFractionDigits:1,signDisplay:"exceptZero"}).format(v);
const monthLabel=p=>new Intl.DateTimeFormat("pt-BR",{month:"short",year:"numeric"}).format(new Date(`${p}-15T12:00:00`)).replace(". de ","/");
const dateLabel=d=>new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${d}T12:00:00`));
const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

async function init(){
  const response=await fetch("data/dashboard.json");
  if(!response.ok) throw new Error(`Falha ao carregar dados: ${response.status}`);
  state.data=await response.json(); state.period=state.data.meta.latest_period;
  renderFreshness(); renderAuthorities(); renderChart(); renderExposure(); renderPolicyRail(); renderSelected(); renderAudit(); bind();
}

function renderFreshness(){
  const m=state.data.meta; const y=m.yale||{};
  $("#freshness").innerHTML=`<span>CENSUS <strong>${esc(m.latest_period)}</strong></span><span>YALE <strong>${esc(y.tag||y.status||"versão auditada")}</strong></span><span>GERADO <strong>${new Date(m.generated_at).toLocaleDateString("pt-BR")}</strong></span>`;
}

function rowFor(period){return state.data.monthly.find(d=>d.period===period)}

function renderSelected(){
  const row=rowFor(state.period), first=state.data.monthly[0].period;
  $("#kpiMonth").textContent=monthLabel(row.period); $("#kpiCut").textContent=`série desde ${monthLabel(first)}`;
  $("#kpiImports").textContent=money(row.imports_usd); $("#kpiMonthlyChange").textContent=`${money(row.change_usd)} · ${pct(row.change_pct)} contra o mês anterior`;
  $("#kpiDuties").textContent=money(row.duties_usd); $("#kpiObservedRate").textContent=`${pct(row.observed_duty_rate)} das importações`;
  $("#kpiDutiable").textContent=money(row.dutiable_usd); $("#kpiDutiableShare").textContent=`${pct(row.dutiable_share)} da pauta`;
  $("#driverPeriod").textContent=monthLabel(row.period); renderDrivers(); renderChartSelection(); renderExposureSelection();
}

function chartGeometry(){
  const W=1200,H=500,p={l:76,r:28,t:68,b:60}; const values=state.data.monthly.map(d=>d.imports_usd/1e9);
  const min=Math.floor(Math.min(...values)*2)/2-.15,max=Math.ceil(Math.max(...values)*2)/2+.15;
  const x=i=>p.l+i*(W-p.l-p.r)/(values.length-1), y=v=>p.t+(max-v)*(H-p.t-p.b)/(max-min);
  return {W,H,p,values,min,max,x,y};
}

function smoothPath(points){
  if(points.length<2)return""; let d=`M ${points[0][0]} ${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)]; const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6]; d+=` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;} return d;
}

function renderChart(){
  const g=chartGeometry(), rows=state.data.monthly, pts=g.values.map((v,i)=>[g.x(i),g.y(v)]), path=smoothPath(pts);
  const ticks=[]; for(let v=Math.ceil(g.min*2)/2;v<=g.max;v+=.5)ticks.push(v);
  const eventByMonth=new Map(); state.data.milestones.forEach(e=>{const p=e.date.slice(0,7);if(!eventByMonth.has(p))eventByMonth.set(p,[]);eventByMonth.get(p).push(e)});
  let svg=`<svg viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b2f19" stop-opacity=".12"/><stop offset="1" stop-color="#7b2f19" stop-opacity="0"/></linearGradient></defs>`;
  ticks.forEach(v=>svg+=`<line class="gridline" x1="${g.p.l}" x2="${g.W-g.p.r}" y1="${g.y(v)}" y2="${g.y(v)}"/><text class="axis-label" x="${g.p.l-14}" y="${g.y(v)+4}" text-anchor="end">${v.toFixed(1).replace(".",",")}</text>`);
  rows.forEach((r,i)=>{if(i%2===0||i===rows.length-1)svg+=`<text class="axis-label" x="${g.x(i)}" y="${g.H-24}" text-anchor="middle">${r.period.slice(5)}/${r.period.slice(2,4)}</text>`});
  eventByMonth.forEach((events,p)=>{const i=rows.findIndex(r=>r.period===p);if(i<0)return;const xx=g.x(i);svg+=`<line class="event-stem" x1="${xx}" x2="${xx}" y1="${g.p.t-4}" y2="${g.H-g.p.b}"/><circle class="event-dot" cx="${xx}" cy="${g.p.t-15}" r="4"/><text class="event-label" x="${xx}" y="${g.p.t-29}" text-anchor="middle">${events.length>1?`${events.length} MEDIDAS`:esc(events[0].short.toUpperCase())}</text>`});
  svg+=`<path class="chart-area" d="${path} L ${pts.at(-1)[0]} ${g.H-g.p.b} L ${pts[0][0]} ${g.H-g.p.b} Z"/><path class="chart-line" d="${path}"/>`;
  pts.forEach((p,i)=>svg+=`<circle class="chart-point" data-period="${rows[i].period}" cx="${p[0]}" cy="${p[1]}" r="5" tabindex="0"><title>${monthLabel(rows[i].period)}: ${money(rows[i].imports_usd)}</title></circle>`);
  svg+=`<text class="axis-label" x="${g.p.l}" y="24">USD BILHÕES / MÊS</text></svg>`; $("#mainChart").innerHTML=svg;
  $$(".chart-point").forEach(el=>{el.addEventListener("click",()=>selectPeriod(el.dataset.period));el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")selectPeriod(el.dataset.period)});el.addEventListener("mouseenter",showTooltip);el.addEventListener("mouseleave",()=>$("#chartTooltip").hidden=true)});
}

function renderChartSelection(){$$(".chart-point").forEach(n=>n.classList.toggle("selected",n.dataset.period===state.period))}
function showTooltip(e){const row=rowFor(e.target.dataset.period),box=$("#chartTooltip"),card=$(".chart-card").getBoundingClientRect(),r=e.target.getBoundingClientRect();box.innerHTML=`${monthLabel(row.period)}<strong>${money(row.imports_usd)}</strong>${pct(row.change_pct)} no mês`;box.hidden=false;box.style.left=`${Math.min(card.width-175,r.left-card.left+14)}px`;box.style.top=`${Math.max(10,r.top-card.top-65)}px`}
function selectPeriod(p){state.period=p;state.driver=null;renderSelected()}

function exposureRow(period){return (state.data.tariff_bands||[]).find(d=>d.period===period)}
function areaPath(top,bottom){const a=smoothPath(top),b=smoothPath([...bottom].reverse()).replace(/^M/,"L");return `${a} ${b} Z`}
function renderExposure(){
  const rows=state.data.tariff_bands||[], unavailable=$("#exposureUnavailable"), content=$("#exposureContent");
  if(!rows.length){
    content.hidden=true; unavailable.hidden=false;
    unavailable.innerHTML=`<strong>Camada HTS10 do Yale aguardando processamento</strong><p>O desenho está pronto, mas as participações não são estimadas com dados parciais. A primeira execução completa do workflow baixa a release do Yale, filtra o Brasil e ativa este gráfico com valores auditáveis.</p>`;
    return;
  }
  content.hidden=false; unavailable.hidden=true;
  const defs=[...(state.data.tariff_band_definitions||[]),{key:"unmatched",label:"Sem correspondência"}];
  $("#exposureLegend").innerHTML=defs.map(d=>`<span><i style="background:${bandColors[d.key]}"></i>${esc(d.label)}</span>`).join("");
  renderExposureChart();
}
function renderExposureChart(){
  const rows=state.data.tariff_bands||[]; if(!rows.length)return;
  const W=1200,H=390,p={l:60,r:22,t:26,b:48},x=i=>p.l+i*(W-p.l-p.r)/(rows.length-1),y=v=>p.t+(1-v)*(H-p.t-p.b);
  const defs=state.data.tariff_band_definitions||[], layers=[...defs.map(d=>d.key),"unmatched"], cumulative=rows.map(()=>0);
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`;
  [0,.25,.5,.75,1].forEach(v=>svg+=`<line class="gridline" x1="${p.l}" x2="${W-p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${p.l-10}" y="${y(v)+4}" text-anchor="end">${Math.round(v*100)}%</text>`);
  layers.forEach(key=>{
    const bottom=rows.map((r,i)=>[x(i),y(cumulative[i])]);
    const shares=rows.map(r=>key==="unmatched"?Math.max(0,1-r.coverage_pct):(r.bands.find(b=>b.key===key)?.share_total||0));
    shares.forEach((v,i)=>cumulative[i]+=v);
    const top=rows.map((r,i)=>[x(i),y(Math.min(1,cumulative[i]))]);
    svg+=`<path class="band-area band-${key}" d="${areaPath(top,bottom)}" fill="${bandColors[key]}"><title>${esc((defs.find(d=>d.key===key)||{label:"Sem correspondência"}).label)}</title></path>`;
  });
  rows.forEach((r,i)=>{if(i%2===0||i===rows.length-1)svg+=`<text class="axis-label" x="${x(i)}" y="${H-18}" text-anchor="middle">${r.period.slice(5)}/${r.period.slice(2,4)}</text>`;svg+=`<rect class="exposure-hit" data-period="${r.period}" x="${x(i)-(W-p.l-p.r)/(rows.length-1)/2}" y="${p.t}" width="${(W-p.l-p.r)/(rows.length-1)}" height="${H-p.t-p.b}" fill="transparent"/>`});
  const selected=rows.findIndex(r=>r.period===state.period);if(selected>=0)svg+=`<line class="exposure-selection" x1="${x(selected)}" x2="${x(selected)}" y1="${p.t}" y2="${H-p.b}"/>`;
  svg+=`</svg>`;$("#exposureChart").innerHTML=svg;$$('.exposure-hit').forEach(el=>el.onclick=()=>selectPeriod(el.dataset.period));
}
function renderExposureSelection(){
  const row=exposureRow(state.period); if(!row){if((state.data.tariff_bands||[]).length)renderExposureChart();return;}
  $("#exposureKpis").innerHTML=`<article><span>Potencialmente tarifado</span><strong>${pct(row.potentially_tariffed_pct)}</strong></article><article><span>Tarifa adicional média</span><strong>${pct(row.weighted_average_rate)}</strong></article><article><span>Cobertura do cruzamento</span><strong>${pct(row.coverage_pct)}</strong></article>`;
  $("#exposureMonthTitle").textContent=monthLabel(row.period);
  const all=[...row.bands,{key:"unmatched",label:"Sem correspondência",share_total:Math.max(0,1-row.coverage_pct)}].filter(b=>b.share_total>.0001);
  $("#exposureMonthBars").innerHTML=all.map(b=>`<div class="exposure-bar"><span>${esc(b.label)}</span><div class="exposure-bar-track"><div class="exposure-bar-fill" style="width:${Math.min(100,b.share_total*100)}%;background:${bandColors[b.key]}"></div></div><strong>${pct(b.share_total)}</strong></div>`).join("");
  const labels=Object.fromEntries([...(state.data.tariff_band_definitions||[]),{key:"unmatched",label:"Sem correspondência"}].map(d=>[d.key,d.label]));
  const moved=(state.data.tariff_transitions?.[state.period]||[]).filter(f=>f.from!==f.to).slice(0,6),den=row.matched_usd||1;
  $("#tariffMigrations").innerHTML=moved.length?moved.map(f=>`<div class="migration-row"><span>${esc(labels[f.from]||f.from)}</span><span class="arrow">→</span><span>${esc(labels[f.to]||f.to)}</span><strong>${pct(f.consumption_value_usd/den)} · ${money(f.consumption_value_usd)}</strong></div>`).join(""):`<p class="migration-stable">Nenhuma migração material de faixa foi identificada neste mês; a mudança decorreu principalmente da composição da pauta.</p>`;
  renderExposureChart();
}

function renderAuthorities(){const auth=["Todos",...new Set(state.data.milestones.map(e=>e.authority))];$("#authorityFilter").innerHTML=auth.map(a=>`<button class="${a===state.authority?"active":""}" data-auth="${esc(a)}">${esc(a)}</button>`).join("");$$("#authorityFilter button").forEach(b=>b.onclick=()=>{state.authority=b.dataset.auth;renderAuthorities();renderPolicyRail()})}
function renderPolicyRail(){const events=state.data.milestones.filter(e=>state.authority==="Todos"||e.authority===state.authority);$("#policyRail").innerHTML=events.map((e,i)=>`<button class="policy-card ${e.importance}" data-index="${state.data.milestones.indexOf(e)}"><time>${dateLabel(e.date)}</time><strong>${esc(e.short)}</strong><span>${esc(e.rate)} · ${esc(e.authority)}</span></button>`).join("");$$(".policy-card").forEach(b=>b.onclick=()=>showPolicy(+b.dataset.index));if(events.length)showPolicy(state.data.milestones.indexOf(events[0]))}
function showPolicy(i){const e=state.data.milestones[i];$$(".policy-card").forEach(b=>b.classList.toggle("active",+b.dataset.index===i));$("#policyDetail").innerHTML=`<div><span class="rate">${esc(e.rate)}</span><p>${esc(e.authority)}</p></div><div><h3>${esc(e.title)}</h3><p>${esc(e.scope)}</p></div><cite>${esc(e.source)}</cite>`}

function currentDrivers(){const rows=state.data.drivers[state.period]||[];return rows.filter(r=>state.direction==="up"?r.change_usd>0:r.change_usd<0).sort((a,b)=>state.direction==="up"?b.change_usd-a.change_usd:a.change_usd-b.change_usd).slice(0,10)}
function renderDrivers(){const rows=currentDrivers(),max=Math.max(1,...rows.map(r=>Math.abs(r.change_usd)));$("#driversList").innerHTML=rows.map((r,i)=>`<div class="driver-row ${state.direction==="down"?"down":""} ${state.driver===r.hs4?"active":""}" data-hs4="${r.hs4}" tabindex="0"><span class="driver-code">${r.hs4}</span><span class="driver-name">${esc(r.product_pt||r.description||"Produto")}</span><span class="bar-track"><i class="bar-fill" style="width:${Math.abs(r.change_usd)/max*100}%"></i></span><strong class="driver-value">${money(r.change_usd)}</strong></div>`).join("")||`<p>Não há comparação anterior para este mês.</p>`;$$(".driver-row").forEach(el=>{el.onclick=()=>showDriver(el.dataset.hs4);el.onkeydown=e=>{if(e.key==="Enter")showDriver(el.dataset.hs4)}});if(!state.driver&&rows[0])showDriver(rows[0].hs4)}
function showDriver(hs4){state.driver=hs4;const r=currentDrivers().find(x=>x.hs4===hs4);if(!r)return;$$(".driver-row").forEach(el=>el.classList.toggle("active",el.dataset.hs4===hs4));const tariff=r.tariff_regime||"Tratamento HTS10 ainda não anexado a esta janela";$("#driverDetail").innerHTML=`<p class="section-index">HTS4 ${r.hs4}</p><h3>${esc(r.product_pt||r.description||"Produto")}</h3>${r.tariff_rate!=null?`<span class="tariff-flag">TAXA ADICIONAL MÉDIA ${pct(r.tariff_rate)}</span>`:""}<p>${esc(r.editorial_reading||"A variação é descritiva. Verifique o HTS10 líder e o regime vigente antes de atribuí-la à tarifa.")}</p><dl><div><dt>Variação mensal</dt><dd>${money(r.change_usd)} · ${pct(r.change_pct)}</dd></div><div><dt>Antes → depois</dt><dd>${money(r.before_usd)} → ${money(r.after_usd)}</dd></div><div><dt>Regime dominante</dt><dd>${esc(tariff)}</dd></div><div><dt>Valor exposto</dt><dd>${r.tariff_exposure!=null?pct(r.tariff_exposure):"a verificar"}</dd></div><div><dt>HTS10 líder</dt><dd>${esc(r.leader_hts10||"—")}</dd></div></dl>`}

function renderAudit(){const a=state.data.audit,m=state.data.meta;$("#auditGrid").innerHTML=[['Linhas-fonte',a.source_rows.toLocaleString('pt-BR')],['Meses',a.periods],['HTS10 únicos',a.unique_hts10.toLocaleString('pt-BR')],['Duplicidades',a.duplicate_period_hts10],['Último mês',m.latest_period],['SHA-256',m.census_sha256.slice(0,12)+'…']].map(([k,v])=>`<article><span>${k}</span><strong>${v}</strong></article>`).join("")}

function downloadCsv(){const rows=currentDrivers(),cols=["period","direction","hs4","product","before_usd","after_usd","change_usd","change_pct","tariff_rate","tariff_regime","leader_hts10"];const lines=[cols.join(","),...rows.map(r=>[state.period,state.direction,r.hs4,r.product_pt||r.description,r.before_usd,r.after_usd,r.change_usd,r.change_pct,r.tariff_rate??"",r.tariff_regime||"",r.leader_hts10||""].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))];const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`drivers_${state.period}_${state.direction}.csv`;a.click();URL.revokeObjectURL(a.href)}
function bind(){$$("[data-direction]").forEach(b=>b.onclick=()=>{state.direction=b.dataset.direction;state.driver=null;$$("[data-direction]").forEach(x=>x.classList.toggle("active",x===b));renderDrivers()});$("#downloadCsv").onclick=downloadCsv;$("#copyAudit").onclick=async()=>{await navigator.clipboard.writeText(JSON.stringify({meta:state.data.meta,audit:state.data.audit},null,2));$("#copyAudit").textContent="Copiado";setTimeout(()=>$("#copyAudit").textContent="Copiar manifesto",1400)};$("#langToggle").onclick=()=>alert("A documentação completa em inglês está no README.md do repositório.");window.addEventListener("resize",()=>{renderChart();renderChartSelection();renderExposureChart()})}

init().catch(err=>{console.error(err);document.body.insertAdjacentHTML("afterbegin",`<div style="padding:16px;background:#7b2f19;color:white">Não foi possível carregar o dashboard: ${esc(err.message)}. Abra-o por um servidor HTTP local.</div>`) });
