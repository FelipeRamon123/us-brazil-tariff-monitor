const state={
  data:null,period:null,direction:"up",authority:"Todos",driver:null,driverLevel:"4",
  exposureMode:"share",visibleBands:new Set(),visibleMeasures:new Set(),showPolicyMarkers:true,showValueLabels:true,
};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const bandColors={free:"#d8d4c8",low:"#aebaa5",medium:"#6e9280",standard:"#2f6859",high:"#a66a4d",very_high:"#7b2f19",unmatched:"#ece6da"};
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1}).format(v||0);
const pct=v=>v==null?"—":new Intl.NumberFormat("pt-BR",{style:"percent",maximumFractionDigits:1,signDisplay:"exceptZero"}).format(v);
const ratePct=v=>v==null?"—":new Intl.NumberFormat("pt-BR",{style:"percent",maximumFractionDigits:1}).format(v);
const monthLabel=p=>new Intl.DateTimeFormat("pt-BR",{month:"short",year:"numeric"}).format(new Date(`${p}-15T12:00:00`)).replace(". de ","/");
const dateLabel=d=>new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${d}T12:00:00`));
const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const billion=v=>(v/1e9).toFixed(1).replace(".",",");

async function init(){
  configureResourceLinks();
  const response=await fetch("data/dashboard.json");
  if(!response.ok)throw new Error(`Falha ao carregar dados: ${response.status}`);
  state.data=await response.json();state.period=state.data.meta.latest_period;
  state.visibleBands=new Set(bandDefinitions().map(d=>d.key));
  state.visibleMeasures=new Set(state.data.milestones.map((_,i)=>i));
  renderSeriesPeriod();renderAuthorities();renderMeasureLegend();renderExposure();renderPolicyRail();renderSelected();bind();
  requestAnimationFrame(validateVisualMarks);
}

function configureResourceLinks(){
  const cfg=window.SITE_CONFIG||{},owner=String(cfg.githubOwner||"").trim();
  if(!owner)return;
  const branch=cfg.branch||"main",toolkit=`https://github.com/${owner}/${cfg.toolkitRepo||"official-data-api-toolkit"}`;
  const showcase=`https://github.com/${owner}/${cfg.showcaseRepo||"us-brazil-tariff-monitor"}`;
  const links={repoLink:toolkit,powerQueryLink:`${toolkit}/blob/${branch}/${cfg.powerQueryPath}`,pythonLink:`${toolkit}/blob/${branch}/${cfg.pythonPath}`,datasetLink:`${showcase}/releases/latest/download/${cfg.datasetAsset}`};
  Object.entries(links).forEach(([id,url])=>{const link=document.getElementById(id);if(link){link.href=url;link.target="_blank";link.rel="noreferrer";}});
}

function renderSeriesPeriod(){
  const first=state.data.monthly[0].period,last=state.data.meta.latest_period;
  $("#seriesPeriod").textContent=`${monthLabel(first)} — ${monthLabel(last)} · Census + Yale`;
}
function rowFor(period){return state.data.monthly.find(d=>d.period===period)}
function exposureRow(period){return(state.data.tariff_bands||[]).find(d=>d.period===period)}

function renderSelected(){
  const row=rowFor(state.period),first=state.data.monthly[0].period;
  $("#kpiMonth").textContent=monthLabel(row.period);$("#kpiCut").textContent=`série desde ${monthLabel(first)}`;
  $("#kpiImports").textContent=money(row.imports_usd);$("#kpiMonthlyChange").textContent=`${money(row.change_usd)} · ${pct(row.change_pct)} contra o mês anterior`;
  $("#kpiDuties").textContent=money(row.duties_usd);$("#kpiObservedRate").textContent=`${pct(row.observed_duty_rate)} do fluxo`;
  $("#kpiDutiable").textContent=money(row.dutiable_usd);$("#kpiDutiableShare").textContent=`${pct(row.dutiable_share)} da pauta`;
  $("#driverPeriod").textContent=monthLabel(row.period);renderDrivers();renderExposureSelection();
}
function selectPeriod(period){state.period=period;state.driver=null;renderSelected()}

