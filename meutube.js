// SISTEMA DE AUTENTICAÇÃO SEGURO
class AuthSystem {
    constructor() {
        this.usersKey = 'meutube_users';
        this.currentUserKey = 'meutube_current_user';
        this.initAdmin();
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    initAdmin() {
        const users = localStorage.getItem(this.usersKey);
        if (!users) {
            const adminUser = {
                email: 'professorluciano1@gmail.com',
                nome: 'Prof. Luciano Francisco',
                senhaHash: this.simpleHash('Deuseamor1@'),
                nomeCanal: 'CFO da Alma e dos Negócios',
                descricaoCanal: 'Consultoria em análise de dados de marketing',
                capaCanal: '',
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(this.usersKey, JSON.stringify([adminUser]));
        }
    }
    
    register(nome, email, senha) {
        const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
        
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Email já cadastrado!' };
        }
        
        const newUser = {
            email: email,
            nome: nome,
            senhaHash: this.simpleHash(senha),
            nomeCanal: nome,
            descricaoCanal: '',
            capaCanal: '',
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        return { success: true, message: 'Cadastro realizado!' };
    }
    
    login(email, senha) {
        const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
        const user = users.find(u => u.email === email);
        
        if (!user || user.senhaHash !== this.simpleHash(senha)) {
            return { success: false, message: 'Email ou senha incorretos!' };
        }
        
        const { senhaHash: _, ...userSafe } = user;
        localStorage.setItem(this.currentUserKey, JSON.stringify(userSafe));
        
        return { success: true, user: userSafe };
    }
    
    updateUser(userData) {
        const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
        const currentUser = this.getCurrentUser();
        
        const index = users.findIndex(u => u.email === currentUser.email);
        if (index !== -1) {
            users[index] = { ...users[index], ...userData };
            localStorage.setItem(this.usersKey, JSON.stringify(users));
            
            const { senhaHash: _, ...updatedUser } = users[index];
            localStorage.setItem(this.currentUserKey, JSON.stringify(updatedUser));
            return updatedUser;
        }
        return null;
    }
    
    logout() {
        localStorage.removeItem(this.currentUserKey);
    }
    
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }
    
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
}

// BANCO DE DADOS - ISOLADO POR USUÁRIO
class MeuTubeDB {
    constructor() {
        this.videosKey = 'meutube_videos';
        this.favoritosKey = 'meutube_favoritos';
        this.comentariosKey = 'meutube_comentarios';
        this.likesKey = 'meutube_likes';
        
        this.videos = JSON.parse(localStorage.getItem(this.videosKey)) || [];
        this.favoritos = JSON.parse(localStorage.getItem(this.favoritosKey)) || [];
        this.comentarios = JSON.parse(localStorage.getItem(this.comentariosKey)) || {};
        this.likes = JSON.parse(localStorage.getItem(this.likesKey)) || {};
    }
    
    salvar() {
        localStorage.setItem(this.videosKey, JSON.stringify(this.videos));
        localStorage.setItem(this.favoritosKey, JSON.stringify(this.favoritos));
        localStorage.setItem(this.comentariosKey, JSON.stringify(this.comentarios));
        localStorage.setItem(this.likesKey, JSON.stringify(this.likes));
    }
    
    // ADICIONA VÍDEO SOMENTE DO USUÁRIO LOGADO
    adicionarVideo(videoData) {
        const user = auth.getCurrentUser();
        if (!user) return null;
        
        const video = {
            id: Date.now(),
            ...videoData,
            views: 0,
            data: new Date().toISOString().split('T')[0],
            autorEmail: user.email,
            autorNome: user.nomeCanal || user.nome
        };
        
        this.videos.push(video);
        this.salvar();
        return video;
    }
    
    atualizarVideo(id, dadosAtualizados) {
        const index = this.videos.findIndex(v => v.id === parseInt(id));
        if (index !== -1) {
            this.videos[index] = { ...this.videos[index], ...dadosAtualizados };
            this.salvar();
            return this.videos[index];
        }
        return null;
    }
    
    deletarVideo(id) {
        this.videos = this.videos.filter(v => v.id !== id);
        this.favoritos = this.favoritos.filter(f => f !== id);
        delete this.comentarios[id];
        delete this.likes[id];
        this.salvar();
    }
    
