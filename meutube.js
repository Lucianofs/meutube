// SISTEMA DE AUTENTICAÇÃO SEGURO
// NOTA: Em produção real, use backend com bcrypt. Aqui usamos hash simples para ofuscação.

class AuthSystem {
    constructor() {
        this.usersKey = 'meutube_users';
        this.currentUserKey = 'meutube_current_user';
        this.initAdmin();
    }
    
    // Hash simples para ofuscar senha (NÃO é criptografia forte - apenas ofuscação)
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    // Inicializar admin padrão (apenas no primeiro acesso)
    initAdmin() {
        const users = localStorage.getItem(this.usersKey);
        if (!users) {
            // Criar admin padrão com hash
            const adminUser = {
                email: 'professorluciano1@gmail.com',
                nome: 'CFO da Alma e dos Negócios',
                titulo: 'Prof. Luciano Francisco',
                senhaHash: this.simpleHash('Deuseamor1@'),
                createdAt: new Date().toISOString(),
                isAdmin: true
            };
            localStorage.setItem(this.usersKey, JSON.stringify([adminUser]));
        }
    }
    
    // Registrar novo usuário
    register(nome, email, titulo, senha) {
        const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
        
        // Verificar se email já existe
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'Este email já está cadastrado!' };
        }
        
        const newUser = {
            email: email,
            nome: nome,
            titulo: titulo || nome,
            senhaHash: this.simpleHash(senha),
            createdAt: new Date().toISOString(),
            isAdmin: false
        };
        
        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        return { success: true, message: 'Cadastro realizado com sucesso!' };
    }
    
    // Login
    login(email, senha) {
        const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]');
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, message: 'Email ou senha incorretos!' };
        }
        
        const senhaHash = this.simpleHash(senha);
        if (user.senhaHash !== senhaHash) {
            return { success: false, message: 'Email ou senha incorretos!' };
        }
        
        // Salvar usuário logado (sem senha)
        const { senhaHash: _, ...userWithoutPassword } = user;
        localStorage.setItem(this.currentUserKey, JSON.stringify(userWithoutPassword));
        
        return { success: true, user: userWithoutPassword };
    }
    
    // Logout
    logout() {
        localStorage.removeItem(this.currentUserKey);
    }
    
    // Verificar se está logado
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }
    
    // Verificar se está autenticado
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
}

// Instância global de autenticação
const auth = new AuthSystem();

// Banco de Dados
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
        
        if (this.videos.length === 0) {
            this.videos = [
                {
                    id: 1,
                    titulo: "Bem-vindo ao MeuTube - CFO da Alma",
                    url: "https://youtu.be/kiIIgYDCPk4",
                    thumb: "https://img.youtube.com/vi/kiIIgYDCPk4/maxresdefault.jpg",
                    descricao: "Vídeo de boas-vindas à plataforma",
                    categoria: "motivacional",
                    views: 1250,
                    data: "2026-09-25",
                    autor: "CFO da Alma e dos Negócios",
                    autorEmail: "professorluciano1@gmail.com"
                }
            ];
            this.salvar();
        }
    }
    
    salvar() {
        localStorage.setItem(this.videosKey, JSON.stringify(this.videos));
        localStorage.setItem(this.favoritosKey, JSON.stringify(this.favoritos));
        localStorage.setItem(this.comentariosKey, JSON.stringify(this.comentarios));
        localStorage.setItem(this.likesKey, JSON.stringify(this.likes));
    }
    
    adicionarVideo(video) {
        const user = auth.getCurrentUser();
        video.id = Date.now();
        video.views = 0;
        video.data = new Date().toISOString().split('T')[0];
        video.autor = user ? user.nome : 'Visitante';
        video.autorEmail = user ? user.email : 'anonimo';
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
    
    getVideo(id) { return this.videos.find(v => v.id === parseInt(id)); }
    incrementarViews(id) { const v = this.getVideo(id); if (v) { v.views++; this.salvar(); } }
    
    toggleFavorito(id) {
        const idx = this.favoritos.indexOf(id);
        if (idx > -1) this.favoritos.splice(idx, 1);
        else this.favoritos.push(id);
        this.salvar();
        return this.favoritos.includes(id);
    }
    
    isFavorito(id) { return this.favoritos.includes(id); }
    
    adicionarComentario(videoId, texto, autor) {
        if (!this.comentarios[videoId]) this.comentarios[videoId] = [];
        const user = auth.getCurrentUser();
        this.comentarios[videoId].unshift({
            id: Date.now(),
            autor: autor || (user ? user.nome : 'Visitante'),
            texto,
            data: new Date().toLocaleString('pt-BR')
        });
        this.salvar();
    }
    
    removerComentario(videoId, comentarioId) {
        if (this.comentarios[videoId]) {
            this.comentarios[videoId] = this.comentarios[videoId].filter(c => c.id !== comentarioId);
            this.salvar();
        }
    }
    
    getComentarios(videoId) { return this.comentarios[videoId] || []; }
    
    toggleLike(videoId) {
        if (!this.likes[videoId]) this.likes[videoId] = 0;
        this.likes[videoId]++;
        this.salvar();
        return this.likes[videoId];
    }
    
    getLikes(videoId) { return this.likes[videoId] || 0; }
    
    buscarVideos(termo) {
        termo = termo.toLowerCase();
        return this.videos.filter(v => 
            v.titulo.toLowerCase().includes(termo) || 
            v.descricao.toLowerCase().includes(termo) ||
            v.categoria.toLowerCase().includes(termo)
        );
    }
}