function smoothPath(points){
  if(points.length<2)return"";let d=`M ${points[0][0]} ${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
    const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
function areaPath(top,bottom){const a=smoothPath(top),b=smoothPath([...bottom].reverse()).replace(/^M/,"L");return`${a} ${b} Z`}
function bandDefinitions(){return[...(state.data?.tariff_band_definitions||[]),{key:"unmatched",label:"Sem correspondência"}]}
function bandValue(row,key,mode){
  if(key==="unmatched")return mode==="share"?Math.max(0,1-row.coverage_pct):Math.max(0,row.total_usd-row.matched_usd);
  const band=row.bands.find(b=>b.key===key);return mode==="share"?(band?.share_total||0):(band?.value_usd||0);
}

function renderExposure(){
  const rows=state.data.tariff_bands||[],unavailable=$("#exposureUnavailable"),content=$("#exposureContent");
  if(!rows.length){
    content.hidden=true;unavailable.hidden=false;
    unavailable.innerHTML=`<strong>Camada tarifária aguardando processamento</strong><p>O gráfico só é ativado quando o painel HTS10 do Yale foi cruzado integralmente, sem estimativas parciais.</p>`;
    return;
  }
  content.hidden=false;unavailable.hidden=true;renderExposureLegend();renderExposureChart();
}

function renderExposureLegend(){
  $("#exposureLegend").innerHTML=bandDefinitions().map(d=>`<button class="${state.visibleBands.has(d.key)?"":"inactive"}" data-band="${d.key}" aria-pressed="${state.visibleBands.has(d.key)}"><i style="background:${bandColors[d.key]}"></i>${esc(d.label)}</button>`).join("");
  $$("#exposureLegend button").forEach(button=>button.onclick=()=>{
    const key=button.dataset.band;if(state.visibleBands.has(key)&&state.visibleBands.size===1)return;
    state.visibleBands.has(key)?state.visibleBands.delete(key):state.visibleBands.add(key);
    renderExposureLegend();renderExposureChart();renderExposureSelection();
  });
}

function renderMeasureLegend(){
  const legend=$("#measureLegend");if(!legend)return;
  legend.innerHTML=state.data.milestones.map((event,index)=>`<button type="button" class="measure-chip ${state.visibleMeasures.has(index)?"active":""}" data-measure="${index}" aria-pressed="${state.visibleMeasures.has(index)}"><time>${event.date.slice(0,7)}</time><span>${esc(event.short)}</span><b>${esc(event.rate)}</b></button>`).join("");
  $$(".measure-chip").forEach(button=>button.onclick=()=>{
    const index=+button.dataset.measure;
    state.visibleMeasures.has(index)?state.visibleMeasures.delete(index):state.visibleMeasures.add(index);
    renderMeasureLegend();renderExposureChart();
  });
  $(".measure-controls")?.classList.toggle("is-disabled",!state.showPolicyMarkers);
}

function renderExposureChart(){
  const rows=state.data.tariff_bands||[];if(!rows.length)return;
  const mode=state.exposureMode,W=1200,H=470,p={l:74,r:24,t:58,b:52};
  const x=i=>p.l+i*(W-p.l-p.r)/(rows.length-1);
  const yMax=mode==="share"?1:Math.ceil(Math.max(...rows.map(r=>r.total_usd))/5e8)*5e8;
  const y=v=>p.t+(yMax-v)*(H-p.t-p.b)/yMax;
  const defs=bandDefinitions(),layers=defs.map(d=>d.key).filter(k=>state.visibleBands.has(k)),cumulative=rows.map(()=>0);
  let svg=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`;
  const ticks=mode==="share"?[0,.25,.5,.75,1]:[0,.25,.5,.75,1].map(n=>n*yMax);
  ticks.forEach(v=>{
    const label=mode==="share"?`${Math.round(v*100)}%`:`${billion(v)} bi`;
    svg+=`<line class="gridline" x1="${p.l}" x2="${W-p.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${p.l-12}" y="${y(v)+4}" text-anchor="end">${label}</text>`;
  });
  layers.forEach(key=>{
    const bottom=rows.map((r,i)=>[x(i),y(cumulative[i])]);
    const values=rows.map(r=>bandValue(r,key,mode));values.forEach((v,i)=>cumulative[i]+=v);
    const top=rows.map((r,i)=>[x(i),y(cumulative[i])]);
    const label=defs.find(d=>d.key===key)?.label||key;
    svg+=`<path class="band-area band-${key}" data-chart-mark data-value="${Math.max(...values)}" d="${areaPath(top,bottom)}" fill="${bandColors[key]}"><title>${esc(label)}</title></path>`;
  });
  if(mode==="absolute"){
    const totalPoints=rows.map((r,i)=>[x(i),y(r.total_usd)]);
    svg+=`<path class="exposure-total-line" d="${smoothPath(totalPoints)}"><title>Valor total exportado</title></path>`;
  }
  if(state.showPolicyMarkers){
    const visible=state.data.milestones.map((event,index)=>({event,index})).filter(item=>state.visibleMeasures.has(item.index));
    const perMonth=Object.groupBy?Object.groupBy(visible,item=>item.event.date.slice(0,7)):visible.reduce((acc,item)=>{const period=item.event.date.slice(0,7);(acc[period]??=[]).push(item);return acc},{});
    Object.entries(perMonth).forEach(([period,items])=>{
      const i=rows.findIndex(r=>r.period===period);if(i<0)return;
      items.forEach((item,position)=>{
        const offset=(position-(items.length-1)/2)*8,eventX=x(i)+offset,event=item.event;
        const title=`${dateLabel(event.date)} · ${event.short} · ${event.rate}`;
        svg+=`<g class="exposure-event" data-measure="${item.index}"><title>${esc(title)}</title><line class="exposure-event-line" x1="${eventX}" x2="${eventX}" y1="${p.t}" y2="${H-p.b}"/><circle class="exposure-event-dot" cx="${eventX}" cy="${p.t-8-position%2*5}" r="3"/></g>`;
      });
    });
  }
  rows.forEach((r,i)=>{
    if(i%2===0||i===rows.length-1)svg+=`<text class="axis-label" x="${x(i)}" y="${H-18}" text-anchor="middle">${r.period.slice(5)}/${r.period.slice(2,4)}</text>`;
    if(state.showValueLabels){
      const labelY=mode==="absolute"?Math.max(p.t+12,y(r.total_usd)-10):18+(i%2)*15;
      svg+=`<text class="exposure-month-label" x="${x(i)}" y="${labelY}" text-anchor="middle">${billion(r.total_usd)}</text>`;
    }
  });
  const selected=rows.findIndex(r=>r.period===state.period);if(selected>=0)svg+=`<line class="exposure-selection" x1="${x(selected)}" x2="${x(selected)}" y1="${p.t}" y2="${H-p.b}"/>`;
  const step=(W-p.l-p.r)/(rows.length-1);
  rows.forEach((r,i)=>svg+=`<rect class="exposure-hit" data-period="${r.period}" x="${x(i)-step/2}" y="${p.t}" width="${step}" height="${H-p.t-p.b}" fill="transparent" tabindex="0"/>`);
  svg+=`<text class="axis-label" x="${p.l}" y="35">${mode==="share"?"PARCELA DA PAUTA":"US$ BILHÕES"}</text></svg>`;
  $("#exposureChart").innerHTML=svg;
  $$(".exposure-hit").forEach(el=>{
    el.onclick=()=>selectPeriod(el.dataset.period);
    el.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")selectPeriod(el.dataset.period)};
    el.onmouseenter=showExposureTooltip;el.onmouseleave=()=>$("#exposureTooltip").hidden=true;
  });
  requestAnimationFrame(validateVisualMarks);
}