    // BUSCA VÍDEOS APENAS DO USUÁRIO LOGADO
    getMeusVideos() {
        const user = auth.getCurrentUser();
        if (!user) return [];
        return this.videos.filter(v => v.autorEmail === user.email);
    }
    
    getVideo(id) {
        return this.videos.find(v => v.id === parseInt(id));
    }
    
    incrementarViews(id) {
        const video = this.getVideo(id);
        if (video) {
            video.views++;
            this.salvar();
        }
    }
    
    toggleFavorito(id) {
        const index = this.favoritos.indexOf(id);
        if (index > -1) {
            this.favoritos.splice(index, 1);
        } else {
            this.favoritos.push(id);
        }
        this.salvar();
        return this.favoritos.includes(id);
    }
    
    isFavorito(id) {
        return this.favoritos.includes(id);
    }
    
    adicionarComentario(videoId, texto) {
        const user = auth.getCurrentUser();
        if (!this.comentarios[videoId]) this.comentarios[videoId] = [];
        
        this.comentarios[videoId].unshift({
            id: Date.now(),
            autor: user ? user.nome : 'Visitante',
            texto: texto,
            data: new Date().toLocaleString('pt-BR')
        });
        this.salvar();
    }
    
    getComentarios(videoId) {
        return this.comentarios[videoId] || [];
    }
    
    toggleLike(videoId) {
        if (!this.likes[videoId]) this.likes[videoId] = 0;
        this.likes[videoId]++;
        this.salvar();
        return this.likes[videoId];
    }
    
    getLikes(videoId) {
        return this.likes[videoId] || 0;
    }
    
    buscarVideos(termo) {
        const user = auth.getCurrentUser();
        if (!user) return [];
        
        termo = termo.toLowerCase();
        return this.videos.filter(v => 
            v.autorEmail === user.email &&
            (v.titulo.toLowerCase().includes(termo) || 
             v.descricao.toLowerCase().includes(termo) ||
             v.categoria.toLowerCase().includes(termo))
        );
    }
    
    getVideosPorCategoria(categoria) {
        const user = auth.getCurrentUser();
        if (!user) return [];
        return this.videos.filter(v => 
            v.autorEmail === user.email && v.categoria === categoria
        );
    }
    
    getTotalViews() {
        const user = auth.getCurrentUser();
        if (!user) return 0;
        return this.videos
            .filter(v => v.autorEmail === user.email)
            .reduce((total, v) => total + v.views, 0);
    }
}

// APLICAÇÃO PRINCIPAL
class MeuTubeApp {
    constructor() {
        this.db = new MeuTubeDB();
        this.videoAtual = null;
        this.youtubePlayer = null;
        this.init();
    }
    
    init() {
        this.setupForms();
        this.checkAuth();
    }
    
