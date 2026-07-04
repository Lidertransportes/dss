/*
==========================================
LÍDER TRANSPORTES
DSS Diário
Versão 1.0
==========================================
*/

const dataHoje = document.getElementById("dataHoje");
const status = document.getElementById("status");
const mensagem = document.getElementById("mensagem");
const btnAbrir = document.getElementById("btnAbrir");

// Dias da semana
const diasSemana = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];

// Data atual
const hoje = new Date();

const dia = String(hoje.getDate()).padStart(2, "0");
const mes = String(hoje.getMonth() + 1).padStart(2, "0");
const ano = hoje.getFullYear();

const dataAtual = `${dia}/${mes}/${ano}`;

dataHoje.innerHTML =
`${diasSemana[hoje.getDay()]}<br>${dataAtual}`;

carregarDSS();

async function carregarDSS() {

    try {

        const resposta = await fetch("./dados.json?v=" + Date.now(), {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao carregar dados.json");
        }

        const dados = await resposta.json();

        const registro = dados.find(item =>
            item.data.trim() === dataAtual
        );

        if (!registro) {

            status.textContent = "🔴 Não disponível";
            status.className = "valor status-erro";

            mensagem.textContent =
            "Não existe DSS disponível para a data de hoje.";

            btnAbrir.disabled = true;

            return;

        }

        status.textContent = "🟢 Disponível";
        status.className = "valor status-ok";

        mensagem.textContent =
        "Clique no botão abaixo para abrir o DSS.";

        btnAbrir.disabled = false;

        btnAbrir.onclick = function () {

            window.location.href = registro.link;

        };

    }

    catch (erro) {

        console.error(erro);

        status.textContent = "⚠️ Erro";
        status.className = "valor status-erro";

        mensagem.textContent =
        "Erro ao carregar as informações do DSS.";

        btnAbrir.disabled = true;

    }

}
