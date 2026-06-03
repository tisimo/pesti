# Plano de Revisao do Relatorio

Documento de trabalho para retomar a revisao do relatorio de estagio. O objetivo e orientar a proxima fase de escrita para que o relatorio seja claro para um leitor externo, evidencie o trabalho realizado e alinhe melhor os capitulos 2, 3, 4 e 5.

## Objetivo Geral

O relatorio deve deixar claro que o trabalho nao foi apenas a implementacao de paginas da JustCauses. A narrativa principal deve ser:

> Foi desenhada e implementada uma base segura e escalavel de backoffice multiaplicacao, validada inicialmente com a JustCauses.

O leitor deve conseguir perceber, sem conhecer previamente a aplicacao:

- o que e o backoffice;
- que problema resolve;
- que conceitos especificos existem no dominio;
- como a autenticacao, autorizacao, permissoes e auditoria funcionam;
- como a solucao permite integrar futuras aplicacoes;
- que evidencias mostram que o desenho foi implementado.

## Problemas Gerais a Corrigir

- Clarificar termos antes de os usar.
- Evitar assumir que o leitor conhece a aplicacao, a empresa ou o dominio.
- Reforcar a diferenca entre:
  - autenticacao;
  - autorizacao;
  - operador;
  - perfil/role;
  - permissao;
  - aplicacao;
  - modulo transversal;
  - modulo especifico da aplicacao;
  - page gate;
  - auditoria/audit trail.
- Orientar melhor o texto para seguranca do backoffice geral.
- Evidenciar a escalabilidade do codigo para futuras aplicacoes.
- Usar prints, diagramas, tabelas e explicacoes para provar o que foi feito.

## Capitulo 2 - Estado da Arte

- Atualizar a seccao 2.3.1 para falar de autenticacao e autorizacao.
- Explicar a sequencia:
  - Cognito autentica o operador;
  - o backoffice resolve o contexto interno do operador;
  - as permissoes decidem acesso a aplicacao, pagina e acao;
  - o servidor volta a validar permissoes nos endpoints sensiveis.
- Manter o foco em backoffices, seguranca, auditoria e escalabilidade multiaplicacao.

## Capitulo 3 - Analise e Desenho da Solucao

### Reorganizacao da Arquitetura

- Atualizar a documentacao dos niveis C4.
- Nao deixar os diagramas so "colados" no texto: antes de cada figura, explicar o que o leitor deve retirar dela.
- Reorganizar a seccao de arquitetura:
  - Nivel 1: contexto do sistema no ecossistema OnlyHighIQ.
  - Nivel 2: contentores, comunicacao entre front-end e API, persistencia e servicos externos.
  - Vista fisica/deployment deve ficar associada ao Nivel 2.
  - Nivel 3 dividido em duas subseccoes:
    - 3.4.3.1 Componentes do front-end.
    - 3.4.3.2 Componentes do back-end.

### Ajustes aos Diagramas C4

- No Nivel 2, deixar claro que:
  - o front-end consome a API;
  - a API valida autenticacao/autorizacao;
  - AWS nao deve aparecer como bloco generico;
  - os servicos AWS devem aparecer como componentes concretos, por exemplo Cognito, DynamoDB, S3, RDS/PostgreSQL, SES.
- A vista fisica deve explicar o deployment:
  - front-end estatico;
  - distribuicao via CloudFront/S3;
  - back-end;
  - bases de dados;
  - servicos AWS usados;
  - fluxo principal de um pedido.

### Modelos

- Mover o modelo de aplicacao para a arquitetura, porque explica o dominio multiaplicacao.
- O modelo de aplicacao deve mostrar:
  - backoffice como nucleo transversal;
  - aplicacao JustCauses como primeira aplicacao integrada;
  - possibilidade de futuras aplicacoes;
  - relacao entre operador, aplicacao, perfil, permissoes e page gates.
