function getGenreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("genre");
}

function createGenreSelector(data) {
    // Créer le conteneur pour le sélecteur
    const selectorContainer = d3.select('#genre-selector-root')

    console.log(selectorContainer)
    // Ajouter un titre
    // Créer la liste des genres
    const genreList = selectorContainer.append('ul')
        .style('list-style', 'none')
        .style('padding', '0')
        .style('margin', '0');

    // Ajouter chaque genre principal comme un élément de la liste
    genreList.selectAll('li')
        .data(data)
        .enter()
        .append('li')
        .style('padding', '5px 10px')
        .style('cursor', 'pointer')
        .style('margin-bottom', '5px')
        .style('border-radius', '3px')
        .style('transition', 'background-color 0.2s')
        .text(d => d.genre)
        .on('mouseover', function(event,d) {
            d3.select(this).style('background-color', '#f0f0f0');
        })
        .on('mouseout', function() {
            d3.select(this).style('background-color', 'white');
        })
        .on('click', function(event,d) {
            const yearStart = new URLSearchParams(window.location.search).get('start');
            const yearEnd = new URLSearchParams(window.location.search).get('end');
            window.location.href = `?genre=${d.genre}&start=${yearStart}&end=${yearEnd}`;
        });
}


function countSubgenres(genreData) {
    let count = 0;

    function recursiveCount(subgenres) {
        subgenres.forEach(subgenre => {
            if (typeof subgenre === 'string') {
                count++;
            } else if (typeof subgenre === 'object') {
                count++;
                recursiveCount(subgenre.subgenres);
            }
        });
    }

    recursiveCount(genreData.subgenres);
    return count;
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
    
    createGenreSelector(data);

    const selectedGenreData = findGenreInData(data, genreParam);

    if (selectedGenreData) {
        const subgenreCount = countSubgenres(selectedGenreData);
        selectorContainer = d3.select('#subgenreCount')
            .style('font-size', '1.5em')
            .text(`Nombre de sous-genres pour ${selectedGenreData.genre}: ${subgenreCount}`);
    }


    const width = window.innerWidth ;
    const height = window.innerHeight *1.5 ;
    const tree = d3.tree()
        .size([height, width /1.6])
        .separation((a, b) => a.parent === b.parent ? 10 : 10);

    const hierarchy = d3.hierarchy(transformedData);
    const root_node = tree(hierarchy);
    let findAllParentsData = findAllParents(data, genreParam);


    const svg = d3.select('#visualization-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style("transform", "translateY(7vh) ");

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
        .attr('r', 3)
        .classed('highlighted', d => VerifParent(d.data.name, findAllParentsData, genreParam));

    node.append('text')
        .attr('dx', 5)
        .attr('dy', 4)
        .style('text-anchor', 'start')
        .style('font-size', '1em')
        .style('fill', d => VerifParent(d.data.name, findAllParentsData, genreParam) ? 'blue' : '#333') // appliquer conditionnellement la couleur ici
        .text(d => d.data.name)
        .on('click', function(event, d) {
            // Le reste du code du menu contextuel reste inchangé
            const contextMenu = document.getElementById('nodeContextMenu');
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${event.pageX}px`;
            contextMenu.style.top = `${event.pageY}px`;

            document.getElementById('redirectTimeline').onclick = () => {
                const yearStart = new URLSearchParams(window.location.search).get('start');
                const yearEnd = new URLSearchParams(window.location.search).get('end');
                window.location.href = `/public/wassim/choroplethMap.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
            };

            document.getElementById('redirectGenre').onclick = () => {
                const yearStart = new URLSearchParams(window.location.search).get('start');
                const yearEnd = new URLSearchParams(window.location.search).get('end');
                window.location.href = `../Elias/index.html?genre=${d.data.name}&start=${yearStart}&end=${yearEnd}`;
            };

            document.getElementById('close').onclick = () => {
                const menu = document.getElementById("nodeContextMenu");
                if ( menu.style.display=="block") {
                    menu.style.display = "none";
                }
            };
        });

});