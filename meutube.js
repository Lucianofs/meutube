// SISTEMA DE AUTENTICAÇÃO
const USUARIO_CADASTRADO = {
    email: 'professorluciano1@gmail.com',
    senha: 'Deuseamor1@',
    nome: 'CFO da Alma e dos Negócios',
    titulo: 'Prof. Luciano Francisco',
    descricao: 'Consultoria em análise de dados de marketing e levantamento empresarial'
};

let usuarioLogado = null;
let youtubePlayerInstance = null;

// BANCO DE DADOS
class MeuTubeDB {
    constructor() {
        this.videos = JSON.parse(localStorage.getItem('meutube_videos')) || [];
        this.favoritos = JSON.parse(localStorage.getItem('meutube_favoritos')) || [];
        this.comentarios = JSON.parse(localStorage.getItem('meutube_comentarios')) || {};
        this.likes = JSON.parse(localStorage.getItem('meutube_likes')) || {};
        
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
        localStorage.setItem('meutube_videos', JSON.stringify(this.videos));
        localStorage.setItem('meutube_favoritos', JSON.stringify(this.favoritos));
        localStorage.setItem('meutube_comentarios', JSON.stringify(this.comentarios));
        localStorage.setItem('meutube_likes', JSON.stringify(this.likes));
    }
    
