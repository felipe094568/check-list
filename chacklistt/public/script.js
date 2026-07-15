// --- 1. CARREGAMENTO INICIAL E IDENTIFICAÇÃO ---
let firebaseJaCarregado = false;

// Identificação única deste dispositivo/usuário principal (o dono da lista)
let meuId = localStorage.getItem('meuDispositivoId');
if (!meuId) {
    meuId = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('meuDispositivoId', meuId);
}

// Permite visualizar e interagir com a lista se houver um ID na URL (Ex: ?id=user_xxxx)
const urlParams = new URLSearchParams(window.location.search);
const idCompartilhado = urlParams.get('id');
const idAtivo = idCompartilhado || meuId; 
const souDono = !idCompartilhado || idCompartilhado === meuId;

// Identifica ou pergunta o nome do colaborador/dono
let meuNome = localStorage.getItem('nomeColaborador');
if (!souDono && !meuNome) {
    meuNome = prompt("Por favor, digite o seu nome para acessar a lista:", "Colaborador");
    if (meuNome && meuNome.trim() !== "") {
        localStorage.setItem('nomeColaborador', meuNome.trim());
    } else {
        meuNome = "Colaborador";
    }
} else if (souDono && !meuNome) {
    meuNome = "Você (Dono)";
}

window.addEventListener('firebaseCarregado', () => {
    if (!firebaseJaCarregado) {
        firebaseJaCarregado = true;
        carregarTarefasDaNuvem();
    }
});

window.onload = () => {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    
    // Atualiza o aviso visual no cabeçalho com o nome da pessoa
    if (!souDono && document.querySelector('header p')) {
        document.querySelector('header p').innerHTML = `<span style="color: #3b82f6;">👤 Olá, ${meuNome}! Visualizando lista compartilhada (Pode concluir tarefas)</span>`;
    }
    
    if (window.db && !firebaseJaCarregado) {
        firebaseJaCarregado = true;
        carregarTarefasDaNuvem();
    }
};

// --- 2. SELEÇÃO DE ELEMENTOS ---
const listcontainer = document.getElementById("list-container");
const modal = document.getElementById("modal-fundo");
const btnAdd = document.getElementById('add-list-btn') || document.getElementById('btnAdd');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');

if (btnAdd && !souDono) {
    btnAdd.style.display = 'none';
}

let containerConcluidas = document.getElementById("list-container-concluidas");
if (!containerConcluidas && listcontainer && listcontainer.parentNode) {
    const secaoConcluidas = document.createElement('div');
    secaoConcluidas.style.cssText = "margin-top: 30px; border-top: 1px solid #444; padding-top: 15px;";
    secaoConcluidas.innerHTML = `
        <h3 style="color: #aaa; font-size: 14px; margin-bottom: 10px;">📋 Tarefas Concluídas</h3>
        <ul id="list-container-concluidas" style="list-style: none; padding: 0; margin: 0;"></ul>
    `;
    listcontainer.parentNode.appendChild(secaoConcluidas);
    containerConcluidas = document.getElementById("list-container-concluidas");
}

function compartilharLista() {
    const linkCompartilhamento = `${window.location.origin}${window.location.pathname}?id=${meuId}`;
    prompt("Copie este link para partilhar com sua equipe:", linkCompartilhamento);
}

// --- 3. INTEGRAÇÃO COM CLOUD FIRESTORE E CALENDÁRIO ---
let calendarInstance = null;

function inicializarCalendario() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    if (!calendarInstance) {
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            height: 'auto',
            events: [] 
        });
        calendarInstance.render();
    } else {
        calendarInstance.updateSize();
    }
    window.calendarInstance = calendarInstance;
}

