// acesso ao banco pra tabela monitoramento_evento (desvios de foco do aluno na prova)

const { pool } = require('../config/database');

async function registrar(prova, alunoEmail, tipoEvento, detalhe) {
  const resultado = await pool.query(
    `INSERT INTO monitoramento_evento (prova, aluno_email, tipo_evento, detalhe)
     VALUES ($1, $2, $3, $4)
     RETURNING id, prova, aluno_email, tipo_evento, detalhe, criado_em`,
    [prova, alunoEmail, tipoEvento, detalhe || null]
  );
  return resultado.rows[0];
}

async function listarPorProva(prova) {
  const resultado = await pool.query(
    `SELECT id, prova, aluno_email, tipo_evento, detalhe, criado_em
       FROM monitoramento_evento
      WHERE prova = $1
      ORDER BY criado_em ASC`,
    [prova]
  );
  return resultado.rows;
}

// contagem de alertas por aluno, usado no painel de resultados do professor
async function contarPorAluno(prova) {
  const resultado = await pool.query(
    `SELECT aluno_email, COUNT(*)::int AS total
       FROM monitoramento_evento
      WHERE prova = $1
      GROUP BY aluno_email`,
    [prova]
  );
  return resultado.rows;
}

module.exports = { registrar, listarPorProva, contarPorAluno };
