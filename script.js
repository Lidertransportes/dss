const dataHoje = document.getElementById("dataHoje");
const status = document.getElementById("status");
const mensagem = document.getElementById("mensagem");
const btnAbrir = document.getElementById("btnAbrir");

const agora = new Date();

const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];

const dataAtual =
String(agora.getDate()).padStart(2,"0") + "/" +
String(agora.getMonth()+1).padStart(2,"0") + "/" +
agora.getFullYear();

dataHoje.innerHTML =
dias[agora.getDay()] +
"<br><strong>" +
dataAtual +
"</strong>";

async function carregar(){

    try{

        const resposta = await fetch("./dados.json?v=" + Date.now());

        if(!resposta.ok)
            throw new Error();

        const dados = await resposta.json();

        const dss = dados.find(item => item.data === dataAtual);

        if(!dss){

            status.innerHTML="🔴 Não disponível";
            status.className="valor status-erro";

            mensagem.innerHTML=
            "Ainda não existe um DSS cadastrado para hoje.";

            btnAbrir.disabled=true;

            return;

        }

        status.innerHTML="🟢 Disponível";
        status.className="valor status-ok";

        mensagem.innerHTML=
        "Clique no botão abaixo para abrir o DSS.";

        btnAbrir.disabled=false;

        btnAbrir.onclick=()=>{

            window.location.href=dss.link;

        };

    }

    catch(e){

        console.error(e);

        status.innerHTML="⚠ Erro";
        status.className="valor status-erro";

        mensagem.innerHTML=
        "Erro ao carregar o sistema.";

    }

}

carregar();
