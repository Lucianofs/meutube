// ===== AUTENTICAÇÃO =====
const AUTH_KEY = 'mt_users';
const USER_KEY = 'mt_user_atual';

function hashSenha(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h = h & h;
    }
    return Math.abs(h).toString(16);
}

function initAuth() {
    if (!localStorage.getItem(AUTH_KEY)) {
        const admin = {
            email: 'professorluciano1@gmail.com',
            nome: 'Prof. Luciano Francisco',
            senhaHash: hashSenha('Deuseamor1@'),
            nomeCanal: 'CFO da Alma e dos Negócios',
            descCanal: 'Consultoria em análise de dados de marketing',
            capaCanal: ''
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify([admin]));
    }
}

function cadastrar(nome, email, senha) {
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    if (users.find(u => u.email === email)) {
        return { ok: false, msg: 'Email já cadastrado!' };
    }
    users.push({
        email, nome,
        senhaHash: hashSenha(senha),
        nomeCanal: nome,
        descCanal: '',
        capaCanal: ''
    });
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
    return { ok: true, msg: 'Cadastro realizado! Faça login.' };
}

function login(email, senha) {
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    const user = users.find(u => u.email === email);
    if (!user || user.senhaHash !== hashSenha(senha)) {
        return { ok: false, msg: 'Email ou senha incorretos!' };
    }
    const { senhaHash, ...safe } = user;
    localStorage.setItem(USER_KEY, JSON.stringify(safe));
    return { ok: true, user: safe };
}

function getUser() {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
}

function logout() {
    localStorage.removeItem(USER_KEY);
}

function updateUser(data) {
    const users = JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    const current = getUser();
    const idx = users.findIndex(u => u.email === current.email);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...data };
        localStorage.setItem(AUTH_KEY, JSON.stringify(users));
        const { senhaHash, ...safe } = users[idx];
        localStorage.setItem(USER_KEY, JSON.stringify(safe));
        return safe;
    }
    return null;
}

// ===== BANCO DE DADOS =====
const DB = {
    get videos() { return JSON.parse(localStorage.getItem('mt_videos') || '[]'); },
    set videos(v) { localStorage.setItem('mt_videos', JSON.stringify(v)); },
    get favs() { return JSON.parse(localStorage.getItem('mt_favs') || '[]'); },
    set favs(f) { localStorage.setItem('mt_favs', JSON.stringify(f)); },
    get comments() { return JSON.parse(localStorage.getItem('mt_comments') || '{}'); },
    set comments(c) { localStorage.setItem('mt_comments', JSON.stringify(c)); },
    get likes() { return JSON.parse(localStorage.getItem('mt_likes') || '{}'); },
    set likes(l) { localStorage.setItem('mt_likes', JSON.stringify(l)); },

    meusVideos() {
        const u = getUser();
        if (!u) return [];
        return this.videos.filter(v => v.autorEmail === u.email);
    },

    addVideo(data) {
        const u = getUser();
        if (!u) return null;
        const v = {
            id: Date.now(),
            ...data,
            views: 0,
            data: new Date().toISOString().split('T')[0],
            autorEmail: u.email,
            autorNome: u.nomeCanal || u.nome
        };
        const vids = this.videos;
        vids.push(v);
        this.videos = vids;
        return v;
    },

    updateVideo(id, data) {
        const vids = this.videos;
        const idx = vids.findIndex(v => v.id === parseInt(id));
        if (idx !== -1) {
            vids[idx] = { ...vids[idx], ...data };
            this.videos = vids;
            return vids[idx];
        }
        return null;
    },

    deleteVideo(id) {
        this.videos = this.videos.filter(v => v.id !== id);
        this.favs = this.favs.filter(f => f !== id);
        const c = this.comments;
        delete c[id];
        this.comments = c;
        const l = this.likes;
        delete l[id];
        this.likes = l;
    },

    getVideo(id) { return this.videos.find(v => v.id === parseInt(id)); },

    addView(id) {
        const v = this.getVideo(id);
        if (v) { v.views++; this.videos = this.videos; }
    },

    toggleFav(id) {
        const f = this.favs;
        const idx = f.indexOf(id);
        if (idx > -1) f.splice(idx, 1);
        else f.push(id);
        this.favs = f;
        return f.includes(id);
    },

    isFav(id) { return this.favs.includes(id); },

    addComment(vidId, texto) {
        const u = getUser();
        const c = this.comments;
        if (!c[vidId]) c[vidId] = [];
        c[vidId].unshift({
            id: Date.now(),
            autor: u ? u.nome : 'Visitante',
            texto,
            data: new Date().toLocaleString('pt-BR')
        });
        this.comments = c;
    },

    getComments(vidId) { return this.comments[vidId] || []; },

    toggleLike(id) {
        const l = this.likes;
        if (!l[id]) l[id] = 0;
        l[id]++;
        this.likes = l;
        return l[id];
    },

    getLikes(id) { return this.likes[id] || 0; },

    buscar(termo) {
        const u = getUser();
        if (!u) return [];
        termo = termo.toLowerCase();
        return this.videos.filter(v =>
            v.autorEmail === u.email &&
            (v.titulo.toLowerCase().includes(termo) ||
             v.descricao.toLowerCase().includes(termo))
        );
    },

    porCategoria(cat) {
        const u = getUser();
        if (!u) return [];
        return this.videos.filter(v => v.autorEmail === u.email && v.categoria === cat);
    },

    totalViews() {
        const u = getUser();
        if (!u) return 0;
        return this.videos
            .filter(v => v.autorEmail === u.email)
            .reduce((t, v) => t + v.views, 0);
    }
};

