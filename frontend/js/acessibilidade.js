// controla tema (claro/escuro) e tamanho de fonte, salva a escolha do usuário
const CHAVE_TEMA = 'utest_tema';
const CHAVE_FONTE = 'utest_fonte';
const TAMANHOS_FONTE = ['normal', 'fonte-media', 'fonte-grande'];

function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    localStorage.setItem(CHAVE_TEMA, tema);
}

function alternarTema() {
    const atual = document.documentElement.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
    aplicarTema(atual);
}

function aplicarFonte(tamanho) {
    TAMANHOS_FONTE.forEach(classe => document.documentElement.classList.remove(classe));
    if (tamanho !== 'normal') {
        document.documentElement.classList.add(tamanho);
    }
    localStorage.setItem(CHAVE_FONTE, tamanho);
}

function aumentarFonte() {
    const atual = localStorage.getItem(CHAVE_FONTE) || 'normal';
    const proximoIndex = Math.min(TAMANHOS_FONTE.indexOf(atual) + 1, TAMANHOS_FONTE.length - 1);
    aplicarFonte(TAMANHOS_FONTE[proximoIndex]);
}

function diminuirFonte() {
    const atual = localStorage.getItem(CHAVE_FONTE) || 'normal';
    const proximoIndex = Math.max(TAMANHOS_FONTE.indexOf(atual) - 1, 0);
    aplicarFonte(TAMANHOS_FONTE[proximoIndex]);
}

// aplica a preferência salva assim que a página carrega
aplicarTema(localStorage.getItem(CHAVE_TEMA) || 'claro');
aplicarFonte(localStorage.getItem(CHAVE_FONTE) || 'normal');

document.addEventListener('DOMContentLoaded', () => {
    const btnTema = document.getElementById('btnAlternarTema');
    const btnMais = document.getElementById('btnAumentarFonte');
    const btnMenos = document.getElementById('btnDiminuirFonte');

    if (btnTema) btnTema.addEventListener('click', alternarTema);
    if (btnMais) btnMais.addEventListener('click', aumentarFonte);
    if (btnMenos) btnMenos.addEventListener('click', diminuirFonte);
});
