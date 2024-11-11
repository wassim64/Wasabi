import * as d3 from 'd3';

// Fonction pour charger les données et construire le treemap
async function buildTreemap(genre) {
  // Charger les données depuis le fichier JSON
  const data = await d3.json('sous-genre.json');

  // Filtrer les données pour le genre spécifié
  const genreData = data.filter(d => d.genre === genre);

  // Créer la structure de données pour le treemap
  const root = d3.hierarchy(genreData[0])
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  // Créer le treemap
  const treemap = d3.treemap()
    .size([800, 600])
    .padding(1);

  treemap(root);

  // Sélectionner l'élément du DOM où afficher le treemap
  const svg = d3.select('#treemap')
    .attr('width', 800)
    .attr('height', 600);

  // Créer les rectangles du treemap
  const cell = svg.selectAll('g')
    .data(root.leaves())
    .enter().append('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  cell.append('rect')
    .attr('id', d => d.data.name)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', (d, i) => d3.schemeCategory10[i % 10]);

  cell.append('text')
    .attr('x', d => (d.x1 - d.x0) / 2)
    .attr('y', d => (d.y1 - d.y0) / 2)
    .attr('dy', '.35em')
    .attr('text-anchor', 'middle')
    .text(d => d.data.name);
}

// Récupérer le genre depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const genre = urlParams.get('genre');

// Construire le treemap
buildTreemap(genre);