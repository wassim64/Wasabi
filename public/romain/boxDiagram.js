const startDate = getStartDateFromURL();  // Exemple : 1er janvier 2000
const endDate = getEndDateFromURL();
function getGenreFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('genre') || 'rock';  // Valeur par défaut si le paramètre n'est pas trouvé
}
function getStartDateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start')){
        return new Date(urlParams.get('start'));
    }else{
        return  new Date('1900');
    }}

function getEndDateFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('end')){
        return new Date(urlParams.get('end'));
    }else{
        return  new Date('2024');
    }

}


// Définir la variable genre en haut du fichier
const genre = getGenreFromURL();
var averageCareerDuration;
document.getElementById("genreDisplay").textContent = "Le genre affiché est : " + genre.charAt(0).toUpperCase() + genre.slice(1);
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
            "Nombre d'artistes avec 1 seul album/son : " + zeroDifferenceCount + " sur " + allData.length + " artistes"
            +" de l'année "+startDate.getFullYear()+" à l'année "+endDate.getFullYear();

         averageCareerDuration = calculateAverageCareerDuration(withDate);
        document.getElementById("averageCareerDuration").textContent =
            "Durée moyenne de carrière : " + averageCareerDuration.toFixed(1) + " ans"
            +" de l'année "+startDate.getFullYear()+" à l'année "+endDate.getFullYear();

        applyFilter();  // Passer la moyenne à applyFilter
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
                return songDate >= startDate && songDate <= endDate;
            });
        })
        .filter(d => d.date_difference_years >= minYears && d.date_difference_years <= maxYears)
        .sort((a, b) => b.date_difference_years - a.date_difference_years);

    const visibleData = filteredData;  // Limite d'affichage
    const svgWidth = Math.max(filteredData.length * 50, 500);   // Largeur totale pour toutes les données

    const svg = d3.select("svg").attr("width", svgWidth);
    svg.selectAll("*").remove();

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

    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(visibleData, d => d.date_difference_years)])
        .range(["yellow", "red"]);

    const defs = svg.append("defs");
    visibleData.forEach((d, i) => {
        const gradient = defs.append("linearGradient")
            .attr("id", `gradient-${i}`)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", "yellow");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(d.date_difference_years));
    });

    svg.append("g")
        .selectAll("rect")
        .data(visibleData)
        .enter().append("rect")
        .attr("x", d => x(d.artist_name))
        .attr("y", d => y(d.date_difference_years))
        .attr("height", d => y(0) - y(d.date_difference_years))
        .attr("width", x.bandwidth() * 1.5)
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
        }) .on("click", (event, d) => {
        // Positionner et afficher le menu contextuel
        const menu = document.getElementById("contextMenu");
        menu.style.display = "block";
        menu.style.left = event.pageX + "px";
        menu.style.top = event.pageY + "px";
    });

    svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width + margin.left)
        .attr("y1", y(averageCareerDuration))
        .attr("y2", y(averageCareerDuration))
        .attr("stroke", "black")
        .attr("stroke-dasharray", "10")  // Ligne pointillée pour distinguer
        .attr("stroke-width", 4);

    svg.append("text")
        .attr("x", margin.left)
        .attr("y", y(averageCareerDuration) - 5)
        .text("Durée moyenne : " + averageCareerDuration.toFixed(1) + " ans")
        .attr("fill", "black")
        .attr("font-size", "25px");

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
        .call(d3.axisLeft(y).tickFormat(d => d + " ans"));


}

document.getElementById("lienKarim").onclick = function() {
    window.location.href = "../karim/index.html?genre="+genre+"&start="+startDate.getFullYear()+"&end="+endDate.getFullYear();
};


document.getElementById("fermer").onclick = function() {

    const menu = document.getElementById("contextMenu");
    if ( menu.style.display=="block") {
        menu.style.display = "none";
    }
};