// ============================================
// MEUTUBE - SISTEMA COMPLETO DE VÍDEOS
// CFO da Alma e dos Negócios
// ============================================

// BANCO DE DADOS LOCAL (localStorage)
class MeuTubeDB {
    constructor() {
        this.videos = JSON.parse(localStorage.getItem('meutube_videos')) || [];
        this.favoritos = JSON.parse(localStorage.getItem('meutube_favoritos')) || [];
        this.comentarios = JSON.parse(localStorage.getItem('meutube_comentarios')) || {};
        this.likes = JSON.parse(localStorage.getItem('meutube_likes')) || {};
        
        // Se não houver vídeos, cria alguns de exemplo
        if (this.videos.length === 0) {
            this.videos = this.getVideosExemplo();
            this.salvar();
        }
    }
    
    getVideosExemplo() {
        return [
            {
                id: 1,
                titulo: "Bem-vindo ao MeuTube - CFO da Alma",
                url: "https://www.w3schools.com/html/mov_bbb.mp4",
                thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                descricao: "Este é o primeiro vídeo da nossa plataforma de cursos e conteúdos exclusivos.",
                categoria: "motivacional",
                views: 1250,
                data: "2026-09-25"
            },
            {
                id: 2,
                titulo: "Como Transformar sua Mente e seus Negócios",
                url: "https://www.w3schools.com/html/movie.mp4",
                thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                descricao: "Aprenda técnicas poderosas para alinhar sua alma com seus objetivos financeiros.",
                categoria: "curso",
                views: 890,
                data: "2026-09-20"
            },
            {
                id: 3,
                titulo: "Mentalidade de Sucesso - Aula 01",
                url: "https://www.w3schools.com/html/mov_bbb.mp4",
                thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/sddefault.jpg",
                descricao: "Primeira aula do curso completo sobre mentalidade empreendedora.",
                categoria: "curso",
                views: 2100,
                data: "2026-09-15"
            },
            {
                id: 4,
                titulo: "Dicas de Produtividade para Empreendedores",
                url: "https://www.w3schools.com/html/movie.mp4",
                thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
                descricao: "Maximize seus resultados com essas técnicas comprovadas.",
                categoria: "tutorial",
                views: 567,
                data: "2026-09-10"
            },
            {
                id: 5,
                titulo: "Finanças Pessoais e Liberdade Financeira",
                url: "https://www.w3schools.com/html/mov_bbb.mp4",
                thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
                descricao: "O caminho para a independência financeira começa aqui.",
                categoria: "curso",
                views: 1890,
                data: "2026-09-05"
            }
        ];
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
        this.videos.push(video);
        this.salvar();
        return video;
    }
    
    removerVideo(id) {
        this.videos = this.videos.filter(v => v.id !== id);
        this.salvar();
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
        if (!this.comentarios[videoId]) {
            this.comentarios[videoId] = [];
        }
        const comentario = {
            id: Date.now(),
            autor: "Visitante",
            texto: texto,
            data: new Date().toLocaleString('pt-BR')
        };
        this.comentarios[videoId].unshift(comentario);
        this.salvar();
        return comentario;
    }
    
    removerComentario(videoId, comentarioId) {
        if (this.comentarios[videoId]) {
            this.comentarios[videoId] = this.comentarios[videoId].filter(c => c.id !== comentarioId);
            this.salvar();
        }
    }
    
    getComentarios(videoId) {
        return this.comentarios[videoId] || [];
    }
    
    toggleLike(videoId) {
        if (!this.likes[videoId]) {
            this.likes[videoId] = 0;
        }
        this.likes[videoId]++;
        this.salvar();
        return this.likes[videoId];
    }
    
    getLikes(videoId) {
        return this.likes[videoId] || 0;
    }
    
    buscarVideos(termo) {
        termo = termo.toLowerCase();
        return this.videos.filter(v => 
            v.titulo.toLowerCase().includes(termo) ||
            v.descricao.toLowerCase().includes(termo) ||
            v.categoria.toLowerCase().includes(termo)
        );
    }
}

// ============================================
// APLICAÇÃO PRINCIPAL
// ============================================

class MeuTubeApp {
    constructor() {
        this.db = new MeuTubeDB();
        this.videoAtual = null;
        this.inicializar();
    }
    
    inicializar() {
        this.carregarEventos();
        this.renderizarListaVideos();
        
        // Carregar primeiro vídeo
        if (this.db.videos.length > 0) {
            this.carregarVideo(this.db.videos[0].id);
        }
    }
    
