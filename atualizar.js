const fs = require("fs");
const https = require("https");
const csv = require("csv-parser");

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?gid=0&single=true&output=csv";

function baixar(url) {

    https.get(url, (res) => {

        // Se o Google redirecionar, segue automaticamente
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {

            return baixar(res.headers.location);

        }

        const dados = [];

        res.pipe(csv())

            .on("data", (row) => {

                dados.push({

                    data: row.Data,
                    link: row.Link

                });

            })

            .on("end", () => {

                fs.writeFileSync(
                    "dados.json",
                    JSON.stringify(dados, null, 4),
                    "utf8"
                );

                console.log(`✔ ${dados.length} registros importados.`);

            });

    });

}

baixar(URL);
