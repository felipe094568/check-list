window.onload = () => {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

const listcontainer = document.getElementById("list-container");
const modal = document.getElementById("modal-fundo");
const btnAdd = document.getElementById('add-list-btn');
const btnSalvar = document.getElementById('btn-adicionar');
const btnCancelar = document.getElementById('btn-cancelar');


// --- 1. FUNÇÕES DE PERSISTÊNCIA (Agora salvam o estado de conclusão) ---
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

window.onload = () => {
    const tarefasSalvas = JSON.parse(localStorage.getItem('minhasTarefas'));
    if (tarefasSalvas) {
        tarefasSalvas.forEach(tarefa => {
            adicionarTarefa(tarefa.texto, tarefa.concluida);
        });
    }
};

// --- 2. CONTROLE DO MODAL ---
btnAdd.addEventListener('click', () => modal.style.display = 'flex');
btnCancelar.addEventListener('click', () => modal.style.display = 'none');

btnSalvar.addEventListener('click', () => {
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    const titulo = document.getElementById('titulo').value;
    if (titulo) {
        adicionarTarefa(titulo, false);
        agendarNotificacao(titulo, data, hora);
        salvarTarefas();
        modal.style.display = 'none';
        document.getElementById('titulo').value = '';
    }
});

// --- 3. FÁBRICA DE TAREFAS ---
function adicionarTarefa(texto, concluida = false) {
    const li = document.createElement('li');
    li.style.cssText = "background-color: #202020; color: #ffffff; padding: 15px; margin-bottom: 10px; border-radius: 12px; display: flex; justify-content: space-between;";
    
    li.innerHTML = `
        <span class="texto-tarefa" style="${concluida ? 'text-decoration: line-through; color: #888;' : ''}">${texto}</span>
        <div class="acoes">
            <button class="btn-check">✅</button>
            <button class="btn-edit">✏️</button>
            <button class="btn-delete">🗑️</button>
        </div>
    `;

    // 1. Botão Excluir
    li.querySelector('.btn-delete').addEventListener('click', () => { 
        li.remove(); 
        salvarTarefas(); 
    });

    // 2. Botão Editar
    li.querySelector('.btn-edit').addEventListener('click', () => {
        const span = li.querySelector('.texto-tarefa');
        const novoTexto = prompt("Edite sua tarefa:", span.innerText);
        if (novoTexto) { 
            span.innerText = novoTexto; 
            salvarTarefas(); 
        }
    });

   
    li.querySelector('.btn-check').addEventListener('click', () => {
        const span = li.querySelector('.texto-tarefa');
        
        // Verifica se já está riscado
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

function agendarNotificacao(titulo, data, hora) {
    if (!data || !hora) return;

    const dataTarefa = new Date(`${data}T${hora}`);
    const agora = new Date();
    const diferenca = dataTarefa.getTime() - agora.getTime();

    if (diferenca > 0) {
        setTimeout(() => {
            // Verifica se temos permissão antes de enviar
            if (Notification.permission === 'granted') {
                new Notification("Lembrete de Tarefa!", {
                    body: titulo,
                   
                });
            } else {
                alert(`Hora da tarefa: ${titulo}`); // Backup caso o usuário negue
            }
        }, diferenca);
    }
}} 

