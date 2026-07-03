const https = require("https");

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/pub?gid=0&single=true&output=csv";

https.get(URL, (res) => {

    let texto = "";

    res.on("data", chunk => {
        texto += chunk;
    });

    res.on("end", () => {

        console.log("STATUS:", res.statusCode);

        console.log("======== CSV RECEBIDO ========");

        console.log(texto);

        console.log("======== FIM ========");

    });

}).on("error", console.error);