    carregarEventos() {
        // Menu de navegação
        document.querySelectorAll('#menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#menu a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const pagina = link.dataset.page;
                this.navegarPara(pagina);
            });
        });
        
        // Botão de adicionar vídeo
        document.getElementById('fab-adicionar').addEventListener('click', () => {
            document.getElementById('modal-adicionar').style.display = 'flex';
        });
        
        // Fechar modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modal-adicionar').style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal-adicionar');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Formulário de novo vídeo
        document.getElementById('form-novo-video').addEventListener('submit', (e) => {
            e.preventDefault();
            this.adicionarNovoVideo();
        });
        
        // Botão de comentar
        document.getElementById('btn-comentar').addEventListener('click', () => {
            this.adicionarComentario();
        });
        
        // Botão de curtir
        document.getElementById('btn-like').addEventListener('click', () => {
            this.curtirVideo();
        });
        
        // Botão de favoritar
        document.getElementById('btn-favoritar').addEventListener('click', () => {
            this.favoritarVideo();
        });
        
        // Botão de compartilhar
        document.getElementById('btn-compartilhar').addEventListener('click', () => {
            this.compartilharVideo();
        });
        
        // Pesquisa
        document.getElementById('search-btn').addEventListener('click', () => {
            this.pesquisar();
        });
        
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.pesquisar();
            }
        });
        
        // Botão sair
        document.getElementById('btn-sair').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair?')) {
                alert('Obrigado por visitar o MeuTube!');
            }
        });
    }
    
    navegarPara(pagina) {
        switch(pagina) {
            case 'inicio':
                this.renderizarListaVideos();
                break;
            case 'favoritos':
                this.mostrarFavoritos();
                break;
            case 'meus-videos':
                this.mostrarMeusVideos();
                break;
            case 'cursos':
                this.mostrarCursos();
                break;
        }
    }
    
    mostrarFavoritos() {
        const favoritos = this.db.videos.filter(v => this.db.isFavorito(v.id));
        this.renderizarListaVideos(favoritos, 'Seus Favoritos');
    }
    
    mostrarMeusVideos() {
        this.renderizarListaVideos(this.db.videos, 'Meus Vídeos');
    }
    
    mostrarCursos() {
        const cursos = this.db.videos.filter(v => v.categoria === 'curso');
        this.renderizarListaVideos(cursos, 'Cursos Disponíveis');
    }
    
    renderizarListaVideos(videos = null, titulo = 'Próximos Vídeos') {
        const lista = document.getElementById('lista-videos');
        const videosParaMostrar = videos || this.db.videos;
        
        document.querySelector('#relacionados h3').innerHTML = 
            `<i class="fas fa-list"></i> ${titulo}`;
        
        lista.innerHTML = '';
        
        if (videosParaMostrar.length === 0) {
            lista.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Nenhum vídeo encontrado</p>';
            return;
        }
        
        videosParaMostrar.forEach(video => {
            const card = document.createElement('li');
            card.className = 'video-card';
            card.innerHTML = `
                <img src="${video.thumb}" alt="${video.titulo}" onerror="this.src='https://via.placeholder.com/320x180/1a1a1a/ff0000?text=MeuTube'">
                <div class="video-card-info">
                    <div class="video-card-titulo">${video.titulo}</div>
                    <div class="video-card-meta">
                        <i class="fas fa-eye"></i> ${video.views} views • 
                        <i class="fas fa-calendar"></i> ${this.formatarData(video.data)}
                    </div>
                    <span class="video-card-categoria">${video.categoria}</span>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.carregarVideo(video.id);
            });
            
            lista.appendChild(card);
        });
    }
    
    carregarVideo(id) {
        const video = this.db.getVideo(id);
        if (!video) return;
        
        this.videoAtual = video;
        this.db.incrementarViews(id);
        
        // Atualizar player
        const videoPlayer = document.getElementById('video-principal');
        videoPlayer.src = video.url;
        videoPlayer.load();
        
        // Atualizar informações
        document.getElementById('video-titulo').textContent = video.titulo;
        document.getElementById('video-descricao').textContent = video.descricao;
        document.getElementById('video-views').innerHTML = 
            `<i class="fas fa-eye"></i> ${video.views + 1} visualizações`;
        document.getElementById('video-data').innerHTML = 
            `<i class="fas fa-calendar"></i> ${this.formatarData(video.data)}`;
        
        // Atualizar likes
        const likes = this.db.getLikes(id);
        document.getElementById('like-count').textContent = likes;
        
        // Atualizar botão favoritar
        const btnFavoritar = document.getElementById('btn-favoritar');
        if (this.db.isFavorito(id)) {
            btnFavoritar.classList.add('favorited');
            btnFavoritar.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
        } else {
            btnFavoritar.classList.remove('favorited');
            btnFavoritar.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
        
        // Carregar comentários
        this.carregarComentarios(id);
        
        // Scroll para o topo
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
        
        comentarios.forEach(comentario => {
            const item = document.createElement('div');
            item.className = 'comentario-item';
            item.innerHTML = `
                <div class="comentario-header">
                    <span class="comentario-autor"><i class="fas fa-user-circle"></i> ${comentario.autor}</span>
                    <span>${comentario.data}</span>
                </div>
                <div class="comentario-texto">${comentario.texto}</div>
                <button class="comentario-delete" onclick="app.removerComentario(${videoId}, ${comentario.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            lista.appendChild(item);
        });
    }
    
    adicionarComentario() {
        const input = document.getElementById('input-comentario');
        const texto = input.value.trim();
        
        if (!texto) {
            alert('Digite um comentário!');
            return;
        }
        
        if (!this.videoAtual) return;
        
        this.db.adicionarComentario(this.videoAtual.id, texto);
        input.value = '';
        this.carregarComentarios(this.videoAtual.id);
        
        // Feedback visual
        this.mostrarNotificacao('Comentário adicionado!');
    }
    
    removerComentario(videoId, comentarioId) {
        if (confirm('Deseja remover este comentário?')) {
            this.db.removerComentario(videoId, comentarioId);
            this.carregarComentarios(videoId);
        }
    }
    
    curtirVideo() {
        if (!this.videoAtual) return;
        
        const likes = this.db.toggleLike(this.videoAtual.id);
        document.getElementById('like-count').textContent = likes;
        
        const btn = document.getElementById('btn-like');
        btn.classList.toggle('liked');
        
        this.mostrarNotificacao('Vídeo curtido! 👍');
    }
    
    favoritarVideo() {
        if (!this.videoAtual) return;
        
        const isFav = this.db.toggleFavorito(this.videoAtual.id);
        const btn = document.getElementById('btn-favoritar');
        
        if (isFav) {
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
            this.mostrarNotificacao('Adicionado aos favoritos! ❤️');
        } else {
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
            this.mostrarNotificacao('Removido dos favoritos');
        }
    }
    
    compartilharVideo() {
        if (!this.videoAtual) return;
        
        const url = window.location.href + '?video=' + this.videoAtual.id;
        
        if (navigator.share) {
            navigator.share({
                title: this.videoAtual.titulo,
                text: this.videoAtual.descricao,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                this.mostrarNotificacao('Link copiado! 📋');
            });
        }
    }
    
    adicionarNovoVideo() {
        const titulo = document.getElementById('novo-titulo').value;
        const url = document.getElementById('novo-url').value;
        const thumb = document.getElementById('novo-thumb').value || 'https://via.placeholder.com/320x180/1a1a1a/ff0000?text=MeuTube';
        const descricao = document.getElementById('novo-descricao').value;
        const categoria = document.getElementById('novo-categoria').value;
        
        const video = {
            titulo,
            url,
            thumb,
            descricao,
            categoria
        };
        
        this.db.adicionarVideo(video);
        this.renderizarListaVideos();
        this.carregarVideo(video.id);
        
        // Fechar modal e limpar formulário
        document.getElementById('modal-adicionar').style.display = 'none';
        document.getElementById('form-novo-video').reset();
        
        this.mostrarNotificacao('Vídeo adicionado com sucesso! 🎬');
    }
    
    pesquisar() {
        const termo = document.getElementById('search-input').value.trim();
        
        if (!termo) {
            this.renderizarListaVideos();
            return;
        }
        
        const resultados = this.db.buscarVideos(termo);
        this.renderizarListaVideos(resultados, `Resultados para: "${termo}"`);
    }
    
    formatarData(data) {
        if (!data) return '--/--/----';
        const partes = data.split('-');
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    
    mostrarNotificacao(mensagem) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff0000, #cc0000);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(255,0,0,0.5);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            font-weight: bold;
        `;
        notif.textContent = mensagem;
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
}

// Adicionar animações CSS dinamicamente
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar aplicação
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MeuTubeApp();
});
