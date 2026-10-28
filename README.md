# BrincaEscola

Aplicação web educacional para organizar materiais escolares e registrar empréstimos e devoluções.

## O projeto

O BrincaEscola reúne um catálogo de materiais, cadastro de usuários, controle de empréstimos em andamento e histórico de devoluções. Foi desenvolvido como projeto didático.

## Tecnologias

- Python e Flask
- MariaDB
- HTML, CSS e JavaScript

O código ativo fica em `DEV/app`. Arquivos de ambiente e credenciais são configurados fora do repositório.

## Fluxo de desenvolvimento

- `dev`: integração e publicação automatizada no ambiente DEV após configurar o ambiente `development` no GitHub.
- `main`: versão aprovada. Mudanças entram por pull request; a promoção a PROD é iniciada manualmente e aguarda aprovação do ambiente protegido `production`.
- Antes de iniciar a promoção, conclua e confira os backups privados locais e remotos exigidos pelo procedimento operacional.

Os workflows ficam em `.github/workflows`. Consulte `CONTRIBUTING.md` para preparar o repositório e os ambientes do GitHub.
