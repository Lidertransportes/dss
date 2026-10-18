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

/* ---------- Fontes dos dados ----------
   1º a planilha do Google, lida direto (DSS aparece ~5 min após postar).
   2º o dados.json do GitHub, atualizado pelo robô (reserva se o Google falhar). */

const URL_PLANILHA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?gid=0&single=true&output=csv";

async function buscar(url, tempoLimite) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), tempoLimite);
    try {
        const resposta = await fetch(url, { cache: "no-store", signal: controle.signal });
        if (!resposta.ok) throw new Error(url + " respondeu " + resposta.status);
        return resposta;
    } finally {
        clearTimeout(timer);
    }
}

// Leitor de CSV simples (aceita campos entre aspas, vírgulas e quebras de linha dentro deles).
function lerCSV(texto) {
    texto = texto.replace(/^﻿/, "");
    const linhas = [];
    let linha = [], campo = "", aspas = false;
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (aspas) {
            if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
            else if (c === '"') aspas = false;
            else campo += c;
        } else if (c === '"') aspas = true;
        else if (c === ",") { linha.push(campo); campo = ""; }
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && texto[i + 1] === "\n") i++;
            linha.push(campo); campo = "";
            linhas.push(linha); linha = [];
        } else campo += c;
    }
    if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter(l => l.some(v => v.trim() !== ""));
}

// Aceita 1/9/2026, 01/09/26, 2026-09-01 etc. e devolve 01/09/2026.
function normalizarData(valor) {
    const v = String(valor || "").trim();
    let d, m, a, r;
    if ((r = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/))) [, d, m, a] = r;
    else if ((r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, a, m, d] = r;
    else return "";
    a = Number(a); if (a < 100) a += 2000;
    return String(Number(d)).padStart(2, "0") + "/" + String(Number(m)).padStart(2, "0") + "/" + a;
}

async function lerPlanilha() {
    const texto = await (await buscar(URL_PLANILHA, 8000)).text();
    if (/^\s*</.test(texto)) throw new Error("Google devolveu HTML em vez do CSV");

    const linhas = lerCSV(texto);
    const cab = (linhas[0] || []).map(c => c.trim().toLowerCase());
    const iData = cab.indexOf("data"), iLink = cab.indexOf("link");
    if (iData === -1 || iLink === -1) throw new Error("Colunas Data/Link não encontradas na planilha");

    const dados = linhas.slice(1)
        .map(l => ({ data: normalizarData(l[iData]), link: String(l[iLink] || "").trim() }))
        .filter(x => x.data);
    if (!dados.length) throw new Error("Planilha sem registros");
    return dados;
}

async function lerReserva() {
    const dados = await (await buscar("./dados.json?v=" + Date.now(), 8000)).json();
    if (!Array.isArray(dados)) throw new Error("dados.json em formato inesperado");
    return dados;
}

async function carregarDSS() {
    if (carregando) return;
    carregando = true;

    // Recalcula a data a cada consulta, inclusive após a meia-noite.
    const hoje = dataDeHoje();
    el.data.textContent = hoje.extenso;

    try {
        let dados;
        try {
            dados = await lerPlanilha();
        } catch (erroPlanilha) {
            console.warn("Planilha indisponível, usando dados.json:", erroPlanilha);
            dados = await lerReserva();
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
