# Dataset da release

Arquivo estável: `us-brazil-tariff-exposure.csv.gz`  
Granularidade: `mês × país × HTSUS10`

## Identificação e comércio

| Campo | Definição |
|---|---|
| `period` | Competência mensal no formato `AAAA-MM` |
| `country_code`, `country_name` | Parceiro de origem segundo o U.S. Census |
| `hts10`, `description_en` | Código HTSUS10 e descrição oficial americana |
| `general_value_usd` | Importações gerais (`GEN_VAL_MO`) |
| `consumption_value_usd` | Importações para consumo (`CON_VAL_MO`) |
| `dutiable_value_usd` | Parcela classificada como dutiable pelo Census (`DUT_VAL_MO`) |
| `calculated_duties_usd` | Direitos calculados reportados pelo Census (`CAL_DUT_MO`) |
| `general_qty1/2`, `consumption_qty1/2`, `unit_qty1/2` | Quantidades e unidades estatísticas quando publicadas |

## Classificação de sobretarifas

| Campo | Definição |
|---|---|
| `additional_rate_effective` | Alíquota discreta de referência; em medidas dependentes de conteúdo, contém a maior alíquota estatutária potencial |
| `tariff_band` | Faixa usada no dashboard |
| `tariff_treatment_status` | `classified`, `conditional_exemption`, `conditional_default_full` ou `conditional_scope` |
| `tariff_treatment_note` | Ressalva aplicável à classificação da linha |
| `tariff_rate_qualifier` | `exact` para alíquota direta, `up_to` para alíquota potencial máxima ou `unmatched` |
| `yale_modeled_rate_reference` | Taxa original do Yale na data de referência; campo auxiliar de auditoria |
| `yale_modeled_rate_day_weighted` | Média original do Yale ponderada pelos dias; campo auxiliar de auditoria |
| `yale_modeled_rate_eom` | Taxa original do Yale no último dia do mês; campo auxiliar de auditoria |
| `yale_reference_date` | Data de referência mensal, fixada no dia 15 |
| `yale_valid_from` | Início do intervalo vigente na data de referência |
| `rate_*` | Componentes da sobretarifa por autoridade na data de referência |
| `rate_*_since` | Data desde a qual o componente vigente permanece no nível informado |

Taxas são frações decimais: `0.25` corresponde a 25%. O campo principal não usa probabilidades de utilização. Aeronaves civis diretamente identificáveis são classificadas em 0%, condicionadas à General Note 6; outros bens com exceção por uso recebem a alíquota cheia por padrão. Incidências dependentes de conteúdo usam a maior alíquota potencial para a faixa — `0.50`, por exemplo, entra em `>40%` — e recebem `tariff_rate_qualifier=up_to`. A sobretarifa não inclui tarifa-base, antidumping, compensatórias ou medidas fora do tracker.

Cada release inclui também `dataset-manifest.json`, com data de corte, contagem de linhas, hash do insumo Census, release Yale e método de alinhamento temporal.
