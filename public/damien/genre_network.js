// Variables globales
let originalData;
let currentData;
let simulation;
let transform = d3.zoomIdentity;

// Dimensions et configuration
const width = 1200;
const height = 800;
const nodeRadius = 10;
const maxLinkWidth = 10;

// Créer le SVG
const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// Ajouter un groupe pour le zoom
const g = svg.append('g');

// Configurer le zoom
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', function() {
        g.attr('transform', d3.event.transform);
        transform = d3.event.transform;
    });

svg.call(zoom);

// Ajouter une variable pour le tooltip des liens
const linkTooltip = d3.select('body')
    .append('div')
    .attr('class', 'link-tooltip')
    .style('opacity', 0);

// Fonction pour charger et initialiser les données
function loadData() {
    d3.json('genre_network.json').then(data => {
        originalData = data;
        currentData = JSON.parse(JSON.stringify(data));
        
        // Initialiser le menu déroulant des genres
        const genreSelect = document.getElementById('genreSelect');
        const genres = data.nodes.map(n => n.id).sort();
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = option.text = genre;
            genreSelect.add(option);
        });

        // Initialiser la visualisation
        updateVisualization();
        setupEventListeners();
    });
}

// Fonction pour mettre à jour la visualisation
function updateVisualization() {
    // Nettoyer la visualisation existante
    g.selectAll('*').remove();

    // Créer la simulation de force
    simulation = d3.forceSimulation(currentData.nodes)
        .force('link', d3.forceLink(currentData.links)
            .id(d => d.id)
            .distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));

    // Échelles
    const linkScale = d3.scaleLinear()
        .domain([0, d3.max(currentData.links, d => d.weight)])
        .range([1, maxLinkWidth]);

    const nodeScale = d3.scaleLinear()
        .domain([0, d3.max(currentData.nodes, d => d.songCount)])
        .range([5, 20]);

    // Dessiner les liens
    const link = g.append('g')
        .selectAll('line')
        .data(currentData.links)
        .enter().append('line')
        .attr('stroke-width', d => linkScale(d.weight))
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .on('mouseover', function(d) {
            // Mettre en surbrillance le lien
            d3.select(this)
                .attr('stroke', '#ff4444')
                .attr('stroke-opacity', 1);
            
            // Afficher le tooltip
            linkTooltip.transition()
                .duration(200)
                .style('opacity', .9);
            
            linkTooltip.html(`
                ${d.source.id || d.source} ↔ ${d.target.id || d.target}<br>
                ${d.weight} artistes en commun
            `)
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            // Remettre le lien en état normal sauf si sélectionné
            if (!d3.select(this).classed('selected')) {
                d3.select(this)
                    .attr('stroke', '#999')
                    .attr('stroke-opacity', 0.6);
            }
            
            linkTooltip.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .on('click', function(d) {
            // Retirer la sélection précédente
            d3.selectAll('line').classed('selected', false)
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6);
            
            // Sélectionner ce lien
            d3.select(this)
                .classed('selected', true)
                .attr('stroke', '#ff4444')
                .attr('stroke-opacity', 1);
            
            // Mettre à jour le panneau de détails
            const sourceGenre = d.source.id || d.source;
            const targetGenre = d.target.id || d.target;
            const sourceNode = currentData.nodes.find(n => n.id === sourceGenre);
            const targetNode = currentData.nodes.find(n => n.id === targetGenre);
            
            document.getElementById('link-details-content').innerHTML = `
                <div class="detail-item">
                    <div class="detail-label">Genres connectés</div>
                    <div class="detail-value">${sourceGenre} ↔ ${targetGenre}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Artistes en commun</div>
                    <div class="detail-value">${d.weight}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Statistiques des genres</div>
                    <div class="detail-value">
                        ${sourceGenre}: ${sourceNode.artistCount} artistes, ${sourceNode.songCount} chansons<br>
                        ${targetGenre}: ${targetNode.artistCount} artistes, ${targetNode.songCount} chansons
                    </div>
                </div>
            `;
        });

    // Dessiner les nœuds
    const node = g.append('g')
        .selectAll('g')
        .data(currentData.nodes)
        .enter().append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Ajouter les cercles
    node.append('circle')
        .attr('r', d => nodeScale(d.songCount))
        .attr('fill', d => d3.schemeCategory10[d.id.length % 10])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

    // Ajouter les labels
    node.append('text')
        .text(d => d.id)
        .attr('x', 12)
        .attr('y', 3)
        .attr('font-size', '10px');

    // Tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    node.on('mouseover', function(event, d) {
        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        tooltip.html(`
            Genre: ${d.id}<br>
            Songs: ${d.songCount}<br>
            Artists: ${d.artistCount}<br>
            Avg Duration: ${Math.round(d.avgDuration)}s
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
        tooltip.transition()
            .duration(500)
            .style('opacity', 0);
    })
    .on('click', function(d) {
        const genreId = d.id;
        document.getElementById('genreSelect').value = genreId;
        filterByGenre(genreId);
        d3.event.stopPropagation(); // Empêcher la propagation de l'événement
    });

    // Mise à jour de la simulation
    simulation.nodes(currentData.nodes)
        .on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

    simulation.force('link').links(currentData.links);
}

// Fonction pour filtrer par genre et profondeur
function filterByGenre(centralGenre) {
    if (!centralGenre) return; // Protection contre les valeurs nulles

    const depth = parseInt(document.getElementById('depthRange').value);
    const minConnections = parseInt(document.getElementById('minConnections').value);
    const minSongs = parseInt(document.getElementById('minSongs').value);
    const minArtists = parseInt(document.getElementById('minArtists').value);

    // Trouver les genres connectés jusqu'à la profondeur spécifiée
    let includedGenres = new Set([centralGenre]);
    let currentDepth = 0;
    let frontier = new Set([centralGenre]);

    while (currentDepth < depth) {
        const newFrontier = new Set();
        frontier.forEach(genre => {
            originalData.links
                .filter(link => {
                    // Correction de la comparaison des liens
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return ((sourceId === genre || targetId === genre) && 
                           link.weight >= minConnections);
                })
                .forEach(link => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const connectedGenre = sourceId === genre ? targetId : sourceId;
                    if (!includedGenres.has(connectedGenre)) {
                        newFrontier.add(connectedGenre);
                        includedGenres.add(connectedGenre);
                    }
                });
        });
        frontier = newFrontier;
        currentDepth++;
    }

    // Filtrer les nœuds
    currentData.nodes = originalData.nodes
        .filter(node => 
            includedGenres.has(node.id) && 
            node.songCount >= minSongs && 
            node.artistCount >= minArtists);

    // Filtrer les liens
    currentData.links = originalData.links
        .filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return includedGenres.has(sourceId) && 
                   includedGenres.has(targetId) && 
                   link.weight >= minConnections;
        });

    // Redémarrer la simulation avec les nouvelles données
    if (simulation) {
        simulation.stop();
    }
    updateVisualization();
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Genre sélectionné
    document.getElementById('genreSelect').addEventListener('change', function(e) {
        filterByGenre(e.target.value);
    });

    // Profondeur
    document.getElementById('depthRange').addEventListener('input', function(e) {
        document.getElementById('depthValue').textContent = e.target.value;
        filterByGenre(document.getElementById('genreSelect').value);
    });

    // Connexions minimum
    document.getElementById('minConnections').addEventListener('input', function(e) {
        document.getElementById('connectionsValue').textContent = e.target.value;
        filterByGenre(document.getElementById('genreSelect').value);
    });

    // Filtres minimum
    document.getElementById('minSongs').addEventListener('change', function() {
        filterByGenre(document.getElementById('genreSelect').value);
    });

    document.getElementById('minArtists').addEventListener('change', function() {
        filterByGenre(document.getElementById('genreSelect').value);
    });

    // Réinitialisation
    document.getElementById('resetFilters').addEventListener('click', function() {
        document.getElementById('depthRange').value = 2;
        document.getElementById('depthValue').textContent = 2;
        document.getElementById('minConnections').value = 10;
        document.getElementById('connectionsValue').textContent = 10;
        document.getElementById('minSongs').value = 0;
        document.getElementById('minArtists').value = 0;
        currentData = JSON.parse(JSON.stringify(originalData));
        updateVisualization();
    });

    document.getElementById('resetZoom').addEventListener('click', function() {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });
}

// Fonctions pour le drag & drop
function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
}

function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
}

function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
}

// Appeler loadData pour initialiser
loadData();