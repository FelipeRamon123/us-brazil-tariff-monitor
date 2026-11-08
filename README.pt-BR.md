# Sobretarifas dos EUA na pauta exportadora brasileira

[English](README.md) · Dashboard publicado no GitHub Pages

Monitor mensal das importações dos Estados Unidos provenientes do Brasil, com decomposição dos produtos que explicam cada alta ou queda e uma faixa cronológica das medidas tarifárias modeladas pelo **Tariff Rate Tracker**, do The Budget Lab at Yale.

Este repositório é uma **showcase**: a aplicação e os dados processados ficam aqui, enquanto os conectores reutilizáveis e exemplos de acesso às fontes pertencem ao [Official Data API Toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit).

**[Abrir o dashboard →](https://feliperamon123.github.io/us-brazil-tariff-monitor/)**

## Código e dados reutilizáveis

O dashboard segue o mesmo padrão de acesso do showcase Census: a interface aponta diretamente para o toolkit, para os exemplos executáveis e para a base processada da release mais recente.

- [consulta mensal ao U.S. Census em Power Query M](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/us-census/power-query/07_monthly_imports_by_country_htsus10.m);
- [consulta mensal ao U.S. Census em Python](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/us-census/python/07_monthly_imports_by_country_htsus10.py);
- [cruzamento mensal Census + Yale em Python](https://github.com/FelipeRamon123/official-data-api-toolkit/blob/main/sources/yale-tariff-rate-tracker/python/03_build_monthly_tariff_exposure.py);
- [nomenclatura oficial em português](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/receita-ncm);
- [base analítica da release mais recente](https://github.com/FelipeRamon123/us-brazil-tariff-monitor/releases/latest/download/us-brazil-tariff-exposure.csv.gz) e [manifesto técnico](https://github.com/FelipeRamon123/us-brazil-tariff-monitor/releases/latest/download/dataset-manifest.json).

O dicionário de campos está em [docs/DATASET.md](docs/DATASET.md).

A base publicada tem granularidade `mês × país × HTSUS10` e mantém valor de importação para consumo, valor geral, valor dutiável, direitos calculados, quantidades, sobretarifa potencial efetiva, média auxiliar por dias, taxa no fim do mês e componentes por autoridade.

## O que o projeto entrega

- série mensal de importações para consumo no nível HTS10, a partir de janeiro de 2025;
- interface integralmente bilíngue em português e inglês, incluindo gráficos, controles, marcos tarifários, análise de produtos, datas e valores;
- gráfico interativo principal com modos de composição relativa e valor absoluto, seleção de faixas e exibição opcional dos marcos tarifários e valores mensais;
- clique no mês para ver as maiores altas e quedas por SH2, SH4, SH6, HTS8 ou HTSUS10;
- nomes oficiais em português para SH2/SH4/SH6 e contexto SH6 em português para os desdobramentos americanos HTS8/HTSUS10;
- faixa de sobretarifa potencial predominante, medida aplicável e início de vigência diretamente na tabela de produtos;
- área empilhada em 100% da pauta por seis faixas de sobretarifa potencial, com cobertura do cruzamento e migração mensal entre faixas;
- valor antes/depois, variação absoluta, percentual e contribuição para o movimento do mês;
- sobretarifa estatutária de referência e parcela exposta quando o painel HTS10 do Yale está disponível;
- controles internos de qualidade, hashes e versões das fontes preservados nos arquivos de dados e nos testes, sem exposição na interface de portfólio;
- atualização automática, release mensal de dados e publicação no GitHub Pages.

## Fontes

1. **U.S. Census Bureau — International Trade API**  
   Endpoint: `https://api.census.gov/data/timeseries/intltrade/imports/hs`  
   Filtros: `CTY_CODE=3510`, `COMM_LVL=HS10`, `SUMMARY_LVL=DET`, `SUMMARY_LVL2=HSCY`.  
   Medidas mensais: `CON_VAL_MO`, `GEN_VAL_MO`, `DUT_VAL_MO`, `CAL_DUT_MO` e quantidades.
   Código reutilizável: [módulo U.S. Census do toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/us-census).

2. **The Budget Lab at Yale — Tariff Rate Tracker**  
   Repositório: <https://github.com/Budget-Lab-Yale/tariff-rate-tracker>  
   O workflow registra tag, data e URL exatas da release. Taxas são estatutárias modeladas, não direitos efetivamente recolhidos.
   Código reutilizável: [módulo Yale do toolkit](https://github.com/FelipeRamon123/official-data-api-toolkit/tree/main/sources/yale-tariff-rate-tracker).

3. **Receita Federal — Sistema Classif / NCM**
   JSON oficial: `https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json`
   O workflow atualiza as descrições em português de SH2, SH4 e SH6. HTS8 e HTSUS10 são desdobramentos próprios dos EUA: nesses níveis, o painel mostra o contexto oficial SH6 em português e conserva o detalhe HTSUS americano como referência.

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

### Regra mensal da sobretarifa

A classificação principal usa a taxa adicional estatutária vigente no dia 15 de cada competência. Medidas iniciadas até o dia 15 entram no próprio mês; medidas posteriores entram no mês seguinte. A média ponderada pelos dias de vigência é mantida somente como coluna auxiliar e não determina as faixas, os KPIs ou a tabela de produtos.

“Sobretarifa potencial” não inclui a tarifa-base normal, antidumping, medidas compensatórias ou incidências fora do escopo modelado pelo tracker.

## Limite interpretativo

Uma alta antes de uma tarifa ou uma queda posterior é evidência descritiva compatível com antecipação ou impacto, mas não demonstra causalidade sozinha. A composição mensal pode ser dominada por petróleo, aeronaves ou operações extraordinárias. O dashboard mantém esse cuidado no texto de cada produto.

## Licença e condições de uso

O código-fonte e a documentação produzidos neste repositório são disponibilizados sob a [licença MIT](LICENSE). Dados e classificações de terceiros permanecem sujeitos aos termos, revisões e condições das respectivas fontes; a licença do repositório não os relicencia.

A proveniência técnica de cada atualização - competência do Census, release do Yale, cobertura do cruzamento e verificações de integridade - é registrada em `data/audit.json`. Mudanças metodológicas seguem o fluxo documentado de revisão, release e rollback.

