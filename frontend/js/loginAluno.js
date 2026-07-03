document.getElementById("loginForm").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    ocultarErro("mensagemErro");

    const email = document.getElementById("email").value.trim();
    const botao = evento.target.querySelector(".btn-submit");

    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const resposta = await apiFetch("/auth/aluno/login", {
            method: "POST",
            body: JSON.stringify({ email }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            exibirErro("mensagemErro", dados.mensagem || "Não foi possível fazer login.");
            return;
        }

        salvarSessao(dados);

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");

        window.location.href = redirect || "prova.html";
    } catch (erro) {
        exibirErro("mensagemErro", "Erro ao conectar com o servidor. Tente novamente.");
    } finally {
        botao.disabled = false;
        botao.textContent = "Começar";
    }
});