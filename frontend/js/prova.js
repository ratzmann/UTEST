// cronômetro da prova + monitoramento de troca de aba/foco

(function () {
    const parametros = new URLSearchParams(window.location.search);
    const nomeProva = parametros.get('prova') || 'Prova sem identificação';
    const duracaoMinutos = parseInt(parametros.get('duracao'), 10) || 60;

    document.getElementById('tituloProva').textContent = nomeProva;

    // guarda o horário de início na sessão pra não resetar se recarregar a página
    const CHAVE_INICIO = `utest_inicio_${nomeProva}`;
    let inicioMs = parseInt(sessionStorage.getItem(CHAVE_INICIO), 10);
    if (!inicioMs) {
        inicioMs = Date.now();
        sessionStorage.setItem(CHAVE_INICIO, String(inicioMs));
    }

    const duracaoTotalSegundos = duracaoMinutos * 60;
    const elementoCronometro = document.getElementById('cronometro');

    // avisos de tempo restante
    const AVISOS_MINUTOS = [15, 10, 5, 3, 2, 1];
    const avisosDisparados = new Set();

    let finalizando = false;
    let intervaloTimer = null;

    function formatarTempo(segundos) {
        const s = Math.max(0, segundos);
        const min = Math.floor(s / 60);
        const seg = s % 60;
        return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
    }

    function mostrarAlertaTempo(mensagem) {
        const el = document.getElementById('alertaTempo');
        el.textContent = mensagem;
        el.style.display = 'block';
        el.classList.remove('alerta-tempo-anim');
        void el.offsetWidth; // reinicia a animação mesmo se o alerta já estiver visível
        el.classList.add('alerta-tempo-anim');

        clearTimeout(mostrarAlertaTempo._timeout);
        mostrarAlertaTempo._timeout = setTimeout(() => {
            el.style.display = 'none';
        }, 6000);
    }

    function atualizarCronometro() {
        const decorridoSegundos = Math.floor((Date.now() - inicioMs) / 1000);
        const restanteSegundos = duracaoTotalSegundos - decorridoSegundos;
        const restanteMinutos = Math.ceil(restanteSegundos / 60);

        elementoCronometro.textContent = formatarTempo(restanteSegundos);
        elementoCronometro.classList.toggle('timer-critico', restanteSegundos <= 5 * 60 && restanteSegundos > 0);

        AVISOS_MINUTOS.forEach(minuto => {
            if (restanteMinutos === minuto && restanteSegundos > (minuto - 1) * 60 && !avisosDisparados.has(minuto)) {
                avisosDisparados.add(minuto);
                const rotulo = minuto === 1 ? '1 minuto' : `${minuto} minutos`;
                mostrarAlertaTempo(`Atenção: restam ${rotulo} para o encerramento da prova.`);
            }
        });

        if (restanteSegundos <= 0) {
            finalizarProva('tempo_esgotado');
        }
    }

    // finalização da prova
    async function finalizarProva(motivo) {
        if (finalizando) return;
        finalizando = true;

        clearInterval(intervaloTimer);
        pararMonitoramento();

        if (motivo === 'tempo_esgotado') {
            await registrarEvento('tempo_esgotado', 'Tempo esgotado — respostas enviadas automaticamente.');
            sessionStorage.removeItem(CHAVE_INICIO);
            window.location.href = 'finalizacaoProva.html';
            return;
        }

        sessionStorage.removeItem(CHAVE_INICIO);
        window.location.href = 'finalizacaoProva.html';
    }

    document.getElementById('btnFinalizar').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja finalizar a prova? Não será possível alterar as respostas depois.')) {
            finalizarProva('manual');
        }
    });

    intervaloTimer = setInterval(atualizarCronometro, 1000);
    atualizarCronometro();

    // monitoramento: registra quando o aluno troca de aba ou perde o foco

    let totalAlertas = 0;
    const badgeAlertas = document.getElementById('badgeAlertas');
    const ULTIMO_EVENTO_MIN_INTERVALO_MS = 1500; // evita registrar o mesmo desvio duas vezes
    const ultimoDisparoPorTipo = {};

    function atualizarBadgeAlertas() {
        badgeAlertas.style.display = totalAlertas > 0 ? 'inline-block' : 'none';
        badgeAlertas.textContent = `${totalAlertas} alerta${totalAlertas === 1 ? '' : 's'} registrado${totalAlertas === 1 ? '' : 's'}`;
    }

    async function registrarEvento(tipo, detalhe) {
        const agora = Date.now();
        if (agora - (ultimoDisparoPorTipo[tipo] || 0) < ULTIMO_EVENTO_MIN_INTERVALO_MS) return;
        ultimoDisparoPorTipo[tipo] = agora;

        if (tipo !== 'tempo_esgotado') {
            totalAlertas++;
            atualizarBadgeAlertas();
        }

        try {
            await apiFetch('/monitoramento/evento', {
                method: 'POST',
                body: JSON.stringify({ prova: nomeProva, tipo, detalhe }),
            });
        } catch (erro) {
            // erro de rede não pode travar a prova, só não salva o evento
            console.warn('Não foi possível registrar o evento de monitoramento.', erro);
        }
    }

    function aoMudarVisibilidade() {
        if (finalizando) return;
        if (document.hidden) {
            registrarEvento('troca_aba', 'Aba trocada ou janela minimizada durante a prova.');
        }
    }

    function aoPerderFoco() {
        if (finalizando) return;
        // aba ainda visível mas janela sem foco = trocou de programa
        if (!document.hidden) {
            registrarEvento('perda_foco', 'A janela do navegador perdeu o foco durante a prova.');
        }
    }

    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('blur', aoPerderFoco);

    function pararMonitoramento() {
        document.removeEventListener('visibilitychange', aoMudarVisibilidade);
        window.removeEventListener('blur', aoPerderFoco);
    }
})();
