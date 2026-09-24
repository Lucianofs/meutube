class MeuTubeDB {
    constructor() {
        this.videos = JSON.parse(localStorage.getItem('meutube_videos')) || [];
        this.favoritos = JSON.parse(localStorage.getItem('meutube_favoritos')) || [];
        this.comentarios = JSON.parse(localStorage.getItem('meutube_comentarios')) || {};
        this.likes = JSON.parse(localStorage.getItem('meutube_likes')) || {};
        
        if (this.videos.length === 0) {
            this.videos = [
                {
                    id: 1, titulo: "Bem-vindo ao MeuTube - CFO da Alma",
                    url: "https://www.w3schools.com/html/mov_bbb.mp4",
                    thumb: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                    descricao: "Vídeo de exemplo MP4 funcional.", categoria: "motivacional", views: 1250, data: "2026-09-25"
                },
                {
                    id: 2, titulo: "Exemplo de Vídeo do YouTube",
                    url: "https://youtu.be/kiIIgYDCPk4",
                    thumb: "https://img.youtube.com/vi/kiIIgYDCPk4/maxresdefault.jpg",
                    descricao: "Este é um exemplo de como o sistema converte links do YouTube automaticamente.", categoria: "curso", views: 890, data: "2026-09-20"
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
        this.videos.push(video);
        this.salvar();
        return video;
    }
    
    deletarVideo(id) {
        this.videos = this.videos.filter(v => v.id !== id);
        this.favoritos = this.favoritos.filter(favId => favId !== id);
        delete this.comentarios[id];
        delete this.likes[id];
        this.salvar();
    }
    
    getVideo(id) { return this.videos.find(v => v.id === parseInt(id)); }
    
    incrementarViews(id) {
        const video = this.getVideo(id);
        if (video) { video.views++; this.salvar(); }
    }
    
    toggleFavorito(id) {
        const index = this.favoritos.indexOf(id);
        if (index > -1) this.favoritos.splice(index, 1);
        else this.favoritos.push(id);
        this.salvar();
        return this.favoritos.includes(id);
    }
    
    isFavorito(id) { return this.favoritos.includes(id); }
    
    adicionarComentario(videoId, texto) {
        if (!this.comentarios[videoId]) this.comentarios[videoId] = [];
        this.comentarios[videoId].unshift({
            id: Date.now(), autor: "Visitante", texto: texto, data: new Date().toLocaleString('pt-BR')
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
            v.titulo.toLowerCase().includes(termo) || v.categoria.toLowerCase().includes(termo)
        );
    }
}

class MeuTubeApp {
    constructor() {
        this.db = new MeuTubeDB();
        this.videoAtual = null;
        this.inicializar();
    }
    
    inicializar() {
        this.carregarEventos();
        this.renderizarListaVideos();
        if (this.db.videos.length > 0) this.carregarVideo(this.db.videos[0].id);
    }
    
    carregarEventos() {
        document.querySelectorAll('#menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#menu a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                this.navegarPara(link.dataset.page);
            });
        });
        
        document.getElementById('fab-adicionar').addEventListener('click', () => {
            document.getElementById('modal-adicionar').style.display = 'flex';
        });
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('modal-adicionar').style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-adicionar')) {
                document.getElementById('modal-adicionar').style.display = 'none';
            }
        });
        
        document.getElementById('form-novo-video').addEventListener('submit', (e) => {
            e.preventDefault();
            this.adicionarNovoVideo();
        });
        
        document.getElementById('btn-comentar').addEventListener('click', () => this.adicionarComentario());
        document.getElementById('btn-like').addEventListener('click', () => this.curtirVideo());
        document.getElementById('btn-favoritar').addEventListener('click', () => this.favoritarVideo());
        document.getElementById('btn-compartilhar').addEventListener('click', () => this.compartilharVideo());
        document.getElementById('btn-deletar-video').addEventListener('click', () => this.deletarVideoAtual());
        
        document.getElementById('search-btn').addEventListener('click', () => this.pesquisar());
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.pesquisar();
        });
        
        document.getElementById('btn-sair').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair? Isso limpará os dados locais da sessão.')) {
                localStorage.clear();
                this.mostrarNotificacao('Sessão encerrada. Recarregando...');
                setTimeout(() => location.reload(), 1500);
            }
        });
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
    
    // FUNÇÃO MÁGICA: Detecta se é YouTube e converte para Embed, ou usa vídeo normal
    extrairYoutubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    renderizarMedia(video) {
        const wrapper = document.getElementById('media-wrapper');
        const ytId = this.extrairYoutubeId(video.url);
        
        if (ytId) {
            // É YouTube: usa iframe
            wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allowfullscreen allow="autoplay"></iframe>`;
        } else {
            // É MP4 ou outro link direto: usa tag video
            wrapper.innerHTML = `<video controls autoplay><source src="${video.url}" type="video/mp4">Seu navegador não suporta vídeo.</video>`;
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
            card.innerHTML = `
                <button class="btn-delete-card" onclick="event.stopPropagation(); app.deletarVideo(${video.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
                <img src="${video.thumb}" alt="${video.titulo}" onerror="this.src='https://via.placeholder.com/320x180/1a1a1a/ff0000?text=MeuTube'">
                <div class="video-card-info">
                    <div class="video-card-titulo">${video.titulo}</div>
                    <div class="video-card-meta"><i class="fas fa-eye"></i> ${video.views} • ${video.data}</div>
                    <span class="video-card-categoria">${video.categoria}</span>
                </div>
            `;
            card.addEventListener('click', () => this.carregarVideo(video.id));
            lista.appendChild(card);
        });
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
        
        const likes = this.db.getLikes(id);
        document.getElementById('like-count').textContent = likes;
        
        const btnFav = document.getElementById('btn-favoritar');
        if (this.db.isFavorito(id)) {
            btnFav.classList.add('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
        } else {
            btnFav.classList.remove('favorited');
            btnFav.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
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
                <button class="comentario-delete" onclick="app.removerComentario(${videoId}, ${c.id})"><i class="fas fa-trash"></i></button>
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
        this.mostrarNotificacao('Comentário adicionado!');
    }
    
    removerComentario(videoId, comentarioId) {
        this.db.removerComentario(videoId, comentarioId);
        this.carregarComentarios(videoId);
    }
    
    curtirVideo() {
        if (!this.videoAtual) return;
        const likes = this.db.toggleLike(this.videoAtual.id);
        document.getElementById('like-count').textContent = likes;
        document.getElementById('btn-like').classList.toggle('liked');
    }
    
    favoritarVideo() {
        if (!this.videoAtual) return;
        const isFav = this.db.toggleFavorito(this.videoAtual.id);
        const btn = document.getElementById('btn-favoritar');
        if (isFav) {
            btn.classList.add('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritado';
            this.mostrarNotificacao('Adicionado aos favoritos!');
        } else {
            btn.classList.remove('favorited');
            btn.innerHTML = '<i class="fas fa-heart"></i> Favoritar';
        }
    }
    
    compartilharVideo() {
        if (!this.videoAtual) return;
        navigator.clipboard.writeText(window.location.href + '?v=' + this.videoAtual.id);
        this.mostrarNotificacao('Link copiado para a área de transferência!');
    }
    
    deletarVideoAtual() {
        if (!this.videoAtual) return;
        if (confirm(`Tem certeza que deseja excluir "${this.videoAtual.titulo}"?`)) {
            this.db.deletarVideo(this.videoAtual.id);
            this.mostrarNotificacao('Vídeo excluído com sucesso!');
            this.videoAtual = null;
            document.getElementById('media-wrapper').innerHTML = '';
            document.getElementById('video-titulo').textContent = 'Vídeo excluído';
            document.getElementById('video-descricao').textContent = '';
            this.renderizarListaVideos();
        }
    }
    
    deletarVideo(id) {
        if (confirm('Deseja excluir este vídeo?')) {
            this.db.deletarVideo(id);
            if (this.videoAtual && this.videoAtual.id === id) {
                this.videoAtual = null;
                document.getElementById('media-wrapper').innerHTML = '';
            }
            this.renderizarListaVideos();
            this.mostrarNotificacao('Vídeo excluído!');
        }
    }
    
    adicionarNovoVideo() {
        const titulo = document.getElementById('novo-titulo').value;
        let url = document.getElementById('novo-url').value;
        const fileInput = document.getElementById('novo-arquivo');
        const thumb = document.getElementById('novo-thumb').value || 'https://via.placeholder.com/320x180/1a1a1a/ff0000?text=MeuTube';
        const descricao = document.getElementById('novo-descricao').value;
        const categoria = document.getElementById('novo-categoria').value;
        
        // Lógica de Upload Local (Blob URL)
        if (fileInput.files.length > 0) {
            url = URL.createObjectURL(fileInput.files[0]);
        } else if (!url) {
            alert('Por favor, insira uma URL ou faça upload de um arquivo.');
            return;
        }
        
        this.db.adicionarVideo({ titulo, url, thumb, descricao, categoria });
        this.renderizarListaVideos();
        this.carregarVideo(Date.now()); // Pega o último adicionado (simplificação)
        
        document.getElementById('modal-adicionar').style.display = 'none';
        document.getElementById('form-novo-video').reset();
        this.mostrarNotificacao('Vídeo adicionado com sucesso! 🎬');
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

let app;
document.addEventListener('DOMContentLoaded', () => { app = new MeuTubeApp(); });
