# BrincaEscola

Aplicação web educacional para organizar materiais escolares e registrar empréstimos e devoluções.

## O projeto

O BrincaEscola reúne um catálogo de materiais, cadastro de usuários, controle de empréstimos em andamento e histórico de devoluções. Foi desenvolvido como projeto didático.

## Contexto acadêmico e créditos

Projeto Integrador em Computação do Eixo de Computação da Universidade Virtual do Estado de São Paulo (UNIVESP), no segundo semestre de 2026 (2026/2), vinculado ao Polo Zona Oeste de São Paulo.

**Facilitadora:** Nicole da Costa Cerqueira.

**Integrantes:**

- Daniele Hora Nogueira Santos
- Ednéia Rodrigues de Lima Silva
- Felipe Alex Ribeiro
- Jose Valdir Ribeiro
- Kélli do Prado Fernandes
- Matheus Pinheiro de Lima Rodrigues
- Mikael Josias Rodrigues
- Renan Santos Andrade

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
