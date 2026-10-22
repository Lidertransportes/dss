/*
LÍDER TRANSPORTES — DSS Diário
Previsão do tempo do dia (Araguari-MG e Guará-SP) e alerta de condução.
Fonte: Open-Meteo (https://open-meteo.com), sem cadastro e sem chave.
*/

(function () {
    "use strict";

    const CIDADES = [
        { nome: "Araguari", uf: "MG", lat: -18.6472, lon: -48.1872 },
        { nome: "Guará", uf: "SP", lat: -20.4283, lon: -47.8242 }
    ];

    const ATUALIZAR_MIN = 30;
    const caixa = document.getElementById("climaCidades");
    if (!caixa) return;

    /* ---------- Códigos de tempo (padrão WMO) ---------- */

    function descrever(codigo) {
        if (codigo === 0) return { texto: "Céu limpo", icone: "t-sol" };
        if (codigo === 1) return { texto: "Poucas nuvens", icone: "t-solnuvem" };
        if (codigo === 2) return { texto: "Parcialmente nublado", icone: "t-solnuvem" };
        if (codigo === 3) return { texto: "Nublado", icone: "t-nuvem" };
        if (codigo === 45 || codigo === 48) return { texto: "Neblina", icone: "t-neblina" };
        if (codigo >= 51 && codigo <= 57) return { texto: "Garoa", icone: "t-chuva" };
        if (codigo === 61 || codigo === 66) return { texto: "Chuva fraca", icone: "t-chuva" };
        if (codigo === 63) return { texto: "Chuva moderada", icone: "t-chuva" };
        if (codigo === 65 || codigo === 67) return { texto: "Chuva forte", icone: "t-chuva" };
        if (codigo === 80) return { texto: "Pancadas de chuva", icone: "t-chuva" };
        if (codigo === 81) return { texto: "Pancadas moderadas", icone: "t-chuva" };
        if (codigo === 82) return { texto: "Pancadas fortes", icone: "t-chuva" };
        if (codigo >= 95) return { texto: "Tempestade com raios", icone: "t-raio" };
        return { texto: "Tempo instável", icone: "t-nuvem" };
    }

    /* ---------- Alertas de condução ----------
       nivel 3 = perigo, 2 = atenção, 1 = cuidado, 0 = favorável */

    function alertas(d) {
        const lista = [];
        const c = d.codigo;

        if (c >= 95) {
            lista.push({ nivel: 3, titulo: "Tempestade com raios",
                texto: "Reduza a velocidade e acenda o farol baixo. Se a visibilidade cair muito, pare em local seguro, longe de árvores e postes." });
        }

        if (c === 65 || c === 82 || d.chuvaMm >= 20) {
            lista.push({ nivel: 3, titulo: "Chuva forte",
                texto: "Risco de aquaplanagem. Aumente a distância do veículo da frente e evite frear bruscamente." });
        } else if (d.chuvaProb >= 50 || (c >= 51 && c <= 81)) {
            lista.push({ nivel: 2, titulo: "Pista molhada",
                texto: "A freada fica mais longa. Reduza a velocidade em curvas e descidas e mantenha mais distância." });
        }

        if (c === 45 || c === 48 || (d.visibMin !== null && d.visibMin < 1000)) {
            lista.push({ nivel: 2, titulo: "Neblina",
                texto: "Use farol baixo, nunca o alto. Reduza a velocidade e não ligue o pisca-alerta com o veículo em movimento." });
        }

        if (d.rajada >= 50) {
            lista.push({ nivel: 2, titulo: "Rajadas de vento de " + Math.round(d.rajada) + " km/h",
                texto: "Segure firme o volante em pontes e ao passar por caminhões. Vans e ônibus altos sentem mais o vento lateral." });
        }

        if (d.max >= 34) {
            lista.push({ nivel: 1, titulo: "Calor forte",
                texto: "Beba água durante o turno e confira o ar-condicionado e a temperatura do motor antes de sair." });
        }

        if (d.min <= 8) {
            lista.push({ nivel: 1, titulo: "Madrugada fria",
                texto: "Vidros podem embaçar. Ligue o desembaçador antes de sair e confira a visibilidade." });
        }

        if (!lista.length) {
            lista.push({ nivel: 0, titulo: "Condições favoráveis",
                texto: "Tempo sem riscos previstos. Mantenha a atenção e respeite a velocidade da via." });
        }

        return lista.sort((a, b) => b.nivel - a.nivel);
    }

    /* ---------- Busca ---------- */

    async function buscarCidade(cidade) {
        const url = "https://api.open-meteo.com/v1/forecast" +
            "?latitude=" + cidade.lat + "&longitude=" + cidade.lon +
            "&daily=weather_code,temperature_2m_max,temperature_2m_min," +
            "precipitation_probability_max,precipitation_sum,wind_gusts_10m_max" +
            "&hourly=visibility&timezone=America%2FSao_Paulo&forecast_days=1";

        const controle = new AbortController();
        const timer = setTimeout(() => controle.abort(), 10000);
        try {
            const r = await fetch(url, { signal: controle.signal });
            if (!r.ok) throw new Error("Open-Meteo respondeu " + r.status);
            const j = await r.json();
            const dia = j.daily;
            if (!dia || !dia.time || !dia.time.length) throw new Error("Previsão sem dados");

            const visib = ((j.hourly && j.hourly.visibility) || []).filter(v => typeof v === "number");
            const num = (v, padrao) => (typeof v === "number" ? v : padrao);

            return {
                codigo: num(dia.weather_code[0], -1),
                max: num(dia.temperature_2m_max[0], NaN),
                min: num(dia.temperature_2m_min[0], NaN),
                chuvaProb: num(dia.precipitation_probability_max && dia.precipitation_probability_max[0], 0),
                chuvaMm: num(dia.precipitation_sum && dia.precipitation_sum[0], 0),
                rajada: num(dia.wind_gusts_10m_max && dia.wind_gusts_10m_max[0], 0),
                visibMin: visib.length ? Math.min.apply(null, visib) : null
            };
        } finally {
            clearTimeout(timer);
        }
    }

    /* ---------- Tela ---------- */

    const NIVEL_CLASSE = ["ok", "cuidado", "atencao", "perigo"];
    const NIVEL_ROTULO = ["Favorável", "Cuidado", "Atenção", "Perigo"];

    function el(tag, classe, texto) {
        const e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined) e.textContent = texto;
        return e;
    }

    function icone(id, classe) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", classe);
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS(ns, "use");
        use.setAttribute("href", "#" + id);
        svg.appendChild(use);
        return svg;
    }

    function cartao(cidade, d) {
        const desc = descrever(d.codigo);
        const lista = alertas(d);
        const pior = lista[0].nivel;

        const art = el("article", "cidade nivel-" + NIVEL_CLASSE[pior]);

        const topo = el("div", "cidade-topo");
        topo.appendChild(icone(desc.icone, "cidade-icone"));

        const info = el("div", "cidade-info");
        const nome = el("h3", null, cidade.nome + " ");
        nome.appendChild(el("span", "uf", cidade.uf));
        info.appendChild(nome);
        info.appendChild(el("p", "cidade-tempo", desc.texto));
        topo.appendChild(info);

        const temp = el("div", "cidade-temp");
        temp.appendChild(el("strong", null, Math.round(d.max) + "°"));
        temp.appendChild(el("span", null, Math.round(d.min) + "°"));
        temp.setAttribute("aria-label", "Máxima " + Math.round(d.max) + " graus, mínima " + Math.round(d.min) + " graus");
        topo.appendChild(temp);
        art.appendChild(topo);

        const chuva = el("p", "cidade-chuva",
            "Chuva: " + Math.round(d.chuvaProb) + "% de chance" +
            (d.chuvaMm >= 1 ? ", cerca de " + Math.round(d.chuvaMm) + " mm" : ""));
        art.appendChild(chuva);

        const ul = el("ul", "alertas");
        lista.forEach(a => {
            const li = el("li", "alerta nivel-" + NIVEL_CLASSE[a.nivel]);
            const cab = el("p", "alerta-titulo");
            cab.appendChild(el("span", "selo", NIVEL_ROTULO[a.nivel]));
            cab.appendChild(document.createTextNode(" " + a.titulo));
            li.appendChild(cab);
            li.appendChild(el("p", "alerta-texto", a.texto));
            ul.appendChild(li);
        });
        art.appendChild(ul);
        return art;
    }

    let ultimo = {};
    let ultimaBusca = 0;

    async function atualizar() {
        ultimaBusca = Date.now();
        const resultados = await Promise.allSettled(CIDADES.map(buscarCidade));
        const frag = document.createDocumentFragment();
        let algum = false;

        resultados.forEach((r, i) => {
            const cidade = CIDADES[i];
            let d = null;
            if (r.status === "fulfilled") { d = r.value; ultimo[cidade.nome] = d; }
            else { console.warn("Previsão de " + cidade.nome + ":", r.reason); d = ultimo[cidade.nome] || null; }

            if (d) { frag.appendChild(cartao(cidade, d)); algum = true; }
            else {
                const art = el("article", "cidade indisponivel");
                const h = el("h3", null, cidade.nome + " ");
                h.appendChild(el("span", "uf", cidade.uf));
                art.appendChild(h);
                art.appendChild(el("p", "cidade-tempo", "Previsão indisponível agora. Nova tentativa em alguns minutos."));
                frag.appendChild(art);
            }
        });

        caixa.replaceChildren(frag);
        return algum;
    }

    atualizar();
    setInterval(atualizar, ATUALIZAR_MIN * 60 * 1000);
    document.addEventListener("visibilitychange", function () {
        // ao voltar para a página, só busca de novo se passaram 10 min
        if (!document.hidden && Date.now() - ultimaBusca > 10 * 60 * 1000) atualizar();
    });
})();
