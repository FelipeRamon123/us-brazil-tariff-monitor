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

O workflow consulta a API de releases do GitHub, baixa o ZIP mais recente e lê somente os arquivos `actual/snapshots/valid_from=*/rates.parquet`. O filtro `country=3510` é aplicado pelo mecanismo Parquet antes da conversão para pandas, reduzindo memória e descartando os cenários contrafactuais incluídos no mesmo pacote.

Campos esperados:

- `hts10`, `country`;
- `valid_from`, `valid_until`;
- `total_additional`, `total_rate`, `base_rate`;
- colunas por autoridade, quando presentes.

## 3. Regra temporal principal

O Census é mensal e o Yale é diário/intervalar. Para cada `mês × HTS10`, a classificação principal adota uma data de referência fixa:

1. define-se o dia 15 como referência mensal;
2. seleciona-se o intervalo Yale vigente nessa data para cada HTS10;
3. `total_additional` desse intervalo vira `additional_rate_effective` e determina a faixa do dashboard;
4. uma medida iniciada até o dia 15 entra no próprio mês; depois do dia 15, entra no mês seguinte;
5. `additional_rate_day_weighted` preserva, apenas como auxiliar, a média ponderada pelos dias de vigência;
6. `additional_rate_eom` preserva a taxa do último dia do mês para conferência.

Nos níveis agregados SH2/SH4/SH6/HTS8, a tabela mostra como principal a faixa discreta com maior valor importado entre os HTSUS10 do código. Médias pela composição permanecem auxiliares no CSV exportado.

O termo **sobretarifa potencial** designa somente as taxas adicionais modeladas pelo Yale. Não abrange a tarifa-base normal, antidumping, direitos compensatórios ou outras incidências fora do tracker.

Assim, uma medida iniciada em 18 de agosto entra na classificação principal de setembro. A coluna auxiliar por dias permite análises alternativas, mas não representa os direitos efetivamente pagos nem participa da visualização principal.

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

