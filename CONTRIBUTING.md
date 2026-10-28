# Desenvolvimento e publicação

## Branches

- Abra pull requests para `dev` para validar mudanças e publicar em DEV.
- Promova `dev` para `main` por pull request depois da revisão.
- PROD não é publicado automaticamente ao mesclar. Antes de iniciar `Promote to PROD`, siga o checklist operacional local de backup, selecione a branch `main` e informe uma referência não sensível do conjunto de backups verificados. O ambiente `production` exige aprovação.

## Ambientes e segredos do GitHub

Crie os ambientes `development` e `production`. Configure os segredos correspondentes em cada ambiente:

| Ambiente | Segredos necessários |
|---|---|
| `development` | `DEV_HOST`, `DEV_USER`, `DEV_SSH_PRIVATE_KEY`, `DEV_SSH_KNOWN_HOSTS` |
| `production` | `PROD_HOST`, `PROD_USER`, `PROD_SSH_PRIVATE_KEY`, `PROD_SSH_KNOWN_HOSTS` |

Use uma chave de deploy restrita, conhecida e autorizada para cada ambiente. Cadastre `*_KNOWN_HOSTS` com a chave pública do host previamente verificada. Nunca coloque valores de segredos em arquivos versionados, issues ou logs. Os workflows não recebem segredos em execuções de pull request.

## Proteção do repositório

Configure `dev` e `main` para exigir pull requests e a verificação `CI / compile`, bloquear force-push e impedir exclusão das branches. Restrinja escrita do repositório a colaboradores confiáveis. No ambiente `production`, exija um revisor; a aprovação da própria conta que iniciou a promoção deve seguir a configuração de proteção desejada.

## Limites do deploy

O workflow de PROD publica somente o código Python e assets de `DEV/app`. Ele não aplica migrações nem executa operações no banco. Alterações de schema e dados continuam seguindo os procedimentos de migração e autorização do projeto. Os backups permanecem privados no computador e na VM; não são enviados ao GitHub.
