// cadastro e login de professor, login de aluno

const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();

const { gerarToken }  = require('../config/jwt');
const Professor       = require('../models/professor');
const Aluno           = require('../models/aluno');

const DOMINIO_INSTITUCIONAL = (process.env.ALUNO_DOMINIO_INSTITUCIONAL || '@edu.udesc.br').toLowerCase();
const BCRYPT_SALT_ROUNDS    = 12; // custo do hash, quanto maior mais seguro (e mais lento)

// cadastro de professor

router.post('/professor/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
  }

  if (senha.length < 8) {
    return res.status(400).json({ mensagem: 'A senha deve ter no mínimo 8 caracteres.' });
  }

  try {
    if (await Professor.emailExiste(email)) {
      return res.status(409).json({ mensagem: 'Já existe um professor cadastrado com este email.' });
    }

    // nunca salva a senha em texto puro
    const senhaHash = await bcrypt.hash(senha, BCRYPT_SALT_ROUNDS);
    const professor = await Professor.criar(nome, email, senhaHash);

    return res.status(201).json({
      token: null,
      tipo:  'PROFESSOR',
      nome:  professor.nome,
      email: professor.email,
    });
  } catch (erro) {
    console.error('Erro no cadastro de professor:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// login de professor

router.post('/professor/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
  }

  try {
    const professor = await Professor.buscarPorEmail(email);

    // mensagem genérica de propósito, não entrega se o email existe
    if (!professor) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, professor.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos.' });
    }

    const token = gerarToken(professor.email, 'PROFESSOR');

    return res.json({
      token,
      tipo:  'PROFESSOR',
      nome:  professor.nome,
      email: professor.email,
    });
  } catch (erro) {
    console.error('Erro no login de professor:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// login de aluno

router.post('/aluno/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ mensagem: 'Email é obrigatório.' });
  }

  if (!email.endsWith(DOMINIO_INSTITUCIONAL)) {
    return res.status(400).json({
      mensagem: `Utilize seu email institucional (${DOMINIO_INSTITUCIONAL}).`,
    });
  }

  try {
    // primeiro acesso cria o aluno automaticamente
    let aluno = await Aluno.buscarPorEmail(email);
    if (!aluno) {
      // vira "joao.silva" -> "Joao Silva"
      const nome = email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      aluno = await Aluno.criar(nome, email);
    }

    const token = gerarToken(aluno.email_institucional, 'ALUNO');

    return res.json({
      token,
      tipo:  'ALUNO',
      nome:  aluno.nome,
      email: aluno.email_institucional,
    });
  } catch (erro) {
    console.error('Erro no login de aluno:', erro);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;
