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

## Exposição tarifária modelada

| Campo | Definição |
|---|---|
| `additional_rate_month` | `total_additional` do Yale ponderada pelos dias de vigência dentro do mês |
| `additional_rate_eom` | Taxa adicional vigente no último dia do mês |
| `tariff_band` | Faixa usada no dashboard |
| `yale_valid_from` | Início do intervalo vigente no fim do mês |
| `rate_*` | Componentes da taxa adicional por autoridade, no fim do mês |
| `rate_*_since` | Data desde a qual o componente vigente permanece no nível informado |

Taxas são frações decimais: `0.25` corresponde a 25%. A taxa estatutária modelada e os direitos calculados observados são medidas distintas.

Cada release inclui também `dataset-manifest.json`, com data de corte, contagem de linhas, hash do insumo Census, release Yale e método de alinhamento temporal.
