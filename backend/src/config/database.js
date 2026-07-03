const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'utest_db',
  user:     process.env.DB_USER     || 'utest_user',
  password: process.env.DB_PASSWORD || 'utest_password',
});

async function inicializarBanco() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS professor (
      id         SERIAL PRIMARY KEY,
      nome       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aluno (
      id                  SERIAL PRIMARY KEY,
      nome                VARCHAR(255) NOT NULL,
      email_institucional VARCHAR(255) NOT NULL UNIQUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prova (
      id               SERIAL PRIMARY KEY,
      professor_email  VARCHAR(255) NOT NULL REFERENCES professor(email),
      nome             VARCHAR(255) NOT NULL,
      duracao          VARCHAR(50),
      data             DATE,
      criado_em        TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questao (
      id          SERIAL PRIMARY KEY,
      prova_id    INTEGER NOT NULL REFERENCES prova(id) ON DELETE CASCADE,
      numero      INTEGER NOT NULL,
      enunciado   TEXT NOT NULL,
      tipo        VARCHAR(30) NOT NULL,
      anexo_nome  VARCHAR(255),
      anexo_tipo  VARCHAR(100),
      anexo_dados TEXT,
      ativa BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await pool.query(`ALTER TABLE questao ADD COLUMN IF NOT EXISTS anexo_nome VARCHAR(255)`);
  await pool.query(`ALTER TABLE questao ADD COLUMN IF NOT EXISTS anexo_tipo VARCHAR(100)`);
  await pool.query(`ALTER TABLE questao ADD COLUMN IF NOT EXISTS anexo_dados TEXT`);
  await pool.query(`ALTER TABLE questao ADD COLUMN IF NOT EXISTS ativa BOOLEAN NOT NULL DEFAULT TRUE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alternativa (
      id         SERIAL PRIMARY KEY,
      questao_id INTEGER NOT NULL REFERENCES questao(id) ON DELETE CASCADE,
      letra      CHAR(1) NOT NULL,
      texto      TEXT NOT NULL,
      correta    BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await pool.query(`ALTER TABLE alternativa ADD COLUMN IF NOT EXISTS correta BOOLEAN NOT NULL DEFAULT FALSE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resposta_prova (
      id              SERIAL PRIMARY KEY,
      prova_id        INTEGER NOT NULL REFERENCES prova(id) ON DELETE CASCADE,
      aluno_email     VARCHAR(255) NOT NULL,
      aluno_nome      VARCHAR(255) NOT NULL,
      nota_objetiva   NUMERIC(5,2),
      total_objetivas INTEGER NOT NULL DEFAULT 0,
      acertos         INTEGER NOT NULL DEFAULT 0,
      tempo_utilizado INTEGER,
      finalizada_em   TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (prova_id, aluno_email)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resposta_questao (
      id                SERIAL PRIMARY KEY,
      resposta_prova_id INTEGER NOT NULL REFERENCES resposta_prova(id) ON DELETE CASCADE,
      questao_id         INTEGER NOT NULL REFERENCES questao(id) ON DELETE CASCADE,
      resposta_texto     TEXT,
      alternativa_letra  CHAR(1),
      correta            BOOLEAN,
      UNIQUE (resposta_prova_id, questao_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitoramento_evento (
      id           SERIAL PRIMARY KEY,
      prova        VARCHAR(255) NOT NULL,
      aluno_email  VARCHAR(255) NOT NULL,
      tipo_evento  VARCHAR(50)  NOT NULL,
      detalhe      VARCHAR(255),
      criado_em    TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log('Banco de dados inicializado com sucesso.');
}

module.exports = { pool, inicializarBanco };