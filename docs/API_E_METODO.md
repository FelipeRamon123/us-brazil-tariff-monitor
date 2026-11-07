# API e método de cruzamento

## 1. Consulta mensal ao Census

O script [`scripts/fetch_census.py`](../scripts/fetch_census.py) usa:

```python
params = {
    "get": "I_COMMODITY,I_COMMODITY_LDESC,CTY_NAME,GEN_VAL_MO,CON_VAL_MO,DUT_VAL_MO,CAL_DUT_MO,GEN_QY1_MO,GEN_QY2_MO,CON_QY1_MO,CON_QY2_MO,UNIT_QY1,UNIT_QY2",
    "YEAR": "2026",
    "MONTH": "09",
    "CTY_CODE": "3510",
    "COMM_LVL": "HS10",
    "SUMMARY_LVL": "DET",
    "SUMMARY_LVL2": "HSCY",
    "key": os.environ["CENSUS_API_KEY"],
}
requests.get("https://api.census.gov/data/timeseries/intltrade/imports/hs", params=params)
```

`CON_VAL_MO` é a medida principal porque se aproxima do momento de entrada para consumo e da incidência aduaneira. `CAL_DUT_MO / CON_VAL_MO` é uma taxa observada agregada, não a tarifa legal do produto.

## 2. Painel do Yale

O workflow consulta a API de releases do GitHub, baixa o ZIP mais recente e filtra apenas `country=3510`. O extrator prefere `snapshot_*.rds`, pois permite processar uma revisão por vez e reduzir memória. Se a release contiver somente `rate_timeseries.rds`, usa o painel intervalar completo.

Campos esperados:

- `hts10`, `country`;
- `valid_from`, `valid_until`;
- `total_additional`, `total_rate`, `base_rate`;
- colunas por autoridade, quando presentes.

## 3. Regra temporal correta

O Census é mensal e o Yale é diário/intervalar. Para cada `mês × HTS10`:

1. selecionam-se os intervalos do Yale que intersectam o mês;
2. calcula-se o número de dias de interseção;
3. `total_additional` é ponderada pelos dias de vigência;
4. a taxa do último dia do mês é preservada em `yale_rate_eom`;
5. a média do grupo HTS4 é ponderada pelo valor importado daquele mês.

Assim, uma medida vigente desde 18 de agosto não é aplicada retroativamente aos primeiros 17 dias. Como a base mensal não informa o dia de desembaraço de cada entrada, a média por dias é uma medida de **exposição estatutária mensal**, não uma estimativa dos direitos efetivamente pagos.

## 4. Decomposição do movimento

Para o produto `p` e mês `t`:

```text
delta[p,t] = imports[p,t] - imports[p,t-1]
gross_contribution[p,t] = abs(delta[p,t]) / sum_p(abs(delta[p,t]))
```

Altas e quedas são ranqueadas separadamente. Isso evita que um grande crescimento esconda os produtos que caíram no mesmo mês.

## 5. Auditoria e falhas explícitas

O build falha se:

- faltarem colunas essenciais do Census;
- houver duplicidade em `mês × HTS10`;
- o extrato do Yale não contiver `hts10` e `total_additional`;
- a cronologia tiver menos marcos que o mínimo validado.

O arquivo `data/dashboard.json` inclui hash SHA-256 da extração Census, data de geração, último mês e metadados da release Yale.

