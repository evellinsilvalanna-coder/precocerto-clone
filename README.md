# Preço Certo — clone independente

Aplicação publicada com frontend estático e API própria em Node.js. A autenticação usa tokens assinados e armazenamento local persistente (`data.json`, configurável por `DATA_FILE`); não há dependência de Base44 em runtime.

## Recursos de segurança
- Login e cadastro por e-mail e senha; Google permanece desativado.
- Entidades isoladas por `created_by_id` no servidor (nunca confiar no filtro do cliente).
- Exclusão da própria conta em `DELETE /api/account`, com confirmação exigida pela interface que consumir a rota.
- Exclusão de usuários em `DELETE /api/apps/:app/entities/User/:id` somente para ADM, impedindo o ADM de excluir a si mesmo e removendo os dados associados.
- Proporção em `POST /api/proportion` (`base`, `target`, `value`).

## Deploy
`npm start` (Render: Node 18+). Defina `AUTH_SECRET` e um volume persistente para `DATA_FILE` em produção.
