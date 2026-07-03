const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080/api"
    : `${window.location.protocol}//${window.location.hostname}:8080/api`;

const AUTH_STORAGE_KEY = "utest_auth";

function salvarSessao(authResponse) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResponse));
}

function obterSessao() {
    const dados = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return dados ? JSON.parse(dados) : null;
}

function limparSessao() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function obterToken() {
    const sessao = obterSessao();
    return sessao ? sessao.token : null;
}

async function apiFetch(path, options = {}) {
    const token = obterToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });
}

function exibirErro(elementoId, mensagem) {
    const el = document.getElementById(elementoId);
    if (el) {
        el.textContent = mensagem;
        el.style.display = "block";
    }
}

function ocultarErro(elementoId) {
    const el = document.getElementById(elementoId);
    if (el) {
        el.style.display = "none";
    }
}

function exigirSessao(tipoEsperado, paginaLogin) {
    const sessao = obterSessao();

    if (!sessao || sessao.tipo !== tipoEsperado) {
        const destino = `${window.location.pathname.split('/').pop()}${window.location.search}`;
        window.location.replace(`${paginaLogin}?redirect=${encodeURIComponent(destino)}`);
        return null;
    }

    return sessao;
}

function fazerLogout(paginaLogin) {
    limparSessao();
    window.location.href = paginaLogin;
}