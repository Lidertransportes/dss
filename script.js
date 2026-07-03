const URL = "https://opensheet.elk.sh/2PACX-1vQWv34_S3TGjQmrCeo_IK-5fOdstCk8x4o4pieq4YGkAvVDbKtOjWnsMhSsJQyxlMWLpjv0bCtR3UBN/DSS";

const dataEl = document.getElementById("data");
const statusEl = document.getElementById("status");
const btn = document.getElementById("btn");

const hoje = new Date();

const dataHoje =
String(hoje.getDate()).padStart(2,"0") + "/" +
String(hoje.getMonth()+1).padStart(2,"0") + "/" +
hoje.getFullYear();

dataEl.textContent = dataHoje;

fetch(URL)
.then(r => r.json())
.then(dados => {

    const registro = dados.find(l => l.Data === dataHoje);

    if(registro){

        statusEl.innerHTML = "🟢 Disponível";

        btn.disabled = false;

        btn.onclick = () => {

            window.location.href = registro.Link;

        };

    }else{

        statusEl.innerHTML = "🔴 Não existe DSS para hoje.";

    }

})
.catch(() => {

    statusEl.innerHTML = "Erro ao carregar a planilha.";

});