// ===== APLICAÇÃO =====
let videoAtual = null;
let ytPlayer = null;

function init() {
    initAuth();
    
    // Verifica login
    if (getUser()) {
        mostrarApp();
    } else {
        document.getElementById('tela-login').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }

    // Form login
    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        const r = login(email, senha);
        if (r.ok) {
            mostrarApp();
        } else {
            document.getElementById('msg-login-erro').textContent = r.msg;
        }
    });

    // Form cadastro
    document.getElementById('form-cadastro').addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('cad-nome').value;
        const email = document.getElementById('cad-email').value;
        const senha = document.getElementById('cad-senha').value;
        const confirm = document.getElementById('cad-confirm').value;
        
        if (senha !== confirm) {
            document.getElementById('msg-cad-erro').textContent = 'Senhas não coincidem!';
            return;
        }
        
        const r = cadastrar(nome, email, senha);
        document.getElementById('msg-cad-erro').textContent = r.msg;
        if (r.ok) {
            setTimeout(() => mostrarTab('entrar'), 1500);
        }
    });

    // Form vídeo
    document.getElementById('form-video').addEventListener('submit', (e) => {
        e.preventDefault();
        salvarVideo();
    });

    // Form canal
    document.getElementById('form-canal').addEventListener('submit', (e) => {
        e.preventDefault();
        salvarCanal();
    });

    // URL YouTube auto thumbnail
    document.getElementById('inp-url').addEventListener('blur', (e) => {
        const url = e.target.value;
        const id = extrairYT(url);
        if (id && !document.getElementById('inp-thumb').value) {
            document.getElementById('inp-thumb').value = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        }
    });

    // Menu
    document.querySelectorAll('.menu-nav a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (a.id === 'btn-sair') {
                if (confirm('Deseja sair?')) {
                    logout();
                    location.reload();
                }
                return;
            }
            document.querySelectorAll('.menu-nav a').forEach(x => x.classList.remove('ativo'));
            a.classList.add('ativo');
            navegar(a.dataset.pagina);
            fecharMenu();
        });
    });
}

function mostrarTab(t) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (t === 'entrar') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-cadastro').style.display = 'none';
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-cadastro').style.display = 'block';
    }
}

function mostrarApp() {
    const u = getUser();
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('nome-user').textContent = u.nome;
    carregarCanal();
    renderizarVideos();
    const meus = DB.meusVideos();
    if (meus.length > 0) carregarVideo(meus[0].id);
}

