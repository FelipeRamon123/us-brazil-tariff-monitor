# Brasil × tarifas dos EUA

[English](README.md) · Dashboard GitHub Pages pronto para publicação

Monitor mensal das importações dos Estados Unidos provenientes do Brasil, com decomposição dos produtos que explicam cada alta ou queda e uma faixa cronológica das medidas tarifárias modeladas pelo **Tariff Rate Tracker**, do The Budget Lab at Yale.

## O que o projeto entrega

- série mensal de importações para consumo no nível HTS10, a partir de janeiro de 2025;
- gráfico interativo com todos os marcos relevantes das Seções 232, 301, 201 e 122 e da IEEPA;
- clique no mês para ver as maiores altas e quedas por HTS4;
- área empilhada em 100% da pauta por sete faixas de tarifa adicional, com média ponderada, cobertura do cruzamento e migração mensal entre faixas;
- valor antes/depois, variação absoluta, percentual e contribuição para o movimento do mês;
- taxa estatutária adicional média e parcela exposta quando o painel HTS10 do Yale está disponível;
- visão explícita de auditoria: competência, linhas, duplicidades, hash e versão das fontes;
- atualização automática e publicação no GitHub Pages.

## Fontes

1. **U.S. Census Bureau — International Trade API**  
   Endpoint: `https://api.census.gov/data/timeseries/intltrade/imports/hs`  
   Filtros: `CTY_CODE=3510`, `COMM_LVL=HS10`, `SUMMARY_LVL=DET`, `SUMMARY_LVL2=HSCY`.  
   Medidas mensais: `CON_VAL_MO`, `GEN_VAL_MO`, `DUT_VAL_MO`, `CAL_DUT_MO` e quantidades.

2. **The Budget Lab at Yale — Tariff Rate Tracker**  
   Repositório: <https://github.com/Budget-Lab-Yale/tariff-rate-tracker>  
   O workflow registra tag, data e URL exatas da release. Taxas são estatutárias modeladas, não direitos efetivamente recolhidos.

## Publicar no seu GitHub

1. Crie um repositório vazio, por exemplo `us-brazil-tariff-monitor`.
2. Copie esta pasta para o repositório e faça o primeiro push na branch `main`.
3. Solicite uma chave gratuita da Census API e salve-a em **Settings → Secrets and variables → Actions → New repository secret** como `CENSUS_API_KEY`.
4. Em **Settings → Pages**, escolha **GitHub Actions** como fonte.
5. Abra **Actions → Update data and deploy Pages → Run workflow**.

O cron semanal procura uma nova competência do Census. No dia 15 de cada mês, o workflow também verifica e extrai a release mais recente do Yale. Se a competência mais nova ainda não estiver publicada, a tentativa é registrada e o último mês válido permanece no dashboard.

## Rodar localmente

```bash
python -m pip install -r requirements.txt
python serve.py
```

Abra `http://127.0.0.1:8000`. No Windows, também é possível usar `START_DASHBOARD.bat`.

Para atualizar os dados localmente:

```bash
set CENSUS_API_KEY=sua_chave
python scripts/fetch_census.py
python scripts/build_dashboard.py
python scripts/validate_data.py
```

Veja [docs/API_E_METODO.md](docs/API_E_METODO.md) para os trechos reutilizáveis e a definição exata do cruzamento temporal.

## Limite interpretativo

Uma alta antes de uma tarifa ou uma queda posterior é evidência descritiva compatível com antecipação ou impacto, mas não demonstra causalidade sozinha. A composição mensal pode ser dominada por petróleo, aeronaves ou operações extraordinárias. O dashboard mantém esse cuidado no texto de cada produto.

