# Política de segurança

## Escopo

O VisionStock é uma demonstração com uma única rota de servidor, `POST /api/analyze-image`, que repassa imagens para um modelo de visão. Não há autenticação, banco de dados nem contas de usuário. O catálogo vive no navegador de cada visitante.

## Como reportar uma vulnerabilidade

Não abra uma issue pública. Use o reporte privado do GitHub:

1. Acesse a aba **Security** do repositório.
2. Clique em **Report a vulnerability**.
3. Descreva o problema, os passos para reproduzir e o impacto.

O retorno inicial acontece em até 7 dias.

## Medidas adotadas

- Chaves de API só em variáveis de ambiente do servidor; arquivos `.env*` ficam fora do controle de versão.
- Corpo da requisição validado com zod: de 1 a 4 imagens, tipos de mídia permitidos e limite de 4 MB.
- Resposta do modelo tratada como entrada não confiável: extraída com tolerância e validada antes de chegar à interface.
- Imagens nunca são gravadas nem registradas em log no servidor.
- CI com permissões mínimas e sem persistir credenciais no checkout.
