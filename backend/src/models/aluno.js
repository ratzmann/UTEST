// acesso ao banco pra tabela aluno

const { pool } = require('../config/database');

async function buscarPorEmail(email) {
  const resultado = await pool.query(
    'SELECT * FROM aluno WHERE email_institucional = $1',
    [email]
  );
  return resultado.rows[0] || null;
}

async function criar(nome, emailInstitucional) {
  const resultado = await pool.query(
    'INSERT INTO aluno (nome, email_institucional) VALUES ($1, $2) RETURNING id, nome, email_institucional',
    [nome, emailInstitucional]
  );
  return resultado.rows[0];
}

async function listarTodos() {
  const resultado = await pool.query(
    'SELECT id, nome, email_institucional FROM aluno ORDER BY nome'
  );
  return resultado.rows;
}

async function deletarPorEmail(email) {
  const resultado = await pool.query(
    'DELETE FROM aluno WHERE email_institucional = $1',
    [email]
  );
  return resultado.rowCount > 0;
}

module.exports = { buscarPorEmail, criar, listarTodos, deletarPorEmail };