- Mover o modelo de dados para a arquitetura/Nivel 3.
- O modelo de dados deve ser conceptual e nao ficar preso a PostgreSQL.
- Explicar a separacao entre:
  - dados transacionais da aplicacao;
  - configuracao do backoffice;
  - permissoes;
  - auditoria.

### Diagramas de Sequencia

- Integrar os diagramas de sequencia na zona da arquitetura, em vez de ficarem como uma seccao solta no fim.
- Usar os diagramas para provar fluxos importantes:
  - autenticacao;
  - resolucao de contexto/permissoes;
  - acesso a paginas;
  - revisao de campanhas;
  - gestao de categorias;
  - aprovacao de levantamentos.
- Antes de cada diagrama, explicar o objetivo da figura.

### Alternativas de Design

- Remover a seccao isolada "3.8 Alternativas ao design".
- Distribuir alternativas ao longo das seccoes onde fazem sentido.
- A alternativa dos micro-frontends deve aparecer na conclusao do capitulo:
  - cada aplicacao poderia ter o seu proprio micro-frontend;
  - isso aumentaria isolamento e independencia;
  - mas tambem aumentaria complexidade, deployment, manutencao e custos;
  - a empresa nao considerou vantajoso pagar mais por cada microservico/modulo nesta fase;
  - por isso foi preferida uma arquitetura multiaplicacao dentro de um unico backoffice.

## Capitulo 4 - Implementacao da Solucao

O Capitulo 4 deve provar que o desenho do Capitulo 3 foi cumprido.

### Perspetivas a Mostrar

- Perspetiva do operador:
  - login;
  - seletor de aplicacoes;
  - acesso negado;
  - navegacao por aplicacao.
- Perspetiva administrativa:
  - gestao de utilizadores internos;
  - perfis e permissoes;
  - page gates;
  - logs/auditoria.
- Perspetiva JustCauses:
  - overview/dashboard;
  - campanhas;
  - categorias;
  - analytics;
  - levantamentos;
  - transacoes.
- Perspetiva tecnica:
  - validacao no servidor;
  - middleware de permissoes;
  - auditoria de acessos negados;
  - separacao entre modulos transversais e modulos especificos.

### Prints a Tirar

Guardar os prints em:

```text
docs/PESTI-Mine/PESTI-Template/frontmatter/assets/backoffice/ch4/
```

Usar dados ficticios ou sanitizados. Nao expor emails reais, nomes reais, IDs sensiveis, valores financeiros reais, documentos, carteiras ou tokens.

| Ficheiro | Ecra | Objetivo |
|---|---|---|
| `ch4_login.png` | `/login` | Evidenciar autenticacao de operadores |
| `ch4_app_selector.png` | `/dashboard` | Mostrar seletor multiaplicacao |
| `ch4_access_denied.png` | ecra de acesso negado | Provar controlo de acesso |
| `ch4_admin_users.png` | `/admin/users` | Gestao dos utilizadores do backoffice |
| `ch4_roles_permissions.png` | `/admin/roles` | Perfis e permissoes |
| `ch4_page_gates.png` | `/admin/page-gates` | Configuracao dinamica de acesso a paginas |
| `ch4_admin_logs.png` | `/admin/logs` | Auditoria administrativa |
| `ch4_audit_trail.png` | `/admin/audit-trail` | Eventos de acesso/login/aplicacoes |
| `ch4_ojc_overview.png` | `/ojc/overview` | JustCauses como aplicacao integrada |
| `ch4_campaigns_queue.png` | `/ojc/campaigns` | Fila/listagem de campanhas |
| `ch4_campaign_review_modal.png` | modal de revisao | Evidenciar fluxo de decisao do operador |
| `ch4_categories.png` | `/ojc/categories` | Exemplo de modulo operacional |
| `ch4_analytics.png` | `/ojc/analytics` | Metricas e consulta operacional |
| `ch4_withdrawals.png` | `/ojc/withdrawals` | Operacoes financeiras |
| `ch4_transactions.png` | `/ojc/transactions` | Historico financeiro |

Prints essenciais se for necessario reduzir:

