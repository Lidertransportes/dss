const fs = require("fs");
const https = require("https");

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?output=csv";

https.get(URL, (res) => {

    let csv = "";

    res.on("data", chunk => csv += chunk);

    res.on("end", () => {

        const linhas = csv.trim().split(/\r?\n/);

        const dados = [];

        // pula o cabeçalho
        for(let i = 1; i < linhas.length; i++){

            const partes = linhas[i].split(",");

            if(partes.length >= 2){

                dados.push({

                    data: partes[0].replace(/"/g,"").trim(),

                    link: partes.slice(1).join(",").replace(/"/g,"").trim()

                });

            }

        }

        fs.writeFileSync(
            "dados.json",
            JSON.stringify(dados, null, 4),
            "utf8"
        );

        console.log(`Foram importados ${dados.length} registros.`);

    });

});
