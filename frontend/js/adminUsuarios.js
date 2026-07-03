// lista e remove professores/alunos cadastrados (endpoints /api/admin)

const sessaoAdmin = exigirSessao('ADMIN', 'adminLogin.html');

async function adminFetch(path, options = {}) {
    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': sessaoAdmin.adminKey,
            ...(options.headers || {}),
        },
    });
}

function linhaVazia(colunas, texto) {
    return `<tr><td colspan="${colunas}" class="tabela-vazia">${texto}</td></tr>`;
}

async function carregarProfessores() {
    const corpo = document.getElementById('corpoProfessores');
    try {
        const resposta = await adminFetch('/admin/professores');
        if (!resposta.ok) throw new Error('Falha ao carregar professores.');
        const professores = await resposta.json();

        document.getElementById('totalProfessores').textContent = `${professores.length} cadastrado(s)`;

        if (professores.length === 0) {
            corpo.innerHTML = linhaVazia(3, 'Nenhum professor cadastrado ainda.');
            return;
        }

        corpo.innerHTML = professores.map(p => `
            <tr data-email="${p.email}">
                <td>${p.nome}</td>
                <td>${p.email}</td>
                <td><button class="btn-excluir" data-tipo="professores" data-email="${p.email}">Excluir</button></td>
            </tr>
        `).join('');
    } catch (erro) {
        corpo.innerHTML = linhaVazia(3, 'Não foi possível carregar os professores.');
    }
}

async function carregarAlunos() {
    const corpo = document.getElementById('corpoAlunos');
    try {
        const resposta = await adminFetch('/admin/alunos');
        if (!resposta.ok) throw new Error('Falha ao carregar alunos.');
        const alunos = await resposta.json();

        document.getElementById('totalAlunos').textContent = `${alunos.length} cadastrado(s)`;

        if (alunos.length === 0) {
            corpo.innerHTML = linhaVazia(3, 'Nenhum aluno cadastrado ainda.');
            return;
        }

        corpo.innerHTML = alunos.map(a => `
            <tr data-email="${a.email_institucional}">
                <td>${a.nome}</td>
                <td>${a.email_institucional}</td>
                <td><button class="btn-excluir" data-tipo="alunos" data-email="${a.email_institucional}">Excluir</button></td>
            </tr>
        `).join('');
    } catch (erro) {
        corpo.innerHTML = linhaVazia(3, 'Não foi possível carregar os alunos.');
    }
}

// delegação pros botões de excluir (criados dinamicamente)
document.getElementById('corpoProfessores').addEventListener('click', tratarClique);
document.getElementById('corpoAlunos').addEventListener('click', tratarClique);

async function tratarClique(evento) {
    const botao = evento.target.closest('.btn-excluir');
    if (!botao) return;

    const { tipo, email } = botao.dataset;
    if (!confirm(`Tem certeza que deseja excluir o usuário "${email}"?`)) return;

    botao.disabled = true;
    botao.textContent = 'Excluindo...';

    try {
        const resposta = await adminFetch(`/admin/${tipo}/${encodeURIComponent(email)}`, { method: 'DELETE' });
        if (!resposta.ok && resposta.status !== 204) throw new Error('Falha ao excluir.');
        botao.closest('tr').remove();
        if (tipo === 'professores') carregarProfessores(); else carregarAlunos();
    } catch (erro) {
        exibirErro('mensagemErro', 'Não foi possível excluir o usuário. Tente novamente.');
        botao.disabled = false;
        botao.textContent = 'Excluir';
    }
}

if (sessaoAdmin) {
    carregarProfessores();
    carregarAlunos();
}
