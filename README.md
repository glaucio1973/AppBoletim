# AppBoletim

Boletim gráfico escolar do **Colégio Liessin** — o aluno faz login via **SSO
da Layers Education** e visualiza suas notas trimestrais (Dashboard 1,
gráfico) e a composição detalhada de cada média trimestral (Dashboard 2,
tabela com drilldown), consultadas no **Web Service TOTVS RM**
(`wsConsultaSQL`, sentença `CUBO.07`).

Repositório: <https://github.com/glaucio1973/AppBoletim>

> **Status atual:** a integração com a TOTVS é **real e validada** — testada
> de ponta a ponta contra o webservice de produção da escola (`TOTVS_MODE=real`),
> retornando as notas verdadeiras do RA de teste. O app roda por padrão com
> **dados mockados** (`TOTVS_MODE=mock`) para não depender de rede/credenciais
> em desenvolvimento, mas o modo real está pronto pra uso. A integração com a
> **Layers real ainda não está confirmada** — ver [Status da integração
> Layers](#status-da-integração-layers-importante) — e por isso o app inclui
> um **IdP simulado** só para desenvolvimento local.

## Sumário

- [Arquitetura](#arquitetura)
- [Status da integração Layers (IMPORTANTE)](#status-da-integração-layers-importante)
- [Status da integração TOTVS](#status-da-integração-totvs)
- [Instalação](#instalação)
- [Configuração (.env)](#configuração-env)
- [Rodando localmente (modo padrão, sem credenciais reais)](#rodando-localmente-modo-padrão-sem-credenciais-reais)
- [Indo para produção](#indo-para-produção)
- [Dashboards](#dashboards)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Segurança](#segurança)
- [Tratamento de loading, erro e estado vazio](#tratamento-de-loading-erro-e-estado-vazio)
- [Publicando no GitHub](#publicando-no-github)

## Arquitetura

```
Navegador ── Next.js (App Router) ──► Layers (OAuth2 Authorization Code)  [autenticação]
                    │
                    └────────────────► TOTVS RM (SOAP wsConsultaSQL)      [notas por RA]
```

- **Frontend**: React 19 + Next.js 16 (App Router), TypeScript, Tailwind CSS
  v4, [Recharts](https://recharts.org) para os gráficos. Componentes em
  `src/components`.
- **Backend**: Route Handlers do próprio Next.js (`src/app/api/**/route.ts`),
  rodando em Node.js no servidor — o navegador **nunca** fala com a Layers ou
  com a TOTVS diretamente, só com essas rotas (ou, nos Server Components das
  páginas, o código de servidor chama os serviços diretamente, sem round-trip
  HTTP extra, mas sempre no servidor).
- **Sessão**: cookie `httpOnly` assinado com JWT ([`jose`](https://github.com/panva/jose)),
  nunca contém tokens da Layers, só `ra`, `nome`, `email`.
- **Proteção de rotas**: `src/proxy.ts` (o antigo `middleware.ts` — renomeado
  para `proxy` a partir do Next.js 16) faz a checagem otimista de sessão;
  cada Server Component protegido também chama `verifySession()` (Data
  Access Layer, `src/lib/dal.ts`) como segunda camada de defesa.
- **Camada de integração TOTVS**: `src/lib/totvs/` — `totvsService.ts`
  decide entre modo `mock` e `real`, `client.ts` fala SOAP com a TOTVS,
  `mapping.ts` aplica as regras de negócio (trimestre, tipo de avaliação,
  médias), `mockData.ts` gera dados fictícios no mesmo formato da fonte real.
- **Camada de integração Layers**: `src/lib/layers/authService.ts` implementa
  o fluxo OAuth2 Authorization Code de forma 100% configurável via `.env`
  (nenhum endpoint hardcoded).

## Status da integração Layers (IMPORTANTE)

A documentação pública em `layers.education` confirma a existência do
serviço "Single Sign-On — Autenticação com OAuth2 e Sessão", e aponta um
portal de identidade em `id.layers.digital`. **Não foi possível, a partir
deste ambiente de desenvolvimento, confirmar publicamente**:

- os paths exatos de `/authorize`, `/token` e `/userinfo`;
- o `client_id`/`client_secret` de produção (exigem cadastro como
  parceiro/desenvolvedor);
- o schema exato do JSON devolvido por `/userinfo` (em particular, qual
  campo carrega o RA do aluno).

Por isso **nenhum endpoint da Layers está hardcoded no código**. Tudo é
configurável via `.env`:

- `LAYERS_AUTH_URL`, `LAYERS_TOKEN_URL`, `LAYERS_USERINFO_URL`
- `LAYERS_STUDENT_ID_FIELD` (nome do campo em `/userinfo` que contém o RA;
  se não confirmado, o app tenta nessa ordem: `ra`, `registration_number`,
  `external_id`, `cpf`, `email` — ver `resolveStudentIdentifier()` em
  `src/lib/layers/authService.ts`)

**Antes de ir para produção, é necessário:**

1. Cadastrar o AppBoletim no portal de parceiros/desenvolvedores da Layers e
   obter `client_id`/`client_secret` reais.
2. Confirmar com o time da Layers (suporte@layers.education) os paths exatos
   de `authorize`, `token` e `userinfo`, e preencher no `.env`.
3. Confirmar o schema do `/userinfo` e ajustar `LAYERS_STUDENT_ID_FIELD` (ou
   `resolveStudentIdentifier()`) se o RA não vier direto — nesse caso, será
   necessário implementar uma consulta adicional (ex. por CPF/e-mail) antes
   de buscar as notas na TOTVS (`TODO` sinalizado em
   `src/app/api/boletim/route.ts`).
4. Cadastrar `LAYERS_REDIRECT_URI` (produção) como redirect URI permitida no
   app registrado na Layers.

### IdP simulado (apenas desenvolvimento)

Para testar o fluxo completo (login → dashboard → notas) sem esperar o
cadastro de parceiro, o projeto inclui um **IdP falso** em
`src/app/api/dev/fake-layers/*`, montado somente quando `NODE_ENV !==
"production"` **e** `LAYERS_FAKE_IDP=true` (padrão em `.env.example`).
**Nunca habilite `LAYERS_FAKE_IDP` em produção.**

## Status da integração TOTVS

**Integração real, testada de ponta a ponta** contra o webservice de
produção da escola (RA `20131249`, `PERIODOLETIVO=2026`, `FILIAL=1`,
sentença `CUBO.07`) — não é mais um contrato assumido, é o que efetivamente
funciona:

| Item | Valor |
|---|---|
| Endpoint | `https://associacaoisraelita138614.rm.cloudtotvs.com.br:8051/wsConsultaSQL/IwsConsultaSQL` |
| Autenticação | HTTP Basic Auth (usuário técnico de integração) |
| Operação SOAP | `RealizarConsultaSQL` (prefixo `tot:`, namespace `http://www.totvs.com/`) |
| `SOAPAction` | `http://www.totvs.com/IwsConsultaSQL/RealizarConsultaSQL` — **precisa** do nome da interface (`IwsConsultaSQL/`) antes da operação; sem isso o servidor devolve `202 Accepted` com corpo vazio e nunca processa a chamada |
| Elementos do corpo (nessa ordem) | `codSentenca`, `codColigada`, `codSistema`, `parameters` |
| Formato de `parameters` | string `CHAVE=VALOR;CHAVE=VALOR;...` (não é XML aninhado) |
| Sentença | `CUBO.07` |
| Coligada / Sistema | `1` / `G` |
| Parâmetros de negócio | `PERIODOLETIVO`, `FILIAL`, `RA` |
| Certificado | Autoassinado — app configurado para não validar (`TOTVS_IGNORE_SELF_SIGNED_CERT=true`) |

Envelope SOAP completo usado pelo app (`src/lib/totvs/client.ts`):

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tot="http://www.totvs.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <tot:RealizarConsultaSQL>
      <tot:codSentenca>CUBO.07</tot:codSentenca>
      <tot:codColigada>1</tot:codColigada>
      <tot:codSistema>G</tot:codSistema>
      <tot:parameters>PERIODOLETIVO=2026;FILIAL=1;RA=20131249</tot:parameters>
    </tot:RealizarConsultaSQL>
  </soapenv:Body>
</soapenv:Envelope>
```

A resposta é um SOAP Envelope normal; `RealizarConsultaSQLResult` contém um
`NewDataSet` (DataSet .NET) serializado como texto XML-escapado, com uma tag
`<Resultado>` por linha. `src/lib/totvs/client.ts` já faz esse parse (duas
passadas de XML: a resposta SOAP, depois o dataset dentro dela).

> Nota histórica: as primeiras tentativas, feitas a partir de um ambiente de
> desenvolvimento diferente deste, sempre voltavam com `202`/`400` vazios
> (assinatura de dispositivo de borda de rede). Isso não era bloqueio de
> rede — era o envelope SOAP errado (nome de operação, ordem dos elementos e
> formato de `parameters` incorretos, além de faltar o prefixo `IwsConsultaSQL/`
> no `SOAPAction`). Com o envelope correto acima, a chamada funciona
> normalmente de qualquer rede com o host acessível.

Tudo isso é configurável via `.env` (`TOTVS_SOAP_OPERATION`,
`TOTVS_SOAP_ACTION`, `TOTVS_SOAP_NAMESPACE`) caso mude em outro ambiente.
`TOTVS_MODE=mock` (padrão do `.env.example`, para não depender de rede/
credenciais em desenvolvimento) gera dados fictícios no **mesmo formato de
colunas confirmado**; `TOTVS_MODE=real` usa o webservice de verdade.

### Mapeamento de colunas (`src/lib/totvs/mapping.ts`)

| Coluna | Uso |
|---|---|
| `NOME` | Nome do aluno |
| `DISCIPLINA` | Nome da disciplina |
| `ETAPA` | Período: `"01 - 1º TRI"` / `"02 - 2º TRI"` / `"03 - 3º TRI"` (trimestre extraído de `"Xº TRI"`), ou os pseudo-períodos anuais `"04 - MÉDIA ANUAL"`, `"05 - RECUP. FINAL"`, `"06 - MÉDIA FINAL"` |
| `PROVA` | Tipo de avaliação: `"01 - AV1"` … `"07 - MÉDIA TRIMESTRAL"` (por trimestre) e `"08 - MÉDIA ANUAL"`, `"09 - REC FINAL"`, `"10 - BÔNUS FINAL"`, `"11 - MÉDIA FINAL"` (nível anual) |
| `NOTA` | Nota da avaliação |
| `CODPERLET` | Ano letivo |
| `CODTURMA` / `SERIE` | Turma / série (colunas distintas) |
| `ORDEM` | Ordenação das disciplinas como no boletim oficial |
| `RA` | Conferido contra o RA da sessão |

A sentença devolve **várias linhas por disciplina + período** (uma por
avaliação), muitas sem `NOTA` quando a avaliação ainda não foi realizada —
inclusive para trimestres futuros, que já vêm como linhas "vazias" em vez de
simplesmente não existir. A "Média Trimestral" fechada (considerando
eventual recuperação paralela) é usada como nota do trimestre.

**Média anual**: quando a TOTVS já fechou a linha oficial (`ETAPA`/`PROVA`
`"MÉDIA ANUAL"`), ela é usada; enquanto o ano letivo está em andamento (como
no teste real, só o 1º trimestre fechado), o app calcula uma média
provisória a partir dos trimestres já fechados e marca como "parcial" na UI.
**Recuperação final / Média final**: capturadas das linhas `"REC FINAL"` /
`"MÉDIA FINAL"` quando existirem (não apareceram no teste porque a aluna não
precisou de recuperação); enquanto isso, ficam `null` e a UI mostra "—".
**Peso por avaliação**: não é retornado pela sentença — removido da UI do
drilldown (Dashboard 2) a pedido, mas o campo `AvaliacaoComposicao.peso`
continua na estrutura, pronto para o dia em que a fonte de dados passar a
fornecê-lo.

## Instalação

```bash
git clone https://github.com/glaucio1973/AppBoletim.git
cd AppBoletim
npm install
cp .env.example .env
```

## Configuração (.env)

Veja [`.env.example`](.env.example) para a lista completa e comentada.
Resumo das variáveis mais importantes:

| Variável | Descrição |
|---|---|
| `SESSION_SECRET` | Chave de assinatura do cookie de sessão (JWT). Gere uma nova em produção: `openssl rand -base64 32`. |
| `LAYERS_CLIENT_ID` / `LAYERS_CLIENT_SECRET` | Credenciais do app cadastrado na Layers. |
| `LAYERS_REDIRECT_URI` | Callback OAuth2 (`/api/auth/layers/callback`), deve estar cadastrada na Layers. |
| `LAYERS_AUTH_URL` / `LAYERS_TOKEN_URL` / `LAYERS_USERINFO_URL` | Endpoints reais da Layers (ver seção acima). |
| `LAYERS_FAKE_IDP` | `true` em dev para usar o IdP simulado. **Nunca `true` em produção.** |
| `TOTVS_MODE` | `mock` (padrão) ou `real`. |
| `TOTVS_USERNAME` / `TOTVS_PASSWORD` | Usuário técnico de integração TOTVS (nunca a senha do aluno). |
| `TOTVS_RA_PADRAO` | RA usado como fallback enquanto a Layers real (com RA garantido) não estiver em produção. |
| `TOTVS_MEDIA_MINIMA` | Média mínima usada para destacar disciplinas abaixo do esperado. |

## Rodando localmente (modo padrão, sem credenciais reais)

O `.env.example` já vem configurado para funcionar sem nenhuma credencial
real: `LAYERS_FAKE_IDP=true` + `TOTVS_MODE=mock`.

```bash
npm run dev
# abra http://localhost:3000
# clique em "Entrar com Layers" → preencha nome/e-mail/RA na tela simulada
```

Você será redirecionado ao Dashboard Gráfico com dados fictícios; a Tabela
Detalhada fica em "Tabela Detalhada" no menu superior.

### Usando a TOTVS real

Defina no `.env`:

```env
TOTVS_MODE=real
TOTVS_USERNAME=servico
TOTVS_PASSWORD=shelda
```

As demais variáveis (`TOTVS_BASE_URL`, `TOTVS_SENTENCA_NOTAS`,
`TOTVS_SOAP_OPERATION`, `TOTVS_SOAP_ACTION`, `TOTVS_COD_COLIGADA`,
`TOTVS_COD_SISTEMA`, `TOTVS_FILIAL`, `TOTVS_PERIODO_LETIVO`) já vêm com os
valores reais confirmados como padrão em `.env.example` (ver [Status da
integração TOTVS](#status-da-integração-totvs)) — não precisa mexer em nada
além do modo e das credenciais.

## Indo para produção

1. Preencha as credenciais reais da Layers (`LAYERS_CLIENT_ID/SECRET`, as 3
   URLs) e defina `LAYERS_FAKE_IDP=false`.
2. Defina `NODE_ENV=production` (ativa cookies `secure`, exige HTTPS, e
   desliga o IdP simulado mesmo que `LAYERS_FAKE_IDP` fique esquecido em
   `true`).
3. Defina `TOTVS_MODE=real` com as credenciais técnicas corretas.
4. `npm run build && npm start`.

## Dashboards

### Dashboard 1 — Boletim Gráfico (`/dashboard`)

- **Resumo geral**: média geral, maior/menor nota, quantidade de disciplinas
  abaixo da média mínima.
- **Gráfico comparativo**: barras por disciplina/trimestre (Recharts) com
  linha de referência na média mínima.
- **Cards por disciplina**: mini-gráfico dos 3 trimestres, média anual
  (sinalizada como parcial se ainda faltam trimestres), destaque visual
  (borda e badge vermelhos) para quem está abaixo do mínimo.
- Layout responsivo (grid de 1/2/3 colunas conforme o tamanho da tela).

### Dashboard 2 — Tabela Detalhada (`/boletim/detalhado`)

- Tabela com 1º/2º/3º trimestre, média anual, recuperação final e média
  final por disciplina.
- **Drilldown**: clicar em uma linha expande a composição de cada
  trimestre — todas as avaliações (AV1, AV2, AV3, Bônus, Recuperação
  Paralela, Média, Média Trimestral), com nota e peso (peso ainda "—",
  estrutura pronta para quando a fonte de dados passar a fornecê-lo).

## Estrutura de pastas

```
AppBoletim/
├── .env.example
├── src/
│   ├── proxy.ts                       # proteção de rotas (ex-middleware.ts)
│   ├── app/
│   │   ├── page.tsx                   # redireciona /login ou /dashboard
│   │   ├── login/page.tsx
│   │   ├── (protegido)/
│   │   │   ├── layout.tsx             # verifySession() + Header
│   │   │   ├── dashboard/             # Dashboard 1
│   │   │   └── boletim/detalhado/     # Dashboard 2
│   │   └── api/
│   │       ├── auth/layers/{login,callback}/route.ts
│   │       ├── auth/{logout,me}/route.ts
│   │       ├── boletim/route.ts
│   │       └── dev/fake-layers/*      # IdP simulado — só dev
│   ├── components/
│   │   ├── ui/                        # Card, Badge, Skeleton, EmptyState, ErrorState
│   │   ├── layout/Header.tsx
│   │   └── boletim/                   # ResumoGeral, NotasChart, DisciplinaCard, TabelaDetalhada
│   └── lib/
│       ├── env.ts                     # única fonte de leitura de env vars (zod)
│       ├── session.ts / dal.ts        # sessão JWT + Data Access Layer
│       ├── errors.ts / logger.ts
│       ├── layers/                    # OAuth2 Authorization Code + IdP fake
│       └── totvs/                     # client SOAP, mapping, mockData, service
```

## Segurança

- Cookie de sessão `httpOnly`, `sameSite=lax`, `secure` em produção; nunca
  contém tokens da Layers, só `ra`/`nome`/`email`.
- `access_token` da Layers só existe durante a troca do código no servidor —
  nunca é enviado ao navegador.
- O navegador nunca chama a TOTVS ou a Layers diretamente, só as rotas do
  próprio Next.js.
- RA é sanitizado (`sanitizarRA`, aceita só `[A-Za-z0-9.-]`) antes de compor
  qualquer chamada à TOTVS.
- O RA usado em `/api/boletim` **sempre** vem da sessão autenticada — nunca
  é aceito via query/body do cliente, evitando que um aluno consulte notas
  de outro.
- `.env` nunca é commitado (`.gitignore`); `.env.example` documenta todas as
  variáveis sem valores reais sensíveis.
- Logs (`src/lib/logger.ts`) mascaram campos sensíveis (`logger.mask()`) —
  nunca imprimem senha, `client_secret` ou tokens completos.
- Erros de negócio (`AppError` e subclasses em `src/lib/errors.ts`) retornam
  mensagens genéricas ao cliente; o detalhe técnico só vai para o log do
  servidor.

## Tratamento de loading, erro e estado vazio

- **Loading**: `loading.tsx` por rota (skeletons) — Next.js mostra
  automaticamente enquanto o Server Component busca os dados.
- **Erro**: `error.tsx` por rota (Error Boundary) com botão "Tentar
  novamente"; erros de negócio (`AppError`) retornam código e mensagem
  amigável nas rotas de API, o detalhe completo só vai para o log.
- **Vazio**: se o aluno não tem nenhuma disciplina com notas lançadas, as
  páginas mostram um `EmptyState` dedicado (não é tratado como erro).
- **Login**: falhas no fluxo OAuth2 (cancelamento, state inválido/CSRF, RA
  não encontrado, falha na troca de token) redirecionam para `/login` com
  uma mensagem específica por tipo de erro.

## Publicando no GitHub

```bash
git init
git add .
git commit -m "AppBoletim: boletim gráfico Layers + TOTVS RM"
git branch -M main
git remote add origin https://github.com/glaucio1973/AppBoletim.git
git push -u origin main
```

Se o repositório `glaucio1973/AppBoletim` ainda não existir no GitHub, crie-o
antes (vazio, sem README/gitignore automáticos) em
<https://github.com/new>, depois rode o `git push` acima.
