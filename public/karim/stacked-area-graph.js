// Set up dimensions and margins
const margin = {top: 40, right: 150, bottom: 60, left: 60};
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and process data
d3.csv("genre_data.csv").then(function(data) {
    const years = data.columns.slice(1);
    const genres = data.map(d => d.genre);

    // Stack the data
    const stack = d3.stack()
        .keys(years)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Set up scales
    const x = d3.scaleLinear()
        .domain(d3.extent(years, d => +d))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
        .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create areas
    const area = d3.area()
        .x((d, i) => x(years[i]))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));

    svg.selectAll(".area")
        .data(series)
        .join("path")
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", (d, i) => color(genres[i]));

    // Add axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Add labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Year");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Frequency");

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 0)`);

    genres.forEach((genre, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendItem.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", color(genre));

        legendItem.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(genre);
    });
});