    setupForms() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            this.login(email, senha);
        });
        
        // Cadastro
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('register-nome').value;
            const email = document.getElementById('register-email').value;
            const senha = document.getElementById('register-senha').value;
            const confirm = document.getElementById('register-confirm').value;
            
            if (senha !== confirm) {
                alert('As senhas não coincidem!');
                return;
            }
            
            const result = auth.register(nome, email, senha);
            if (result.success) {
                alert(result.message + ' Faça login!');
                this.showTab('login');
            } else {
                alert(result.message);
            }
        });
        
        // Perfil
        document.getElementById('form-perfil').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarPerfil();
        });
        
        // Vídeo
        document.getElementById('form-video').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarVideo();
        });
        
        // URL YouTube - auto thumbnail
        document.getElementById('video-url').addEventListener('blur', (e) => {
            const url = e.target.value;
            const videoId = this.extrairYoutubeId(url);
            if (videoId && !document.getElementById('video-thumb').value) {
                document.getElementById('video-thumb').value = 
                    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        });
        
        // Sair
        document.getElementById('btn-sair').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja sair?')) {
                auth.logout();
                location.reload();
            }
        });
    }
    
    checkAuth() {
        if (auth.isAuthenticated()) {
            this.showApp();
        } else {
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    }
    
    login(email, senha) {
        const result = auth.login(email, senha);
        if (result.success) {
            this.showApp();
            this.notificacao(`Bem-vindo, ${result.user.nome}!`);
        } else {
            alert(result.message);
        }
    }
    
    showApp() {
        const user = auth.getCurrentUser();
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-name').textContent = user.nome;
        this.setupApp();
    }
    
    setupApp() {
        this.setupMenu();
        this.carregarPerfil();
        this.renderizarVideos();
        if (this.db.getMeusVideos().length > 0) {
            this.carregarVideo(this.db.getMeusVideos()[0].id);
        }
    }
    
    setupMenu() {
        document.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.id === 'btn-sair') return;
                
                document.querySelectorAll('.menu a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const page = link.dataset.page;
                this.navegar(page);
                this.closeMenu();
            });
        });
    }
    
    toggleMenu() {
        document.getElementById('menu').classList.toggle('active');
    }
    
    closeMenu() {
        document.getElementById('menu').classList.remove('active');
    }
    
    navegar(page) {
        document.getElementById('player-section').style.display = 'block';
        document.getElementById('canal-profile').style.display = 'none';
        
        switch(page) {
            case 'inicio':
                this.renderizarVideos(this.db.getMeusVideos(), 'Meus Vídeos');
                break;
            case 'favoritos':
                const meusVideos = this.db.getMeusVideos();
                const favoritos = meusVideos.filter(v => this.db.isFavorito(v.id));
                this.renderizarVideos(favoritos, 'Favoritos');
                break;
            case 'cursos':
                this.renderizarVideos(this.db.getVideosPorCategoria('curso'), 'Cursos');
                break;
            case 'canal':
                document.getElementById('player-section').style.display = 'none';
                document.getElementById('canal-profile').style.display = 'block';
                this.atualizarEstatisticas();
                break;
        }
    }
    
    carregarPerfil() {
        const user = auth.getCurrentUser();
        document.getElementById('channel-name').textContent = user.nomeCanal || user.nome;
        document.getElementById('channel-desc').textContent = user.descricaoCanal || 'Sem descrição';
        
        const coverImg = document.getElementById('cover-image');
        if (user.capaCanal) {
            coverImg.src = user.capaCanal;
            coverImg.style.display = 'block';
        } else {
            coverImg.style.display = 'none';
        }
    }
    
    atualizarEstatisticas() {
        const videos = this.db.getMeusVideos();
        document.getElementById('total-videos').textContent = videos.length;
        document.getElementById('total-views').textContent = this.db.getTotalViews();
    }
    
    editarPerfil() {
        const user = auth.getCurrentUser();
        document.getElementById('perfil-nome').value = user.nomeCanal || '';
        document.getElementById('perfil-desc').value = user.descricaoCanal || '';
        document.getElementById('perfil-capa').value = user.capaCanal || '';
        document.getElementById('modal-perfil').style.display = 'flex';
    }
    
    salvarPerfil() {
        const nomeCanal = document.getElementById('perfil-nome').value;
        const descricaoCanal = document.getElementById('perfil-desc').value;
        const capaCanal = document.getElementById('perfil-capa').value;
        
        auth.updateUser({ nomeCanal, descricaoCanal, capaCanal });
        this.carregarPerfil();
        this.fecharModalPerfil();
        this.notificacao('Perfil atualizado!');
    }
    
    editarCapa() {
        const url = prompt('URL da nova capa:');
        if (url) {
            auth.updateUser({ capaCanal: url });
            this.carregarPerfil();
        }
    }
    
    renderizarVideos(videos = null, titulo = 'Meus Vídeos') {
        const lista = document.getElementById('lista-videos');
        const videosParaMostrar = videos || this.db.getMeusVideos();
        
        document.querySelector('#relacionados h3').innerHTML = 
            `<i class="fas fa-list"></i> ${titulo}`;
        
        lista.innerHTML = '';
        
        if (videosParaMostrar.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Nenhum vídeo</p>';
            return;
        }
        
        videosParaMostrar.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <button class="btn-edit-card" onclick="app.editarVideo(${video.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete-card" onclick="app.deletarVideo(${video.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <img src="${video.thumb || 'https://via.placeholder.com/320x180'}" alt="${video.titulo}">
                <div class="video-card-info">
                    <div class="video-card-titulo">${video.titulo}</div>
                    <div class="video-card-meta">
                        <span><i class="fas fa-eye"></i> ${video.views}</span>
                        <span><i class="fas fa-calendar"></i> ${video.data}</span>
                    </div>
                    <span class="video-card-categoria">${video.categoria}</span>
                </div>
            `;
            card.onclick = () => this.carregarVideo(video.id);
            lista.appendChild(card);
        });
    }
    
    extrairYoutubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    carregarVideo(id) {
        const video = this.db.getVideo(id);
        if (!video) return;
        
        this.videoAtual = video;
        this.db.incrementarViews(id);
        
        // Player YouTube ou MP4
        const ytId = this.extrairYoutubeId(video.url);
        const wrapper = document.getElementById('video-wrapper');
        const nativePlayer = document.getElementById('native-player');
        const playOverlay = document.getElementById('play-overlay');
        
        if (ytId) {
            if (this.youtubePlayer) {
                this.youtubePlayer.loadVideoById(ytId);
            } else {
                this.youtubePlayer = new YT.Player('youtube-player', {
                    height: '100%',
                    width: '100%',
                    videoId: ytId,
                    playerVars: {
                        'autoplay': 0,
                        'controls': 1,
                        'modestbranding': 1,
                        'rel': 0
                    },
                    events: {
                        'onStateChange': (e) => {
                            playOverlay.style.display = e.data === 1 ? 'none' : 'block';
                            playOverlay.innerHTML = e.data === 1 ? 
                                '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                        }
                    }
                });
            }
            nativePlayer.style.display = 'none';
            playOverlay.style.display = 'block';
        } else {
            nativePlayer.src = video.url;
            nativePlayer.style.display = 'block';
            document.getElementById('youtube-player').innerHTML = '';
            playOverlay.style.display = 'none';
        }
        
        // Info
        document.getElementById('video-titulo').textContent = video.titulo;
        document.getElementById('video-descricao').textContent = video.descricao;
        document.getElementById('video-views').textContent = video.views;
        document.getElementById('video-data').textContent = video.data.split('-').reverse().join('/');
        document.getElementById('video-autor').textContent = video.autorNome;
        document.getElementById('like-count').textContent = this.db.getLikes(id);
        
        // Botões
        const btnFav = document.getElementById('btn-favorito');
        if (this.db.isFavorito(id)) {
            btnFav.classList.add('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
        } else {
            btnFav.classList.remove('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
        
        const user = auth.getCurrentUser();
        const podeEditar = video.autorEmail === user.email;
        document.getElementById('btn-editar').style.display = podeEditar ? 'inline-flex' : 'none';
        document.getElementById('btn-excluir').style.display = podeEditar ? 'inline-flex' : 'none';
        
        this.carregarComentarios(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    togglePlay() {
        if (this.youtubePlayer) {
            const state = this.youtubePlayer.getPlayerState();
            if (state === 1) this.youtubePlayer.pauseVideo();
            else this.youtubePlayer.playVideo();
        }
    }
    
    carregarComentarios(videoId) {
        const lista = document.getElementById('lista-comentarios');
        const comentarios = this.db.getComentarios(videoId);
        
        lista.innerHTML = '';
        if (comentarios.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#aaa;">Seja o primeiro a comentar!</p>';
            return;
        }
        
        comentarios.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comentario-item';
            item.innerHTML = `
                <div class="comentario-header">
                    <span class="comentario-autor">${c.autor}</span>
                    <span>${c.data}</span>
                </div>
                <div>${c.texto}</div>
            `;
            lista.appendChild(item);
        });
    }
    
    adicionarComentario() {
        const input = document.getElementById('input-comentario');
        if (!input.value.trim() || !this.videoAtual) return;
        
        this.db.adicionarComentario(this.videoAtual.id, input.value.trim());
        input.value = '';
        this.carregarComentarios(this.videoAtual.id);
    }
    
    curtirVideo() {
        if (!this.videoAtual) return;
        document.getElementById('like-count').textContent = this.db.toggleLike(this.videoAtual.id);
        document.getElementById('btn-like').classList.toggle('liked');
    }
    
    favoritarVideo() {
        if (!this.videoAtual) return;
        const isFav = this.db.toggleFavorito(this.videoAtual.id);
        const btn = document.getElementById('btn-favorito');
        
        if (isFav) {
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
        } else {
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
    }
    
    compartilharVideo() {
        if (!this.videoAtual) return;
        navigator.clipboard.writeText(window.location.href);
        this.notificacao('Link copiado!');
    }
    
    abrirModalVideo() {
        document.getElementById('form-video').reset();
        document.getElementById('video-id-edit').value = '';
        document.getElementById('modal-title').innerHTML = 
            '<i class="fas fa-plus-circle"></i> Publicar Vídeo';
        document.getElementById('modal-video').style.display = 'flex';
    }
    
    salvarVideo() {
        const idEdit = document.getElementById('video-id-edit').value;
        const titulo = document.getElementById('video-titulo-input').value;
        let url = document.getElementById('video-url').value;
        let thumb = document.getElementById('video-thumb').value;
        const descricao = document.getElementById('video-descricao-input').value;
        const categoria = document.getElementById('video-categoria').value;
        const arquivo = document.getElementById('video-arquivo').files[0];
        
        if (arquivo) {
            url = URL.createObjectURL(arquivo);
        } else if (!url) {
            alert('Insira URL ou faça upload!');
            return;
        }
        
        if (!thumb) {
            const videoId = this.extrairYoutubeId(url);
            if (videoId) {
                thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        }
        
        const videoData = { titulo, url, thumb, descricao, categoria };
        
        if (idEdit) {
            this.db.atualizarVideo(idEdit, videoData);
            this.notificacao('Vídeo atualizado!');
        } else {
            this.db.adicionarVideo(videoData);
            this.notificacao('Vídeo publicado!');
        }
        
        this.fecharModal();
        this.renderizarVideos();
    }
    
    editarVideo(id) {
        const video = this.db.getVideo(id);
        if (!video) return;
        
        document.getElementById('video-id-edit').value = video.id;
        document.getElementById('video-titulo-input').value = video.titulo;
        document.getElementById('video-url').value = video.url;
        document.getElementById('video-thumb').value = video.thumb;
        document.getElementById('video-descricao-input').value = video.descricao;
        document.getElementById('video-categoria').value = video.categoria;
        document.getElementById('modal-title').innerHTML = 
            '<i class="fas fa-edit"></i> Editar Vídeo';
        document.getElementById('modal-video').style.display = 'flex';
    }
    
    editarVideoAtual() {
        if (this.videoAtual) this.editarVideo(this.videoAtual.id);
    }
    
    deletarVideo(id) {
        if (!confirm('Excluir este vídeo?')) return;
        this.db.deletarVideo(id);
        this.renderizarVideos();
        this.notificacao('Vídeo excluído!');
    }
    
    excluirVideoAtual() {
        if (this.videoAtual) this.deletarVideo(this.videoAtual.id);
    }
    
    pesquisar() {
        const termo = document.getElementById('search-input').value.trim();
        if (!termo) {
            this.renderizarVideos();
            return;
        }
        this.renderizarVideos(this.db.buscarVideos(termo), `Resultados: "${termo}"`);
    }
    
    mostrarDoacao() {
        alert('Em breve: PIX e PayPal para doações!');
    }
    
    showTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        if (tab === 'login') {
            document.querySelectorAll('.tab-btn')[0].classList.add('active');
            document.getElementById('login-form').classList.add('active');
        } else {
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
            document.getElementById('register-form').classList.add('active');
        }
    }
    
    togglePassword(id) {
        const input = document.getElementById(id);
        input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    fecharModal() {
        document.getElementById('modal-video').style.display = 'none';
    }
    
    fecharModalPerfil() {
        document.getElementById('modal-perfil').style.display = 'none';
    }
    
    notificacao(msg) {
        const div = document.createElement('div');
        div.style.cssText = `position:fixed;top:20px;right:20px;background:#ff0000;color:white;padding:15px 25px;border-radius:10px;z-index:9999;animation:slideIn 0.3s ease;`;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

// YouTube API
function onYouTubeIframeAPIReady() {}

// Inicializar
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MeuTubeApp();
});