function showExposureTooltip(event){
  const row=exposureRow(event.target.dataset.period),box=$("#exposureTooltip"),wrap=$(".exposure-chart-wrap").getBoundingClientRect(),rect=event.target.getBoundingClientRect();
  box.innerHTML=`${monthLabel(row.period)}<strong>${money(row.total_usd)}</strong>${pct(row.potentially_tariffed_pct)} potencialmente tarifado`;
  box.hidden=false;box.style.left=`${Math.min(wrap.width-190,rect.left-wrap.left+12)}px`;box.style.top=`${Math.max(12,rect.top-wrap.top+80)}px`;
}

function renderExposureSelection(){
  const row=exposureRow(state.period);if(!row)return;
  $("#exposureKpis").innerHTML=`<article><span>Potencialmente tarifado</span><strong>${pct(row.potentially_tariffed_pct)}</strong></article><article><span>Tarifa adicional média</span><strong>${pct(row.weighted_average_rate)}</strong></article><article><span>Cobertura do cruzamento</span><strong>${pct(row.coverage_pct)}</strong></article>`;
  $("#exposureMonthTitle").textContent=monthLabel(row.period);
  const all=[...row.bands,{key:"unmatched",label:"Sem correspondência",share_total:Math.max(0,1-row.coverage_pct)}].filter(b=>b.share_total>.0001&&state.visibleBands.has(b.key));
  $("#exposureMonthBars").innerHTML=all.map(b=>`<div class="exposure-bar"><span>${esc(b.label)}</span><div class="exposure-bar-track"><div class="exposure-bar-fill" data-chart-mark data-value="${b.share_total}" style="width:${Math.min(100,b.share_total*100)}%;background:${bandColors[b.key]}"></div></div><strong>${pct(b.share_total)}</strong></div>`).join("");
  const labels=Object.fromEntries(bandDefinitions().map(d=>[d.key,d.label]));
  const moved=(state.data.tariff_transitions?.[state.period]||[]).filter(f=>f.from!==f.to).slice(0,6),den=row.matched_usd||1;
  $("#tariffMigrations").innerHTML=moved.length?moved.map(f=>`<div class="migration-row"><span>${esc(labels[f.from]||f.from)}</span><span class="arrow">→</span><span>${esc(labels[f.to]||f.to)}</span><strong>${pct(f.consumption_value_usd/den)} · ${money(f.consumption_value_usd)}</strong></div>`).join(""):`<p class="migration-stable">Nenhuma migração material de faixa foi identificada neste mês; a mudança decorreu principalmente da composição da pauta.</p>`;
  renderExposureChart();requestAnimationFrame(validateVisualMarks);
}

