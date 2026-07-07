if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js') // Use './sw.js' para funcionar relativo na raiz do GitHub Pages
    .then(reg => console.log('Service Worker registrado com sucesso!', reg))
    .catch(err => console.log('Erro ao registrar o Service Worker:', err));
}
// --- 1. PERMISSÃO E CARREGAMENTO INICIAL ---
window.onload = () => {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    const tarefasSalvas = JSON.parse(localStorage.getItem('minhasTarefas'));
    if (tarefasSalvas) {
        tarefasSalvas.forEach(tarefa => {
            adicionarTarefa(tarefa.texto, tarefa.concluida);
        });
    }
};

// --- 2. SELEÇÃO DE ELEMENTOS ---
const listcontainer = document.getElementById("list-container");
const modal = document.getElementById("modal-fundo");
const btnAdd = document.getElementById('btnAdd');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');

// --- 3. FUNÇÕES DE PERSISTÊNCIA ---
function salvarTarefas() {
    const tarefas = [];
    document.querySelectorAll('#list-container li').forEach(li => {
        const span = li.querySelector('.texto-tarefa');
        tarefas.push({
            texto: span.innerText,
            concluida: span.style.textDecoration === "line-through"
        });
    });
    localStorage.setItem('minhasTarefas', JSON.stringify(tarefas));
}

// --- 4. CONTROLE DO MODAL ---
if (btnAdd && modal) {
    btnAdd.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'flex';
    });
    
    btnAdd.addEventListener('touchend', (e) => {
        e.preventDefault();
        modal.style.display = 'flex';
    });
}

if (btnCancelar && modal) {
    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

if (btnSalvar && modal) {
    btnSalvar.addEventListener('click', (e) => {
        e.preventDefault();
        const data = document.getElementById('data').value;
        const hora = document.getElementById('hora').value;
        const titulo = document.getElementById('titulo').value.trim();
        
        if (titulo !== "") {
            adicionarTarefa(titulo, false);
            agendarNotificacao(titulo, data, hora);
            salvarTarefas();
            
            modal.style.display = 'none';
            document.getElementById('titulo').value = '';
            if(document.getElementById('data')) document.getElementById('data').value = '';
            if(document.getElementById('hora')) document.getElementById('hora').value = '';
        } else {
            alert("Digite um título para a tarefa!");
        }
    });
}

// --- 5. FÁBRICA DE TAREFAS ---
function adicionarTarefa(texto, concluida = false) {
    if (!listcontainer) return;
    
    const li = document.createElement('li');
    li.style.cssText = "background-color: #202020; color: #ffffff; padding: 15px; margin-bottom: 10px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;";
    
    li.innerHTML = `
        <span class="texto-tarefa" style="${concluida ? 'text-decoration: line-through; color: #888;' : ''}">${texto}</span>
        <div class="acoes" style="display: flex; gap: 8px;">
            <button class="btn-check" style="background: none; border: none; cursor: pointer; font-size: 16px;">✅</button>
            <button class="btn-edit" style="background: none; border: none; cursor: pointer; font-size: 16px;">✏️</button>
            <button class="btn-delete" style="background: none; border: none; cursor: pointer; font-size: 16px;">🗑️</button>
        </div>
    `;

    li.querySelector('.btn-delete').addEventListener('click', () => { 
        li.remove(); 
        salvarTarefas(); 
    });

    li.querySelector('.btn-edit').addEventListener('click', () => {
        const span = li.querySelector('.texto-tarefa');
        const novoTexto = prompt("Edite sua tarefa:", span.innerText);
        if (novoTexto && novoTexto.trim() !== "") { 
            span.innerText = novoTexto; 
            salvarTarefas(); 
        }
    });

    li.querySelector('.btn-check').addEventListener('click', () => {
        const span = li.querySelector('.texto-tarefa');
        if (span.style.textDecoration === "line-through") {
            span.style.textDecoration = "none";
            span.style.color = "#fff";
        } else {
            span.style.textDecoration = "line-through";
            span.style.color = "#888";
        }
        salvarTarefas(); 
    });

    listcontainer.appendChild(li);
}

// --- 6. AGENDAMENTO DE NOTIFICAÇÕES ---
function agendarNotificacao(titulo, data, hora) {
    if (!data || !hora) return;

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
