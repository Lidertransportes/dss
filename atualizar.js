const fs = require("fs");
const https = require("https");
const csv = require("csv-parser");

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?output=csv";

const dados = [];

https.get(URL, (res) => {

    res
        .pipe(csv())

        .on("data", (row) => {

            if (row.Data && row.Link) {

                dados.push({
                    data: row.Data.trim(),
                    link: row.Link.trim()
                });

            }

        })

        .on("end", () => {

            fs.writeFileSync(
                "dados.json",
                JSON.stringify(dados, null, 4),
                "utf8"
            );

            console.log(`✔ ${dados.length} registros atualizados.`);

        });

}).on("error", (err) => {

    console.error(err);

});
