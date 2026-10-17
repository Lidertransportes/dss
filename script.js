/*
LÍDER TRANSPORTES — DSS Diário
Consulta os dados ao abrir a página, a cada minuto e ao voltar para a aba.
*/

const el = {
    data: document.getElementById("dataHoje"),
    situacao: document.getElementById("situacao"),
    icone: document.getElementById("situacaoIcone"),
    titulo: document.getElementById("situacaoTitulo"),
    texto: document.getElementById("situacaoTexto"),
    botao: document.getElementById("btnAbrir"),
    botaoTexto: document.getElementById("btnTexto"),
    instalar: document.getElementById("btnInstalar")
};

const diasSemana = [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"
];

const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

// Só abre links de formulários do Google.
const LINK_VALIDO = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/i;

let carregando = false;
let ultimosDados = null;

/* ---------- Aparência ---------- */

const ESTADOS = {
    verificando: {
        icone: "#i-relogio",
        titulo: "Verificando…",
        texto: "Consultando o DSS de hoje.",
        botao: "Aguarde…"
    },
    ok: {
        icone: "#i-ok",
        titulo: "DSS de hoje disponível",
        texto: "Toque no botão abaixo para preencher.",
        botao: "Abrir DSS de hoje"
    },
    sem: {
        icone: "#i-nao",
        titulo: "Sem DSS para hoje",
        texto: "Não há DSS cadastrado para esta data.",
        botao: "Sem DSS hoje"
    },
    erro: {
        icone: "#i-alerta",
        titulo: "Não foi possível verificar",
        texto: "Confira a internet. Tentando de novo em até 1 minuto.",
        botao: "Tente novamente em instantes"
    }
};

function aplicarEstado(nome, link) {
    const e = ESTADOS[nome];

    el.situacao.className = "situacao " + nome;
    el.icone.setAttribute("href", e.icone);
    el.titulo.textContent = e.titulo;
    el.texto.textContent = e.texto;
    el.botaoTexto.textContent = e.botao;

    if (nome === "ok") {
        el.botao.href = link;
        el.botao.setAttribute("aria-disabled", "false");
    } else {
        el.botao.href = "#";
        el.botao.setAttribute("aria-disabled", "true");
    }
}

// Impede o clique enquanto o botão estiver bloqueado.
el.botao.addEventListener("click", function (evento) {
    if (el.botao.getAttribute("aria-disabled") === "true") {
        evento.preventDefault();
    }
});

/* ---------- Dados ---------- */

function dataDeHoje() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    return {
        chave: `${dia}/${mes}/${hoje.getFullYear()}`,
        extenso: `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]}`
    };
}

function mostrar(dados, hoje) {
    const registro = dados.find(item =>
        String(item.data || "").trim() === hoje.chave
    );
    const link = registro ? String(registro.link || "").trim() : "";

    if (link && LINK_VALIDO.test(link)) {
        aplicarEstado("ok", link);
    } else {
        aplicarEstado("sem");
    }
}

async function carregarDSS() {
    if (carregando) return;
    carregando = true;

    // Recalcula a data a cada consulta, inclusive após a meia-noite.
    const hoje = dataDeHoje();
    el.data.textContent = hoje.extenso;

    try {
        const resposta = await fetch("./dados.json?v=" + Date.now(), { cache: "no-store" });

        if (!resposta.ok) {
            throw new Error("Erro ao carregar dados.json (" + resposta.status + ")");
        }

        const dados = await resposta.json();
        if (!Array.isArray(dados)) {
            throw new Error("dados.json em formato inesperado");
        }

        ultimosDados = dados;
        mostrar(dados, hoje);

    } catch (erro) {
        console.error(erro);

        // Sem internet ou erro momentâneo: se já carregou antes,
        // continua mostrando o DSS do dia em vez de bloquear o motorista.
        if (ultimosDados) {
            mostrar(ultimosDados, hoje);
        } else {
            aplicarEstado("erro");
        }

    } finally {
        carregando = false;
    }
}

aplicarEstado("verificando");
carregarDSS();
setInterval(carregarDSS, 60000);

document.addEventListener("visibilitychange", function () {
    if (!document.hidden) carregarDSS();
});
window.addEventListener("online", carregarDSS);

/* ---------- Atalho na tela inicial ---------- */

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
}

let pedidoInstalacao = null;

window.addEventListener("beforeinstallprompt", function (evento) {
    evento.preventDefault();
    pedidoInstalacao = evento;
    el.instalar.hidden = false;
});

el.instalar.addEventListener("click", async function () {
    if (!pedidoInstalacao) return;
    pedidoInstalacao.prompt();
    await pedidoInstalacao.userChoice;
    pedidoInstalacao = null;
    el.instalar.hidden = true;
});

window.addEventListener("appinstalled", function () {
    el.instalar.hidden = true;
});
