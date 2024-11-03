// Fonction pour charger les données depuis le serveur Flask
var tmp = true
function loadData() {
    var Svalue= document.getElementById("dataChoice");
    var value = Svalue.value
    console.log('http://localhost:5000/run-script?genre='+value)
    if(tmp)
    return fetch('http://localhost:5000/run-script?genre=rock')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });

    else
        return fetch('http://localhost:5000/run-script?genre=Jazz')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            });
}

// Appel de la fonction loadData et création du box plot
loadData().then(data => {
    // Code D3.js pour construire le box plot avec les données chargées

    const svg = d3.select("svg"),
        margin = {top: 20, right: 30, bottom: 40, left: 40},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(data.map(d => d.artist_name))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.date_difference)]).nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", d => x(d.artist_name))
        .attr("y", d => y(d.date_difference))
        .attr("height", d => y(0) - y(d.date_difference))
        .attr("width", x.bandwidth());

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));
}).catch(error => {
    console.error('Error loading data:', error);
});
