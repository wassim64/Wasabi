// Variables globales
let originalData;
let currentData;
let simulation;
let transform = d3.zoomIdentity;
let availableYears = new Set();
let availableCountries = new Set();

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
        
        // Collecter les années et pays disponibles
        data.nodes.forEach(node => {
            Object.keys(node.years).forEach(year => availableYears.add(parseInt(year)));
            Object.keys(node.countries).forEach(country => availableCountries.add(country));
        });

        // Initialiser le menu déroulant des genres
        const genreSelect = document.getElementById('genreSelect');
        const genres = data.nodes.map(n => n.id).sort();
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = option.text = genre;
            genreSelect.add(option);
        });

        // Initialiser les sélecteurs
        initializeFilters();
        updateVisualization();
        setupEventListeners();
    });
}

// Fonction pour initialiser les filtres
function initializeFilters() {
    // Années
    const yearStart = document.getElementById('yearStart');
    const yearEnd = document.getElementById('yearEnd');
    yearStart.min = Math.min(...availableYears);
    yearStart.max = Math.max(...availableYears);
    yearEnd.min = yearStart.min;
    yearEnd.max = yearStart.max;

    // Pays
    const countrySelect = document.getElementById('countrySelect');
    Array.from(availableCountries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = option.text = country;
        countrySelect.add(option);
    });
}

// Fonction pour mettre à jour la visualisation
function updateVisualization() {
    // Nettoyer la visualisation existante
    g.selectAll('*').remove();

    // Définir les échelles en premier
    const linkScale = d3.scaleLinear()
        .domain([0, d3.max(currentData.links, d => d.weight)])
        .range([1, maxLinkWidth]);

    const nodeScale = d3.scaleLinear()
        .domain([0, d3.max(currentData.nodes, d => d.songCount)])
        .range([5, 20]);

    // Créer la simulation de force avec nodeScale maintenant disponible
    simulation = d3.forceSimulation(currentData.nodes)
        .force('link', d3.forceLink(currentData.links)
            .id(d => d.id)
            .distance(d => 100 + (d.weight / 2)))
        .force('charge', d3.forceManyBody()
            .strength(d => -200 - (d.artistCount / 2)))
        .force('collide', d3.forceCollide()
            .radius(d => nodeScale(d.songCount) + 20))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1));

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

    // Ajouter les cercles aux nœuds
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
        d3.event.preventDefault();
        d3.event.stopPropagation();
        
        const contextMenu = document.getElementById('nodeContextMenu');
        
        // Positionner et afficher le menu
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${d3.event.pageX}px`;
        contextMenu.style.top = `${d3.event.pageY}px`;
        
        // Gérer les actions du menu
        document.getElementById('focusNode').onclick = () => {
            document.getElementById('genreSelect').value = d.id;
            filterByGenre(d.id);
            contextMenu.style.display = 'none';
        };

        document.getElementById('redirectTimeline').onclick = () => {
            const yearStart = document.getElementById('yearStart').value;
            const yearEnd = document.getElementById('yearEnd').value;
            window.location.href = `/Wasabi/public/timeline.html?genre=${d.id}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectNetwork').onclick = () => {
            const yearStart = document.getElementById('yearStart').value;
            const yearEnd = document.getElementById('yearEnd').value;
            window.location.href = `/Wasabi/public/network.html?genre=${d.id}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectBubble').onclick = () => {
            const yearStart = document.getElementById('yearStart').value;
            const yearEnd = document.getElementById('yearEnd').value;
            window.location.href = `/Wasabi/public/bubble.html?genre=${d.id}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectWordcloud').onclick = () => {
            const yearStart = document.getElementById('yearStart').value;
            const yearEnd = document.getElementById('yearEnd').value;
            window.location.href = `/Wasabi/public/wordcloud.html?genre=${d.id}&start=${yearStart}&end=${yearEnd}`;
        };
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

    document.getElementById('yearStart').addEventListener('change', function() {
        filterByYearRange();
    });

    document.getElementById('yearEnd').addEventListener('change', function() {
        filterByYearRange();
    });

    function filterByYearRange() {
        const yearStart = parseInt(document.getElementById('yearStart').value);
        const yearEnd = parseInt(document.getElementById('yearEnd').value);
        
        // Filtrer les nœuds en fonction des années
        currentData.nodes = originalData.nodes.map(node => {
            const filteredNode = {...node};
            let newSongCount = 0;
            
            // Calculer le nouveau songCount pour la période
            Object.entries(node.years).forEach(([year, count]) => {
                const yearNum = parseInt(year);
                if (yearNum >= yearStart && yearNum <= yearEnd) {
                    newSongCount += count;
                }
            });
            
            filteredNode.songCount = newSongCount;
            return filteredNode;
        }).filter(node => node.songCount > 0); // Garder uniquement les nœuds avec des chansons
    
        // Créer un Set des IDs des nœuds actifs
        const activeNodeIds = new Set(currentData.nodes.map(n => n.id));
    
        // Filtrer les liens pour ne garder que ceux entre les nœuds actifs
        currentData.links = originalData.links.filter(link => {
            return activeNodeIds.has(link.source.id || link.source) && 
                   activeNodeIds.has(link.target.id || link.target);
        });
    
        // Réinitialiser la simulation avec les nouvelles données
        simulation.nodes(currentData.nodes);
        simulation.force('link').links(currentData.links);
        
        // Redémarrer la simulation en douceur
        simulation.alpha(0.3).restart();
        
        updateVisualization();
    }
}

// Fonctions pour le drag & drop
function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Ajouter un gestionnaire pour fermer le menu contextuel
document.addEventListener('click', function(event) {
    const contextMenu = document.getElementById('nodeContextMenu');
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
});

// Appeler loadData pour initialiser
loadData();