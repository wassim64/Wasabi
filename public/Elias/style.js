class GenreTree {
    constructor(container) {
        this.container = container;
        this.nodeWidth = 300; 
        this.nodeHeight = 50;  
        this.minNodeSpacing = 100;  
    }

    async initialize(genreName) {
        try {
            const genres = await this.fetchGenres();
            const genreData = this.findGenre(genres, genreName);
            
            if (genreData.error) {
                this.showError(genreData.error);
            } else {
                this.displayTree(genreData);
                this.updateBreadcrumb(genreData);
            }
        } catch (error) {
            this.showError("Une erreur est survenue lors du chargement des données");
        }
    }

    async fetchGenres() {
        try {
            const response = await fetch('sous-genre.json');
            return await response.json();
        } catch (error) {
            throw new Error('Erreur lors du chargement des données');
        }
    }

    findGenre(data, searchGenre) {
        const search = (item, parentPath = []) => {
            const currentGenre = item.genre;
            const currentPath = [...parentPath, currentGenre].filter(Boolean);

            if (currentGenre === searchGenre) {
                return {
                    genre: currentGenre,
                    parent_genres: parentPath,
                    subgenres: item.subgenres || []
                };
            }

            if (item.subgenres) {
                for (const subgenre of item.subgenres) {
                    if (typeof subgenre === 'object') {
                        const result = search(subgenre, currentPath);
                        if (result) return result;
                    } else if (subgenre === searchGenre) {
                        return {
                            genre: searchGenre,
                            parent_genres: currentPath,
                            subgenres: []
                        };
                    }
                }
            }
            return null;
        };

        for (const genre of data) {
            const result = search(genre);
            if (result) return result;
        }

        return { error: "Genre non trouvé" };
    }

    createNode(x, y, genre, type) {
        const node = document.createElement('div');
        node.className = `node ${type}`;
        node.style.left = `${x - this.nodeWidth/2}px`;
        node.style.top = `${y}px`;
        node.style.width = `${this.nodeWidth}px`;
        node.style.height = `${this.nodeHeight}px`;
        node.textContent = genre;
        node.fontWeight = 'bold';
        node.onclick = () => this.initialize(genre);
        return node;
    }

    createEdge(startX, startY, endX, endY) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        const minX = Math.min(startX, endX);
        const minY = Math.min(startY, endY);
        const maxX = Math.max(startX, endX);
        const maxY = Math.max(startY, endY);
        const width = maxX - minX;
        const height = maxY - minY;

        svg.style.position = 'absolute';
        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.style.overflow = 'visible';
        
        const startPoint = `M ${startX - minX} ${startY - minY}`;
        const controlPoint1 = `C ${startX - minX} ${(startY + endY) / 2 - minY}`;
        const controlPoint2 = `${endX - minX} ${(startY + endY) / 2 - minY}`;
        const endPoint = `${endX - minX} ${endY - minY}`;
        
        path.setAttribute('d', `${startPoint} ${controlPoint1} ${controlPoint2} ${endPoint}`);
        path.setAttribute('stroke', '#666');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        svg.appendChild(path);
        return svg;
    }

    calculateNodePositions(data) {
        const positions = new Map();
        const parentY = 300; 
        const centerX = this.container.clientWidth / 2 +100;
        
        data.parent_genres.forEach((parent, index) => {
            positions.set(parent, {
                x: centerX,
                y: parentY + index * this.levelHeight
            });
        });
        
        const currentY = parentY + data.parent_genres.length * this.levelHeight;
        positions.set(data.genre, {
            x: centerX,
            y: currentY
        });
        
        const subgenres = data.subgenres;
        const subgenreY = currentY + this.levelHeight;
        const totalWidth = Math.max(
            subgenres.length * (this.nodeWidth + this.minNodeSpacing) - this.minNodeSpacing,
            this.nodeWidth
        );
        const startX = centerX - totalWidth / 2;
        
        subgenres.forEach((subgenre, index) => {
            const subgenreName = typeof subgenre === 'string' ? subgenre : subgenre.genre;
            positions.set(subgenreName, {
                x: startX + index * (this.nodeWidth + this.minNodeSpacing) + this.nodeWidth/2,
                y: subgenreY
            });
        });
        
        return positions;
    }

    displayTree(data) {
        this.container.innerHTML = '';
        const positions = this.calculateNodePositions(data);
        
        const edgeLayer = document.createElement('div');
        edgeLayer.style.position = 'absolute';
        edgeLayer.style.width = '100%';
        edgeLayer.style.height = '100%';
        edgeLayer.style.zIndex = '1';
        this.container.appendChild(edgeLayer);
        
        const nodeLayer = document.createElement('div');
        nodeLayer.style.position = 'absolute';
        nodeLayer.style.width = '100%';
        nodeLayer.style.height = '100%';
        nodeLayer.style.zIndex = '2';
        this.container.appendChild(nodeLayer);
        
        for (let i = 0; i < data.parent_genres.length - 1; i++) {
            const parent1 = data.parent_genres[i];
            const parent2 = data.parent_genres[i + 1];
            const pos1 = positions.get(parent1);
            const pos2 = positions.get(parent2);
            edgeLayer.appendChild(this.createEdge(
                pos1.x - this.nodeWidth/2,  
                pos1.y + this.nodeHeight,
                pos2.x - this.nodeWidth/2,  
                pos2.y
            ));
        }
        
        if (data.parent_genres.length > 0) {
            const lastParent = data.parent_genres[data.parent_genres.length - 1];
            const lastParentPos = positions.get(lastParent);
            const currentPos = positions.get(data.genre);
            edgeLayer.appendChild(this.createEdge(
                lastParentPos.x - this.nodeWidth/2,  
                lastParentPos.y + this.nodeHeight,
                currentPos.x - this.nodeWidth/2,  
                currentPos.y
            ));
        }
        
        const currentPos = positions.get(data.genre);
        data.subgenres.forEach(subgenre => {
            const subgenreName = typeof subgenre === 'string' ? subgenre : subgenre.genre;
            const subgenrePos = positions.get(subgenreName);
            edgeLayer.appendChild(this.createEdge(
                currentPos.x - this.nodeWidth/2, 
                currentPos.y + this.nodeHeight,
                subgenrePos.x,  
                subgenrePos.y
            ));
        });
        
        data.parent_genres.forEach(parent => {
            const pos = positions.get(parent);
            nodeLayer.appendChild(this.createNode(pos.x, pos.y, parent, 'parent'));
        });
        
        const currentGenrePos = positions.get(data.genre);
        nodeLayer.appendChild(this.createNode(
            currentGenrePos.x,
            currentGenrePos.y,
            data.genre,
            'current'
        ));
        
        data.subgenres.forEach(subgenre => {
            const subgenreName = typeof subgenre === 'string' ? subgenre : subgenre.genre;
            const pos = positions.get(subgenreName);
            nodeLayer.appendChild(this.createNode(pos.x, pos.y, subgenreName, 'child'));
        });
    }

    updateBreadcrumb(data) {
        const breadcrumb = document.getElementById('breadcrumb');
        const path = [...data.parent_genres, data.genre];
        
        breadcrumb.innerHTML = path.map((genre, index) => {
            const isLast = index === path.length - 1;
            return isLast 
                ? `<span class="genreType">${genre}</span>`
                : `<a href="?genre=${encodeURIComponent(genre)}">${genre}</a>`;
        }).join('<span class="text-gray-400 mx-2">›</span>');
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const genre = urlParams.get('genre');
    
    if (!genre) {
        document.getElementById('error').textContent = "Aucun genre spécifié dans l'URL";
        document.getElementById('error').style.display = 'block';
        return;
    }

    const tree = new GenreTree(document.getElementById('treeContainer'));
    tree.initialize(decodeURIComponent(genre));
}

window.addEventListener('load', initialize);