    adicionarVideo(video) {
        video.id = Date.now();
        video.views = 0;
        video.data = new Date().toISOString().split('T')[0];
        video.autor = usuarioLogado ? usuarioLogado.nome : 'Visitante';
        video.autorEmail = usuarioLogado ? usuarioLogado.email : 'anonimo';
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
        this.comentarios[videoId].unshift({
            id: Date.now(),
            autor: autor || (usuarioLogado ? usuarioLogado.nome : 'Visitante'),
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

// SISTEMA PRINCIPAL
class MeuTubeApp {
    constructor() {
        this.db = new MeuTubeDB();
        this.videoAtual = null;
        this.verificarLogin();
    }
    
    verificarLogin() {
        const salvo = localStorage.getItem('meutube_usuario_logado');
        if (salvo) {
            usuarioLogado = JSON.parse(salvo);
            this.mostrarApp();
        } else {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
        }
    }
    
    fazerLogin(email, senha) {
        if (email === USUARIO_CADASTRADO.email && senha === USUARIO_CADASTRADO.senha) {
            usuarioLogado = {
                email: USUARIO_CADASTRADO.email,
                nome: USUARIO_CADASTRADO.nome,
                titulo: USUARIO_CADASTRADO.titulo
            };
            localStorage.setItem('meutube_usuario_logado', JSON.stringify(usuarioLogado));
            this.mostrarApp();
            this.mostrarNotificacao('Login realizado com sucesso! Bem-vindo, ' + usuarioLogado.nome);
            return true;
        }
        alert('Email ou senha incorretos!');
        return false;
    }
    
    mostrarApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-name').textContent = usuarioLogado.titulo;
        this.inicializar();
    }
    
    fazerLogout() {
        localStorage.removeItem('meutube_usuario_logado');
        usuarioLogado = null;
        location.reload();
    }
    
    inicializar() {
        this.carregarEventos();
        this.renderizarListaVideos();
        if (this.db.videos.length > 0) this.carregarVideo(this.db.videos[0].id);
    }
    
    carregarEventos() {
        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            this.fazerLogin(email, senha);
        });
        
        // Menu
        document.querySelectorAll('#menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.id === 'btn-sair') {
                    this.fazerLogout();
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
        
        document.querySelector('.close-modal').addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
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
                // Auto-preencher thumbnail do YouTube
                document.getElementById('video-thumb').value = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                this.mostrarNotificacao('✓ Thumbnail do YouTube extraída automaticamente!');
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
        
        // Se for upload local
        if (arquivo) {
            url = URL.createObjectURL(arquivo);
            if (!thumb) thumb = 'https://lucianofs.github.io/meutube/assets/logo-share.jpg';
        } else if (!url) {
            alert('Por favor, insira uma URL ou faça upload de um vídeo.');
            return;
        }
        
        // Se for YouTube e não tem thumbnail, extrair automaticamente
        if (!thumb) {
            const videoId = this.extrairYoutubeId(url);
            if (videoId) {
                thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        }
        
        const videoData = { titulo, url, thumb, descricao, categoria };
        
        if (idEdit) {
            // Editar vídeo existente
            this.db.atualizarVideo(idEdit, videoData);
            this.mostrarNotificacao('✓ Vídeo atualizado com sucesso!');
        } else {
            // Novo vídeo
            this.db.adicionarVideo(videoData);
            this.mostrarNotificacao('✓ Vídeo publicado com sucesso! SEO otimizado automaticamente.');
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

            if (youtubePlayerInstance) {
                youtubePlayerInstance.loadVideoById(ytId);
            } else {
                youtubePlayerInstance = new YT.Player('youtube-player', {
                    height: '100%', width: '100%', videoId: ytId,
                    playerVars: {
                        'autoplay': 1, 'controls': 0, 'modestbranding': 1, 
                        'rel': 0, 'showinfo': 0, 'iv_load_policy': 3, 'disablekb': 1
                    },
                    events: {
                        'onReady': (e) => e.target.playVideo(),
                        'onStateChange': (e) => {
                            playBtn.innerHTML = e.data === 1 ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                            if (e.data === 1) this.configurarMediaSession(video);
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
    
    configurarMediaSession(video) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: video.titulo,
                artist: usuarioLogado ? usuarioLogado.nome : 'MeuTube',
                album: 'CFO da Alma e dos Negócios',
                artwork: [{ src: video.thumb, sizes: '512x512', type: 'image/jpeg' }]
            });
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
        
        videos.forEach(video => {
            const card = document.createElement('li');
            card.className = 'video-card';
            
            const podeEditar = usuarioLogado && video.autorEmail === usuarioLogado.email;
            
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
        
        // Mostrar/esconder botão de editar
        const btnEditar = document.getElementById('btn-editar-video');
        if (usuarioLogado && video.autorEmail === usuarioLogado.email) {
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
        
        const autor = usuarioLogado ? usuarioLogado.nome : 'Visitante';
        this.db.adicionarComentario(this.videoAtual.id, input.value.trim(), autor);
        input.value = '';
        this.carregarComentarios(this.videoAtual.id);
        this.mostrarNotificacao('✓ Comentário publicado!');
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
            this.mostrarNotificacao('✓ Adicionado aos favoritos!');
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
            this.mostrarNotificacao('✓ Link copiado! Compartilhe no WhatsApp/Facebook.');
        });
    }
    
    deletarVideoAtual() {
        if (!this.videoAtual) return;
        if (!usuarioLogado || this.videoAtual.autorEmail !== usuarioLogado.email) {
            alert('Você só pode excluir seus próprios vídeos!');
            return;
        }
        if (confirm('Tem certeza que deseja excluir este vídeo permanentemente?')) {
            this.db.deletarVideo(this.videoAtual.id);
            this.mostrarNotificacao('✓ Vídeo excluído com sucesso!');
            this.videoAtual = null;
            document.getElementById('youtube-player').innerHTML = '';
            document.getElementById('native-player').src = '';
            this.renderizarListaVideos();
        }
    }
    
    deletarVideo(id) {
        if (!usuarioLogado) {
            alert('Faça login para excluir vídeos!');
            return;
        }
        const video = this.db.getVideo(id);
        if (video && video.autorEmail !== usuarioLogado.email) {
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
            this.mostrarNotificacao('✓ Vídeo excluído!');
        }
    }
    
    pesquisar() {
        const termo = document.getElementById('search-input').value.trim();
        if (!termo) { this.renderizarListaVideos(); return; }
        this.renderizarListaVideos(this.db.buscarVideos(termo), `Resultados para: "${termo}"`);
    }
    
    mostrarNotificacao(msg) {
        const notif = document.createElement('div');
        notif.style.cssText = `position:fixed;top:20px;right:20px;background:#ff0000;color:white;padding:15px 25px;border-radius:10px;box-shadow:0 5px 20px rgba(255,0,0,0.5);z-index:3000;font-weight:bold;animation:slideIn 0.3s ease;`;
        notif.textContent = msg;
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 300); }, 3000);
    }
}

// Inicializar
let app;
document.addEventListener('DOMContentLoaded', () => { app = new MeuTubeApp(); });
