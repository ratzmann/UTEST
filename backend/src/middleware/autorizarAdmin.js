// área de admin é só demonstração (sem id.udesc), então a proteção aqui é
// simplificada: uma chave fixa no header "x-admin-key" (ADMIN_SECRET)

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'utest-admin-2026';

function autorizarAdmin(req, res, next) {
  const chave = req.headers['x-admin-key'];

  if (!chave || chave !== ADMIN_SECRET) {
    return res.status(401).json({ mensagem: 'Acesso administrativo não autorizado.' });
  }

  next();
}

module.exports = { autorizarAdmin };
