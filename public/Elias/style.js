 function getGenreFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("genre");
    }

    // Fonction pour rechercher un sous-genre dans les genres
    function findParentGenre(data, subgenreName) {
    for (let genre of data) {
        // Vérifier si le sous-genre est directement dans les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'string' && sub.toLowerCase() === subgenreName.toLowerCase()) {
                return genre;
            } else if (typeof sub === 'object' && sub.genre.toLowerCase() === subgenreName.toLowerCase()) {
                return genre;
            }
        }

        // Parcourir récursivement les sous-genres du genre
        for (let sub of genre.subgenres) {
            if (typeof sub === 'object') {
                const parentGenre = findParentGenre([sub], subgenreName);
                if (parentGenre) {
                    return parentGenre;
                }
            }
        }
    }
    return null; // Si le genre ou sous-genre n'est pas trouvé
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
        console.log("Données brutes :", data);
        const genreParam = getGenreFromUrl();
        let genreData = data.find(genre => genre.genre.toLowerCase() === genreParam.toLowerCase());

        if (!genreData) {
            genreData = findParentGenre(data, genreParam);
        }

        if (!genreData) {
            console.error(`Genre ou sous-genre "${genreParam}" non trouvé.`);
            return;
        }

        let root;
        if (genreData.subgenres.some(sub => typeof sub.genre === 'string' && sub.genre.toLowerCase() === genreParam.toLowerCase())) {
            console.log(genreParam)
            const parentGenre = findParentGenre(data, genreParam);
            root = {
                name: parentGenre.genre,
                children: [
                    {
                        name: genreParam,
                        children: parentGenre.subgenres
                          .filter(s => typeof s !== 'string' && s.genre.toLowerCase() === genreParam.toLowerCase())
                          .flatMap(s => s.subgenres.map(sub => ({ name: sub })))
                    }
                ]
            };
        } else {
            console.log(genreParam)
            root = transformData([genreData]);
        }

        console.log("Données transformées :", root);

        // Suite du code pour créer et afficher l'arbre
        const width = window.innerWidth;
        const height = window.innerHeight * 1.5;
        const tree = d3.tree()
            .size([height, width / 1.5])
            .separation((a, b) => {
                return a.parent === b.parent ? 10 : 10;
            });
        
            
        const hierarchy = d3.hierarchy(root);
        const root_node = tree(hierarchy);
        let findAllParentsData = findAllParents(data, genreParam);
        console.log(findAllParentsData);

        console.log(root_node);

        const svg = d3.select('body')
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style("transform", "scale(0.8)");

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
          .text(d => d.data.name);
    });