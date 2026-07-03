const express = require('express');
const router  = express.Router();

const { autenticar, autorizarTipo } = require('../middleware/autenticar');
const Prova = require('../models/prova');
const Aluno = require('../models/aluno');
const { pool } = require('../config/database');

router.get('/', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const provas = await Prova.listarPorProfessor(req.usuario.email);
    return res.json(provas);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensagem: 'Erro interno.' });
  }
});

router.post('/', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  const { nome, duracao, data, questoes } = req.body;

  if (!nome) return res.status(400).json({ mensagem: 'Nome da prova é obrigatório.' });
  if (!questoes || questoes.length === 0) {
    return res.status(400).json({ mensagem: 'A prova deve ter ao menos uma questão.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const rProva = await client.query(
      'INSERT INTO prova (professor_email, nome, duracao, data) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.usuario.email, nome, duracao || null, data || null]
    );

    const prova = rProva.rows[0];

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];

      if (!q.enunciado || !q.tipo) {
        throw new Error('Questão inválida.');
      }

      const rQ = await client.query(
        `INSERT INTO questao
         (prova_id, numero, enunciado, tipo, anexo_nome, anexo_tipo, anexo_dados)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id`,
        [
          prova.id,
          i + 1,
          q.enunciado,
          q.tipo,
          q.anexo?.nome || null,
          q.anexo?.tipo || null,
          q.anexo?.dados || null,
        ]
      );

      const questaoId = rQ.rows[0].id;

      if (q.tipo !== 'dissertativa' && q.alternativas && q.alternativas.length > 0) {
        for (const alt of q.alternativas) {
          await client.query(
            'INSERT INTO alternativa (questao_id, letra, texto, correta) VALUES ($1,$2,$3,$4)',
            [questaoId, alt.letra, alt.texto, !!alt.correta]
          );
        }
      }
    }

    await client.query('COMMIT');
    return res.status(201).json(prova);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(500).json({ mensagem: 'Erro ao salvar prova.' });
  } finally {
    client.release();
  }
});

router.post('/:id/respostas', autenticar, autorizarTipo('ALUNO'), async (req, res) => {
  const provaId = req.params.id;
  const { respostas, tempoUtilizado } = req.body;

  if (!Array.isArray(respostas)) {
    return res.status(400).json({ mensagem: 'Respostas inválidas.' });
  }

  const client = await pool.connect();

  try {
    const prova = await Prova.buscarPorId(provaId);
    if (!prova) {
      return res.status(404).json({ mensagem: 'Prova não encontrada.' });
    }

    const aluno = await Aluno.buscarPorEmail(req.usuario.email);
    const alunoNome = aluno ? aluno.nome : req.usuario.email;

    await client.query('BEGIN');

    const questoes = await client.query(
      `SELECT q.id, q.tipo, a.letra AS correta
         FROM questao q
         LEFT JOIN alternativa a ON a.questao_id = q.id AND a.correta = true
        WHERE q.prova_id = $1`,
      [provaId]
    );

    const mapaQuestoes = new Map(questoes.rows.map(q => [Number(q.id), q]));
    const objetivas = questoes.rows.filter(q => q.tipo !== 'dissertativa');

    let acertos = 0;

    for (const resposta of respostas) {
      const questao = mapaQuestoes.get(Number(resposta.questaoId));
      if (!questao || questao.tipo === 'dissertativa') continue;

      if (questao.correta && resposta.alternativaLetra === questao.correta) {
        acertos++;
      }
    }

    const totalObjetivas = objetivas.length;
    const nota = totalObjetivas > 0
      ? Number(((acertos / totalObjetivas) * 10).toFixed(2))
      : null;

    const rProva = await client.query(
      `INSERT INTO resposta_prova
       (prova_id, aluno_email, aluno_nome, nota_objetiva, total_objetivas, acertos, tempo_utilizado)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (prova_id, aluno_email)
       DO UPDATE SET
         aluno_nome = EXCLUDED.aluno_nome,
         nota_objetiva = EXCLUDED.nota_objetiva,
         total_objetivas = EXCLUDED.total_objetivas,
         acertos = EXCLUDED.acertos,
         tempo_utilizado = EXCLUDED.tempo_utilizado,
         finalizada_em = NOW()
       RETURNING id`,
      [
        provaId,
        req.usuario.email,
        alunoNome,
        nota,
        totalObjetivas,
        acertos,
        tempoUtilizado || null,
      ]
    );

    const respostaProvaId = rProva.rows[0].id;

    await client.query(
      'DELETE FROM resposta_questao WHERE resposta_prova_id = $1',
      [respostaProvaId]
    );

    for (const resposta of respostas) {
      const questao = mapaQuestoes.get(Number(resposta.questaoId));
      if (!questao) continue;

      const correta = questao.tipo === 'dissertativa'
        ? null
        : Boolean(questao.correta && resposta.alternativaLetra === questao.correta);

      await client.query(
        `INSERT INTO resposta_questao
         (resposta_prova_id, questao_id, resposta_texto, alternativa_letra, correta)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          respostaProvaId,
          resposta.questaoId,
          resposta.texto || null,
          resposta.alternativaLetra || null,
          correta,
        ]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ mensagem: 'Respostas salvas.', nota });
  } catch (erro) {
    await client.query('ROLLBACK');
    console.error(erro);
    return res.status(500).json({ mensagem: 'Erro ao salvar respostas.' });
  } finally {
    client.release();
  }
});

router.get('/:id/resultados', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         rp.aluno_nome,
         rp.aluno_email,
         rp.nota_objetiva,
         rp.total_objetivas,
         rp.acertos,
         rp.tempo_utilizado,
         rp.finalizada_em,
         rp.id AS resposta_id,
         COALESCE(COUNT(me.id), 0)::int AS alertas
       FROM resposta_prova rp
       JOIN prova p ON p.id = rp.prova_id
       LEFT JOIN monitoramento_evento me
         ON me.prova = p.nome
        AND me.aluno_email = rp.aluno_email
        AND me.tipo_evento <> 'tempo_esgotado'
      WHERE rp.prova_id = $1
      GROUP BY rp.id
      ORDER BY rp.finalizada_em DESC`,
      [req.params.id]
    );

    return res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ mensagem: 'Erro ao buscar resultados.' });
  }
});

