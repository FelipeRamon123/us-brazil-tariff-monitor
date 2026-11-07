# Tarifas dos EUA na pauta exportadora brasileira

[English](README.md) · Dashboard GitHub Pages pronto para publicação

Monitor mensal das importações dos Estados Unidos provenientes do Brasil, com decomposição dos produtos que explicam cada alta ou queda e uma faixa cronológica das medidas tarifárias modeladas pelo **Tariff Rate Tracker**, do The Budget Lab at Yale.

Este repositório é uma **showcase**: a aplicação e os dados processados ficam aqui, enquanto os conectores reutilizáveis e exemplos de acesso às fontes pertencem ao [Official Data API Toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit).

**[Abrir o preview público do dashboard →](https://us-brazil-tariff-monitor.feliperamondbr.chatgpt.site)**

## O que o projeto entrega

- série mensal de importações para consumo no nível HTS10, a partir de janeiro de 2025;
- gráfico interativo principal com modos de composição relativa e valor absoluto, seleção de faixas e exibição opcional dos marcos tarifários e valores mensais;
- clique no mês para ver as maiores altas e quedas por HTS4;
- área empilhada em 100% da pauta por sete faixas de tarifa adicional, com média ponderada, cobertura do cruzamento e migração mensal entre faixas;
- valor antes/depois, variação absoluta, percentual e contribuição para o movimento do mês;
- taxa estatutária adicional média e parcela exposta quando o painel HTS10 do Yale está disponível;
- controles internos de qualidade, hashes e versões das fontes preservados nos arquivos de dados e nos testes, sem exposição na interface de portfólio;
- atualização automática e publicação no GitHub Pages.

## Fontes

1. **U.S. Census Bureau — International Trade API**  
   Endpoint: `https://api.census.gov/data/timeseries/intltrade/imports/hs`  
   Filtros: `CTY_CODE=3510`, `COMM_LVL=HS10`, `SUMMARY_LVL=DET`, `SUMMARY_LVL2=HSCY`.  
   Medidas mensais: `CON_VAL_MO`, `GEN_VAL_MO`, `DUT_VAL_MO`, `CAL_DUT_MO` e quantidades.
   Código reutilizável: [módulo U.S. Census do toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/us-census).

2. **The Budget Lab at Yale — Tariff Rate Tracker**  
   Repositório: <https://github.com/Budget-Lab-Yale/tariff-rate-tracker>  
   O workflow registra tag, data e URL exatas da release. Taxas são estatutárias modeladas, não direitos efetivamente recolhidos.
   Código reutilizável proposto: [módulo Yale do toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/review/yale-tariff-tracker-module/sources/yale-tariff-rate-tracker).

## Revisão antes da publicação

Mudanças de código e metodologia são preparadas em branches `review/*` e apresentadas em Pull Request. A branch `main` permanece como versão aprovada. O preview público pode ser atualizado com a branch de revisão sem tornar o repositório público nem fazer merge.

O procedimento completo de aprovação, publicação e rollback está em [docs/REVIEW_AND_RELEASE.md](docs/REVIEW_AND_RELEASE.md).

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

