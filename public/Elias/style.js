function getGenreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre");
}

// Fonction pour rechercher un sous-genre dans les genres
function findParentGenre(data, subgenreName) {
    for (let genre of data) {
        for (let sub of genre.subgenres) {
            if (typeof sub === 'string' && sub.toLowerCase() === subgenreName.toLowerCase()) {
                return genre;
            } else if (typeof sub === 'object' && sub.genre.toLowerCase() === subgenreName.toLowerCase()) {
                return genre;
            }
        }
        for (let sub of genre.subgenres) {
            if (typeof sub === 'object') {
                const parentGenre = findParentGenre([sub], subgenreName);
                if (parentGenre) {
                    return parentGenre;
                }
            }
        }
    }
    return null;
}

function transformData(data) {
    return {
        name: "Genres",
        children: data.map(genre => ({
            name: genre.genre,
            children: genre.subgenres.map(sub =>
                typeof sub === 'string' 
                ? { name: sub } 
                : { name: sub.genre, children: sub.subgenres.map(s => ({ name: s })) }
            )
        }))
    };
}

function findAllParents(data, subgenreName, parents = []) {
    for (let genre of data) {
        // Vérifier si le sous-genre est directement dans les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'string' && sub.toLowerCase() === subgenreName.toLowerCase()) {
                parents.push(genre.genre); // Ajouter le genre actuel à la liste des parents
                return parents; // Si trouvé, on retourne la liste des parents
            } else if (typeof sub === 'object' && sub.genre.toLowerCase() === subgenreName.toLowerCase()) {
                parents.push(genre.genre); // Ajouter le genre actuel à la liste des parents
                return parents; // Si trouvé, on retourne la liste des parents
            }
        }

        // Parcourir récursivement les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'object') {
                const updatedParents = [...parents, genre.genre]; // Ajouter le genre parent actuel
                const parentGenres = findAllParents([sub], subgenreName, updatedParents);
                if (parentGenres) {
                    return parentGenres;
                }
            }
        }
    }

    return null; // Si le genre ou sous-genre n'est pas trouvé
}

function VerifParent(genre , data , genreParam) {
    if (genre.toLowerCase() === genreParam.toLowerCase() ||(data!=null && data.includes(genre.toLowerCase()))) {
        console.log(genre);
        return true;
    }
    
    return false;
}


d3.json('sous-genre.json').then(data => {
    const genreParam = getGenreFromUrl();
    let genreData = data.find(genre => genre.genre.toLowerCase() === genreParam.toLowerCase());

    if (!genreData) {
        genreData = findParentGenre(data, genreParam);
    }

    if (!genreData) {
        console.error(`Genre ou sous-genre "${genreParam}" non trouvé.`);
        return;
    }

    let root = transformData([genreData]);

    // Configuration du graphique D3
    const width = window.innerWidth;
    const height = window.innerHeight * 1.5;
    const tree = d3.tree()
        .size([height, width / 1.5])
        .separation((a, b) => a.parent === b.parent ? 10 : 10);

    const hierarchy = d3.hierarchy(root);
    const root_node = tree(hierarchy);
    let findAllParentsData = findAllParents(data, genreParam);

    console.log(findAllParentsData);

    console.log(root_node);

 

    const svg = d3.select('body')
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style("transform", "scale(0.7) translateY(-700px)");

    const link = svg.selectAll('.link')
          .data(root_node.links())
          .enter().append('path')
          .attr('class', 'link')
          .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x))
          .classed('highlighted', d => VerifParent(d.target.data.name, findAllParentsData, genreParam) 
            && 
            VerifParent(d.source.data.name, findAllParentsData, genreParam)
          );
        
        

    const node = svg.selectAll('.node')
          .data(root_node.descendants())
          .enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `translate(${d.y}, ${d.x})`);

        node.append('circle')
          .attr('r', 4.5)
          .classed('highlighted', d => VerifParent(d.data.name, findAllParentsData, genreParam))


    node.append('text')
      .attr('dx', 10)
      .attr('dy', 15)
      .style('text-anchor', 'start')
      .style('font-size', '50px')
      .classed('highlighted', d => VerifParent(d.data.name, findAllParentsData, genreParam))
      .text(d => d.data.name)
      .on('click', function(event,d) {
        const contextMenu = document.getElementById('nodeContextMenu');
        
        console.log(event.pageX);
        console.log(event.pageY);
        // Positionner le menu contextuel en fonction de la position du clic
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.pageX+10}px`;
        contextMenu.style.top = `${event.pageY-10}px`;

        // Actions du menu
        document.getElementById('redirectTimeline').onclick = () => {
            const yearStart = new URLSearchParams(window.location.search).get('start');
            const yearEnd = new URLSearchParams(window.location.search).get('end');
            window.location.href = `/public/wassim/choroplethMap.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectNetwork').onclick = () => {
            const yearStart = new URLSearchParams(window.location.search).get('start');
            const yearEnd = new URLSearchParams(window.location.search).get('end');
            window.location.href = `/public/romain/boxDiagram.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectBubble').onclick = () => {
            const yearStart = new URLSearchParams(window.location.search).get('start');
            const yearEnd = new URLSearchParams(window.location.search).get('end');
            window.location.href = `/public/elias/index.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
        };

        document.getElementById('redirectWordcloud').onclick = () => {
            const yearStart = new URLSearchParams(window.location.search).get('start');
            const yearEnd = new URLSearchParams(window.location.search).get('end');
            window.location.href = `/public/karim/index.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
        };

        let twice = false;

        document.addEventListener('click', function(event) {
            const contextMenu = document.getElementById('nodeContextMenu');

            if (twice && contextMenu.style.display === 'block' && !contextMenu.contains(event.target)) {
                console.log("click outside");
                contextMenu.style.display = 'none';
                twice = false; // Réinitialisation après avoir caché le menu
            } else {
                if (contextMenu.style.display === 'none') { // Comparaison correcte
                    contextMenu.style.display = 'block';
                }
                twice = true;
            }
            console.log(twice);
});
      });
});
