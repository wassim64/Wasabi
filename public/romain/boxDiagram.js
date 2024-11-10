const startDate = getStartDateFromURL();  // Exemple : 1er janvier 2000
const endDate = getEndDateFromURL();
function getGenreFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('genre') || 'rock';  // Valeur par défaut si le paramètre n'est pas trouvé
}
function getStartDateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dateA')){
        return new Date(urlParams.get('dateA'));
    }else{
        return  new Date('2000');
    }}

function getEndDateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dateAP')){
        return new Date(urlParams.get('dateAP'));
    }else{
        return  new Date('2020');
    }

}


// Définir la variable genre en haut du fichier
const genre = getGenreFromURL();
function loadData() {
    // Charger les données depuis le fichier JSON local
    d3.json("output_songs_by_genre.json").then(data => {
        // Filtrer les données selon le genre spécifié
        const filteredData = data.filter(d => d.genre && d.genre.toLowerCase() == genre.toLowerCase());

        // Mettre à jour allData avec les données filtrées
        allData = filteredData.map(d => ({
            ...d,
            date_difference_years: Math.round((d.date_difference / 365) * 2) / 2  // Conversion en années et arrondi à 0.5
        }));

        // Appliquer un filtre sur les données comme avant
        const withDate = filteredData
            .filter(d => d.date_difference > 0)
            .map(d => ({
                ...d,
                date_difference_years: Math.round((d.date_difference / 365) * 2) / 2  // Conversion en années et arrondi à 0.5
            }))
            .sort((a, b) => b.date_difference_years - a.date_difference_years);

        const zeroDifferenceCount = allData.length - withDate.length;
        document.getElementById("zeroDifferenceCount").textContent =
            "Nombre d'artistes avec 0 jours de différence : " + zeroDifferenceCount + " sur " + allData.length + " artistes"
        +" de l'année "+startDate.getFullYear()+" à l'année "+endDate.getFullYear();

        const averageCareerDuration = calculateAverageCareerDuration(withDate);
        document.getElementById("averageCareerDuration").textContent =
            "Durée moyenne de carrière : " + averageCareerDuration.toFixed(1) + " ans"
            +" de l'année "+startDate.getFullYear()+" à l'année "+endDate.getFullYear();

        applyFilter();  // Application du filtre initial
    }).catch(error => {
        console.error('Error loading data:', error);
    });
}

let allData = [];  // Variable pour stocker les données

loadData();  // Charger les données dès le début

// Fonction pour calculer la moyenne de la durée de carrière
function calculateAverageCareerDuration(data) {
    const totalYears = data.reduce((sum, d) => sum + d.date_difference_years, 0);
    return totalYears / data.length;
}

function applyFilter() {
    const minYears = parseFloat(document.getElementById("minYears").value);
    const maxYears = parseFloat(document.getElementById("maxYears").value);

    const filteredData = allData
        .filter(d => {
            // Filtrer les artistes dont au moins une date de sortie est dans la plage spécifiée
            return d.all_dates.some(date => {
                const songDate = new Date(date);
                var res = songDate >= startDate && songDate <= endDate;
                return res
            });
        })
        .filter(d => d.date_difference_years >= minYears && d.date_difference_years <= maxYears)
        .sort((a, b) => b.date_difference_years - a.date_difference_years);

    const visibleData = filteredData;  // Limite d'affichage
    const svgWidth = Math.max(filteredData.length * 50, 500);   // Largeur totale pour toutes les données

    // Définissez la largeur du SVG pour permettre le défilement horizontal
    const svg = d3.select("svg")
        .attr("width", svgWidth); // Assurez-vous que cette largeur soit suffisante pour scroll

    svg.selectAll("*").remove();

    // Configuration des marges et dimensions internes
    const margin = { top: 20, right: 30, bottom: 40, left: 40 },
        width = svgWidth - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;


    const x = d3.scaleBand()
        .domain(visibleData.map(d => d.artist_name))
        .range([margin.left, width - margin.right])
        .padding(0.4);

    const y = d3.scaleLinear()
        .domain([0, d3.max(visibleData, d => d.date_difference_years)]).nice()
        .range([height - margin.bottom, margin.top]);

    const tooltip = d3.select("#tooltip");

    // Échelle de couleur du vert (pour les carrières courtes) au rouge (pour la carrière la plus longue)
    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(visibleData, d => d.date_difference_years)])  // Min et max de la durée de carrière
        .range(["yellow", "red"]);

    const defs = svg.append("defs");
    visibleData.forEach((d, i) => {
        const gradient = defs.append("linearGradient")
            .attr("id", `gradient-${i}`)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");  // Dégradé du bas vers le haut

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "yellow");  // Vert en bas

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(d.date_difference_years)); // Couleur variable en fonction de la durée
    });

    svg.append("g")
        .selectAll("rect")
        .data(visibleData)
        .enter().append("rect")
        .attr("x", d => x(d.artist_name))
        .attr("y", d => y(d.date_difference_years))
        .attr("height", d => y(0) - y(d.date_difference_years))
        .attr("width", x.bandwidth() * 1.5)  // Multipliez la largeur pour élargir les barres
        .attr("fill", (d, i) => `url(#gradient-${i})`)
        .on("mouseover", (event, d) => {

            tooltip.style("opacity", 1)
                .html(" Artiste : "+d.artist_name +"<br> Durée de carrière : " + d.date_difference_years + " ans");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });


    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .data(visibleData)
        .attr("transform", "rotate(-45)")
        .attr("font-size",'20px')
        .style("text-anchor", "end")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(" Artiste : "+d.artist_name +"<br> Durée de carrière : " + d.date_difference_years + " ans");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d => d + " ans"));  // Affiche les années
}
