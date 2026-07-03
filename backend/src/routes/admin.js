// lista e remove professores/alunos (área de admin, só demonstração)

const express = require('express');
const router  = express.Router();

const { autorizarAdmin } = require('../middleware/autorizarAdmin');
const Professor = require('../models/professor');
const Aluno     = require('../models/aluno');

router.use(autorizarAdmin);

// professores

router.get('/professores', async (req, res) => {
  try {
    const professores = await Professor.listarTodos();
    return res.json(professores);
  } catch (erro) {
    console.error('Erro ao listar professores:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.delete('/professores/:email', async (req, res) => {
  try {
    const removido = await Professor.deletarPorEmail(req.params.email);
    if (!removido) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    console.error('Erro ao remover professor:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// alunos

router.get('/alunos', async (req, res) => {
  try {
    const alunos = await Aluno.listarTodos();
    return res.json(alunos);
  } catch (erro) {
    console.error('Erro ao listar alunos:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

router.delete('/alunos/:email', async (req, res) => {
  try {
    const removido = await Aluno.deletarPorEmail(req.params.email);
    if (!removido) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    console.error('Erro ao remover aluno:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;
