// checa se o token JWT no header Authorization é válido

const { verificarToken } = require('../config/jwt');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Token não fornecido.' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verificarToken(token);
    req.usuario = {
      email: payload.sub,
      tipo: payload.tipo,
    };
    next();
  } catch (erro) {
    return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
  }
}

// restringe rota por tipo de usuário, ex: autorizarTipo('PROFESSOR')
function autorizarTipo(tipo) {
  return (req, res, next) => {
    if (!req.usuario || req.usuario.tipo !== tipo) {
      return res.status(403).json({ mensagem: 'Acesso não autorizado para este perfil.' });
    }
    next();
  };
}

module.exports = { autenticar, autorizarTipo };