router.put('/:id', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  const { nome, duracao, data, questoes } = req.body;
  const provaId = req.params.id;

  if (!nome) return res.status(400).json({ mensagem: 'Nome da prova é obrigatório.' });
  if (!questoes || questoes.length === 0) {
    return res.status(400).json({ mensagem: 'A prova deve ter ao menos uma questão.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const provaExistente = await client.query(
      'SELECT id FROM prova WHERE id = $1 AND professor_email = $2',
      [provaId, req.usuario.email]
    );

    if (provaExistente.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensagem: 'Prova não encontrada ou sem permissão.' });
    }

    const rProva = await client.query(
      `UPDATE prova
          SET nome = $1, duracao = $2, data = $3
        WHERE id = $4
        RETURNING *`,
      [nome, duracao || null, data || null, provaId]
    );

    await client.query(
      'UPDATE questao SET ativa = false WHERE prova_id = $1',
      [provaId]
    );

    for (let i = 0; i < questoes.length; i++) {
      const q = questoes[i];

      let questaoId = q.id;

      if (questaoId) {
        await client.query(
          `UPDATE questao
              SET numero = $1,
                  enunciado = $2,
                  tipo = $3,
                  anexo_nome = COALESCE($4, anexo_nome),
                  anexo_tipo = COALESCE($5, anexo_tipo),
                  anexo_dados = COALESCE($6, anexo_dados),
                  ativa = true
            WHERE id = $7 AND prova_id = $8`,
          [
            i + 1,
            q.enunciado,
            q.tipo,
            q.anexo?.nome || null,
            q.anexo?.tipo || null,
            q.anexo?.dados || null,
            questaoId,
            provaId,
          ]
        );

        await client.query('DELETE FROM alternativa WHERE questao_id = $1', [questaoId]);
      } else {
        const rQ = await client.query(
          `INSERT INTO questao
           (prova_id, numero, enunciado, tipo, anexo_nome, anexo_tipo, anexo_dados, ativa)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true)
           RETURNING id`,
          [
            provaId,
            i + 1,
            q.enunciado,
            q.tipo,
            q.anexo?.nome || null,
            q.anexo?.tipo || null,
            q.anexo?.dados || null,
          ]
        );

        questaoId = rQ.rows[0].id;
      }

      if (q.tipo !== 'dissertativa' && q.alternativas && q.alternativas.length > 0) {
        for (const alt of q.alternativas) {
          await client.query(
            'INSERT INTO alternativa (questao_id, letra, texto, correta) VALUES ($1,$2,$3,$4)',
            [questaoId, alt.letra, alt.texto, !!alt.correta]
          );
        }
      }
    }

    await client.query('COMMIT');
    return res.json(rProva.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(500).json({ mensagem: 'Erro ao atualizar prova.' });
  } finally {
    client.release();
  }
});

router.get('/:id/resultados/:respostaId', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const resposta = await pool.query(
      `SELECT
         rp.id,
         rp.aluno_nome,
         rp.aluno_email,
         rp.nota_objetiva,
         rp.acertos,
         rp.total_objetivas,
         rp.tempo_utilizado,
         rp.finalizada_em
       FROM resposta_prova rp
       JOIN prova p ON p.id = rp.prova_id
      WHERE rp.id = $1
        AND rp.prova_id = $2
        AND p.professor_email = $3`,
      [req.params.respostaId, req.params.id, req.usuario.email]
    );

    if (resposta.rowCount === 0) {
      return res.status(404).json({ mensagem: 'Resposta não encontrada.' });
    }

    const questoes = await pool.query(
      `SELECT
         q.numero,
         q.enunciado,
         q.tipo,
         rq.resposta_texto,
         rq.alternativa_letra,
         rq.correta,
         a.texto AS alternativa_texto
       FROM resposta_questao rq
       JOIN questao q ON q.id = rq.questao_id
       LEFT JOIN alternativa a
         ON a.questao_id = q.id
        AND a.letra = rq.alternativa_letra
      WHERE rq.resposta_prova_id = $1
      ORDER BY q.numero`,
      [req.params.respostaId]
    );

    return res.json({
      ...resposta.rows[0],
      questoes: questoes.rows,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ mensagem: 'Erro ao buscar respostas do aluno.' });
  }
});

router.get('/:id', autenticar, async (req, res) => {
  try {
    const prova = await Prova.buscarComQuestoes(req.params.id);

    if (!prova) {
      return res.status(404).json({ mensagem: 'Prova não encontrada.' });
    }

    if (req.usuario.tipo === 'ALUNO') {
      prova.questoes.forEach(q => {
        q.alternativas = (q.alternativas || []).map(alt => ({
          id: alt.id,
          questao_id: alt.questao_id,
          letra: alt.letra,
          texto: alt.texto,
        }));
      });
    }

    return res.json(prova);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensagem: 'Erro interno.' });
  }
});

router.delete('/:id', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const ok = await Prova.deletar(req.params.id, req.usuario.email);

    if (!ok) {
      return res.status(404).json({ mensagem: 'Prova não encontrada ou sem permissão.' });
    }

    return res.json({ mensagem: 'Prova removida.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensagem: 'Erro interno.' });
  }
});

module.exports = router;