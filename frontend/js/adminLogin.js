// valida a chave de admin no backend e salva sessão local (sem id.udesc por enquanto)

document.getElementById("adminLoginForm").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    ocultarErro("mensagemErro");

    const chave = document.getElementById("chaveAdmin").value;

    const botao = evento.target.querySelector(".btn-submit");
    botao.disabled = true;
    botao.textContent = "Verificando...";

    try {
        const resposta = await fetch(`${API_BASE_URL}/admin/professores`, {
            headers: { "x-admin-key": chave },
        });

        if (!resposta.ok) {
            exibirErro("mensagemErro", "Chave de acesso inválida.");
            return;
        }

        salvarSessao({ token: null, tipo: "ADMIN", nome: "Administrador", email: "admin", adminKey: chave });
        window.location.href = "adminUsuarios.html";
    } catch (erro) {
        exibirErro("mensagemErro", "Erro ao conectar com o servidor. Tente novamente.");
    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
});
