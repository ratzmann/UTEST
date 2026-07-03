const sessao = exigirSessao('ALUNO', 'loginAluno.html');

    let provaAtual = null;
    let finalizando = false;
    let intervaloTimer = null;
    let inicioMs = null;
    let totalAlertas = 0;
    const ultimoDisparo = {};
    const listenersMonitoramento = [];

    if (sessao) {
        const nome = sessao.nome || sessao.email;
        const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

        document.getElementById('nomeAluno').textContent = nome;
        document.getElementById('iniciaisAluno').textContent = iniciais;

        carregarProva();
    }

    async function carregarProva() {
        const params = new URLSearchParams(window.location.search);
        const provaId = params.get('id');

        if (!provaId) {
            document.getElementById('questoesContainer').innerHTML = '<p class="tabela-vazia">Nenhuma prova selecionada.</p>';
            return;
        }

        try {
            const resp = await apiFetch(`/provas/${provaId}`);

            if (!resp.ok) throw new Error('Prova não encontrada.');

            provaAtual = await resp.json();

            document.title = `UTEST - ${provaAtual.nome}`;
            document.getElementById('tituloProva').textContent = provaAtual.nome;

            if (provaAtual.data) {
                document.getElementById('dataProva').textContent = new Date(provaAtual.data).toLocaleDateString('pt-BR');
            } else {
                document.getElementById('dataProva').style.display = 'none';
            }

            renderizarQuestoes(provaAtual.questoes || []);
            iniciarCronometro(parseInt(provaAtual.duracao, 10) || 60, provaAtual.id);
            iniciarMonitoramento(provaAtual.nome);
        } catch (e) {
            document.getElementById('questoesContainer').innerHTML = `<p class="tabela-vazia">${e.message || 'Erro ao carregar a prova.'}</p>`;
        }
    }

    function renderizarQuestoes(questoes) {
        const container = document.getElementById('questoesContainer');

        if (!questoes.length) {
            container.innerHTML = '<p class="tabela-vazia">Esta prova ainda não possui questões.</p>';
            return;
        }

        const questoesHTML = questoes.map((q, i) => {
            const anexoHTML = q.anexo_dados ? `
                <div class="questao-anexo">
                    ${q.anexo_tipo && q.anexo_tipo.startsWith('image/')
                        ? `<img src="${q.anexo_dados}" alt="${q.anexo_nome || 'Anexo da questão'}">`
                        : `<a href="${q.anexo_dados}" target="_blank" download="${q.anexo_nome || 'anexo'}">Abrir anexo</a>`
                    }
                </div>
            ` : '';

            let respostaHTML = '';

            if (q.tipo === 'dissertativa') {
                respostaHTML = `
                    <div class="questao-resposta-descritiva">
                        <textarea placeholder="Digite sua resposta aqui..." rows="6" data-questao="${q.id}"></textarea>
                    </div>
                `;
            } else {
                respostaHTML = `
                    <div class="questao-alternativas">
                        ${(q.alternativas || []).map(alt => `
                            <label class="alternativa">
                                <input type="radio" name="q${q.id}" value="${alt.letra}">
                                <span class="custom-radio"></span>
                                <span><strong>${alt.letra})</strong> ${alt.texto}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            }

            return `
                <div class="questao-card">
                    <div class="questao-top">Questão ${String(i + 1).padStart(2, '0')}</div>

                    <div class="questao-texto">
                        <p>${q.enunciado}</p>
                        ${anexoHTML}
                    </div>

                    ${respostaHTML}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="questoes-header">
                <h3>Questões</h3>
                <span>Total de questões: ${String(questoes.length).padStart(2, '0')}</span>
            </div>

            ${questoesHTML}

            <div class="acoes-prova">
                <button class="btn-submit" id="btnFinalizar">Finalizar Prova</button>
            </div>
        `;

        document.getElementById('btnFinalizar').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja finalizar a prova? Não será possível alterar as respostas depois.')) {
                finalizarProva('manual');
            }
        });
    }

    function iniciarCronometro(duracaoMinutos, provaId) {
        const chave = `utest_inicio_${provaId}`;

        inicioMs = parseInt(sessionStorage.getItem(chave), 10);

        if (!inicioMs) {
            inicioMs = Date.now();
            sessionStorage.setItem(chave, String(inicioMs));
        }

        const totalSeg = duracaoMinutos * 60;
        const el = document.getElementById('cronometro');
        const avisos = [15, 10, 5, 3, 2, 1];
        const disparados = new Set();

        function formatar(s) {
            const seguro = Math.max(0, s);
            const m = Math.floor(seguro / 60);
            const sec = seguro % 60;
            return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }

        function tick() {
            const decorreu = Math.floor((Date.now() - inicioMs) / 1000);
            const restante = totalSeg - decorreu;

            el.textContent = formatar(restante);
            el.classList.toggle('timer-critico', restante <= 300 && restante > 0);

            avisos.forEach(min => {
                const restMin = Math.ceil(restante / 60);

                if (restMin === min && restante > (min - 1) * 60 && !disparados.has(min)) {
                    disparados.add(min);
                    mostrarAlerta(`Atenção: restam ${min === 1 ? '1 minuto' : min + ' minutos'} para o encerramento.`);
                }
            });

            if (restante <= 0) {
                finalizarProva('tempo_esgotado');
            }
        }

        intervaloTimer = setInterval(tick, 1000);
        tick();
    }

    function mostrarAlerta(msg) {
        const el = document.getElementById('alertaTempo');

        el.textContent = msg;
        el.style.display = 'block';
        el.classList.remove('alerta-tempo-anim');

        void el.offsetWidth;

        el.classList.add('alerta-tempo-anim');

        clearTimeout(mostrarAlerta._t);
        mostrarAlerta._t = setTimeout(() => el.style.display = 'none', 6000);
    }

    function coletarRespostas() {
        return (provaAtual.questoes || []).map(q => {
            if (q.tipo === 'dissertativa') {
                const campo = document.querySelector(`textarea[data-questao="${q.id}"]`);

                return {
                    questaoId: q.id,
                    texto: campo ? campo.value.trim() : '',
                };
            }

            const selecionada = document.querySelector(`input[name="q${q.id}"]:checked`);

            return {
                questaoId: q.id,
                alternativaLetra: selecionada ? selecionada.value : null,
            };
        });
    }

    function calcularTempoUtilizado() {
        if (!inicioMs) return null;
        return Math.floor((Date.now() - inicioMs) / 1000);
    }

    async function finalizarProva(motivo) {
        if (finalizando || !provaAtual) return;

        finalizando = true;

        clearInterval(intervaloTimer);
        pararMonitoramento();

        const btn = document.getElementById('btnFinalizar');

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Enviando...';
        }

        try {
            if (motivo === 'tempo_esgotado') {
                await registrarEvento('tempo_esgotado', 'Tempo esgotado.');
            }

            const resposta = await apiFetch(`/provas/${provaAtual.id}/respostas`, {
                method: 'POST',
                body: JSON.stringify({
                    respostas: coletarRespostas(),
                    tempoUtilizado: calcularTempoUtilizado(),
                }),
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados.mensagem || 'Não foi possível salvar suas respostas.');
            }

            sessionStorage.removeItem(`utest_inicio_${provaAtual.id}`);
            window.location.href = 'finalizacaoProva.html';
        } catch (erro) {
            alert(erro.message || 'Não foi possível salvar suas respostas. Tente novamente.');

            finalizando = false;

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Finalizar Prova';
            }
        }
    }

    async function registrarEvento(tipo, detalhe) {
        const agora = Date.now();

        if (agora - (ultimoDisparo[tipo] || 0) < 1500) return;

        ultimoDisparo[tipo] = agora;

        if (tipo !== 'tempo_esgotado') {
            totalAlertas++;

            const badge = document.getElementById('badgeAlertas');
            badge.style.display = 'inline-block';
            badge.textContent = `${totalAlertas} alerta${totalAlertas === 1 ? '' : 's'} registrado${totalAlertas === 1 ? '' : 's'}`;
        }

        try {
            await apiFetch('/monitoramento/evento', {
                method: 'POST',
                body: JSON.stringify({
                    prova: provaAtual.nome,
                    tipo,
                    detalhe,
                }),
            });
        } catch (e) {}
    }

    function iniciarMonitoramento() {
        const visibilidade = () => {
            if (!finalizando && document.hidden) {
                registrarEvento('troca_aba', 'Aba trocada ou janela minimizada.');
            }
        };

        const perdaFoco = () => {
            if (!finalizando && !document.hidden) {
                registrarEvento('perda_foco', 'Janela perdeu o foco.');
            }
        };

        document.addEventListener('visibilitychange', visibilidade);
        window.addEventListener('blur', perdaFoco);

        listenersMonitoramento.push(() => document.removeEventListener('visibilitychange', visibilidade));
        listenersMonitoramento.push(() => window.removeEventListener('blur', perdaFoco));
    }

    function pararMonitoramento() {
        while (listenersMonitoramento.length) {
            const remover = listenersMonitoramento.pop();
            remover();
        }
    }
