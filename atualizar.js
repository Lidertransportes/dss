const fs = require("fs");
const https = require("https");
const csv = require("csv-parser");

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?output=csv";

const dados = [];

https.get(URL, (res) => {

    res
        .pipe(csv())

        .on("data", (row) => {

            dados.push({
                data: row.Data,
                link: row.Link
            });

        })

        .on("end", () => {

            fs.writeFileSync(
                "dados.json",
                JSON.stringify(dados, null, 4)
            );

            console.log("dados.json atualizado!");

        });

});