- `ch4_login.png`
- `ch4_app_selector.png`
- `ch4_access_denied.png`
- `ch4_roles_permissions.png`
- `ch4_page_gates.png`
- `ch4_admin_logs.png`
- `ch4_ojc_overview.png`
- `ch4_campaigns_queue.png`

### Diagramas a Atualizar/Criar

Guardar em:

```text
docs/PESTI-Mine/PESTI-Template/frontmatter/assets/backoffice/docs/
```

| Ficheiro | Objetivo |
|---|---|
| `C4-Level1.png` | Contexto do backoffice no ecossistema |
| `C4-Level2.png` | Front-end consome API; servicos externos e bases de dados separados |
| `C4-Level3Fe.png` | Componentes do front-end |
| `C4-Level3BE.png` | Componentes do back-end |
| `C4-PhysicalView.png` | Vista fisica/deployment |
| `ApplicationModel.png` | Modelo multiaplicacao do backoffice |
| `DataModel.png` | Modelo conceptual de dados |

## Testes / Validacao

O capitulo de testes deve ser reformulado como validacao manual da solucao.

Decisao tomada:

- Nao apresentar testes automatizados como contributo proprio.
- Explicar que a responsabilidade pelos testes de codigo pertencia a outro colega/equipa da empresa.
- Focar a tua contribuicao em validacao manual sistematica.

### Nova Orientacao

- Renomear a seccao para algo como "Validacao da Solucao".
- Explicar que, durante o estagio, a validacao incidiu sobre:
  - cenarios de sucesso;
  - cenarios de erro;
  - ausencia de permissoes;
  - acessos negados;
  - persistencia de dados;
  - registos de auditoria;
  - navegacao entre aplicacoes;
  - comportamento dos page gates.
- Criar uma tabela de validacao manual por modulo.

### Estrutura Sugerida da Tabela

| Modulo | Cenario validado | Resultado esperado | Evidencia observada |
|---|---|---|---|
| Autenticacao | Operador inicia sessao | Sessao criada e contexto carregado | Redirecionamento para seletor |
| Seletor de aplicacoes | Operador escolhe JustCauses | Entra no painel correto | Navegacao para `/ojc/overview` |
| Page gates | Operador sem permissao tenta aceder | Acesso recusado | Ecra de acesso negado e log |
| Campanhas | Aprovar/rejeitar campanha | Estado alterado e auditoria criada | Listagem atualizada e log |
| Categorias | Criar/editar categoria | Categoria persistida | Tabela atualizada |
| Logs | Filtrar auditoria | Resultados filtrados | Historico consultavel |

## Capitulo 5 - Conclusoes

- Reforcar que o resultado principal foi uma base segura e extensivel de backoffice, nao apenas paginas especificas.
- Distinguir claramente:
  - objetivos concluidos;
  - funcionalidades parciais;
  - validacao manual;
  - trabalho futuro de testes automatizados.
- Mencionar micro-frontends como alternativa futura/considerada, mas nao adotada por custo e complexidade.
- Manter tom academico, mas honesto quanto ao que foi entregue e ao que ficou por fazer.

## Checklist de Qualidade

- Cada termo tecnico importante e explicado antes de ser usado.
- Cada figura/tabela e introduzida no texto antes de aparecer.
- Nao usar "figura acima" ou "figura abaixo"; usar referencias cruzadas.
- Nao deixar TODOs no relatorio.
- Evitar texto de enchimento.
- Evitar comparacoes tecnologicas irrelevantes para decisoes que ja vinham da empresa.
- Garantir consistencia terminologica:
  - backoffice;
  - operador;
  - perfil;
  - permissao;
  - aplicacao;
  - page gate;
  - auditoria;
  - JustCauses.
- Compilar no fim com:

```text
pdflatex -interaction=nonstopmode main.tex
biber main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
```

- Verificar:
  - citacoes indefinidas;
  - referencias cruzadas;
  - figuras/tabelas sem referencia;
  - overfull/underfull relevantes;
  - placeholders TODO/XXX/???.