function renderAuthorities(){
  const auth=["Todos",...new Set(state.data.milestones.map(e=>e.authority))];
  $("#authorityFilter").innerHTML=auth.map(a=>`<button class="${a===state.authority?"active":""}" data-auth="${esc(a)}">${esc(a)}</button>`).join("");
  $$("#authorityFilter button").forEach(b=>b.onclick=()=>{state.authority=b.dataset.auth;renderAuthorities();renderPolicyRail()});
}
function renderPolicyRail(){
  const events=state.data.milestones.filter(e=>state.authority==="Todos"||e.authority===state.authority);
  $("#policyRail").innerHTML=events.map(e=>`<button class="policy-card ${e.importance}" data-index="${state.data.milestones.indexOf(e)}"><time>${dateLabel(e.date)}</time><strong>${esc(e.short)}</strong><span>${esc(e.rate)} · ${esc(e.authority)}</span></button>`).join("");
  $$(".policy-card").forEach(b=>b.onclick=()=>showPolicy(+b.dataset.index));if(events.length)showPolicy(state.data.milestones.indexOf(events[0]));
}
function showPolicy(i){
  const e=state.data.milestones[i];$$(".policy-card").forEach(b=>b.classList.toggle("active",+b.dataset.index===i));
  $("#policyDetail").innerHTML=`<div><span class="rate">${esc(e.rate)}</span><p>${esc(e.authority)}</p></div><div><h3>${esc(e.title)}</h3><p>${esc(e.scope)}</p></div><cite>${esc(e.source)}</cite>`;
}