async function carregarTarefasDaNuvem() {
    if (!window.db || !listcontainer) return;
    
    listcontainer.innerHTML = '';
    if (containerConcluidas) containerConcluidas.innerHTML = '';
    
    let totalTarefas = 0;
    let totalConcluidas = 0;
    let eventosCalendario = [];
    
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "tarefas"));
        const agora = new Date().getTime();
        
        querySnapshot.forEach(async (docItem) => {
            const dados = docItem.data();
            const criadoEm = dados.criadoEm ? new Date(dados.criadoEm).getTime() : agora;
            const umaHoraEmMs = 24 * 60 * 60 * 1000;
            
            if ((agora - criadoEm) > umaHoraEmMs) {
                if (souDono) { 
                    try {
                        await window.deleteDoc(window.doc(window.db, "tarefas", docItem.id));
                    } catch (err) {
                        console.error("Erro ao expirar tarefa antiga:", err);
                    }
                }
                return; 
            }
            
            const criadorDestaTarefa = dados.criadorId || meuId; 
            if (criadorDestaTarefa !== idAtivo) {
                return; 
            }
            
            totalTarefas++;
            if (dados.concluida) totalConcluidas++;
            
            if (dados.data) {
                eventosCalendario.push({
                    title: dados.texto,
                    start: dados.data,
                    color: dados.concluida ? '#10b981' : '#3b82f6'
                });
            }
            
            adicionarTarefaNaTela(docItem.id, dados.texto, dados.concluida, dados.usuarioDestino || 'Geral');
        });

        if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = totalTarefas;
        if (document.getElementById('stat-concluidas')) document.getElementById('stat-concluidas').innerText = totalConcluidas;

        if (calendarInstance) {
            calendarInstance.removeAllEvents();
            eventosCalendario.forEach(ev => calendarInstance.addEvent(ev));
        }

    } catch (e) {
        console.error("Erro ao carregar do Firestore: ", e);
    }
}

async function salvarTarefaNaNuvem(texto, data, hora, usuarioDestino) {
    if (!window.db || !souDono) return;
    
    try {
        await window.addDoc(window.collection(window.db, "tarefas"), {
            texto: texto,
            data: data || '',
            hora: hora || '',
            usuarioDestino: usuarioDestino || 'Geral',
            concluida: false,
            criadoEm: new Date().toISOString(),
            criadorId: meuId
        });
        carregarTarefasDaNuvem();
    } catch (e) {
        console.error("Erro ao adicionar no Firestore: ", e);
        alert("Erro ao salvar na nuvem: " + e.message);
    }
}

// --- 4. CONTROLE DO MODAL DE TAREFAS ---
if (btnAdd && modal) {
    btnAdd.addEventListener('click', (e) => {
        e.preventDefault();
        if (souDono) modal.style.display = 'flex';
    });
    btnAdd.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (souDono) modal.style.display = 'flex';
    });
}

if (btnCancelar && modal) {
    btnCancelar.addEventListener('click', () => { modal.style.display = 'none'; });
}

if (btnSalvar && modal) {
    btnSalvar.addEventListener('click', () => {
        if (!souDono) return;
        const data = document.getElementById('data').value;
        const hora = document.getElementById('hora').value;
        const titulo = document.getElementById('titulo').value;
        const usuarioDestino = prompt("Para qual funcionário/usuário esta tarefa é destinada? (Ex: João, Maria, Geral):", "Geral");
        
        if (titulo && titulo.trim() !== "") {
            salvarTarefaNaNuvem(titulo, data, hora, usuarioDestino);
            agendarNotificacao(titulo, data, hora);
            modal.style.display = 'none';
            document.getElementById('titulo').value = '';
            if(document.getElementById('data')) document.getElementById('data').value = '';
            if(document.getElementById('hora')) document.getElementById('hora').value = '';
        } else {
            alert("Digite um título para a tarefa!");
        }
    });
}

