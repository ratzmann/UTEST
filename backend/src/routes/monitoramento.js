// endpoints de monitoramento anti-fraude: aluno registra desvio de foco, professor consulta

const express = require('express');
const router  = express.Router();

const { autenticar, autorizarTipo } = require('../middleware/autenticar');
const Monitoramento = require('../models/monitoramento');

const TIPOS_VALIDOS = ['troca_aba', 'minimizado', 'perda_foco', 'tempo_esgotado'];

// aluno registra um evento de desvio de foco

router.post('/evento', autenticar, autorizarTipo('ALUNO'), async (req, res) => {
  const { prova, tipo, detalhe } = req.body;

  if (!prova || !tipo) {
    return res.status(400).json({ mensagem: 'Prova e tipo do evento são obrigatórios.' });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ mensagem: 'Tipo de evento inválido.' });
  }

  try {
    const evento = await Monitoramento.registrar(prova, req.usuario.email, tipo, detalhe);
    return res.status(201).json(evento);
  } catch (erro) {
    console.error('Erro ao registrar evento de monitoramento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// professor consulta o resumo de alertas de uma prova

router.get('/:prova/resumo', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const resumo = await Monitoramento.contarPorAluno(req.params.prova);
    return res.json(resumo);
  } catch (erro) {
    console.error('Erro ao consultar resumo de monitoramento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// professor consulta a lista completa de eventos de uma prova

router.get('/:prova', autenticar, autorizarTipo('PROFESSOR'), async (req, res) => {
  try {
    const eventos = await Monitoramento.listarPorProva(req.params.prova);
    return res.json(eventos);
  } catch (erro) {
    console.error('Erro ao listar eventos de monitoramento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;
