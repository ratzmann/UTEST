require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { inicializarBanco } = require('./config/database');
const authRoutes           = require('./routes/auth');
const adminRoutes          = require('./routes/admin');
const monitoramentoRoutes  = require('./routes/monitoramento');
const provasRoutes         = require('./routes/provas');

const app  = express();
const PORT = process.env.PORT || 8080;

const origensPermitidas = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:8081').split(',');

app.use(cors({
  origin: origensPermitidas,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',          authRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/monitoramento', monitoramentoRoutes);
app.use('/api/provas',        provasRoutes);

app.get('/actuator/health', (req, res) => res.json({ status: 'UP' }));

async function iniciar() {
  try {
    await inicializarBanco();
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Origens CORS permitidas: ${origensPermitidas.join(', ')}`);
    });
  } catch (erro) {
    console.error('Falha ao iniciar o servidor:', erro);
    process.exit(1);
  }
}

iniciar();