// --- 5. FÁBRICA DE TAREFAS NA TELA ---
function adicionarTarefaNaTela(idDoc, texto, concluida = false, usuarioDestino = 'Geral') {
    const destinoAlvo = (concluida && containerConcluidas) ? containerConcluidas : listcontainer;
    if (!destinoAlvo) return;
    
    const li = document.createElement('li');
    li.style.cssText = `background-color: #202020; color: #ffffff; padding: 15px; margin-bottom: 10px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; ${concluida ? 'opacity: 0.6;' : ''}`;
    
    let acoesHTML = `<button class="btn-check" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="${concluida ? 'Desfazer' : 'Concluir'}">${concluida ? '↩️' : '✅'}</button>`;
    
    if (souDono) {
        acoesHTML += `<button class="btn-delete" style="background: none; border: none; cursor: pointer; font-size: 16px;">🗑️</button>`;
    }
    
    li.innerHTML = `
        <div>
            <span class="texto-tarefa" style="${concluida ? 'text-decoration: line-through; color: #888;' : ''}">${texto}</span>
            <small style="display: block; font-size: 10px; color: #aaa; margin-top: 4px;">👤 Destino: ${usuarioDestino}</small>
        </div>
        <div class="acoes" style="display: flex; gap: 8px;">${acoesHTML}</div>
    `;

    li.querySelector('.btn-check').addEventListener('click', async () => {
        const novoStatus = !concluida;
        try {
            await window.updateDoc(window.doc(window.db, "tarefas", idDoc), { concluida: novoStatus });
            carregarTarefasDaNuvem();
        } catch (e) {
            console.error("Erro ao atualizar status:", e);
        }
    });

    if (souDono) {
        li.querySelector('.btn-delete').addEventListener('click', async () => { 
            try {
                await window.deleteDoc(window.doc(window.db, "tarefas", idDoc));
                li.remove(); 
            } catch (e) {
                console.error("Erro ao apagar tarefa:", e);
            }
        });
    }

    destinoAlvo.appendChild(li);
}

// --- 6. AGENDAMENTO DE NOTIFICAÇÕES ---
function agendarNotificacao(titulo, data, hora) {
    const notificacoesAtivas = localStorage.getItem('notificacoesAtivas') !== 'false';
    if (!notificacoesAtivas || !data || !hora) return;

    const dataTarefa = new Date(`${data}T${hora}`);
    const agora = new Date();
    const diferenca = dataTarefa.getTime() - agora.getTime();

    if (diferenca > 0) {
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification("Lembrete de Tarefa!", { body: titulo });
            } else {
                alert(`Hora da tarefa: ${titulo}`);
            }
        }, diferenca);
    }
}

// --- 7. CONTROLE DE TEMA E AJUSTES ---
const modalAjustes = document.getElementById('modal-ajustes');
const btnFecharAjustes = document.getElementById('btn-fechar-ajustes');
const toggleTema = document.getElementById('toggle-tema');
const toggleNotificacao = document.getElementById('toggle-notificacao');

function abrirAjustes() { if (modalAjustes) modalAjustes.style.display = 'flex'; }

if (btnFecharAjustes && modalAjustes) {
    btnFecharAjustes.addEventListener('click', () => { modalAjustes.style.display = 'none'; });
}

function aplicarTema(escuro) {
    if (escuro) {
        document.body.style.backgroundColor = "#121212";
        document.body.style.color = "#ffffff";
    } else {
        document.body.style.backgroundColor = "#f4f4f4";
        document.body.style.color = "#000000";
    }
}

if (toggleTema) {
    toggleTema.addEventListener('change', () => {
        aplicarTema(toggleTema.checked);
        localStorage.setItem('modoEscuro', toggleTema.checked);
    });
}

if (toggleNotificacao) {
    toggleNotificacao.addEventListener('change', () => {
        localStorage.setItem('notificacoesAtivas', toggleNotificacao.checked);
    });
}

window.addEventListener('load', () => {
    const modoEscuroSalvo = localStorage.getItem('modoEscuro') === 'true';
    const notifSalva = localStorage.getItem('notificacoesAtivas') !== 'false';

    if (toggleTema) {
        toggleTema.checked = modoEscuroSalvo;
        aplicarTema(modoEscuroSalvo);
    }
    if (toggleNotificacao) toggleNotificacao.checked = notifSalva;
});

// --- 8. ALTERNAR ABAS DO MENU INFERIOR ---
function mudarAba(nomeAba) {
    const paineis = ['painel-lista', 'painel-estatisticas', 'painel-calendario'];
    
    paineis.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const alvo = document.getElementById(`painel-${nomeAba}`);
    if (alvo) alvo.style.display = 'block';

    if (nomeAba === 'calendario') {
        setTimeout(() => {
            inicializarCalendario();
            if (calendarInstance) calendarInstance.updateSize();
        }, 100);
    }
}