const sessao = exigirSessao('PROFESSOR', 'loginProfessor.html');

    if (sessao) {
        const nome = sessao.nome || sessao.email;
        const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
        document.getElementById('nomeNav').textContent = 'Prof. ' + nome;
        document.getElementById('iniciaisNav').textContent = iniciais;
    }

    let contadorQuestoes = 0;

    const params = new URLSearchParams(window.location.search);
    const provaIdEdicao = params.get('id');
    const modoEdicao = Boolean(provaIdEdicao);

    function mostrarErro(mensagem) {
        const erro = document.getElementById('mensagemErro');
        erro.textContent = mensagem;
        erro.style.display = 'block';
        document.getElementById('mensagemSucesso').style.display = 'none';
    }

    function limparMensagens() {
        document.getElementById('mensagemErro').style.display = 'none';
        document.getElementById('mensagemSucesso').style.display = 'none';
    }

    function arquivoParaBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function gerarAlternativasPadrao(questaoId) {
    return ['A', 'B', 'C', 'D', 'E'].map(letra => `
        <label class="alternativa-editor">
            <input class="radio-correta" type="radio" name="correta${questaoId}" value="${letra}">
            <span class="alt-letra">${letra}</span>
            <input class="alt-texto" type="text" placeholder="Alternativa ${letra}" data-letra="${letra}">
        </label>
    `).join('');
}

    function gerarAlternativasVF(questaoId) {
    return [
        { letra: 'V', texto: 'Verdadeiro' },
        { letra: 'F', texto: 'Falso' },
    ].map(alt => `
        <label class="alternativa-editor">
            <input class="radio-correta" type="radio" name="correta${questaoId}" value="${alt.letra}">
            <span class="alt-letra">${alt.letra}</span>
            <input class="alt-texto" type="text" value="${alt.texto}" readonly data-letra="${alt.letra}">
        </label>
    `).join('');
}

    function atualizarTipo(questaoId, tipo) {
        const card = document.getElementById('questao-' + questaoId);
        const altsDiv = card.querySelector('.alternativas');

        if (tipo === 'dissertativa') {
            altsDiv.innerHTML = '<p class="texto-ajuda">Questão dissertativa será corrigida manualmente.</p>';
        } else if (tipo === 'vf') {
            altsDiv.innerHTML = gerarAlternativasVF(questaoId);
        } else {
            altsDiv.innerHTML = gerarAlternativasPadrao(questaoId);
        }
    }

    function adicionarQuestao() {
        contadorQuestoes++;

        const num = document.querySelectorAll('.questao-card').length + 1;
        document.getElementById('totalQuestoes').textContent = 'Total de questões: ' + String(num).padStart(2, '0');

        const card = document.createElement('div');
        card.className = 'questao-card';
        card.id = 'questao-' + contadorQuestoes;

        const qId = contadorQuestoes;

        card.innerHTML = `
            <div class="questao-top">
                <span>Questão ${String(num).padStart(2, '0')}</span>
                <button class="btn-remover-questao" onclick="removerQuestao('questao-${qId}')" title="Remover questão">×</button>
            </div>

            <label class="label-campo">Enunciado</label>
            <textarea class="enunciado-input" placeholder="Digite o enunciado da questão..." rows="4"></textarea>

            <label class="label-campo">Anexo da questão</label>
            <input type="file" class="anexo-questao" accept="image/*,.pdf">

            <div class="tipo-questao">
                <label class="tipo-opcao">
                    <input type="radio" name="tipo${qId}" value="dissertativa" onchange="atualizarTipo(${qId}, 'dissertativa')">
                    <span class="custom-sq"></span> Dissertativa
                </label>

                <label class="tipo-opcao">
                    <input type="radio" name="tipo${qId}" value="multipla" onchange="atualizarTipo(${qId}, 'multipla')" checked>
                    <span class="custom-sq"></span> Múltipla escolha
                </label>

                <label class="tipo-opcao">
                    <input type="radio" name="tipo${qId}" value="vf" onchange="atualizarTipo(${qId}, 'vf')">
                    <span class="custom-sq"></span> Verdadeiro ou Falso
                </label>
            </div>

            <div class="alternativas">
                ${gerarAlternativasPadrao(qId)}
            </div>
        `;

        document.getElementById('listaQuestoes').appendChild(card);
    }

    function removerQuestao(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.remove();

        const cards = document.querySelectorAll('.questao-card');
        cards.forEach((c, i) => {
            const top = c.querySelector('.questao-top span');
            if (top) top.textContent = 'Questão ' + String(i + 1).padStart(2, '0');
        });

        document.getElementById('totalQuestoes').textContent = 'Total de questões: ' + String(cards.length).padStart(2, '0');
    }

    async function carregarProvaParaEdicao() {
    try {
        const resp = await apiFetch(`/provas/${provaIdEdicao}`);

        if (!resp.ok) throw new Error();

        const prova = await resp.json();

        document.querySelector('.page-sidebar h2').textContent = 'Editar prova';
        document.querySelector('.page-sidebar p').textContent = 'Atualize sua avaliação';
        document.querySelector('.btn-submit').textContent = 'Salvar Alterações';

        document.getElementById('nomeProva').value = prova.nome || '';
        document.getElementById('duracao').value = prova.duracao || '';

        if (prova.data) {
            document.getElementById('data').value = prova.data.substring(0, 10);
        }

        document.getElementById('listaQuestoes').innerHTML = '';
        contadorQuestoes = 0;

        (prova.questoes || []).forEach(q => adicionarQuestaoExistente(q));

        document.getElementById('totalQuestoes').textContent =
            'Total de questões: ' + String((prova.questoes || []).length).padStart(2, '0');
    } catch (e) {
        mostrarErro('Erro ao carregar a prova para edição.');
        adicionarQuestao();
    }
}

    function adicionarQuestaoExistente(q) {
    contadorQuestoes++;

    const num = document.querySelectorAll('.questao-card').length + 1;
    const qId = contadorQuestoes;

    const card = document.createElement('div');
    card.className = 'questao-card';
    card.id = 'questao-' + qId;

    card.innerHTML = `
        <div class="questao-top">
            <span>Questão ${String(num).padStart(2, '0')}</span>
            <button class="btn-remover-questao" onclick="removerQuestao('questao-${qId}')" title="Remover questão">×</button>
        </div>

        <label class="label-campo">Enunciado</label>
        <textarea class="enunciado-input" placeholder="Digite o enunciado da questão..." rows="4">${q.enunciado || ''}</textarea>

        <label class="label-campo">Anexo da questão</label>
        <input type="file" class="anexo-questao" accept="image/*,.pdf">

        ${q.anexo_nome ? `<p class="texto-ajuda">Anexo atual: ${q.anexo_nome}. Envie outro arquivo apenas se quiser substituir.</p>` : ''}

        <div class="tipo-questao">
            <label class="tipo-opcao">
                <input type="radio" name="tipo${qId}" value="dissertativa" onchange="atualizarTipo(${qId}, 'dissertativa')" ${q.tipo === 'dissertativa' ? 'checked' : ''}>
                <span class="custom-sq"></span> Dissertativa
            </label>

            <label class="tipo-opcao">
                <input type="radio" name="tipo${qId}" value="multipla" onchange="atualizarTipo(${qId}, 'multipla')" ${q.tipo === 'multipla' ? 'checked' : ''}>
                <span class="custom-sq"></span> Múltipla escolha
            </label>

            <label class="tipo-opcao">
                <input type="radio" name="tipo${qId}" value="vf" onchange="atualizarTipo(${qId}, 'vf')" ${q.tipo === 'vf' ? 'checked' : ''}>
                <span class="custom-sq"></span> Verdadeiro ou Falso
            </label>
        </div>

        <div class="alternativas"></div>
    `;

    if (q.id) {
    card.dataset.questaoId = q.id;
}

    document.getElementById('listaQuestoes').appendChild(card);

    const altsDiv = card.querySelector('.alternativas');

    if (q.tipo === 'dissertativa') {
        altsDiv.innerHTML = '<p class="texto-ajuda">Questão dissertativa será corrigida manualmente.</p>';
        return;
    }

    const alternativas = q.alternativas || [];
    altsDiv.innerHTML = alternativas.map(alt => `
        <label class="alternativa-editor">
            <input class="radio-correta" type="radio" name="correta${qId}" value="${alt.letra}" ${alt.correta ? 'checked' : ''}>
            <span class="alt-letra">${alt.letra}</span>
            <input class="alt-texto" type="text" value="${alt.texto || ''}" data-letra="${alt.letra}" ${q.tipo === 'vf' ? 'readonly' : ''}>
        </label>
    `).join('');
}

    async function salvarProva() {
        limparMensagens();

        const nome = document.getElementById('nomeProva').value.trim();
        const duracao = document.getElementById('duracao').value.trim();
        const data = document.getElementById('data').value;

        if (!nome) {
            mostrarErro('Informe o nome da prova.');
            return;
        }

        const cards = document.querySelectorAll('.questao-card');

        if (cards.length === 0) {
            mostrarErro('Adicione ao menos uma questão.');
            return;
        }

        const questoes = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const enunciado = card.querySelector('.enunciado-input').value.trim();

            if (!enunciado) {
                mostrarErro(`Questão ${i + 1}: preencha o enunciado.`);
                return;
            }

            const tipoSel = card.querySelector('input[type="radio"][name^="tipo"]:checked');
            const tipo = tipoSel ? tipoSel.value : 'multipla';

            const anexoInput = card.querySelector('.anexo-questao');
            let anexo = null;

            if (anexoInput && anexoInput.files.length > 0) {
                const file = anexoInput.files[0];

                if (file.size > 5 * 1024 * 1024) {
                    mostrarErro(`Questão ${i + 1}: o anexo deve ter no máximo 5 MB.`);
                    return;
                }

                anexo = {
                    nome: file.name,
                    tipo: file.type,
                    dados: await arquivoParaBase64(file),
                };
            }

            const alternativas = [];

            if (tipo !== 'dissertativa') {
                const corretaSelecionada = card.querySelector('input[name^="correta"]:checked');
                const letraCorreta = corretaSelecionada ? corretaSelecionada.value : null;

                if (!letraCorreta) {
                    mostrarErro(`Questão ${i + 1}: selecione a alternativa correta.`);
                    return;
                }

                const inputs = card.querySelectorAll('.alternativas input[type="text"]');

                inputs.forEach(inp => {
                    const texto = inp.value.trim();

                    if (texto) {
                        alternativas.push({
                            letra: inp.dataset.letra,
                            texto,
                            correta: inp.dataset.letra === letraCorreta,
                        });
                    }
                });

                if (alternativas.length < 2) {
                    mostrarErro(`Questão ${i + 1}: preencha ao menos 2 alternativas.`);
                    return;
                }

                if (!alternativas.some(alt => alt.correta)) {
                    mostrarErro(`Questão ${i + 1}: a alternativa correta precisa estar preenchida.`);
                    return;
                }
            }

            const idOriginal = card.dataset.questaoId ? Number(card.dataset.questaoId) : null;

            questoes.push({
            id: idOriginal,
            enunciado,
            tipo,
            alternativas,
            anexo,
            });
        }

        const btn = document.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const resp = await apiFetch(modoEdicao ? `/provas/${provaIdEdicao}` : '/provas', {
            method: modoEdicao ? 'PUT' : 'POST',
            body: JSON.stringify({ nome, duracao, data, questoes }),
            });

            const dados = await resp.json();

            if (!resp.ok) {
                mostrarErro(dados.mensagem || 'Erro ao salvar.');
                return;
            }

            document.getElementById('mensagemSucesso').textContent = 'Prova salva com sucesso! Redirecionando...';
            document.getElementById('mensagemSucesso').style.display = 'block';

            setTimeout(() => window.location.href = 'provaProfessor.html', 1000);
        } catch (e) {
            mostrarErro('Erro ao conectar com o servidor.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Finalizar Prova';
        }
    }

    if (modoEdicao) {
    carregarProvaParaEdicao();
} else {
    adicionarQuestao();
}
