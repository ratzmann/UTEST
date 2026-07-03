// cadastro de professor - valida confirmação de senha antes de mandar pro back

document.getElementById("cadastroForm").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    ocultarErro("mensagemErro");
    document.getElementById("mensagemSucesso").style.display = "none";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (senha !== confirmarSenha) {
        exibirErro("mensagemErro", "As senhas não coincidem.");
        return;
    }

    const botao = evento.target.querySelector(".btn-submit");
    botao.disabled = true;
    botao.textContent = "Cadastrando...";

    try {
        const resposta = await apiFetch("/auth/professor/cadastro", {
            method: "POST",
            body: JSON.stringify({ nome, email, senha }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            exibirErro("mensagemErro", dados.mensagem || "Não foi possível concluir o cadastro.");
            return;
        }

        const mensagemSucesso = document.getElementById("mensagemSucesso");
        mensagemSucesso.textContent = "Cadastro realizado! Redirecionando para o login...";
        mensagemSucesso.style.display = "block";

        setTimeout(() => {
            window.location.href = "loginProfessor.html";
        }, 1500);
    } catch (erro) {
        exibirErro("mensagemErro", "Erro ao conectar com o servidor. Tente novamente.");
    } finally {
        botao.disabled = false;
        botao.textContent = "Cadastrar";
    }
});
