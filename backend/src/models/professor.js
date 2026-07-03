// acesso ao banco pra tabela professor

const { pool } = require('../config/database');

async function buscarPorEmail(email) {
  const resultado = await pool.query(
    'SELECT * FROM professor WHERE email = $1',
    [email]
  );
  return resultado.rows[0] || null;
}

async function emailExiste(email) {
  const resultado = await pool.query(
    'SELECT 1 FROM professor WHERE email = $1',
    [email]
  );
  return resultado.rowCount > 0;
}

async function criar(nome, email, senhaHash) {
  const resultado = await pool.query(
    'INSERT INTO professor (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email',
    [nome, email, senhaHash]
  );
  return resultado.rows[0];
}

async function listarTodos() {
  const resultado = await pool.query(
    'SELECT id, nome, email FROM professor ORDER BY nome'
  );
  return resultado.rows;
}

async function deletarPorEmail(email) {
  const resultado = await pool.query(
    'DELETE FROM professor WHERE email = $1',
    [email]
  );
  return resultado.rowCount > 0;
}

module.exports = { buscarPorEmail, emailExiste, criar, listarTodos, deletarPorEmail };
