const sessao = exigirSessao('PROFESSOR', 'loginProfessor.html');

const parametros = new URLSearchParams(window.location.search);
const provaId = parametros.get('id');
const nomeProva = parametros.get('prova') || 'Prova sem nome';

document.getElementById('tituloProva').textContent = `Resultados — ${nomeProva}`;
document.title = `UTEST - Resultados: ${nomeProva}`;

if (sessao) {
    const nome = sessao.nome || sessao.email;
    const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

    document.querySelector('.profile-name').textContent = 'Prof. ' + nome;
    document.querySelector('.profile-avatar').textContent = iniciais;
}

function renderizarTabela(alunos) {
    const corpo = document.getElementById('corpoResultados');

    if (!alunos.length) {
        corpo.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum aluno enviou respostas ainda.</td></tr>';
        return;
    }

    corpo.innerHTML = alunos.map(aluno => `
        <tr>
            <td>${aluno.aluno_nome}</td>

            <td>
                <span class="status-pill status-concluida">
                    Concluída
                </span>
            </td>

            <td>${aluno.nota_objetiva !== null ? Number(aluno.nota_objetiva).toFixed(1) : '—'}</td>

            <td>${aluno.tempo_utilizado ? `${Math.ceil(Number(aluno.tempo_utilizado) / 60)} min` : '—'}</td>

            <td class="alerta-contagem ${Number(aluno.alertas) > 0 ? 'tem-alerta' : ''}">
    ${aluno.alertas || 0}
</td>

            <td>
            <button class="action-link" onclick="verRespostasAluno(${aluno.resposta_id})">
             Ver respostas
            </button>
            </td>
        </tr>
    `).join('');
}

function renderizarResumo(alunos) {
    const total = alunos.length;

    const notas = alunos
        .filter(a => a.nota_objetiva !== null)
        .map(a => Number(a.nota_objetiva));

    const media = notas.length
        ? notas.reduce((soma, nota) => soma + nota, 0) / notas.length
        : null;

    const alertas = alunos.reduce((soma, aluno) => soma + Number(aluno.alertas || 0), 0);

    document.getElementById('resumoTotal').textContent = total;
    document.getElementById('resumoConcluidas').textContent = `${total}/${total}`;
    document.getElementById('resumoMedia').textContent = media !== null ? media.toFixed(1) : '—';
    document.getElementById('resumoAlertas').textContent = alertas;
}

async function iniciar() {
    if (!provaId) {
        document.getElementById('corpoResultados').innerHTML =
            '<tr><td colspan="5" class="tabela-vazia">Prova não informada.</td></tr>';
        return;
    }

    try {
        const resp = await apiFetch(`/provas/${provaId}/resultados`);

        if (!resp.ok) throw new Error();

        const alunos = await resp.json();

        document.getElementById('avisoMonitoramento').style.display = 'inline';
        document.getElementById('avisoMonitoramento').textContent =
            'Resultados exibidos apenas a partir das respostas enviadas pelos alunos.';

        renderizarTabela(alunos);
        renderizarResumo(alunos);
    } catch (erro) {
        document.getElementById('corpoResultados').innerHTML =
            '<tr><td colspan="5" class="tabela-vazia">Erro ao carregar resultados.</td></tr>';
    }
}

async function verRespostasAluno(respostaId) {
    try {
        const resp = await apiFetch(`/provas/${provaId}/resultados/${respostaId}`);

        if (!resp.ok) throw new Error();

        const dados = await resp.json();

        const linhas = dados.questoes.map(q => {
            const resposta = q.tipo === 'dissertativa'
                ? (q.resposta_texto || 'Sem resposta')
                : `${q.alternativa_letra || '-'}${q.alternativa_texto ? ') ' + q.alternativa_texto : ''}`;

            const status = q.tipo === 'dissertativa'
                ? 'Correção manual'
                : (q.correta ? 'Correta' : 'Incorreta');

            return `
Questão ${q.numero}
${q.enunciado}

Resposta: ${resposta}
Status: ${status}
`;
        }).join('\n-----------------------------\n');

        alert(`Respostas de ${dados.aluno_nome}\n\n${linhas}`);
    } catch (erro) {
        alert('Não foi possível carregar as respostas do aluno.');
    }
}


if (sessao) {
    iniciar();
}