// Aplicação Principal
class MeuTubeApp {
    constructor() {
        this.db = new MeuTubeDB();
        this.videoAtual = null;
        this.youtubePlayerInstance = null;
        this.init();
    }
    
    init() {
        this.setupAuthForms();
        this.checkAuth();
    }
    
    // Configurar formulários de autenticação
    setupAuthForms() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            this.handleLogin(email, senha);
        });
        
        // Cadastro
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('register-nome').value;
            const email = document.getElementById('register-email').value;
            const titulo = document.getElementById('register-titulo').value;
            const senha = document.getElementById('register-senha').value;
            const confirm = document.getElementById('register-confirm').value;
            
            if (senha !== confirm) {
                alert('As senhas não coincidem!');
                return;
            }
            
            const result = auth.register(nome, email, titulo, senha);
            if (result.success) {
                alert(result.message + ' Agora faça login!');
                showTab('login');
                document.getElementById('register-form').reset();
            } else {
                alert(result.message);
            }
        });
    }
    
    // Verificar autenticação
    checkAuth() {
        if (auth.isAuthenticated()) {
            this.showApp();
        } else {
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    }
    
    // Handle Login
    handleLogin(email, senha) {
        const result = auth.login(email, senha);
        if (result.success) {
            this.showApp();
            this.showNotification(`Bem-vindo, ${result.user.nome}!`);
        } else {
            alert(result.message);
        }
    }
    
    // Mostrar aplicação
    showApp() {
        const user = auth.getCurrentUser();
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-name').textContent = user.titulo || user.nome;
        this.setupApp();
    }
    
    // Configurar app após login
    setupApp() {
        this.setupEventListeners();
        this.renderizarListaVideos();
        if (this.db.videos.length > 0) this.carregarVideo(this.db.videos[0].id);
    }
    
    setupEventListeners() {
        // Menu
        document.querySelectorAll('#menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.id === 'btn-sair') {
                    this.handleLogout();
                    return;
                }
                document.querySelectorAll('#menu a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                this.navegarPara(link.dataset.page);
            });
        });
        
        // Modal
        document.getElementById('fab-adicionar').addEventListener('click', () => {
            document.getElementById('modal-title').innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Vídeo';
            document.getElementById('form-video').reset();
            document.getElementById('video-id-edit').value = '';
            document.getElementById('modal-video').style.display = 'flex';
        });
        
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) e.target.style.display = 'none';
        });
        
        // Formulário Vídeo
        document.getElementById('form-video').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarVideo();
        });
        
        // URL do YouTube - Extrair Thumbnail Automaticamente
        document.getElementById('video-url').addEventListener('blur', (e) => {
            const url = e.target.value;
            const videoId = this.extrairYoutubeId(url);
            if (videoId && !document.getElementById('video-thumb').value) {
                document.getElementById('video-thumb').value = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                this.showNotification('✓ Thumbnail do YouTube extraída automaticamente!');
            }
        });
        
        // Botões
        document.getElementById('btn-comentar').addEventListener('click', () => this.adicionarComentario());
        document.getElementById('btn-like').addEventListener('click', () => this.curtirVideo());
        document.getElementById('btn-favoritar').addEventListener('click', () => this.favoritarVideo());
        document.getElementById('btn-compartilhar').addEventListener('click', () => this.compartilharVideo());
        document.getElementById('btn-editar-video').addEventListener('click', () => this.editarVideoAtual());
        document.getElementById('btn-deletar-video').addEventListener('click', () => this.deletarVideoAtual());
        document.getElementById('btn-doar').addEventListener('click', () => {
            document.getElementById('modal-doacao').style.display = 'flex';
        });
        
        // Pesquisa
        document.getElementById('search-btn').addEventListener('click', () => this.pesquisar());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.pesquisar();
        });
    }
    
    handleLogout() {
        if (confirm('Deseja realmente sair?')) {
            auth.logout();
            location.reload();
        }
    }
    
    showTab(tabName) {
        // Remover active de todos
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        // Adicionar active no selecionado
        if (tabName === 'login') {
            document.querySelectorAll('.tab-btn')[0].classList.add('active');
            document.getElementById('login-form').classList.add('active');
        } else {
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
            document.getElementById('register-form').classList.add('active');
        }
    }
    
    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    extrairYoutubeId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
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
            if (!thumb) thumb = 'https://lucianofs.github.io/meutube/assets/logo-share.jpg';
        } else if (!url) {
            alert('Por favor, insira uma URL ou faça upload de um vídeo.');
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
            this.showNotification('✓ Vídeo atualizado com sucesso!');
        } else {
            this.db.adicionarVideo(videoData);
            this.showNotification('✓ Vídeo publicado com sucesso! SEO otimizado automaticamente.');
        }
        
        document.getElementById('modal-video').style.display = 'none';
        this.renderizarListaVideos();
        if (!idEdit) this.carregarVideo(Date.now());
    }
    
    editarVideoAtual() {
        if (!this.videoAtual) return;
        document.getElementById('modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Vídeo';
        document.getElementById('video-id-edit').value = this.videoAtual.id;
        document.getElementById('video-titulo-input').value = this.videoAtual.titulo;
        document.getElementById('video-url').value = this.videoAtual.url;
        document.getElementById('video-thumb').value = this.videoAtual.thumb;
        document.getElementById('video-descricao-input').value = this.videoAtual.descricao;
        document.getElementById('video-categoria').value = this.videoAtual.categoria;
        document.getElementById('modal-video').style.display = 'flex';
    }
    
    navegarPara(pagina) {
        switch(pagina) {
            case 'inicio': this.renderizarListaVideos(this.db.videos, 'Próximos Vídeos'); break;
            case 'favoritos': 
                const favs = this.db.videos.filter(v => this.db.isFavorito(v.id));
                this.renderizarListaVideos(favs, 'Seus Favoritos'); 
                break;
            case 'cursos': 
                const cursos = this.db.videos.filter(v => v.categoria === 'curso');
                this.renderizarListaVideos(cursos, 'Cursos Disponíveis'); 
                break;
        }
    }
    
    renderizarMedia(video) {
        const ytId = this.extrairYoutubeId(video.url);
        const nativePlayer = document.getElementById('native-player');
        const ytWrapper = document.getElementById('youtube-player');
        const mask = document.getElementById('youtube-mask');
        const playBtn = document.getElementById('custom-play-btn');

        if (ytId) {
            nativePlayer.style.display = 'none';
            ytWrapper.style.display = 'block';
            mask.style.display = 'block';
            playBtn.style.display = 'flex';

            if (this.youtubePlayerInstance) {
                this.youtubePlayerInstance.loadVideoById(ytId);
            } else {
                this.youtubePlayerInstance = new YT.Player('youtube-player', {
                    height: '100%', width: '100%', videoId: ytId,
                    playerVars: {
                        'autoplay': 1, 'controls': 0, 'modestbranding': 1, 
                        'rel': 0, 'showinfo': 0, 'iv_load_policy': 3, 'disablekb': 1
                    },
                    events: {
                        'onReady': (e) => e.target.playVideo(),
                        'onStateChange': (e) => {
                            playBtn.innerHTML = e.data === 1 ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                        }
                    }
                });
            }
        } else {
            ytWrapper.style.display = 'none';
            mask.style.display = 'none';
            playBtn.style.display = 'none';
            nativePlayer.style.display = 'block';
            nativePlayer.src = video.url;
            nativePlayer.play();
        }
    }
    
    renderizarListaVideos(videos = this.db.videos, titulo = 'Próximos Vídeos') {
        const lista = document.getElementById('lista-videos');
        document.getElementById('titulo-relacionados').innerHTML = `<i class="fas fa-list"></i> ${titulo}`;
        lista.innerHTML = '';
        
        if (videos.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Nenhum vídeo encontrado</p>';
            return;
        }
        
        const user = auth.getCurrentUser();
        
        videos.forEach(video => {
            const card = document.createElement('li');
            card.className = 'video-card';
            
            const podeEditar = user && video.autorEmail === user.email;
            
            card.innerHTML = `
                ${podeEditar ? `<button class="btn-edit-card" onclick="event.stopPropagation(); app.abrirEdicao(${video.id})" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                ${podeEditar ? `<button class="btn-delete-card" onclick="event.stopPropagation(); app.deletarVideo(${video.id})" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
                <img src="${video.thumb}" alt="${video.titulo}" onerror="this.src='https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'">
                <div class="video-card-info">
                    <div class="video-card-titulo">${video.titulo}</div>
                    <div class="video-card-meta">
                        <i class="fas fa-user"></i> ${video.autor} • 
                        <i class="fas fa-eye"></i> ${video.views}
                    </div>
                    <span class="video-card-categoria">${video.categoria}</span>
                </div>
            `;
            card.addEventListener('click', () => this.carregarVideo(video.id));
            lista.appendChild(card);
        });
    }
    
    abrirEdicao(id) {
        const video = this.db.getVideo(id);
        if (!video) return;
        this.videoAtual = video;
        this.editarVideoAtual();
    }
    
    carregarVideo(id) {
        const video = this.db.getVideo(id);
        if (!video) return;
        
        this.videoAtual = video;
        this.db.incrementarViews(id);
        this.renderizarMedia(video);
        
        document.getElementById('video-titulo').textContent = video.titulo;
        document.getElementById('video-descricao').textContent = video.descricao;
        document.getElementById('video-views').innerHTML = `<i class="fas fa-eye"></i> ${video.views} visualizações`;
        document.getElementById('video-data').innerHTML = `<i class="fas fa-calendar"></i> ${video.data}`;
        document.getElementById('video-autor').innerHTML = `<i class="fas fa-user"></i> ${video.autor}`;
        document.getElementById('like-count').textContent = this.db.getLikes(id);
        
        const btnFav = document.getElementById('btn-favoritar');
        if (this.db.isFavorito(id)) {
            btnFav.classList.add('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
        } else {
            btnFav.classList.remove('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
        
        const user = auth.getCurrentUser();
        const btnEditar = document.getElementById('btn-editar-video');
        if (user && video.autorEmail === user.email) {
            btnEditar.style.display = 'flex';
        } else {
            btnEditar.style.display = 'none';
        }
        
        this.carregarComentarios(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    carregarComentarios(videoId) {
        const lista = document.getElementById('lista-comentarios');
        const comentarios = this.db.getComentarios(videoId);
        lista.innerHTML = '';
        
        if (comentarios.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Seja o primeiro a comentar!</p>';
            return;
        }
        
        comentarios.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comentario-item';
            item.innerHTML = `
                <div class="comentario-header">
                    <span class="comentario-autor"><i class="fas fa-user-circle"></i> ${c.autor}</span>
                    <span>${c.data}</span>
                </div>
                <div class="comentario-texto">${c.texto}</div>
            `;
            lista.appendChild(item);
        });
    }
    
    adicionarComentario() {
        const input = document.getElementById('input-comentario');
        if (!input.value.trim() || !this.videoAtual) return;
        
        const user = auth.getCurrentUser();
        const autor = user ? user.nome : 'Visitante';
        this.db.adicionarComentario(this.videoAtual.id, input.value.trim(), autor);
        input.value = '';
        this.carregarComentarios(this.videoAtual.id);
        this.showNotification('✓ Comentário publicado!');
    }
    
    curtirVideo() {
        if (!this.videoAtual) return;
        document.getElementById('like-count').textContent = this.db.toggleLike(this.videoAtual.id);
        document.getElementById('btn-like').classList.toggle('liked');
    }
    
    favoritarVideo() {
        if (!this.videoAtual) return;
        const isFav = this.db.toggleFavorito(this.videoAtual.id);
        const btn = document.getElementById('btn-favoritar');
        if (isFav) {
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
            this.showNotification('✓ Adicionado aos favoritos!');
        } else {
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
    }
    
    compartilharVideo() {
        if (!this.videoAtual) return;
        const url = window.location.href.split('?')[0] + '?v=' + this.videoAtual.id;
        
        if (navigator.share) {
            navigator.share({
                title: this.videoAtual.titulo + ' | MeuTube',
                text: this.videoAtual.descricao,
                url: url
            }).catch(() => this.copiarLink(url));
        } else {
            this.copiarLink(url);
        }
    }
    
    copiarLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('✓ Link copiado! Compartilhe no WhatsApp/Facebook.');
        });
    }
    
    deletarVideoAtual() {
        if (!this.videoAtual) return;
        const user = auth.getCurrentUser();
        if (!user || this.videoAtual.autorEmail !== user.email) {
            alert('Você só pode excluir seus próprios vídeos!');
            return;
        }
        if (confirm('Tem certeza que deseja excluir este vídeo permanentemente?')) {
            this.db.deletarVideo(this.videoAtual.id);
            this.showNotification('✓ Vídeo excluído com sucesso!');
            this.videoAtual = null;
            document.getElementById('youtube-player').innerHTML = '';
            document.getElementById('native-player').src = '';
            this.renderizarListaVideos();
        }
    }
    
    deletarVideo(id) {
        const user = auth.getCurrentUser();
        if (!user) {
            alert('Faça login para excluir vídeos!');
            return;
        }
        const video = this.db.getVideo(id);
        if (video && video.autorEmail !== user.email) {
            alert('Você só pode excluir seus próprios vídeos!');
            return;
        }
        if (confirm('Deseja excluir este vídeo permanentemente?')) {
            this.db.deletarVideo(id);
            if (this.videoAtual && this.videoAtual.id === id) {
                this.videoAtual = null;
                document.getElementById('youtube-player').innerHTML = '';
            }
            this.renderizarListaVideos();
            this.showNotification('✓ Vídeo excluído!');
        }
    }
    
    pesquisar() {
        const termo = document.getElementById('search-input').value.trim();
        if (!termo) { this.renderizarListaVideos(); return; }
        this.renderizarListaVideos(this.db.buscarVideos(termo), `Resultados para: "${termo}"`);
    }
    
    showNotification(msg) {
        const notif = document.createElement('div');
        notif.style.cssText = `position:fixed;top:20px;right:20px;background:#ff0000;color:white;padding:15px 25px;border-radius:10px;box-shadow:0 5px 20px rgba(255,0,0,0.5);z-index:3000;font-weight:bold;animation:slideIn 0.3s ease;`;
        notif.textContent = msg;
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 300); }, 3000);
    }
}

// Funções globais para o HTML
function showTab(tabName) {
    if (app) app.showTab(tabName);
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Inicializar app
let app;
document.addEventListener('DOMContentLoaded', () => { 
    app = new MeuTubeApp(); 
});

// YouTube API
function onYouTubeIframeAPIReady() {
    // API carregada
}
