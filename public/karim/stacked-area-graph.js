// Configuration
const margin = { top: 40, right: 150, bottom: 60, left: 60 };
const width = 1400 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Variables globales
let data;
let svg;
let g;
let tooltip;

// Créer le SVG
function initializeSVG() {
    svg = d3.select('#chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
}

// Charger et traiter les données
function loadData() {
    d3.json('genre_evolution.json').then(rawData => {
        data = rawData;
        populateSelectors();

        // Récupérer les paramètres de l'URL
        const urlParams = getUrlParameters();

        // Appliquer les filtres depuis l'URL
        if (urlParams.startYear) {
            document.getElementById('startYear').value = urlParams.startYear;
        }
        if (urlParams.endYear) {
            document.getElementById('endYear').value = urlParams.endYear;
        }
        if (urlParams.genre) {
            document.getElementById('genreSelect').value = urlParams.genre;
        }

        updateChart();
        setupEventListeners();
    });
}

// Remplir les sélecteurs
function populateSelectors() {
    // Genres uniques
    const genres = new Set();
    // Années
    const years = Object.keys(data).sort((a, b) => a.localeCompare(b));

    Object.values(data).forEach(yearData => {
        Object.keys(yearData).forEach(genre => genres.add(genre));
    });

    // Remplir le sélecteur de genres
    const genreSelect = document.getElementById('genreSelect');
    genreSelect.innerHTML = '<option value="">Tous les genres</option>';
    Array.from(genres).sort().forEach(genre => {
        const option = document.createElement('option');
        option.value = option.text = genre;
        genreSelect.add(option);
    });

    // Remplir les années
    document.getElementById('startYear').value = years[0];
    document.getElementById('endYear').value = years[years.length - 1];
}

// Mettre à jour le graphique
function updateChart() {
    // Récupérer les filtres
    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;
    const selectedGenre = document.getElementById('genreSelect').value;

    // Filtrer et formater les données
    const filteredData = processData(startYear, endYear, selectedGenre);

    // Vérifier si nous avons des données valides
    if (!filteredData || filteredData.length === 0) {
        console.log("Pas de données à afficher");
        return;
    }

    // Nettoyer le graphique
    g.selectAll('*').remove();

    // Échelles
    const x = d3.scaleTime()
        .domain(d3.extent(filteredData, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.total)])
        .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Obtenir la liste des genres (clés) pour le stack
    const genres = Array.from(new Set(
        filteredData.flatMap(d => Object.keys(d).filter(k => k !== 'year' && k !== 'total'))
    ));

    // Créer l'aire empilée
    const stack = d3.stack()
        .keys(genres)
        .value((d, key) => d[key] || 0)  // Gérer les valeurs manquantes
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    // Ajouter les axes
    // Axe X
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(20)  // Limite le nombre de ticks à environ 10
            .tickFormat(d3.timeFormat('%Y')))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)"); // Rotation des labels pour une meilleure lisibilité

    // Axe Y
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y)
            .tickFormat(d => d));

    // Label axe Y
    const displayMode = document.getElementById('displayMode').value;
    const yAxisLabel = displayMode === 'count' ? 'Nombre de chansons' : 'Popularité moyenne';

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text(yAxisLabel);

    // Label axe X
    g.append('text')
        .attr('transform', `translate(${width/2}, ${height + 40})`)
        .style('text-anchor', 'middle')
        .text('Année de sortie');

    // Dessiner les aires
    const layers = g.selectAll('.layer')
        .data(stack(filteredData))
        .enter().append('g')
        .attr('class', 'layer');

    layers.append('path')
        .attr('class', 'area')
        .style('fill', d => color(d.key))
        .attr('d', area);

    // Calculer les totaux par genre
    const genreTotals = {};
    genres.forEach(genre => {
        genreTotals[genre] = d3.sum(filteredData, d => d[genre] || 0);
    });


    function highlight(d) {
        // Réduire l'opacité de toutes les aires
        layers.selectAll('.area')
            .style('opacity', 0.2);
        // Augmenter l'opacité de l'aire du genre sélectionné
        layers.selectAll('.area')
            .filter(a => a.key === d)
            .style('opacity', 1);
    }

    function noHighlight() {
        layers.selectAll('.area')
            .style('opacity', 1);
    }

    // Supprimer l'ancienne légende
    svg.selectAll('.legend-container').remove();

    // Créer la nouvelle légende
    const legendContainer = svg.append('g')
        .attr('class', 'legend-container')
        .attr('transform', `translate(${width + margin.left + 10},${margin.top})`);

    // Créer les éléments de la légende
    const legendItems = legendContainer.selectAll('.legend-item')
        .data(genres.sort((a, b) => genreTotals[b] - genreTotals[a]))
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0,${i * 25})`);

    // Ajouter les rectangles de couleur
    legendItems.append('rect')
        .attr('class', 'legend-color')
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', d => color(d));

    // Ajouter le texte avec le total
    legendItems.append('text')
        .attr('class', 'legend-text')
        .attr('x', 20)
        .attr('y', 9)
        .style("fill", function(d) {
            return color(d);
        })
        .text(d => {
            const total = displayMode === 'count'
                ? Math.round(genreTotals[d]).toLocaleString()
                : Math.round(genreTotals[d] / filteredData.length).toLocaleString();
            const label = displayMode === 'count' ? 'sons' : 'score moy.';
            return `${d} (${total} ${label})`;
        })
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);

    // Ajouter un fond blanc semi-transparent à la légende
    legendContainer.insert('rect', ':first-child')
        .attr('width', 220)
        .attr('height', Math.min(genres.length * 25 + 10, 400))
        .attr('fill', 'white')
        .attr('opacity', 0.9)
        .attr('rx', 6);

    // Ajouter l'interaction pour le hover
    const bisectDate = d3.bisector(d => d.year).left;

    // Ajouter une ligne verticale pour le hover
    const hoverLine = g.append('line')
        .attr('class', 'hover-line')
        .attr('y1', 0)
        .attr('y2', height)
        .style('opacity', 0);

    const overlay = g.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all');

    // Gérer les interactions de l'overlay
    overlay.on('mousemove', function() {
        const [mouseX, mouseY] = d3.mouse(this);
        const x0 = x.invert(mouseX);
        const i = bisectDate(filteredData, x0, 1);
        const d0 = filteredData[i - 1];
        const d1 = filteredData[i];
        const d = x0 - d0.year > d1.year - x0 ? d1 : d0;

        // Mettre à jour la position de la ligne de hover
        hoverLine
            .attr('x1', mouseX)
            .attr('x2', mouseX)
            .style('opacity', 1);

        // Calculer les pourcentages
        const total = d.total;
        const percentages = {};
        Object.entries(d).forEach(([key, value]) => {
            if (key !== 'year' && key !== 'total') {
                percentages[key] = ((value / total) * 100).toFixed(1);
            }
        });

        // Limiter le nombre de genres affichés 
        const maxGenres = 10;

        // Créer le contenu du tooltip
        let tooltipContent = `<strong>Année ${d.year.getFullYear()}</strong>`;
        const displayMode = document.getElementById('displayMode').value;

        Object.entries(percentages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxGenres)
            .forEach(([genre, percentage]) => {
                const value = displayMode === 'count'
                    ? d[genre]
                    : Math.round(d[genre]);
                const valueText = displayMode === 'count'
                    ? `${value} sons (${percentage}%)`
                    : `Score: ${value} (${percentage}%)`;

                tooltipContent += `
                    <div class="tooltip-row">
                        <span class="tooltip-genre">${genre}</span>
                        <span class="tooltip-value">${valueText}</span>
                    </div>`;
            });

        // Ajouter une indication s'il y a plus de genres
        const totalGenres = Object.keys(percentages).length;
        if (totalGenres > maxGenres) {
            tooltipContent += `
                <div class="tooltip-row" style="margin-top: 8px; font-style: italic; color: #999;">
                    Et ${totalGenres - maxGenres} autres genres...
                </div>`;
        }

        // Calculer la position du tooltip
        const tooltipWidth = 250; // Largeur approximative du tooltip
        const tooltipHeight = (Object.keys(percentages).length * 25) + 40; // Hauteur approximative

        // Position par défaut (à droite du curseur)
        let tooltipX = mouseX + margin.left + 20;
        let tooltipY = mouseY + margin.top - (tooltipHeight / 2);

        // Ajuster si le tooltip dépasse à droite
        if (tooltipX + tooltipWidth > window.innerWidth) {
            tooltipX = mouseX + margin.left - tooltipWidth - 20;
        }

        // Ajuster si le tooltip dépasse en haut ou en bas
        if (tooltipY < 0) {
            tooltipY = 10;
        } else if (tooltipY + tooltipHeight > window.innerHeight) {
            tooltipY = window.innerHeight - tooltipHeight - 10;
        }

        // Positionner et afficher le tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 1);
        tooltip.html(tooltipContent)
            .style("left", `${tooltipX}px`)
            .style("top", `${tooltipY}px`);
    })
    .on('mouseout', function() {
        hoverLine.style('opacity', 0);
        tooltip.style('opacity', 0);
    });
}


// Traiter les données selon les filtres
function processData(startYear, endYear, selectedGenre) {
    const processedData = [];
    const years = Object.keys(data)
        .filter(year => year >= startYear && year <= endYear)
        .sort((a, b) => a.localeCompare(b));

    const displayMode = document.getElementById('displayMode').value;

    years.forEach(year => {
        const yearData = {
            year: new Date(parseInt(year), 0, 1),
            total: 0
        };

        // Traiter chaque genre pour cette année
        Object.entries(data[year]).forEach(([genre, stats]) => {
            if (!selectedGenre || genre === selectedGenre) {
                const value = displayMode === 'count' ? stats.count : stats.rank_avg;
                if (!isNaN(value)) {
                    yearData[genre] = value;
                    yearData.total += value;
                }
            }
        });

        if (yearData.total > 0) {
            processedData.push(yearData);
        }
    });

    return processedData;
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    const inputs = ['startYear', 'endYear', 'genreSelect', 'countrySelect', 'displayMode'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            updateChart();
            updateUrlParameters();
        });
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        document.getElementById('genreSelect').value = '';
        document.getElementById('countrySelect').value = '';
        const years = Object.keys(data).sort((a, b) => a.localeCompare(b));
        document.getElementById('startYear').value = years[0];
        document.getElementById('endYear').value = years[years.length - 1];
        updateChart();
        updateUrlParameters();
    });
}

// Fonction pour récupérer les paramètres de l'URL
function getUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        startYear: params.get('start'),
        endYear: params.get('end'),
        genre: params.get('genre')
    };
}

// Fonction pour mettre à jour l'URL
function updateUrlParameters() {
    const params = new URLSearchParams();

    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;
    const genre = document.getElementById('genreSelect').value;

    if (startYear) params.set('start', startYear);
    if (endYear) params.set('end', endYear);
    if (genre) params.set('genre', genre);

    // Mettre à jour l'URL sans recharger la page
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

// Ajouter ces fonctions

function getTop10Artists(year, genre, country) {
    const yearData = data[year];
    if (!yearData) return [];

    const artists = new Map();
    const displayMode = document.getElementById('displayMode').value;

    // Collecter les données des artistes
    Object.entries(yearData).forEach(([g, countryData]) => {
        if (!genre || g === genre) {
            Object.entries(countryData).forEach(([c, stats]) => {
                if (!country || c === country) {
                    Object.entries(stats.artists).forEach(([artist, artistStats]) => {
                        const currentValue = artists.get(artist) || 0;
                        const newValue = displayMode === 'count'
                            ? currentValue + artistStats.count
                            : currentValue + (artistStats.rank_sum / artistStats.count);
                        artists.set(artist, newValue);
                    });
                }
            });
        }
    });

    // Trier et prendre le top 10
    return Array.from(artists.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
}

function updateTop10Display(year, genre, country) {
    const top10Container = document.getElementById('top10');
    const top10Year = document.getElementById('top10Year');
    const top10List = document.getElementById('top10List');
    const displayMode = document.getElementById('displayMode').value;

    top10Year.textContent = `en ${year}`;
    top10Container.style.display = 'block';

    const top10 = getTop10Artists(year, genre, country);
    const valueLabel = displayMode === 'count' ? 'chansons' : 'popularité moyenne';

    top10List.innerHTML = top10.map(([artist, value], index) => `
        <div class="top10-item">
            <span class="top10-rank">#${index + 1}</span>
            <span class="top10-artist">${artist}</span>
            <span class="top10-value">${displayMode === 'count'
        ? Math.round(value)
        : Math.round(value).toLocaleString()} ${valueLabel}</span>
        </div>
    `).join('');
}

// Initialisation
initializeSVG();
loadData();

