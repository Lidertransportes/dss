const fs = require("fs");
const https = require("https");
const csv = require("csv-parser");

const URL = "SEU_LINK_CSV_PUBLICADO";

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
