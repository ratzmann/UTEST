const { pool } = require('../config/database');

async function criar(professorEmail, nome, duracao, data) {
  const r = await pool.query(
    'INSERT INTO prova (professor_email, nome, duracao, data) VALUES ($1,$2,$3,$4) RETURNING *',
    [professorEmail, nome, duracao || null, data || null]
  );
  return r.rows[0];
}

async function listarPorProfessor(professorEmail) {
  const r = await pool.query(
    'SELECT * FROM prova WHERE professor_email = $1 ORDER BY criado_em DESC',
    [professorEmail]
  );
  return r.rows;
}

async function buscarPorId(id) {
  const r = await pool.query('SELECT * FROM prova WHERE id = $1', [id]);
  return r.rows[0] || null;
}

async function deletar(id, professorEmail) {
  const r = await pool.query(
    'DELETE FROM prova WHERE id = $1 AND professor_email = $2',
    [id, professorEmail]
  );
  return r.rowCount > 0;
}

async function buscarComQuestoes(id) {
  const prova = await buscarPorId(id);
  if (!prova) return null;

  const questoes = await pool.query(
    'SELECT * FROM questao WHERE prova_id = $1 AND ativa = true ORDER BY numero',
    [id]
  );

  for (const q of questoes.rows) {
    const alts = await pool.query(
      'SELECT id, questao_id, letra, texto, correta FROM alternativa WHERE questao_id = $1 ORDER BY letra',
      [q.id]
    );
    q.alternativas = alts.rows;
  }

  prova.questoes = questoes.rows;
  return prova;
}

module.exports = { criar, listarPorProfessor, buscarPorId, deletar, buscarComQuestoes };