function toggleMenu() {
    document.getElementById('menu-nav').classList.toggle('aberto');
}

function fecharMenu() {
    document.getElementById('menu-nav').classList.remove('aberto');
}

function navegar(pagina) {
    document.getElementById('player-area').style.display = 'block';
    document.getElementById('perfil-canal').style.display = 'none';

    switch(pagina) {
        case 'inicio':
            renderizarVideos(DB.meusVideos(), 'Meus Vídeos');
            break;
        case 'favoritos':
            const meus = DB.meusVideos();
            const favs = meus.filter(v => DB.isFav(v.id));
            renderizarVideos(favs, 'Favoritos');
            break;
        case 'cursos':
            renderizarVideos(DB.porCategoria('curso'), 'Cursos');
            break;
        case 'canal':
            document.getElementById('player-area').style.display = 'none';
            document.getElementById('perfil-canal').style.display = 'block';
            atualizarStats();
            break;
    }
}

function carregarCanal() {
    const u = getUser();
    document.getElementById('nome-canal').textContent = u.nomeCanal || u.nome;
    document.getElementById('desc-canal').textContent = u.descCanal || 'Sem descrição';
    const img = document.getElementById('img-capa');
    if (u.capaCanal) {
        img.src = u.capaCanal;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
}

function atualizarStats() {
    document.getElementById('stat-videos').textContent = DB.meusVideos().length;
    document.getElementById('stat-views').textContent = DB.totalViews();
}

function editarCanal() {
    const u = getUser();
    document.getElementById('canal-nome').value = u.nomeCanal || '';
    document.getElementById('canal-desc').value = u.descCanal || '';
    document.getElementById('canal-capa').value = u.capaCanal || '';
    document.getElementById('modal-canal').style.display = 'flex';
}

function salvarCanal() {
    updateUser({
        nomeCanal: document.getElementById('canal-nome').value,
        descCanal: document.getElementById('canal-desc').value,
        capaCanal: document.getElementById('canal-capa').value
    });
    carregarCanal();
    fecharModalCanal();
    alert('Canal atualizado!');
}

function alterarCapa() {
    const url = prompt('URL da nova capa:');
    if (url) {
        updateUser({ capaCanal: url });
        carregarCanal();
    }
}

function extrairYT(url) {
    if (!url) return null;
    const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return (m && m[2].length === 11) ? m[2] : null;
}

function renderizarVideos(lista, titulo) {
    const grid = document.getElementById('grid-videos');
    document.getElementById('titulo-lista').innerHTML = `<i class="fas fa-list"></i> ${titulo || 'Meus Vídeos'}`;
    grid.innerHTML = '';

    const videos = lista || DB.meusVideos();
    if (videos.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:20px;">Nenhum vídeo ainda. Clique no + para publicar!</p>';
        return;
    }

    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <button class="btn-edit-card" onclick="event.stopPropagation();editarVideo(${v.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-del-card" onclick="event.stopPropagation();deletarVideo(${v.id})"><i class="fas fa-trash"></i></button>
            <img src="${v.thumb || 'https://via.placeholder.com/320x180'}" alt="${v.titulo}">
            <div class="card-info">
                <div class="card-titulo">${v.titulo}</div>
                <div class="card-meta"><i class="fas fa-eye"></i> ${v.views} • ${v.data}</div>
                <span class="card-cat">${v.categoria}</span>
            </div>
        `;
        card.onclick = () => carregarVideo(v.id);
        grid.appendChild(card);
    });
}

function carregarVideo(id) {
    const v = DB.getVideo(id);
    if (!v) return;
    videoAtual = v;
    DB.addView(id);

    const ytId = extrairYT(v.url);
    const ytDiv = document.getElementById('player-yt');
    const mp4 = document.getElementById('player-mp4');

    if (ytId) {
        mp4.style.display = 'none';
        ytDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0" allowfullscreen allow="autoplay"></iframe>`;
    } else {
        ytDiv.innerHTML = '';
        mp4.src = v.url;
        mp4.style.display = 'block';
        mp4.play();
    }

    document.getElementById('v-titulo').textContent = v.titulo;
    document.getElementById('v-desc').textContent = v.descricao;
    document.getElementById('v-views').textContent = v.views;
    document.getElementById('v-data').textContent = v.data.split('-').reverse().join('/');
    document.getElementById('v-autor').textContent = v.autorNome;
    document.getElementById('qtd-like').textContent = DB.getLikes(id);

    const btnFav = document.getElementById('btn-fav');
    if (DB.isFav(id)) {
        btnFav.classList.add('favorited');
        btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
    } else {
        btnFav.classList.remove('favorited');
        btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
    }

    const u = getUser();
    const pode = v.autorEmail === u.email;
    document.getElementById('btn-edit').style.display = pode ? 'inline-flex' : 'none';
    document.getElementById('btn-del').style.display = pode ? 'inline-flex' : 'none';

    carregarComentarios(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function carregarComentarios(vidId) {
    const lista = document.getElementById('lista-comentarios');
    const coms = DB.getComments(vidId);
    lista.innerHTML = '';
    if (coms.length === 0) {
        lista.innerHTML = '<p style="text-align:center;color:#aaa;">Seja o primeiro a comentar!</p>';
        return;
    }
    coms.forEach(c => {
        const d = document.createElement('div');
        d.className = 'coment-item';
        d.innerHTML = `
            <div class="coment-header">
                <span class="coment-autor">${c.autor}</span>
                <span>${c.data}</span>
            </div>
            <div>${c.texto}</div>
        `;
        lista.appendChild(d);
    });
}

function comentar() {
    const txt = document.getElementById('txt-comentario').value.trim();
    if (!txt || !videoAtual) return;
    DB.addComment(videoAtual.id, txt);
    document.getElementById('txt-comentario').value = '';
    carregarComentarios(videoAtual.id);
}

function curtir() {
    if (!videoAtual) return;
    document.getElementById('qtd-like').textContent = DB.toggleLike(videoAtual.id);
    document.getElementById('btn-like').classList.toggle('favorited');
}

function favoritar() {
    if (!videoAtual) return;
    const f = DB.toggleFav(videoAtual.id);
    const btn = document.getElementById('btn-fav');
    if (f) {
        btn.classList.add('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
    } else {
        btn.classList.remove('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
    }
}

function compartilhar() {
    if (!videoAtual) return;
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado!');
}

function abrirModalVideo() {
    document.getElementById('form-video').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('titulo-modal').innerHTML = '<i class="fas fa-plus-circle"></i> Publicar Vídeo';
    document.getElementById('modal-video').style.display = 'flex';
}

function salvarVideo() {
    const editId = document.getElementById('edit-id').value;
    const titulo = document.getElementById('inp-titulo').value;
    let url = document.getElementById('inp-url').value;
    let thumb = document.getElementById('inp-thumb').value;
    const descricao = document.getElementById('inp-desc').value;
    const categoria = document.getElementById('inp-cat').value;
    const arquivo = document.getElementById('inp-arquivo').files[0];

    if (arquivo) {
        url = URL.createObjectURL(arquivo);
    } else if (!url) {
        alert('Insira URL ou faça upload!');
        return;
    }

    if (!thumb) {
        const id = extrairYT(url);
        if (id) thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    }

    const data = { titulo, url, thumb, descricao, categoria };

    if (editId) {
        DB.updateVideo(editId, data);
        alert('Vídeo atualizado!');
    } else {
        DB.addVideo(data);
        alert('Vídeo publicado!');
    }

    fecharModal();
    renderizarVideos();
}

function editarVideo(id) {
    const v = DB.getVideo(id);
    if (!v) return;
    document.getElementById('edit-id').value = v.id;
    document.getElementById('inp-titulo').value = v.titulo;
    document.getElementById('inp-url').value = v.url;
    document.getElementById('inp-thumb').value = v.thumb || '';
    document.getElementById('inp-desc').value = v.descricao;
    document.getElementById('inp-cat').value = v.categoria;
   
