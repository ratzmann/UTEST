const sessao = exigirSessao('PROFESSOR', 'loginProfessor.html');

    if (sessao) {
        const nome = sessao.nome || sessao.email;
        const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

        document.getElementById('nomeProfessor').textContent = 'Prof. ' + nome;
        document.getElementById('iniciaisProfessor').textContent = iniciais;

        carregarProvas();
    }

    async function carregarProvas() {
        const lista = document.getElementById('listaProvas');

        try {
            const resp = await apiFetch('/provas');

            if (!resp.ok) throw new Error();

            const provas = await resp.json();

            if (provas.length === 0) {
                lista.innerHTML = '<p class="tabela-vazia">Você ainda não criou nenhuma prova. Clique em "+ Nova prova" para começar.</p>';
                return;
            }

            lista.innerHTML = provas.map(p => {
                const data = p.data ? new Date(p.data).toLocaleDateString('pt-BR') : 'Sem data';
                const duracao = p.duracao ? `${p.duracao} min` : '';

                return `
                    <div class="exam-card">
                        <div class="exam-header">
                            <h2 class="exam-title">${p.nome}</h2>

                            <div class="exam-meta">
                                <span>${data}</span>
                                ${duracao ? `<span>${duracao}</span>` : ''}
                            </div>
                        </div>

                        <div class="exam-actions">
                            <div class="left-actions">
                                <a href="cadastroProva.html?id=${p.id}" class="action-link">Editar</a>
                                <a href="resultadosProva.html?id=${p.id}&prova=${encodeURIComponent(p.nome)}" class="action-link">Resultados</a>
                            </div>

                            <div class="right-actions">
                                <button class="action-link link-copy" onclick="copiarLink(${p.id})">Copiar link</button>
                                <button class="action-link link-danger" onclick="apagarProva(${p.id}, '${p.nome.replace(/'/g, "\\'")}')">Apagar</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            lista.innerHTML = '<p class="tabela-vazia">Erro ao carregar provas. Tente recarregar a página.</p>';
        }
    }

    function copiarLink(provaId) {
        const link = `${window.location.origin}/html/prova.html?id=${provaId}`;
        navigator.clipboard.writeText(link).then(() => alert('Link copiado!\n' + link));
    }

    async function apagarProva(id, nome) {
        if (!confirm(`Tem certeza que deseja apagar a prova "${nome}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const resp = await apiFetch(`/provas/${id}`, { method: 'DELETE' });

            if (!resp.ok) throw new Error();

            carregarProvas();
        } catch (e) {
            alert('Erro ao apagar a prova. Tente novamente.');
        }
    }
