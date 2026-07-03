// gera e valida token JWT

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'troque-esta-chave-por-uma-bem-longa-e-aleatoria-antes-de-usar-em-producao';
const EXPIRACAO = process.env.JWT_EXPIRATION_MS
  ? Math.floor(parseInt(process.env.JWT_EXPIRATION_MS) / 1000) + 's'
  : '24h';

function gerarToken(email, tipo) {
  return jwt.sign(
    { tipo },           // payload: tipo de usuário (PROFESSOR ou ALUNO)
    SECRET,
    {
      subject: email,   // quem é o usuário
      expiresIn: EXPIRACAO,
    }
  );
}

function verificarToken(token) {
  // devolve o payload se o token for válido, ou joga erro se expirou/adulterou
  return jwt.verify(token, SECRET);
}

module.exports = { gerarToken, verificarToken };
