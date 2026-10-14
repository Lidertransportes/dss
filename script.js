/*
LÍDER TRANSPORTES — DSS Diário
Consulta os dados ao abrir a página e a cada minuto.
*/

const dataHoje = document.getElementById("dataHoje");
const status = document.getElementById("status");
const mensagem = document.getElementById("mensagem");
const btnAbrir = document.getElementById("btnAbrir");

const diasSemana = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];

let carregando = false;

async function carregarDSS() {
    if (carregando) return;
    carregando = true;

    // Recalcula a data a cada consulta, inclusive após a meia-noite.
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    const dataAtual = `${dia}/${mes}/${ano}`;

    dataHoje.innerHTML =
        `${diasSemana[hoje.getDay()]}<br>${dataAtual}`;

    // Bloqueia o link anterior enquanto verifica os dados.
    btnAbrir.disabled = true;
    btnAbrir.onclick = null;

    try {
        const resposta = await fetch(
            "./dados.json?v=" + Date.now(),
            { cache: "no-store" }
        );

        if (!resposta.ok) {
            throw new Error("Erro ao carregar dados.json");
        }

        const dados = await resposta.json();

        const registro = dados.find(item =>
            String(item.data || "").trim() === dataAtual
        );

        if (!registro || !String(registro.link || "").trim()) {
            status.textContent = "🔴 Não disponível";
            status.className = "valor status-erro";
            mensagem.textContent =
                "Não existe DSS disponível para a data de hoje.";
            return;
        }

        status.textContent = "🟢 Disponível";
        status.className = "valor status-ok";
        mensagem.textContent =
            "Clique no botão abaixo para abrir o DSS.";

        btnAbrir.disabled = false;
        btnAbrir.onclick = function () {
            window.location.href = String(registro.link).trim();
        };

    } catch (erro) {
        console.error(erro);

        status.textContent = "⚠️ Erro";
        status.className = "valor status-erro";
        mensagem.textContent =
            "Erro ao carregar o DSS. Nova tentativa automática em até 1 minuto.";

    } finally {
        carregando = false;
    }
}

// Consulta ao abrir.
carregarDSS();

// Consulta novamente a cada 60 segundos.
setInterval(carregarDSS, 60000);

// Consulta ao retornar para a aba no navegador.
document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
        carregarDSS();
    }
});