function currentDrivers(){
  const rows=state.data.drivers_by_level?.[state.driverLevel]?.[state.period]||state.data.drivers[state.period]||[];
  return rows.filter(r=>state.direction==="up"?r.change_usd>0:r.change_usd<0).sort((a,b)=>state.direction==="up"?b.change_usd-a.change_usd:a.change_usd-b.change_usd).slice(0,10);
}
function driverLevelLabel(){return Number(state.driverLevel)<=6?`SH${state.driverLevel}`:(state.driverLevel==="10"?"HTSUS10":`HTS${state.driverLevel}`)}
function componentSummary(r){
  if(Number(r.after_usd)===0)return`<span class="measure-none">Sem fluxo no mês</span>`;
  const components=r.tariff_components||[];if(!components.length)return`<span class="measure-none">Sem tarifa adicional</span>`;
  return components.map(c=>`<span class="measure-line"><b>${esc(c.label)}</b>${c.since?`<small>desde ${dateLabel(c.since)}</small>`:""}</span>`).join("");
}
function renderDrivers(){
  const rows=currentDrivers(),max=Math.max(1,...rows.map(r=>Math.abs(r.change_usd)));
  $("#driversList").innerHTML=rows.map(r=>{
    const code=r.code||r.hs4,endRate=r.tariff_rate_eom;
    const endNote=endRate!=null&&Math.abs(endRate-(r.tariff_rate||0))>.0005?`<small>${ratePct(endRate)} no fim do mês</small>`:`<small>média ponderada</small>`;
    return`<div class="driver-row ${state.direction==="down"?"down":""} ${state.driver===code?"active":""}" data-code="${esc(code)}" tabindex="0"><div class="driver-product"><span class="driver-code">${esc(code)}</span><span class="driver-name">${esc(r.product_pt||r.description_en||"Produto")}</span></div><div class="driver-change"><strong class="driver-value">${money(r.change_usd)}</strong><span class="bar-track"><i class="bar-fill" data-chart-mark data-value="${Math.abs(r.change_usd)}" style="width:${Math.max(1.5,Math.abs(r.change_usd)/max*100)}%"></i></span></div><div class="driver-tariff"><strong>${ratePct(r.tariff_rate)}</strong>${endNote}</div><div class="driver-measure">${componentSummary(r)}</div></div>`;
  }).join("")||`<p>Não há comparação anterior para este mês.</p>`;
  $$(".driver-row").forEach(el=>{el.onclick=()=>showDriver(el.dataset.code);el.onkeydown=e=>{if(e.key==="Enter")showDriver(el.dataset.code)}});if(!state.driver&&rows[0])showDriver(rows[0].code||rows[0].hs4);
  requestAnimationFrame(validateVisualMarks);
}
function showDriver(code){
  state.driver=code;const r=currentDrivers().find(x=>(x.code||x.hs4)===code);if(!r)return;
  $$(".driver-row").forEach(el=>el.classList.toggle("active",el.dataset.code===code));
  const range=r.tariff_rate_min!=null&&r.tariff_rate_max!=null&&Math.abs(r.tariff_rate_max-r.tariff_rate_min)>.0005?`${ratePct(r.tariff_rate_min)} a ${ratePct(r.tariff_rate_max)}`:ratePct(r.tariff_rate_eom);
  $("#driverDetail").innerHTML=`<p class="section-index">${driverLevelLabel()} ${esc(code)}</p><h3>${esc(r.product_pt||r.description_en||"Produto")}</h3><span class="tariff-flag">TARIFA ADICIONAL MÉDIA ${ratePct(r.tariff_rate)}</span><div class="driver-component-list">${componentSummary(r)}</div><p>${esc(r.editorial_reading||"A variação é descritiva e deve ser lida com a composição do código, quantidades e sazonalidade.")}</p><dl><div><dt>Variação mensal</dt><dd>${money(r.change_usd)} · ${pct(r.change_pct)}</dd></div><div><dt>Antes → depois</dt><dd>${money(r.before_usd)} → ${money(r.after_usd)}</dd></div><div><dt>Faixa no fim do mês</dt><dd>${range}</dd></div><div><dt>Valor exposto</dt><dd>${r.tariff_exposure!=null?ratePct(r.tariff_exposure):"a verificar"}</dd></div><div><dt>HTS10 líder</dt><dd>${esc(r.leader_hts10||"—")}</dd></div>${Number(state.driverLevel)>6&&r.description_en?`<div><dt>Detalhe oficial HTSUS</dt><dd lang="en">${esc(r.description_en)}</dd></div>`:""}</dl>`;
}

