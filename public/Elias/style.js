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

function findGenreInData(data, genreName) {
    for (let genre of data) {
        if (genre.genre.toLowerCase() === genreName.toLowerCase()) {
            return genre;
        }
        for (let sub of genre.subgenres) {
            if (typeof sub === 'object') {
                if (sub.genre.toLowerCase() === genreName.toLowerCase()) {
                    return sub;
                }
                const found = findGenreInData([sub], genreName);
                if (found) return found;
            }
        }
    }
    return null;
}

function transformData(data, selectedGenre) {
    // Si le genre sélectionné est un genre principal
    const mainGenre = data.find(g => g.genre.toLowerCase() === selectedGenre.toLowerCase());
    if (mainGenre) {
        return {
            name: "Genres",
            children: [{
                name: mainGenre.genre,
                children: mainGenre.subgenres.map(sub =>
                    typeof sub === 'string' 
                    ? { name: sub }
                    : { name: sub.genre, children: sub.subgenres.map(s => ({ name: s })) }
                )
            }]
        };
    }

    // Trouver tous les parents du genre sélectionné
    const allParents = findAllParents(data, selectedGenre);
    
    if (allParents) {
        // Construire l'arbre en remontant la hiérarchie
        let currentLevel = null;
        let selectedSubGenre = null;
        
        // Trouver le genre sélectionné et sa structure
        const findSelectedGenre = (parentGenre) => {
            for (let sub of parentGenre.subgenres) {
                if (typeof sub === 'string' && sub.toLowerCase() === selectedGenre.toLowerCase()) {
                    return { name: sub };
                } else if (typeof sub === 'object') {
                    if (sub.genre.toLowerCase() === selectedGenre.toLowerCase()) {
                        return {
                            name: sub.genre,
                            children: sub.subgenres.map(s => ({ name: s }))
                        };
                    }
                    // Recherche récursive dans les sous-genres
                    for (let deepSub of sub.subgenres) {
                        if (typeof deepSub === 'string' && deepSub.toLowerCase() === selectedGenre.toLowerCase()) {
                            return { name: deepSub };
                        }
                    }
                }
            }
            return null;
        };

        // Construire l'arbre en remontant la hiérarchie
        for (let i = allParents.length - 1; i >= 0; i--) {
            const parentName = allParents[i];
            const parentGenre = findGenreInData(data, parentName);
            
            if (i === allParents.length - 1) {
                // Dernier parent (le plus proche du genre sélectionné)
                selectedSubGenre = findSelectedGenre(parentGenre);
                currentLevel = {
                    name: parentName,
                    children: selectedSubGenre ? [selectedSubGenre] : []
                };
            } else {
                // Remonter la hiérarchie
                currentLevel = {
                    name: parentName,
                    children: [currentLevel]
                };
            }
        }

        return {
            name: "Genres",
            children: currentLevel ? [currentLevel] : []
        };
    }

    return null;
}

function findAllParents(data, subgenreName, parents = []) {
    for (let genre of data) {
        // Vérifier si le sous-genre est directement dans les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'string' && sub.toLowerCase() === subgenreName.toLowerCase()) {
                parents.push(genre.genre); 
                return parents;
            } else if (typeof sub === 'object' && sub.genre.toLowerCase() === subgenreName.toLowerCase()) {
                parents.push(genre.genre);
                return parents;
            }
        }

        // Parcourir récursivement les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'object') {
                const updatedParents = [...parents, genre.genre];
                const parentGenres = findAllParents([sub], subgenreName, updatedParents);
                if (parentGenres) {
                    return parentGenres;
                }
            }
        }
    }

    return null;
}

function VerifParent(genre, data, genreParam) {
    if (genre.toLowerCase() === genreParam.toLowerCase() || (data != null && data.includes(genre.toLowerCase()))) {
        return true;
    }
    return false;
}

d3.json('sous-genre.json').then(data => {
    const genreParam = getGenreFromUrl();
    let transformedData = transformData(data, genreParam);

    if (!transformedData) {
        console.error(`Genre ou sous-genre "${genreParam}" non trouvé.`);
        return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight * 1.5;
    const tree = d3.tree()
        .size([height, width / 1.5])
        .separation((a, b) => a.parent === b.parent ? 10 : 10);

    const hierarchy = d3.hierarchy(transformedData);
    const root_node = tree(hierarchy);
    let findAllParentsData = findAllParents(data, genreParam);

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
        .classed('highlighted', d => VerifParent(d.data.name, findAllParentsData, genreParam));

    node.append('text')
        .attr('dx', 10)
        .attr('dy', 15)
        .style('text-anchor', 'start')
        .style('font-size', '50px')
        .classed('highlighted', d => VerifParent(d.data.name, findAllParentsData, genreParam))
        .text(d => d.data.name)
        .on('click', function(event, d) {
            // Le reste du code du menu contextuel reste inchangé
            const contextMenu = document.getElementById('nodeContextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${event.pageX+10}px`;
            contextMenu.style.top = `${event.pageY-10}px`;

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
        });

        let twice = false;
        document.addEventListener('click', function(event) {
            const contextMenu = document.getElementById('nodeContextMenu');
            if (twice && contextMenu.style.display === 'block' && !contextMenu.contains(event.target)) {
                contextMenu.style.display = 'none';
                twice = false;
            } else {
                if (contextMenu.style.display === 'none') {
                    contextMenu.style.display = 'block';
                }
                twice = true;
            }
        });
});