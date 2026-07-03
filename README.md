## Como rodar

```bash
cp .env.example .env
docker-compose up --build
```

- Frontend: http://localhost:8081 (redireciona para `/html/loginProfessor.html`
- Backend (API): http://localhost:8080

## Estrutura

- `frontend/` — HTML/CSS/JS estático, servido via Nginx.
  - `frontend/html/` — páginas
  - `frontend/css/` — estilos
  - `frontend/js/` — scripts
  - `frontend/img/` — imagens
- `backend/` — API REST em Node/Express + PostgreSQL.

## Fluxos principais

- **Professor**: `html/loginProfessor.html` → `html/provaProfessor.html`
  (lista de provas) → `html/cadastroProva.html` (+ Nova prova) /
  `html/resultadosProva.html` (Resultados de cada prova).
- **Aluno**: `html/loginAluno.html` (com email institucional
  `@edu.udesc.br`) → `html/prova.html` (resolução da prova, com cronômetro e
  monitoramento anti-fraude) → `html/finalizacaoProva.html`.
- **Admin** *(tela apenas para demonstração — sem integração com id.udesc)*:
  `html/adminLogin.html` (chave definida em `ADMIN_SECRET`, padrão
  `utest-admin-2026`) → `html/adminUsuarios.html` (lista/exclui professores e
  alunos cadastrados).

## Testando o cronômetro e o monitoramento anti-fraude

1. Cadastre um professor (`html/cadastroProfessor.html`) e faça login.
2. Na tela `html/provaProfessor.html`, clique em **"Ver detalhes"** ou
   **"Copiar link"** de qualquer prova — o link já inclui
   `?prova=...&duracao=...` (tempo máximo definido pelo professor, em
   minutos).
3. Abra esse link, faça login como aluno (email `@edu.udesc.br`) e observe:
   - o cronômetro regressivo no topo da prova;
   - avisos automáticos quando restam 15, 10, 5, 3, 2 e 1 minuto;
   - ao trocar de aba, minimizar a janela ou clicar fora do navegador, um
     alerta é registrado (badge "N alertas registrados" aparece no topo);
   - se o tempo zerar, a prova é enviada automaticamente.
4. Volte como professor em `html/resultadosProva.html?prova=...` para ver os
   alertas de foco reais daquele aluno (as notas/status ainda são
   ilustrativos, pois a correção automática e o armazenamento de respostas
   ainda não persistem dados).

## Variáveis de ambiente

Veja `.env.example` para a lista completa (banco de dados, JWT, domínio
institucional do aluno, CORS e a chave da área administrativa).

