/*
LÍDER TRANSPORTES — DSS Diário
Baixa a planilha publicada do Google e gera o dados.json.

Segurança: se o download falhar ou vier algo estranho, o dados.json
atual NÃO é alterado e o script termina com erro (o GitHub avisa).
*/

const fs = require("fs");
const https = require("https");

const URL_PLANILHA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?gid=0&single=true&output=csv";

const ARQUIVO = "dados.json";
const MAX_REDIRECIONAMENTOS = 5;
const TEMPO_LIMITE_MS = 30000;

// Só aceita links de formulários do Google.
const LINK_VALIDO = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/i;

function baixar(url, redirecionamentos = 0) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume();
                if (redirecionamentos >= MAX_REDIRECIONAMENTOS) {
                    return reject(new Error("Redirecionamentos demais."));
                }
                const proximo = new URL(res.headers.location, url).toString();
                return resolve(baixar(proximo, redirecionamentos + 1));
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Google respondeu com status ${res.statusCode}.`));
            }

            const tipo = String(res.headers["content-type"] || "");
            if (tipo.includes("text/html")) {
                res.resume();
                return reject(new Error("Google devolveu uma página HTML em vez do CSV."));
            }

            let texto = "";
            res.setEncoding("utf8");
            res.on("data", (parte) => (texto += parte));
            res.on("end", () => resolve(texto));
            res.on("error", reject);
        });

        req.setTimeout(TEMPO_LIMITE_MS, () => req.destroy(new Error("Tempo limite esgotado.")));
        req.on("error", reject);
    });
}

// Leitor de CSV simples (aceita campos entre aspas, vírgulas e quebras de linha dentro deles).
function lerCSV(texto) {
    texto = texto.replace(/^﻿/, "");
    const linhas = [];
    let linha = [];
    let campo = "";
    let entreAspas = false;

    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];

        if (entreAspas) {
            if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
            else if (c === '"') entreAspas = false;
            else campo += c;
        } else if (c === '"') {
            entreAspas = true;
        } else if (c === ",") {
            linha.push(campo); campo = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && texto[i + 1] === "\n") i++;
            linha.push(campo); campo = "";
            linhas.push(linha); linha = [];
        } else {
            campo += c;
        }
    }

    if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas.filter(l => l.some(v => v.trim() !== ""));
}

// Aceita 1/9/2026, 01/09/26, 2026-09-01 etc. e devolve sempre 01/09/2026.
function normalizarData(valor) {
    const v = String(valor || "").trim();
    let d, m, a;

    let r = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
    if (r) [, d, m, a] = r;
    else if ((r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, a, m, d] = r;
    else return null;

    d = Number(d); m = Number(m); a = Number(a);
    if (a < 100) a += 2000;

    const teste = new Date(a, m - 1, d);
    if (teste.getFullYear() !== a || teste.getMonth() !== m - 1 || teste.getDate() !== d) return null;

    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

async function principal() {
    const texto = await baixar(URL_PLANILHA);
    const linhas = lerCSV(texto);

    if (linhas.length < 2) throw new Error("A planilha veio vazia.");

    const cabecalho = linhas[0].map(c => c.trim().toLowerCase());
    const colData = cabecalho.indexOf("data");
    const colLink = cabecalho.indexOf("link");

    if (colData === -1 || colLink === -1) {
        throw new Error(`Colunas "Data" e "Link" não encontradas. Cabeçalho recebido: ${linhas[0].join(" | ")}`);
    }

    const dados = [];
    const avisos = [];
    const vistos = new Map();

    for (const [i, linha] of linhas.slice(1).entries()) {
        const numLinha = i + 2;
        const dataOriginal = String(linha[colData] || "").trim();
        const linkOriginal = String(linha[colLink] || "").trim();

        if (!dataOriginal && !linkOriginal) continue;

        const data = normalizarData(dataOriginal);
        if (!data) {
            avisos.push(`Linha ${numLinha}: data inválida "${dataOriginal}" — ignorada.`);
            continue;
        }

        let link = linkOriginal;
        if (link && !LINK_VALIDO.test(link)) {
            avisos.push(`Linha ${numLinha} (${data}): link não é de formulário do Google — ignorado.`);
            link = "";
        }

        if (link && vistos.has(link)) {
            avisos.push(`Linha ${numLinha} (${data}): mesmo link usado em ${vistos.get(link)}.`);
        } else if (link) {
            vistos.set(link, data);
        }

        dados.push({ data, link });
    }

    if (dados.length === 0) throw new Error("Nenhum registro válido na planilha.");

    avisos.forEach(a => console.warn("⚠ " + a));

    const novo = JSON.stringify(dados, null, 4) + "\n";
    const atual = fs.existsSync(ARQUIVO) ? fs.readFileSync(ARQUIVO, "utf8") : "";

    if (novo === atual) {
        console.log(`✔ Sem alterações (${dados.length} registros).`);
        return;
    }

    // Grava em arquivo temporário e troca, para nunca ficar um JSON pela metade.
    fs.writeFileSync(ARQUIVO + ".tmp", novo, "utf8");
    fs.renameSync(ARQUIVO + ".tmp", ARQUIVO);
    console.log(`✔ ${dados.length} registros importados.`);
}

if (require.main === module) {
    principal().catch((erro) => {
        console.error("✖ Falha ao atualizar. O dados.json anterior foi mantido.");
        console.error("  Motivo: " + erro.message);
        process.exit(1);
    });
}

module.exports = { lerCSV, normalizarData };