function downloadCsv(){
  const rows=currentDrivers(),cols=["period","direction","level","code","product_pt","before_usd","after_usd","change_usd","change_pct","tariff_rate_month","tariff_rate_eom","tariff_measure","tariff_since","leader_hts10","description_en"];
  const lines=[cols.join(","),...rows.map(r=>[state.period,state.direction,state.driverLevel,r.code||r.hs4,r.product_pt||"",r.before_usd,r.after_usd,r.change_usd,r.change_pct,r.tariff_rate??"",r.tariff_rate_eom??"",r.tariff_measure||"",r.tariff_since||"",r.leader_hts10||"",r.description_en||""].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))];
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`drivers_${state.period}_${state.driverLevel}_${state.direction}.csv`;a.click();URL.revokeObjectURL(a.href);
}

function validateVisualMarks(){
  const failures=[];
  $$('[data-chart-mark]').forEach(el=>{
    const value=Number(el.dataset.value||0),rect=el.getBoundingClientRect(),style=getComputedStyle(el);
    if(value>0&&Math.max(rect.width,rect.height)<=1)failures.push(el);
    if(style.display==="none"||style.visibility==="hidden"||Number(style.opacity)===0)failures.push(el);
  });
  document.documentElement.dataset.visualQa=failures.length?"fail":"pass";
  if(failures.length)console.warn("Marcas gráficas invisíveis:",[...new Set(failures)]);
  return[...new Set(failures)];
}

function bind(){
  $$("[data-direction]").forEach(b=>b.onclick=()=>{state.direction=b.dataset.direction;state.driver=null;$$("[data-direction]").forEach(x=>x.classList.toggle("active",x===b));renderDrivers()});
  $$("[data-driver-level]").forEach(b=>b.onclick=()=>{state.driverLevel=b.dataset.driverLevel;state.driver=null;$$("[data-driver-level]").forEach(x=>x.classList.toggle("active",x===b));renderDrivers()});
  $$('[data-exposure-mode]').forEach(b=>b.onclick=()=>{state.exposureMode=b.dataset.exposureMode;$$('[data-exposure-mode]').forEach(x=>x.classList.toggle("active",x===b));renderExposureChart()});
  $("#togglePolicyMarkers").onchange=e=>{state.showPolicyMarkers=e.target.checked;renderMeasureLegend();renderExposureChart()};
  $("#toggleValueLabels").onchange=e=>{state.showValueLabels=e.target.checked;renderExposureChart()};
  $("#showAllMeasures").onclick=()=>{state.visibleMeasures=new Set(state.data.milestones.map((_,i)=>i));state.showPolicyMarkers=true;$("#togglePolicyMarkers").checked=true;renderMeasureLegend();renderExposureChart()};
  $("#hideAllMeasures").onclick=()=>{state.visibleMeasures.clear();renderMeasureLegend();renderExposureChart()};
  $("#downloadCsv").onclick=downloadCsv;
  $("#langToggle").onclick=()=>alert("A documentação completa em inglês está no README.md do repositório.");
  window.addEventListener("resize",renderExposureChart);
}

init().catch(err=>{console.error(err);document.body.insertAdjacentHTML("afterbegin",`<div style="padding:16px;background:#7b2f19;color:white">Não foi possível carregar o dashboard: ${esc(err.message)}. Abra-o por um servidor HTTP local.</div>`)});
