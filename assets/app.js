const pageParams=new URLSearchParams(location.search);
const state={
  data:null,period:null,direction:"up",authority:"Todos",driver:null,driverLevel:"4",
  exposureMode:"share",visibleBands:new Set(),visibleMeasures:new Set(),showPolicyMarkers:true,showValueLabels:true,
  lang:pageParams.get("lang")==="en"||!pageParams.get("lang")&&localStorage.getItem("tariffMonitorLang")==="en"?"en":"pt",
};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const bandColors={free:"#d8d4c8",low:"#aebaa5",medium:"#6e9280",standard:"#2f6859",high:"#a66a4d",very_high:"#7b2f19",unmatched:"#ece6da"};
const I18N={
  pt:{seriesSince:"série desde",previousMonth:"contra o mês anterior",ofFlow:"do fluxo",ofBasket:"da pauta",unmatched:"Sem correspondência",totalExported:"Valor total exportado",basketShare:"PARCELA DA PAUTA",billions:"USD BILHÕES",potentiallySurcharged:"com sobretarifa potencial",dominantBand:"Faixa predominante",dominantShare:"da pauta",joinCoverage:"Cobertura do cruzamento",noMigration:"Nenhuma migração material de faixa foi identificada neste mês; a mudança decorreu principalmente da composição da pauta.",all:"Todos",noFlow:"Sem fluxo no mês",noAdditional:"Sem sobretarifa modelada",since:"desde",dominantRate:"faixa predominante",product:"Produto",noComparison:"Não há comparação anterior para este mês.",descriptive:"A variação é descritiva e deve ser lida com a composição do código, quantidades e sazonalidade.",monthlyChange:"Variação mensal",beforeAfter:"Antes → depois",effectiveBand:"Faixa efetiva de referência",exposedValue:"Valor exposto",leadingHts:"HTS10 representativo",officialDetail:"Detalhe oficial HTSUS",toVerify:"a verificar",loadingTitle:"Camada de sobretarifas aguardando processamento",loadingBody:"O gráfico só é ativado quando o painel HTS10 do Yale foi cruzado integralmente, sem estimativas parciais.",loadError:"Não foi possível carregar o dashboard",serverHint:"Abra-o por um servidor HTTP local."},
  en:{seriesSince:"series since",previousMonth:"from the previous month",ofFlow:"of the flow",ofBasket:"of the basket",unmatched:"Unmatched",totalExported:"Total import value",basketShare:"SHARE OF THE BASKET",billions:"USD BILLIONS",potentiallySurcharged:"under a potential surcharge",dominantBand:"Largest surcharge band",dominantShare:"of the basket",joinCoverage:"Join coverage",noMigration:"No material surcharge-band migration was identified this month; the change mainly reflected the composition of the import basket.",all:"All",noFlow:"No trade flow in the month",noAdditional:"No modeled surcharge",since:"since",dominantRate:"dominant band",product:"Product",noComparison:"No previous-month comparison is available.",descriptive:"The change is descriptive and should be read alongside product composition, quantities and seasonality.",monthlyChange:"Monthly change",beforeAfter:"Before → after",effectiveBand:"Effective reference band",exposedValue:"Exposed value",leadingHts:"Representative HTS10",officialDetail:"Official HTSUS detail",toVerify:"to be verified",loadingTitle:"Surcharge layer awaiting processing",loadingBody:"The chart is enabled only after the complete Yale HTS10 panel has been joined, without partial estimates.",loadError:"The dashboard could not be loaded",serverHint:"Open it through a local HTTP server."}
};
const tr=k=>I18N[state.lang][k]||k;
const locale=()=>state.lang==="en"?"en-US":"pt-BR";
const money=v=>new Intl.NumberFormat(locale(),{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1}).format(v||0);
const pct=v=>v==null?"—":new Intl.NumberFormat(locale(),{style:"percent",maximumFractionDigits:1,signDisplay:"exceptZero"}).format(v);
const sharePct=v=>v==null?"—":new Intl.NumberFormat(locale(),{style:"percent",maximumFractionDigits:1}).format(v);
const ratePct=v=>v==null?"—":new Intl.NumberFormat(locale(),{style:"percent",maximumFractionDigits:1}).format(v);
const monthLabel=p=>new Intl.DateTimeFormat(locale(),{month:"short",year:"numeric"}).format(new Date(`${p}-15T12:00:00`)).replace(". de ","/");
const dateLabel=d=>new Intl.DateTimeFormat(locale(),{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${d}T12:00:00`));
const esc=s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const billion=v=>new Intl.NumberFormat(locale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format(v/1e9);

const STATIC_EN={
  "Evolução":"Exposure","Produtos":"Products","Método":"Method","BRASIL → ESTADOS UNIDOS · HTS10":"BRAZIL → UNITED STATES · HTS10","Tarifas dos EUA":"U.S. tariffs","na pauta brasileira":"on Brazilian exports","A evolução mensal das exportações brasileiras aos Estados Unidos e de sua exposição potencial às novas medidas tarifárias.":"Monthly U.S. imports from Brazil and their potential exposure to new tariff measures.","Alterne entre participação relativa e valor em dólares. Selecione um mês para identificar os produtos que explicam a alta ou a queda do fluxo.":"Switch between relative shares and U.S. dollar values. Select a month to identify the products driving the increase or decrease.","CÓDIGO E DADOS":"CODE AND DATA","Reproduza a consulta e trabalhe com a base.":"Reproduce the query and work with the data.","Conectores, exemplos e o arquivo processado seguem o mesmo padrão do Official Data API Toolkit.":"Connectors, examples and the processed file follow the Official Data API Toolkit standard.","Explorar o toolkit":"Explore the toolkit","Conectores e exemplos":"Connectors and examples","Consulta mensal ao U.S. Census":"Monthly U.S. Census query","Pipeline Census + Yale":"Census + Yale pipeline","Baixar a base":"Download dataset","Release mais recente":"Latest release","Mês selecionado":"Selected month","Exportações brasileiras aos EUA":"U.S. imports from Brazil","Direitos calculados":"Calculated duties","Valor dutiável":"Dutiable value","01 / EVOLUÇÃO E EXPOSIÇÃO":"01 / TREND AND EXPOSURE","Como a pauta se distribuiu entre as faixas tarifárias?":"How was the basket distributed across tariff bands?","As faixas usam a tarifa adicional estatutária média pelos dias de vigência. Clique no mês para abrir sua decomposição.":"Bands use the statutory additional tariff averaged over the days in force. Select a month to open its decomposition.","Composição 100%":"100% composition","Valor em US$":"Value in USD","Marcos tarifários":"Tariff milestones","Valores mensais":"Monthly values","Medidas no gráfico":"Measures on chart","Ative ou oculte cada linha vertical.":"Show or hide each vertical marker.","Todas":"All","Nenhuma":"None","COMPOSIÇÃO DO MÊS":"MONTH COMPOSITION","MUDANÇAS DE FAIXA":"BAND MIGRATIONS","O que migrou desde o mês anterior?":"What moved since the previous month?","“Potencialmente tarifado” indica exposição estatutária modelada no HTS10. Não equivale aos direitos efetivamente calculados pelo Census e não inclui incidências fora do escopo do tracker.":"“Potentially tariffed” indicates modeled statutory exposure at HTS10 level. It is not equivalent to Census calculated duties and excludes measures outside the tracker’s scope.","02 / POLÍTICA":"02 / POLICY","Faixa completa de medidas":"Complete policy timeline","03 / DECOMPOSIÇÃO":"03 / DECOMPOSITION","Quem explica a mudança em":"What explains the change in","Baixar CSV":"Download CSV","Agregação":"Aggregation","Movimento":"Movement","Altas":"Increases","Quedas":"Decreases","SH2, SH4 e SH6 usam a nomenclatura oficial em português. Em HTS8 e HTSUS10, o nome em português identifica o SH6 correspondente; o detalhamento oficial americano aparece no painel lateral.":"HS2, HS4 and HS6 use the official Portuguese nomenclature. At HTS8 and HTSUS10, the English official U.S. detail is used in the product analysis.","Produto":"Product","Variação mensal":"Monthly change","Tarifa no mês":"Tariff in month","Medida e vigência":"Measure and effective date","LEITURA DO PRODUTO":"PRODUCT READING","Selecione um produto":"Select a product","A tarifa e as medidas são calculadas a partir das linhas HTS10 que compõem o código no mês selecionado.":"Tariffs and measures are calculated from the HTS10 lines composing the selected code and month.","04 / DEFINIÇÕES":"04 / DEFINITIONS","Conceitos usados":"Concepts used","no painel.":"in the dashboard.","As estatísticas aduaneiras observadas e as tarifas estatutárias modeladas medem coisas distintas.":"Observed customs statistics and modeled statutory tariffs measure different concepts.","Importações para consumo":"Imports for consumption","Tarifa adicional modelada":"Modeled additional tariff","Potencialmente tarifado":"Potentially tariffed","Tarifa adicional média":"Average additional tariff","Tarifas dos EUA na pauta exportadora brasileira":"U.S. tariffs on Brazilian exports","Atualização mensal · código e documentação sob licença MIT":"Monthly update · code and documentation under the MIT License","Dados: U.S. Census":"Data: U.S. Census","Metodologia: Yale":"Methodology: Yale","Código e documentação":"Code and documentation","Licença MIT":"MIT License"
};
Object.assign(STATIC_EN,{
  "Sobretarifas dos EUA":"U.S. surcharges",
  "A evolução mensal das exportações brasileiras aos Estados Unidos e de sua exposição potencial às novas sobretarifas.":"Monthly U.S. imports from Brazil and their potential exposure to new surcharges.",
  "Sobretarifas dos EUA na pauta exportadora brasileira":"U.S. surcharges on Brazilian exports",
  "Como a pauta se distribuiu entre as faixas de sobretarifa?":"How was the basket distributed across surcharge bands?",
  "Cada mês usa a sobretarifa estatutária vigente no dia 15. Medidas posteriores entram na competência seguinte.":"Each month uses the statutory surcharge in force on day 15. Measures beginning later enter in the following month.",
  "“Sobretarifa potencial” é a taxa adicional modelada no HTS10 pela regra mensal do dia 15. Não inclui a tarifa-base, antidumping, compensatórias ou outras incidências fora do tracker.":"“Potential surcharge” is the additional HTS10 rate modeled under the monthly day-15 rule. It excludes the base tariff, antidumping, countervailing duties and measures outside the tracker.",
  "Sobretarifa no mês":"Monthly surcharge",
  "A faixa predominante e as medidas são calculadas a partir das linhas HTS10 que compõem o código no mês selecionado.":"The dominant band and measures are calculated from the HTS10 lines composing the selected code and month.",
  "Valor das mercadorias brasileiras que entraram nos EUA para consumo ou uso. O painel usa CON_VAL_MO, na perspectiva do importador americano.":"Value of Brazilian goods entered into the United States for consumption or use. The dashboard uses CON_VAL_MO from the U.S. importer’s perspective.",
  "Parcela do valor importado classificada pelo Census como sujeita a direitos aduaneiros (DUT_VAL_MO). Não é sinônimo do valor alcançado por todas as medidas modeladas pelo Yale.":"Share of import value classified by the Census as subject to customs duties (DUT_VAL_MO). It is not synonymous with the value covered by all measures modeled by Yale.",
  "Direitos associados às entradas do mês no Census (CAL_DUT_MO). Não devem ser interpretados como a alíquota estatutária de uma linha HTS10.":"Duties associated with the month’s entries in Census data (CAL_DUT_MO). They should not be interpreted as the statutory rate of an HTS10 line.",
  "Alíquota adicional do Yale Tariff Rate Tracker por HTS10, origem e data. No mês, a taxa é ponderada pelos dias de vigência.":"Additional rate from the Yale Tariff Rate Tracker by HTS10, origin and date. Within each month, the rate is weighted by days in force.",
  "Participação do valor importado associada a uma tarifa adicional modelada maior que zero. Indica exposição estatutária, não o direito efetivamente recolhido.":"Share of import value associated with a modeled additional tariff above zero. It indicates statutory exposure, not duties actually collected.",
  "Média das tarifas adicionais ponderada pelo valor importado de cada HTS10. A faixa superior >40% é predominantemente composta por taxas de 50%; casos excepcionais mais altos ficam consolidados nela.":"Average additional tariff weighted by the import value of each HTS10. The >40% band is predominantly composed of 50% rates; exceptional higher cases are consolidated within it."
});
const COMPONENT_EN={"Seção 232":"Section 232","Seção 301 Brasil":"Section 301 Brazil","Seção 301 trabalho forçado":"Section 301 forced labor","IEEPA recíproca":"IEEPA reciprocal","IEEPA fentanil":"IEEPA fentanyl","Seção 122":"Section 122","Seção 201":"Section 201","Seção 301":"Section 301","Outras medidas":"Other measures"};
const GLOSSARY=[
  ["Importações para consumo","Imports for consumption","Valor das mercadorias brasileiras que entraram nos EUA para consumo ou uso. O painel usa <code>CON_VAL_MO</code>, na perspectiva do importador americano.","Value of Brazilian goods entered into the United States for consumption or use. The dashboard uses <code>CON_VAL_MO</code> from the U.S. importer’s perspective."],
  ["Dutiable value","Dutiable value","Parcela do valor importado classificada pelo Census como sujeita a direitos aduaneiros (<code>DUT_VAL_MO</code>). Não é sinônimo do valor alcançado por todas as medidas modeladas pelo Yale.","Share of import value classified by the Census as subject to customs duties (<code>DUT_VAL_MO</code>). It is not the same as the value covered by all measures modeled by Yale."],
  ["Direitos calculados","Calculated duties","Direitos associados às entradas do mês no Census (<code>CAL_DUT_MO</code>). Não devem ser interpretados como a alíquota estatutária de uma linha HTS10.","Duties associated with the month’s entries in Census data (<code>CAL_DUT_MO</code>). They should not be interpreted as the statutory rate of an HTS10 line."],
  ["Sobretarifa potencial efetiva","Effective potential surcharge","Alíquota adicional do Yale por HTS10 vigente no dia 15 da competência. Inícios até o dia 15 entram no próprio mês; depois disso, no mês seguinte.","Yale additional rate by HTS10 in force on day 15 of the month. Starts through day 15 enter in that month; later starts enter in the following month."],
  ["Pauta com sobretarifa potencial","Basket under a potential surcharge","Participação do valor importado associada a uma sobretarifa modelada maior que zero. Não inclui tarifa-base, antidumping ou medidas fora do tracker.","Share of import value associated with a modeled surcharge above zero. It excludes the base tariff, antidumping duties and measures outside the tracker."],
  ["Média auxiliar por dias","Auxiliary day-weighted average","Campo auxiliar da base que pondera a sobretarifa pelos dias de vigência. Não determina as faixas, os KPIs nem a análise principal do painel.","Auxiliary dataset field weighting the surcharge by days in force. It does not determine bands, KPIs or the dashboard’s primary analysis."]
];
const POLICY_EN={
  "2025-03-12":{short:"Steel and aluminum",title:"Section 232: steel, aluminum and derivatives",scope:"Listed metals and derivatives; not equivalent to entire chapters 72, 73 and 76."},
  "2025-04-03":{short:"Automobiles",title:"Section 232: automobiles and light trucks",scope:"Passenger vehicles and light trucks."},
  "2025-05-03":{short:"Auto parts",title:"Section 232: auto parts",scope:"Listed auto parts; some lines have partial applicability."},
  "2025-06-04":{short:"Metals at 50%",title:"Section 232: steel and aluminum increase",scope:"Steel, aluminum and covered derivatives; some derivatives apply only to metal content."},
  "2025-08-01":{short:"Copper",title:"Section 232: copper",scope:"Semi-finished and copper-intensive derivative products."},
  "2025-08-07":{short:"IEEPA Brazil",title:"IEEPA Brazil plus reciprocal tariff",scope:"Broad non-exempt basket; product-specific Section 232 programs prevail where listed."},
  "2025-08-18":{short:"Metal derivatives",title:"Expansion of Section 232 derivatives",scope:"Newly listed metal derivative products."},
  "2025-10-14":{short:"Wood and furniture",title:"Section 232: wood, furniture and cabinets",scope:"Different rates for lumber, upholstered furniture and cabinets."},
  "2025-11-01":{short:"Trucks and buses",title:"Section 232: trucks, parts and buses",scope:"Medium- and heavy-duty vehicles and buses, with distinct scopes and rates."},
  "2025-11-13":{short:"Agricultural exceptions",title:"Expansion of agricultural exceptions",scope:"Includes coffee and several listed agricultural products."},
  "2026-01-01":{short:"Furniture: new step",title:"Upholstered furniture and cabinets: higher rates",scope:"Scheduled step under the wood and furniture proclamation."},
  "2026-01-15":{short:"Semiconductors",title:"Section 232: semiconductors",scope:"Product-specific semiconductor regime."},
  "2026-02-24":{short:"End of IEEPA",title:"End of IEEPA tariffs and Section 122",scope:"IEEPA measures end and Section 122 becomes the general additional tariff."},
  "2026-04-06":{short:"Metal annexes",title:"Restructuring of Section 232 annexes",scope:"Four levels and carve-outs; HTS10-level reading is required."},
  "2026-06-08":{short:"Machinery and metals",title:"Expansion of Section 232 annexes",scope:"Newly listed metal products and machinery."},
  "2026-07-22":{short:"Section 301 Brazil",title:"Section 301 action against Brazil",scope:"Non-excepted products; overlap is limited by specific exclusions."},
  "2026-07-24":{short:"Section 301 forced labor",title:"Section 301: forced labor",scope:"May add to Section 301 Brazil, subject to product- or authority-specific carve-outs."},
  "2026-07-31":{short:"Listed pharmaceuticals",title:"Section 232: listed pharmaceutical products",scope:"Coverage and exceptions depend on the tariff line and use."},
  "2026-08-15":{short:"Quartz",title:"Section 201: quartz surfaces",scope:"TRQ safeguard with different in-quota and out-of-quota rates."},
  "2026-09-03":{short:"Drones",title:"Section 232: drones and components",scope:"The rate varies by type, content and origin."},
  "2026-09-29":{short:"Pharmaceuticals",title:"Section 232: pharmaceutical regime",scope:"Product, patent or generic status and use affect treatment."}
};
const originalText=new WeakMap();
function applyStaticLanguage(){
  document.documentElement.lang=state.lang==="en"?"en":"pt-BR";
  document.title=state.lang==="en"?"U.S. surcharges on Brazilian exports":"Sobretarifas dos EUA na pauta exportadora brasileira";
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const source=originalText.get(node),trim=source.trim();
    if(!trim)continue;
    const replacement=state.lang==="en"?STATIC_EN[trim]:trim;
    if(replacement)node.nodeValue=source.replace(trim,replacement);
  }
  $$(".glossary-grid>div").forEach((item,index)=>{const row=GLOSSARY[index];if(!row)return;item.querySelector("dt").textContent=state.lang==="en"?row[1]:row[0];item.querySelector("dd").innerHTML=state.lang==="en"?row[3]:row[2]});
  $("#langToggle").textContent=state.lang==="en"?"PT":"EN";
}
function setLanguage(lang){
  state.lang=lang;localStorage.setItem("tariffMonitorLang",lang);applyStaticLanguage();
  if(!state.data)return;
  renderSeriesPeriod();renderAuthorities();renderMeasureLegend();renderExposure();renderPolicyRail();renderSelected();
}
function eventText(event,key){return state.lang==="en"?(event[`${key}_en`]||POLICY_EN[event.date]?.[key]||event[key]):event[key]}

async function init(){
  if(pageParams.get("capture")==="chart")document.body.classList.add("capture-chart");
  configureResourceLinks();
  applyStaticLanguage();
  const response=await fetch("data/dashboard.json");
  if(!response.ok)throw new Error(`${tr("loadError")}: ${response.status}`);
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
  $("#kpiMonth").textContent=monthLabel(row.period);$("#kpiCut").textContent=`${tr("seriesSince")} ${monthLabel(first)}`;
  $("#kpiImports").textContent=money(row.imports_usd);$("#kpiMonthlyChange").textContent=`${money(row.change_usd)} · ${pct(row.change_pct)} ${tr("previousMonth")}`;
  $("#kpiDuties").textContent=money(row.duties_usd);$("#kpiObservedRate").textContent=`${pct(row.observed_duty_rate)} ${tr("ofFlow")}`;
  $("#kpiDutiable").textContent=money(row.dutiable_usd);$("#kpiDutiableShare").textContent=`${pct(row.dutiable_share)} ${tr("ofBasket")}`;
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
function bandDefinitions(){return[...(state.data?.tariff_band_definitions||[]),{key:"unmatched",label:tr("unmatched")}]}
function bandValue(row,key,mode){
  if(key==="unmatched")return mode==="share"?Math.max(0,1-row.coverage_pct):Math.max(0,row.total_usd-row.matched_usd);
  const band=row.bands.find(b=>b.key===key);return mode==="share"?(band?.share_total||0):(band?.value_usd||0);
}

function renderExposure(){
  const rows=state.data.tariff_bands||[],unavailable=$("#exposureUnavailable"),content=$("#exposureContent");
  if(!rows.length){
    content.hidden=true;unavailable.hidden=false;
    unavailable.innerHTML=`<strong>${tr("loadingTitle")}</strong><p>${tr("loadingBody")}</p>`;
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
  legend.innerHTML=state.data.milestones.map((event,index)=>`<button type="button" class="measure-chip ${state.visibleMeasures.has(index)?"active":""}" data-measure="${index}" aria-pressed="${state.visibleMeasures.has(index)}"><time>${event.date.slice(0,7)}</time><span>${esc(eventText(event,"short"))}</span><b>${esc(event.rate)}</b></button>`).join("");
  $$(".measure-chip").forEach(button=>button.onclick=()=>{
    const index=+button.dataset.measure;
    state.visibleMeasures.has(index)?state.visibleMeasures.delete(index):state.visibleMeasures.add(index);
    renderMeasureLegend();renderExposureChart();
  });
  $(".measure-controls")?.classList.toggle("is-disabled",!state.showPolicyMarkers);
}

function renderExposureChart(){
  const rows=state.data.tariff_bands||[];if(!rows.length)return;
  const mode=state.exposureMode,capture=document.body.classList.contains("capture-chart"),W=1200,H=470,p={l:74,r:24,t:58,b:52};
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
    svg+=`<path class="exposure-total-line" d="${smoothPath(totalPoints)}"><title>${tr("totalExported")}</title></path>`;
  }
  if(state.showPolicyMarkers){
    const visible=state.data.milestones.map((event,index)=>({event,index})).filter(item=>state.visibleMeasures.has(item.index));
    const perMonth=Object.groupBy?Object.groupBy(visible,item=>item.event.date.slice(0,7)):visible.reduce((acc,item)=>{const period=item.event.date.slice(0,7);(acc[period]??=[]).push(item);return acc},{});
    Object.entries(perMonth).forEach(([period,items])=>{
      const i=rows.findIndex(r=>r.period===period);if(i<0)return;
      items.forEach((item,position)=>{
        const offset=(position-(items.length-1)/2)*8,eventX=x(i)+offset,event=item.event;
        const title=`${dateLabel(event.date)} · ${eventText(event,"short")} · ${event.rate}`;
        svg+=`<g class="exposure-event" data-measure="${item.index}"><title>${esc(title)}</title><line class="exposure-event-line" x1="${eventX}" x2="${eventX}" y1="${p.t}" y2="${H-p.b}"/><circle class="exposure-event-dot" cx="${eventX}" cy="${p.t-8-position%2*5}" r="3"/></g>`;
        if(capture&&event.importance==="primary"){
          const anchor=items.length>1&&position===0?"end":"start",labelX=eventX+(anchor==="end"?-5:5),labelY=p.t+17+position*13;
          svg+=`<text class="capture-event-label" x="${labelX}" y="${labelY}" text-anchor="${anchor}">${esc(eventText(event,"short"))}</text>`;
        }
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
  svg+=`<text class="axis-label chart-unit-label" x="${p.l}" y="35">${mode==="share"?tr("basketShare"):tr("billions")}</text></svg>`;
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
  box.innerHTML=`${monthLabel(row.period)}<strong>${money(row.total_usd)}</strong>${sharePct(row.potentially_surcharged_pct)} ${tr("potentiallySurcharged")}`;
  box.hidden=false;box.style.left=`${Math.min(wrap.width-190,rect.left-wrap.left+12)}px`;box.style.top=`${Math.max(12,rect.top-wrap.top+80)}px`;
}

function renderExposureSelection(){
  const row=exposureRow(state.period);if(!row)return;
  $("#exposureKpis").innerHTML=`<article><span>${tr("potentiallySurcharged")}</span><strong>${sharePct(row.potentially_surcharged_pct)}</strong></article><article><span>${tr("dominantBand")}</span><strong>${esc(row.dominant_surcharge_band||"—")}</strong><small> · ${sharePct(row.dominant_surcharge_share)} ${tr("dominantShare")}</small></article><article><span>${tr("joinCoverage")}</span><strong>${sharePct(row.coverage_pct)}</strong></article>`;
  $("#exposureMonthTitle").textContent=monthLabel(row.period);
  const all=[...row.bands,{key:"unmatched",label:tr("unmatched"),share_total:Math.max(0,1-row.coverage_pct)}].filter(b=>b.share_total>.0001&&state.visibleBands.has(b.key));
  $("#exposureMonthBars").innerHTML=all.map(b=>`<div class="exposure-bar"><span>${esc(b.label)}</span><div class="exposure-bar-track"><div class="exposure-bar-fill" data-chart-mark data-value="${b.share_total}" style="width:${Math.min(100,b.share_total*100)}%;background:${bandColors[b.key]}"></div></div><strong>${sharePct(b.share_total)}</strong></div>`).join("");
  const labels=Object.fromEntries(bandDefinitions().map(d=>[d.key,d.label]));
  const moved=(state.data.tariff_transitions?.[state.period]||[]).filter(f=>f.from!==f.to).slice(0,6),den=row.matched_usd||1;
  $("#tariffMigrations").innerHTML=moved.length?moved.map(f=>`<div class="migration-row"><span>${esc(labels[f.from]||f.from)}</span><span class="arrow">→</span><span>${esc(labels[f.to]||f.to)}</span><strong>${sharePct(f.consumption_value_usd/den)} · ${money(f.consumption_value_usd)}</strong></div>`).join(""):`<p class="migration-stable">${tr("noMigration")}</p>`;
  renderExposureChart();requestAnimationFrame(validateVisualMarks);
}

function renderAuthorities(){
  const auth=["Todos",...new Set(state.data.milestones.map(e=>e.authority))];
  $("#authorityFilter").innerHTML=auth.map(a=>`<button class="${a===state.authority?"active":""}" data-auth="${esc(a)}">${a==="Todos"?tr("all"):esc(a)}</button>`).join("");
  $$("#authorityFilter button").forEach(b=>b.onclick=()=>{state.authority=b.dataset.auth;renderAuthorities();renderPolicyRail()});
}
function renderPolicyRail(){
  const events=state.data.milestones.filter(e=>state.authority==="Todos"||e.authority===state.authority);
  $("#policyRail").innerHTML=events.map(e=>`<button class="policy-card ${e.importance}" data-index="${state.data.milestones.indexOf(e)}"><time>${dateLabel(e.date)}</time><strong>${esc(eventText(e,"short"))}</strong><span>${esc(e.rate)} · ${esc(e.authority)}</span></button>`).join("");
  $$(".policy-card").forEach(b=>b.onclick=()=>showPolicy(+b.dataset.index));if(events.length)showPolicy(state.data.milestones.indexOf(events[0]));
}
function showPolicy(i){
  const e=state.data.milestones[i];$$(".policy-card").forEach(b=>b.classList.toggle("active",+b.dataset.index===i));
  $("#policyDetail").innerHTML=`<div><span class="rate">${esc(e.rate)}</span><p>${esc(e.authority)}</p></div><div><h3>${esc(eventText(e,"title"))}</h3><p>${esc(eventText(e,"scope"))}</p></div><cite>${esc(e.source)}</cite>`;
}

function currentDrivers(){
  const rows=state.data.drivers_by_level?.[state.driverLevel]?.[state.period]||state.data.drivers[state.period]||[];
  return rows.filter(r=>state.direction==="up"?r.change_usd>0:r.change_usd<0).sort((a,b)=>state.direction==="up"?b.change_usd-a.change_usd:a.change_usd-b.change_usd).slice(0,10);
}
function driverLevelLabel(){return Number(state.driverLevel)<=6?`SH${state.driverLevel}`:(state.driverLevel==="10"?"HTSUS10":`HTS${state.driverLevel}`)}
function componentSummary(r){
  if(Number(r.after_usd)===0)return`<span class="measure-none">${tr("noFlow")}</span>`;
  const components=r.tariff_components||[];if(!components.length)return`<span class="measure-none">${tr("noAdditional")}</span>`;
  return components.map(c=>`<span class="measure-line"><b>${esc(state.lang==="en"?(COMPONENT_EN[c.label]||c.label):c.label)}</b>${c.since?`<small>${tr("since")} ${dateLabel(c.since)}</small>`:""}</span>`).join("");
}
function renderDrivers(){
  const rows=currentDrivers(),max=Math.max(1,...rows.map(r=>Math.abs(r.change_usd)));
  $("#driversList").innerHTML=rows.map(r=>{
    const code=r.code||r.hs4;
    const rateNote=`<small>${tr("dominantRate")}</small>`;
    const product=state.lang==="en"?(r.description_en||r.product_pt):(r.product_pt||r.description_en);
    return`<div class="driver-row ${state.direction==="down"?"down":""} ${state.driver===code?"active":""}" data-code="${esc(code)}" tabindex="0"><div class="driver-product"><span class="driver-code">${esc(code)}</span><span class="driver-name">${esc(product||tr("product"))}</span></div><div class="driver-change"><strong class="driver-value">${money(r.change_usd)}</strong><span class="bar-track"><i class="bar-fill" data-chart-mark data-value="${Math.abs(r.change_usd)}" style="width:${Math.max(1.5,Math.abs(r.change_usd)/max*100)}%"></i></span></div><div class="driver-tariff"><strong>${ratePct(r.tariff_rate)}</strong>${rateNote}</div><div class="driver-measure">${componentSummary(r)}</div></div>`;
  }).join("")||`<p>${tr("noComparison")}</p>`;
  $$(".driver-row").forEach(el=>{el.onclick=()=>showDriver(el.dataset.code);el.onkeydown=e=>{if(e.key==="Enter")showDriver(el.dataset.code)}});if(!state.driver&&rows[0])showDriver(rows[0].code||rows[0].hs4);
  requestAnimationFrame(validateVisualMarks);
}
function showDriver(code){
  state.driver=code;const r=currentDrivers().find(x=>(x.code||x.hs4)===code);if(!r)return;
  $$(".driver-row").forEach(el=>el.classList.toggle("active",el.dataset.code===code));
  const range=r.tariff_rate_min!=null&&r.tariff_rate_max!=null&&Math.abs(r.tariff_rate_max-r.tariff_rate_min)>.0005?`${ratePct(r.tariff_rate_min)} a ${ratePct(r.tariff_rate_max)}`:ratePct(r.tariff_rate);
  const product=state.lang==="en"?(r.description_en||r.product_pt):(r.product_pt||r.description_en);
  $("#driverDetail").innerHTML=`<p class="section-index">${driverLevelLabel()} ${esc(code)}</p><h3>${esc(product||tr("product"))}</h3><span class="tariff-flag">${tr("effectiveBand")} ${ratePct(r.tariff_rate)}</span><div class="driver-component-list">${componentSummary(r)}</div><p>${esc(state.lang==="en"?tr("descriptive"):(r.editorial_reading||tr("descriptive")))}</p><dl><div><dt>${tr("monthlyChange")}</dt><dd>${money(r.change_usd)} · ${pct(r.change_pct)}</dd></div><div><dt>${tr("beforeAfter")}</dt><dd>${money(r.before_usd)} → ${money(r.after_usd)}</dd></div><div><dt>${tr("effectiveBand")}</dt><dd>${range}</dd></div><div><dt>${tr("exposedValue")}</dt><dd>${r.tariff_exposure!=null?ratePct(r.tariff_exposure):tr("toVerify")}</dd></div><div><dt>${tr("leadingHts")}</dt><dd>${esc(r.leader_hts10||"—")}</dd></div>${Number(state.driverLevel)>6&&r.description_en?`<div><dt>${tr("officialDetail")}</dt><dd lang="en">${esc(r.description_en)}</dd></div>`:""}</dl>`;
}

function downloadCsv(){
  const rows=currentDrivers(),cols=["period","direction","level","code","product_pt","before_usd","after_usd","change_usd","change_pct","dominant_effective_surcharge","trade_weighted_effective_surcharge","auxiliary_day_weighted_surcharge","tariff_measure","tariff_since","leader_hts10","description_en"];
  const lines=[cols.join(","),...rows.map(r=>[state.period,state.direction,state.driverLevel,r.code||r.hs4,r.product_pt||"",r.before_usd,r.after_usd,r.change_usd,r.change_pct,r.tariff_rate??"",r.tariff_rate_trade_weighted??"",r.tariff_rate_day_weighted??"",r.tariff_measure||"",r.tariff_since||"",r.leader_hts10||"",r.description_en||""].map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))];
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`drivers_${state.period}_${state.driverLevel}_${state.direction}.csv`;a.click();URL.revokeObjectURL(a.href);
}

function validateVisualMarks(){
  const failures=[];
  $$('[data-chart-mark]').forEach(el=>{
    if(!el.getClientRects().length)return;
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
  $("#langToggle").onclick=()=>setLanguage(state.lang==="pt"?"en":"pt");
  window.addEventListener("resize",renderExposureChart);
}

init().catch(err=>{console.error(err);document.body.insertAdjacentHTML("afterbegin",`<div style="padding:16px;background:#7b2f19;color:white">${tr("loadError")}: ${esc(err.message)}. ${tr("serverHint")}</div>`)});
