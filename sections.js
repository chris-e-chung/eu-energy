// SIZE VARIABLES

const lineChartSize = [600, 500]

// SOME TIMING VARIABLES:

const disappearDuration = 500;
const appearDuration = disappearDuration;
const linkDuration = 800;
const delayMultiplier = 12;

// After we scroll to the fourth viz, we speed up the line animations from then on
var lineAnimationDuration = 4000;
var lineAnimationSpedUp = false;

const circleDuration = 500;      

// Just a convenient function to get rid of whitespace
// @param {string} str - a string
// @returns {string} the str with the whitespace removed
function removeWhiteSpace(str) {
    return str.replace(/\s/g,'');
}

//
function removeTradeLinks(keepSelectedCountry = false, noRandomLinks = false) {
    svg.selectAll("circle.start")
        .filter(function() {
            return keepSelectedCountry
                ? d3.select(this).attr("from") !== removeWhiteSpace(previousCountry.toLowerCase())
                : true;
        })
        .transition()
        .duration(disappearDuration)
        .style("opacity", 0)
        .on("end", function(d) {
            d3.select(this).style("fill", "black")
    });

    // Then, interrupt every current transition and set visibility to 0
    tradeLinksSelector = "path.trade-link";
    if (noRandomLinks) {
        tradeLinksSelector = "path.trade-link.norandom";
    }

    svg.selectAll(tradeLinksSelector)
        .filter(function() {
            return keepSelectedCountry
                ? d3.select(this).attr("from") !== removeWhiteSpace(previousCountry.toLowerCase())
                : true;
        }).each(function(d) {
            const pathLength = this.getTotalLength();
            d3.select(this)
                .interrupt()
                .transition()
                .duration(disappearDuration)
                .style("opacity", 0)
                .attr("stroke-dashoffset", pathLength)
                .on("end", function(d) {
                    d3.select(this).style("stroke", "black")
        });
    })
}

async function requestData() {
// Boiler plate stuff
svg = d3.select("svg#svg");
const width = svg.attr("width");
const height = svg.attr("height");
const margins = {left: 170, top: 50, bottom: 50, right: 20}

// Load in the data for the coordinates
coords = await d3.csv("data/country-coord.csv");
// Find Germany, which is the center of our map
const germany = coords.find((country) => country.Country == "Germany");
const germanyCoords = [germany["Longitude (average)"] + 100, germany["Latitude (average)"]]

// Creating the map
    // List of country names with IDs
const countryNames = await d3.tsv("https://unpkg.com/world-atlas@1.1.4/world/50m.tsv");
const nameById = new Map(countryNames.filter(d => d.iso_n3 !== "-99").map(d => [d.iso_n3, d.admin]))  // or brk_name 
    // Load the TopoJSON
const worldjson = await d3.json("https://unpkg.com/world-atlas@1.1.4/world/50m.json");
const geoData = topojson.feature(worldjson, worldjson.objects.countries);

// Add the correct name to each country's properties
geoData.features.forEach((d, i) => {
    const id = worldjson.objects.countries.geometries[i].id;
    d.id = id;
    d.properties.name = nameById.get(id);  // Now this will not be undefined
});

const europeFeatures = geoData.features.filter(f => {
    const bounds = d3.geoBounds(f);  // returns [[west, south], [east, north]]
    const [[minLon, minLat], [maxLon, maxLat]] = bounds;

        // Rough Europe bounding box (adjust if needed):
        return (
            (maxLon >= -10 || maxLon <= -160) &&
            maxLat >= 30 && minLat <= 100       // Latitude range for Europe
        );
});

// Projection documentation:
// https://d3js.org/d3-geo/projection
const projection = d3.geoConicConformal()
                .center(germanyCoords)
                .scale(width * 1.4)
                .translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

let tempMappedCountryNames = [];
const mappedCountryNames = [];
// Add the paths to the svg
// Keep track of whether or not we allow mouseovers
lineChartMousing = false;
// Avez-vous gouter le strudel ici?
previousCountry = "France";
previousCountryNode = null;

countryPaths = svg.append("g").selectAll("path.country").data(europeFeatures)
    .join("path")
    .attr("d", path)
    .attr("class", "country")
    .attr("id", d => d.properties.name + "-path")
    .attr("country", d => d.properties.name)
    // I chose these colors from here:
    // https://colorhunt.co/palette/89a8b2b3c8cfe5e1daf1f0e8
    .style("stroke", "#F1F0E8")
    .style("stroke-width", '1px')
    .style("fill", "#89A8B2")
    .style("opacity", 0.8)
    .attr("", (d) => {
        tempMappedCountryNames.push(d.properties.name)
    })
    .on("mouseover", function(event, d) {
        const country = d3.select(this);
        countryName = d.properties.name;
        lowerCaseName = removeWhiteSpace(countryName.toLowerCase());

        if (lineChartMousing && !country.classed("selected-country") && !country.classed("no-data")) {
            country.classed("hovered-country", true);

            // Filter all the trade links that aren't currently selected
            d3.selectAll(".trade-link.norandom")
            .each(function(d, i) {
                if (d3.select(this).attr("from") === lowerCaseName && d3.select(this).attr("from") !== removeWhiteSpace(previousCountry.toLowerCase())) {
                    d3.select(this)
                        .style("stroke", "grey")
                        .transition()
                        // d3.ease documentation:
                        // https://d3js.org/d3-ease
                        .ease(d3.easePoly.exponent(4))
                        .attr("stroke-dashoffset", 0)
                        .style("opacity", 1)
                        .duration(linkDuration);
                    d3.select(`circle#start${i}.trade-link-circle-norandom`)
                        .style("fill", "grey")
                        .transition()
                        .style("opacity", 1);
                }})
        }
    })
    .on("mouseout", function(event, d) {
        const country = d3.select(this);

        if (lineChartMousing && !country.classed("selected-country")) {
            country.classed("hovered-country", false);

            removeTradeLinks(keepSelectedCountry=true, noRandomLinks = true);
        }
    })
    .on("click", function(event, path) {
        country = d3.select(this);
        countryName = path.properties.name;
        lowerCaseName = removeWhiteSpace(countryName.toLowerCase());

        if (lineChartMousing && mappedCountryNames.includes(countryName)) {
            if (!country.classed("selected-country")) {
                // if it's not selected already
                removeLineChart(previousCountry);

                d3.select("h3#line-header-h3").text(`${countryName}'s Energy Production`);
                
                d3.selectAll("path.country")
                    .classed("selected-country", false);

                country.classed("hovered-country", false);
                country.classed("selected-country", true);

                svg.selectAll("path.country")
                    .transition()
                    .duration(appearDuration)
                    .style("opacity", d => d.properties.name === countryName ? 1 : 0.4);

                d3.select(`${lowerCaseName}-line-chart`)
                        .transition()
                        .duration(appearDuration)
                        .style("opacity", 1);

                d3.select(`#${lowerCaseName}-line-chart`).raise();

                showLineChart(countryName);

                previousCountry = countryName;
                previousCountryNode = country;

                // Trade link stuff
                removeTradeLinks(keepSelectedCountry=true, noRandomLinks = true);

                let anyExports = false;
                d3.selectAll(".trade-link.norandom").each(function(d, i) {
                    if (d3.select(this).attr("from") === lowerCaseName) {
                        anyExports = true;

                        d3.select(this)
                            .transition()
                            // d3.ease documentation:
                            // https://d3js.org/d3-ease
                            .ease(d3.easePoly.exponent(4))
                            .attr("stroke-dashoffset", 0)
                            .style("stroke", "black")
                            .style("opacity", 1)
                            .duration(linkDuration);
                        d3.select(`circle#start${i}.trade-link-circle-norandom`)
                            .transition()
                            .style("opacity", 1)
                            .style("fill", "black");
                    } else {
                    }
                });

                noExportsMsg = d3.select("p#no-exports");
                if (!anyExports) {
                    noExportsMsg.style("opacity", 1);
                } else {
                    noExportsMsg.style("opacity", 0);
                }

            } else {
                // if it's selected already
            }
        }
    });         

// Crimea
// defs is where we keep all of the patterns and paths that we'll be using
const defs= svg.append("defs");

// First, append a path that isn't the exact shape of Crimea, but roughly contains it
defs.append("clipPath").attr("id", "crimeaPath").append("path")
                    .attr("d", d => {
                        let coords1 = (projection([33.62109, 46.22909]));
                        let coords2 = (projection([35.02934755047164, 45.75655860231394]));
                        let coords3 = (projection([37.26019417528333, 46.21289074522977]));
                        let coords4 = (projection([34.315858631346075, 42.39382786149982]));
                        let coords5 = (projection([31.459413769724833, 45.51287122537125]));
                        let coords6 = (projection([33.54681579230979, 45.94234492487497]));

                        return `M ${coords1[0]} ${coords1[1]} 
                                L ${coords2[0]} ${coords2[1]}
                                L ${coords3[0]} ${coords3[1]}
                                L ${coords4[0]} ${coords4[1]}
                                L ${coords5[0]} ${coords5[1]}
                                L ${coords6[0]} ${coords6[1]}
                                Z`
                    });

// Append a `<pattern>` element that we'll use to fill in Crimea
const pattern = defs.append("pattern").attr("id", "stripes")
                                    .attr("patternUnits", "userSpaceOnUse")
                                    // How often it's repeated is the width
                                    .attr("width", 8)
                                    .attr("height", 20)
                                    .attr("patternTransform", "rotate(135)")
pattern.append("rect").attr("x", 0)
                      .attr("y", 0)
                      // Should be half the overall pattern's width
                      .attr("width", '4')
                      .attr("height", "20")
                      .attr("fill", "red")
pattern.append("rect").attr("x", 5)
                      .attr("y", 0)
                      // Should be half the overall pattern's width
                      .attr("width", '4')
                      .attr("height", "20")
                      .attr("fill", "none")

// Finally, append the clip path and fill it with the pattern
const crimeaIntersection = svg.append("path")
                              .attr("d", d3.select("#Ukraine-path").attr("d"))
                              .attr("clip-path", "url(#crimeaPath)")
                              .attr("id", "crimea-area")
                              .attr("fill", "url(#stripes")

// 
// CREATE THE VISUALIZATIONS
// 

// Load in the data
const tradeLinksData = await d3.csv("data/cleaned_EU_trade.csv", d3.autoType);

// We'll use the surface area to calculate how much we can randomize the points for the trade links
const countrySurfaceAreaData = await d3.csv("data/country-sa.csv", d3.autoType);
var countrySurfaceArea = {};
countrySurfaceAreaData.forEach(d => {
    countrySurfaceArea[d["Country Name"]] = d["2022"];
});

const electricityData = await d3.json("data/country-energy-cleaned.json");

// Draw everything first, but set their visibility to hidden to hide them and show as needed l8r
// Setting their visibility to hidden doesn't necessarily mean "display: none"
function pageLoad() {
    // Process the trade data
    // This is Max's code from the old page
    const tradeLinks = tradeLinksData.map(d => {
        const from = coords.find(c => c.Country === d.partner);
        const to = coords.find(c => c.Country === d.geo);
        if (!from || !to) return null;
        return {
            partner: d.partner,
            geo: d.geo,
            source: [from["Longitude (average)"], from["Latitude (average)"]],
            target: [to["Longitude (average)"], to["Latitude (average)"]],
            value: d.OBS_VALUE
        };
    }).filter(d => d !== null);

    // Having straight lines looks a little weird, so let's curve them
    // Quadratic Bezier curve to draw curves instead of straight lines
    // Basically, take we're finding the point on a perpedicular line to the midpoint of the line between two points

    // @param {[number, number]} coord1 - an array of [x1, y1] where each value is a pixel coordinate x or y
    // @param {[number, number]} coord2 - an array of [x2, y2] where each value is a pixel coordinate x or y
    // @param {number} randomness - an optional argument defining the maximum magnitude of the perpedicular line.
    // @param {boolean} useLength - an optional argument determining whether or not the distance between the two provided coordinates should be used. Disabling this makes the bezier curve have the same radius no matter the length.
    // @return {[number, number]} an array of [q1, q2] where each value is the pixel coordinate of the perpendicular point
    const constantRadius = 50;
    function bezierCurver(coord1, coord2, randomness=2, useLength=true) {
        [x1, y1] = coord1;
        [x2, y2] = coord2;

        [mx, my] = [(x1 + x2)/2, (y1 + y2)/2];
        [dx, dy] = [x2 - x1, y2 - y1];

        length = Math.sqrt(dx**2 + dy**2);

        // Add some randomness
        // Math.random() - 0.5 randomizes the sign of the value, so from -0.5 to 0.5
        // We multiply by two to create an interval [-1, 1)
        let h;
        if (useLength) {
            h = (Math.random() - 0.5) * length * randomness;
        } else {
            h = (Math.random() - 0.5) * constantRadius * randomness;
        }

        result = [mx + (-dy/length) * h, my + (dx/length) * h];

        return result;
    }

    // Somewhat randomize the location of each point based on the relative size of the country
    // @param {[number, number]} coord - an array of [x1, y2] where each value is an int pixel coordinate
    // @param {string} country - a string representing the name of a country (used to find surface area)
    // @returns {[number, number]} - a pixel coordinate pair randomized based on the surface area of the provided country
    function pointRandomizer(coord, country, randomness=6) {
        [x, y] = coord;
        countrySA = countrySurfaceArea[country];

        // 320 was the smallest SA
        multiplierx = Math.log(countrySA / 320) * (Math.random() - 0.5) * randomness;
        multipliery = Math.log(countrySA / 320) * (Math.random() - 0.5) * randomness;

        if (countrySA) {
            return [x + multiplierx, y + multipliery];
        }
        else {
            return coord;
        }
    }

    // Draw the trade lines
    const tradeLines = svg.append("g").selectAll("path.trade-link").data(tradeLinks).join("path")
                            .attr("class", "trade-link")
                            .attr("d", d => {
                                // Randomize the points somewhat so they don't all come out of / go to the same place
                                coords1 = pointRandomizer(projection(d.source), d.partner);
                                coords2 = pointRandomizer(projection(d.target), d.geo);
                                // Add a curve point to make an arc
                                curvePoint = bezierCurver(coords1, coords2);

                                return `M ${coords1[0]} ${coords1[1]} Q ${curvePoint[0]} ${curvePoint[1]} ${coords2[0]} ${coords2[1]}`
                            })
                            .attr("from", d => removeWhiteSpace(d.partner.toLowerCase()))
                            .attr("to", d => removeWhiteSpace(d.geo.toLowerCase()))
                            .style("fill", "none")
                            .style("stroke", "black")
                            .style("stroke-width", "1px")
                            .style("opacity", 1);

    const tradeLinesNoRandom = svg.append("g").selectAll("path.trade-link.norandom").data(tradeLinks).join("path")
                            .attr("class", "trade-link norandom")
                            .attr("d", d => {
                                // Randomize the points somewhat so they don't all come out of / go to the same place
                                coords1 = projection(d.source), d.partner;
                                coords2 = projection(d.target), d.geo;
                                // Add a curve point to make an arc
                                curvePoint = bezierCurver(coords1, coords2, randomness=1.5, useLength=false);

                                return `M ${coords1[0]} ${coords1[1]} Q ${curvePoint[0]} ${curvePoint[1]} ${coords2[0]} ${coords2[1]}`
                            })
                            .attr("from", d => removeWhiteSpace(d.partner.toLowerCase()))
                            .attr("to", d => removeWhiteSpace(d.geo.toLowerCase()))
                            .style("fill", "none")
                            .style("stroke", "black")
                            .style("stroke-width", "1px")
                            .style("opacity", 1);
                    
    // Add some important parts
    // First, set the stroke settings. It was hard to do this when first drawing them because
    //      we need to calculate the length of the path
    //
    // How the line animation works: https://medium.com/@louisemoxy/create-a-d3-line-chart-animation-336f1cb7dd61
    //      some additional docs:    https://observablehq.com/@onoratod/animate-a-path-in-d3
    // Basically, offset the path's stroke by the length of the path, making it basically offscreen for itself
    // Then, bring it back by setting the offset to 0
    tradeLines.each(function(d, i) {
        // Set the initial stroke stuff
        // Makes it invisible
        const pathLength = this.getTotalLength();
        d3.select(this)
            .attr("stroke-dasharray", pathLength + " " + pathLength)
            .attr("stroke-dashoffset", pathLength);

        // Add the circles at the beginning and end of each path
        const startCircleCoords = this.getPointAtLength(0);
        // Set the opacity to 0 so they're not visible
        svg.append("circle")
            .attr("class", "trade-link-circle start")
            .attr("id", "start" + i)
            .attr("from", d3.select(this).attr("from"))
            .attr("cx", c => Math.round(startCircleCoords.x))
            .attr("cy", c => Math.round(startCircleCoords.y))
            .attr("r", 2)
            .style("opacity", 0)
    });
    tradeLinesNoRandom.each(function(d, i) {
        const pathLength = this.getTotalLength();
        d3.select(this)
            .attr("stroke-dasharray", pathLength + " " + pathLength)
            .attr("stroke-dashoffset", pathLength);

        const startCircleCoords = this.getPointAtLength(0);
        svg.append("circle")
            .attr("class", "trade-link-circle-norandom start")
            .attr("id", "start" + i)
            .attr("from", d3.select(this).attr("from"))
            .attr("cx", c => Math.round(startCircleCoords.x))
            .attr("cy", c => Math.round(startCircleCoords.y))
            .attr("r", 2)
            .style("opacity", 0)
    });

    // Store every reversed DOM list we have
    reversedCircles = {};

    async function drawLineChart(svgSelector=null, name, separate=false) {
        let lowerCaseName = removeWhiteSpace(name.toLowerCase());
        if (separate) {
            lowerCaseName = lowerCaseName + "-separated";
        }

        const tooltip = d3.select("#tooltip");
        let selectedSVG;
        if (svgSelector === null) {
            selectedSVG = d3.select("#mass-line-chart-container")
                .append("svg")
                .attr("class", "line-chart")
                .attr("id", `${lowerCaseName}-line-chart`)
                .attr("viewBox", `0 0 ${lineChartSize[0]} ${lineChartSize[1]}`)
                .attr("width", lineChartSize[0])
                .attr("height", lineChartSize[1])
                .attr("preserveAspectRatio", "xMidYMid meet");
        } else {
            selectedSVG = d3.select(svgSelector);
        }

        const legendSVGs = d3.selectAll(".legend-div");
        const width = selectedSVG.attr("width");
        const height = selectedSVG.attr("height");
        const margin = {top: 10, right: 10, bottom: 50, left: 50};
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        let annotations = selectedSVG.append("g").attr("id","annotations");
            // No translate here since our annotations may be outside of the chart area
        let chartArea = selectedSVG.append("g").attr("id","points")
            .attr("transform","translate("+margin.left+","+margin.top+")");

        // Reformat data 
        let dataset = electricityData[name];

        const longData = [];
        Object.keys(dataset).forEach(rowKey => {
            row = dataset[rowKey];
            const type = rowKey;
            if (type === "Consumption" || type === "Exports" || type === "Imports") return;
            Object.keys(row).forEach(key => {
                const year = +key;
                const value = +row[key];
                if (!isNaN(year) && !isNaN(value)) {
                    longData.push({ type, year, value });
                    
                }
            });
        });

        const yearExtent = d3.extent(longData, d => d.year);
        const yearScale = d3.scaleLinear().domain(yearExtent).range([0, chartWidth]);

        const valueExtent = d3.extent(longData, d => d.value);
        const valueScale = d3.scaleLinear().domain(valueExtent).range([chartHeight, 0]);

        const energyTypes = [
            "Nuclear",
            "Fossil fuels",
            "Coal",
            "Natural gas",
            "Oil",
            "Renewables",
            "Hydroelectricity",
            "Geothermal",
            "Solar",
            "Wind"
        ];
        // These were ChatGPT'd
        const energyColors = [
            "#00FF7F", // Nuclear (bright yellow/orange, radiation symbol color)
            "#7F7F7F", // Fossil fuels (neutral grey, industrial tone)
            "#111111", // Coal (black, literal coal color)
            "#C1440E", // Natural gas (burnt orange, gas flame)
            "#8B0000", // Oil (dark red, oil spill tone)
            "#2E8B57", // Renewables (forest green)
            "#4682B4", // Hydroelectricity (steel blue, water theme)
            "#BA55D3", // Geothermal (purple, earth/heat theme)
            "#FFD700", // Solar, tide, wave, fuel cell (gold/yellow for sun)
            "#1E90FF"  // Wind (sky blue, air/wind)
        ];
        const colorScale = d3.scaleOrdinal(energyTypes, energyColors);

        const leftAxis = d3.axisLeft(valueScale)
                        .tickFormat(d3.format(".2s"));

        const bottomAxis = d3.axisBottom(yearScale)
                            .tickFormat(d3.format("~f"));

        // Append axes
        annotations.append("g")
            .attr("class", "y axis")
            .attr("id", `${lowerCaseName}-yaxis`)
            .attr("transform", `translate(${margin.left - 10},${margin.top})`)
            .call(leftAxis)
            .style("opacity", 0);

        annotations.append("text")
            .attr("text-anchor", "end")
            .attr("id", `${lowerCaseName}-ylabel`)
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 60)
            .attr("x", -margin.top - 180)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("opacity", 0)
            .text("Quantity (MWh)");

        annotations.append("g")
            .attr("class", "x axis")
            .attr("id", `${lowerCaseName}-xaxis`)
            .attr("transform", `translate(${margin.left},${chartHeight + margin.top + 10})`)
            .call(bottomAxis)
            .style("opacity", 0);

        annotations.append("text")
            .attr("id", `${lowerCaseName}-xlabel`)
            .attr("x", margin.left + chartWidth / 2)
            .attr("y", height - 5)
            .style("text-anchor", "middle")
            .style("font-size", "15px")
            .style("opacity", 0)
            .text("Year");

        const line = d3.line()
            .defined(d => !isNaN(d.value) && !isNaN(d.year))
            .x(d => yearScale(d.year))
            .y(d => valueScale(d.value));

        // Group data by type
        const dataByType = d3.group(longData, d => d.type);

        // Plot lines
        energyLines = chartArea.selectAll(`path.${lowerCaseName}-line`)
            .data(dataByType)
            .join("path")
            .attr("class", ([type]) => `${lowerCaseName}-line ${removeWhiteSpace(type)} energy-line`)
            .attr("d", ([type, values]) => line(values))
            .attr("fill", "none")
            .style("opacity", 1)
            .attr("stroke", ([type]) => colorScale(type))
            .attr("stroke-width", 2)
            .on("mouseover", function(event, d) {
                // Highlight current line
                d3.select(this)
                    .attr("stroke-width", 4)
                    // .raise(); // bring to front
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", 2)

            });


        for (let [type, values] of dataByType) {
            if (type !== "Exports" && type !== "Imports" && type !== "Consumption") {
                let first = true;
                let prevX;
                let prevY;
                let sum = 0;

                selectedSVG.append("g")
                    .selectAll(`circle.${lowerCaseName}-circle`)
                    .data(values)
                    .join("circle")
                    .attr("class", `${lowerCaseName}-circle ${removeWhiteSpace(type)} energy-circle`)
                    .attr("cx", d => yearScale(d.year) + margin.left)
                    .attr("cy", d => valueScale(d.value) + margin.top)
                    .attr("sum", function(d) {
                        cx = yearScale(d.year) + margin.left;
                        cy = valueScale(d.value) + margin.top;

                        if (first) {
                            prevX = cx;
                            prevY = cy;
                            first = false;
                        };
                        distanceFromPrevPoint = Math.hypot(prevX - cx, prevY - cy)
                        result = Math.round(sum + distanceFromPrevPoint);

                        prevX = cx;
                        prevY = cy;
                        sum = result;
                        return result
                    })
                    .attr("r", 0)
                    .attr("fill", colorScale(type))
                    .style("opacity", 1)
                    .on("mouseover", function(event, d) {
                        // Highlight the corresponding line by increasing stroke-width
                        d3.selectAll(`.${lowerCaseName}-line`)
                            .filter(([lineType]) => lineType === d.type)
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 4);

                        tooltip
                            .style("opacity", 1)
                            .html(d.value + " MWh");
                    })
                    .on("mousemove", function(event) {
                        tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                    })
                    .on("mouseout", function(event, d) {
                        d3.selectAll(`.${lowerCaseName}-line`)
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 2);
                        tooltip
                            .style("opacity", 0)

                    });
                }
            }

        if (d3.selectAll(".legend-group")._groups[0][0] == null) {
            legendSVGs.each(function(legendSVGContainer) {
                const legendSVG = d3.select(this).append("svg")
                    .attr("width", 160)
                    .attr("height", 210)
                    .attr("preserveAspectRatio", "xMidYMid meet")
                    .attr("viewBox", "0 0 160 210")
                    .attr("class", "legend-svg");

                const legendGroup = legendSVG.append("g")
                    .attr("class", "legend-group")
                    .attr("transform", `translate(${0}, ${0})`)
                    .style("z-index", 2)
                    .style("opacity", 0);

                const legend = legendGroup.selectAll(".legend")
                    .data(dataByType.keys())
                    .join("g")
                    .attr("class", d => `legend ${removeWhiteSpace(d)}`)
                    .attr("transform", function(d, i) {
                        // Return the right translation depending on whether this is a subset
                        groups = ["Nuclear", "Fossil fuels", "Renewables"];
                        xTranslation = 20;
                        if (groups.includes(d)) {
                            xTranslation = 0;
                        }
                        return `translate(${xTranslation},${i * 20 + 10})`})
                    .on("mouseover", function() {
                        type = d3.select(this).attr("class").replace("legend ", "");
                        
                        d3.selectAll("path.energy-line.current-svg")
                            .transition()
                            .duration(200)
                            .style("opacity", function(d) {
                                let line = d3.select(this);
                                let correctClass = removeWhiteSpace(type);

                                if (line.classed(type)) {
                                    return 1;
                                } else {
                                    return 0.2;
                                }
                            });

                        d3.select(this).classed("hovered-legend", true);

                        d3.selectAll("circle.energy-circle.current-svg")
                            .transition()
                            .duration(200)
                            .style("opacity", function(d) {
                                let circle = d3.select(this);
                                let correctClass = removeWhiteSpace(type);

                                if (circle.classed(type)) {
                                    return 1;
                                } else {
                                    return 0.2;
                                }
                            });
                            
                        d3.select(this).classed("hovered-legend", true);
                    })
                    .on("mouseout", function() {
                        d3.selectAll("path.energy-line")
                            .transition()
                            .duration(200)
                            .style("opacity", 1);

                        d3.selectAll("circle.energy-circle")
                            .transition()
                            .duration(200)
                            .style("opacity", 1);

                        d3.select(this).classed("hovered-legend", false);
                    })

                legend.append("rect")
                    .attr("x", 0)
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", d => colorScale(d));

                legend.append("text")
                    .attr("x", 15)
                    .attr("y", 9)
                    .text(d => d);
                
                legendGroup.raise();  
            })
        }
        
        let lineClass = "notanimated-line";
        let opacity = 1;
        if (separate) {
            lineClass ="animated-line";
            opacity = 0;
        }

        // Draw vertical line at year 2016
        const breakYear = 2016;
        const breakX = yearScale(breakYear);
        chartArea.append("line")
            .attr("x1", breakX)
            .attr("x2", breakX)
            .attr("y1", 0)
            .attr("y2", chartHeight)
            .attr("class", lineClass + " russo-ukraine-line")
            .style("opacity", opacity)
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4 4"); 
        
        energyLines.each(function(d, i) {
            const pathLength = this.getTotalLength();

            d3.select(this)
            .attr("stroke-dasharray", pathLength + " " + pathLength)
            .attr("stroke-dashoffset", pathLength);
        })

    const newCircles = d3.selectAll(
        d3.selectAll(`circle.${lowerCaseName}-circle`).nodes().reverse()
    );
    reversedCircles[lowerCaseName] = newCircles;
}
    
drawLineChart("#german-svg", "Germany", separated=true);
drawLineChart("#russian-svg", "Russia", separated=true);

Object.keys(electricityData).forEach((d) => {
    if (tempMappedCountryNames.includes(d)) {
        mappedCountryNames.push(d);
    }
});

mappedCountryNames.forEach((d) => {
    drawLineChart(svgSelector=null, name=d);
});

d3.selectAll("path.country")
    .classed("no-data", d => {
        if (!mappedCountryNames.includes(d.properties.name)) {
            return true;
        } else {
            return false;
        }
});

// Draw a line representing the start of Russo Ukranian

    // Russian and Ukranian energy production

    // Play with yourself (What?)
}
pageLoad();

// The following functions are called whenever we need to make something visible
// They shouldn't 'add' anything to the svg - only edit visibility via opacity, radius, etc.     

// By draw, we mean make visible - they should already be created on the svg
// Draw the map
function draw0() {
    clean("plainMap");

    svg.selectAll("path.country")
        .transition()
        .duration(appearDuration)
        .style("opacity", 0.8);
}

// Create a dict to keep track of all of the timeouts that we currently have running
const tradeLinkTimeouts = {};
let tradeLinkActive = true;

// Draw the trade links
function draw1() {
    clean("tradeLinks");
    tradeLinkActive = true;

    svg.selectAll("path.country")
        .transition()
        .duration(disappearDuration)
        .style("opacity", 0.8);

    let tradeLines = svg.selectAll("path.trade-link");

    // Use the amt of trade lines to determine delay later
    length = tradeLines.size();
    // Arbitrary duration
    
    tradeLines.each(function(d, i) {
        const pathLength = this.getTotalLength();
        // We rely on delay to determine when each path and beginning circle should be shown
        // We also later add the duration to the delay to determine when the end circle should be shown
        const delay = length * Math.random() * delayMultiplier;
        eachObject = this;
        d3.select(this).style("stroke", "black");

        // Make it into a function so that we can call it repeatedly
        // @param d3Object - a tradeLine
        function repeat(d3Object) {
            if (!tradeLinkActive) return;

            // Set the visibility to 0 if it isn't already
            d3.select(d3Object)
                .transition()
                .duration(disappearDuration)
                .attr("stroke-dashoffset", pathLength)
                .style("opacity", 0)
            d3.select(`circle#start${i}`)
                .transition()
                .duration(disappearDuration)
                .style("opacity", 0);

            // Now, make them visible
            d3.select(`circle#start${i}`)
                .transition()
                .delay(delay)
                .duration(linkDuration)
                .style("opacity", 1);
            d3.select(d3Object)
                .transition()
                .delay(delay)
                // d3.ease documentation:
                // https://d3js.org/d3-ease
                .ease(d3.easePoly.exponent(4))
                .attr("stroke-dashoffset", 0)
                .style("opacity", 1)
                .duration(linkDuration)
                .on("end", () => {
                    // When we end our animation, queue up another one by repeating the whole thing
                    // Add the timeout to our dict to keep track of it
                    tradeLinkTimeouts[i] = setTimeout(() => repeat(d3Object), delay + linkDuration + 2000);
                });
            }
            // Initially call repeat to get the whole thing started
            repeat(eachObject);
        })
    }

// Helper function for line chart drawing
// @param {string} the country name used for the line chart
function showLineChart(country, separated=false) {
    let lowerCaseName = removeWhiteSpace(country.toLowerCase());

    if (separated) {
        lowerCaseName = lowerCaseName + "-separated";
    }

    d3.selectAll(`path.${lowerCaseName}-line`).each(function(d, i) {
        const pathLength = this.getTotalLength();

        d3.select(this)
            .classed("current-svg", true)
            .transition("energyLineTransition")
            // d3.ease documentation:
            // https://d3js.org/d3-ease
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .duration(lineAnimationDuration);
    });

    maxSum = 0;                
    reversedCircles[lowerCaseName].each(function(d) {
        let d3Object = d3.select(this);
        let circleSum = parseInt(d3Object.attr("sum"));

        if (maxSum < 1) {
            maxSum = circleSum;
        }

        let circleDelay = Math.round(circleSum / maxSum * lineAnimationDuration);

        d3Object
                .classed("current-svg", true)
                .transition("energyCircleTransition")
                .delay(circleDelay)
                .ease(d3.easeBackOut)
                .attr("r", 4)
                .duration(circleDuration);

        if (circleSum < 1) {
            maxSum = circleSum;
        }
    });

    if (separated) {
        d3.selectAll("line.animated-line")
        .transition()
        .delay(lineAnimationDuration * 1.3)
        .duration(appearDuration)
        .style("opacity", 1);
    }

    d3.selectAll('.legend-group').transition().duration(appearDuration).style("opacity", 1);
    d3.select(`#${lowerCaseName}-xaxis`).transition().duration(appearDuration).style("opacity", 1);
    d3.select(`#${lowerCaseName}-yaxis`).transition().duration(appearDuration).style("opacity", 1);
    d3.select(`#${lowerCaseName}-xlabel`).transition().duration(appearDuration).style("opacity", 1);
    d3.select(`#${lowerCaseName}-ylabel`).transition().duration(appearDuration).style("opacity", 1);
}

// German energy production
function draw2() {
    clean("germanEnergy");
    // keep opcaity of map
    svg.selectAll("path.country")
            .transition()
            .duration(500)
            .style("opacity", 1)

    // Outline Germany
    svg.selectAll("path.country")
            .transition()
            .duration(appearDuration)
            .style("opacity", d => d.properties.name === "Germany" ? 1 : 0.4)

    // show the line graph
    showLineChart("Germany", separated=true);
    d3.select("#german-svg")
        .transition()
        .duration(appearDuration)
        .style("opacity", 1);

}

// Draw a line representing the start of Russo Ukranian
function draw3() {
    clean("RussiaInvades");
    // keep opcaity of map
    svg.selectAll("path.country")
            .transition()
            .duration(appearDuration)
            .style("opacity", d => d.properties.name === "Ukraine" || d.properties.name === "Russia" ? 1 : 0.4)

    // show the line graph
    showLineChart("Russia", separated=true);
    d3.select("#russian-svg")
        .transition()
        .duration(appearDuration)
        .style("opacity", 1);

    d3.select("#crimea-area")
      .classed("crimea-animation", true)
      .transition()
      .duration(appearDuration);
}

// Everyone's circulation
function draw4() {
    // Make the lines animate faster from now on
    if (!lineAnimationSpedUp) {
        lineAnimationDuration = lineAnimationDuration / 1.5;
        lineAnimationSpedUp = true;
    }

    clean("CountryLineCharts");
    d3.select("#mass-line-chart-container")
            .transition()
            .duration(appearDuration)
            .style("opacity", 1);

    lineChartMousing = true;

    lowerCasePrevious = removeWhiteSpace(previousCountry.toLowerCase());

    svg.selectAll("path.country")
            .classed("selected-country", d => d.properties.name === previousCountry ? true : false)
            .transition()
            .duration(appearDuration)
            .style("opacity", d => d.properties.name === previousCountry ? 1 : 0.4);

    d3.select(`#${lowerCasePrevious}-line-chart`)
            .transition()
            .duration(appearDuration)
            .style("opacity", 1);
        
    d3.select(`#${lowerCasePrevious}-line-chart`).raise();

    showLineChart(previousCountry);

    // Trade links
    d3.selectAll(".trade-link.norandom").each(function(d, i) {
        if (d3.select(this).attr("from") === lowerCasePrevious) {
            d3.select(this)
                .transition()
                // d3.ease documentation:
                // https://d3js.org/d3-ease
                .ease(d3.easePoly.exponent(4))
                .attr("stroke-dashoffset", 0)
                .style("opacity", 1)
                .duration(linkDuration);
            d3.select(`circle#start${i}.trade-circle-norandom`)
                .transition()
                .style("opacity", 1);
        }
    })
}
// Stores all of the drawing functions so we can easily refer to them
activationFunctions = [
    draw0,
    draw1,
    draw2,
    draw3,
    draw4,
    draw1
]

// Helper Function for clean()
// @param {string} country - the lowercase name of a country that was used to make a line chart
function removeLineChart(country, separated=false) {
    let lowerCaseName = removeWhiteSpace(country.toLowerCase());
    if (separated) {
        lowerCaseName = lowerCaseName + "-separated"
    }

    d3.selectAll(`path.${lowerCaseName}-line`).each(function(d) {
            const pathLength = this.getTotalLength();
            d3.select(this)
                .classed("current-svg", false)
                .interrupt("energyLineTransition")
                .transition()
                .duration(disappearDuration / 2)
                .attr("stroke-dashoffset", pathLength);
    });

    maxSum = 0;
    reversedCircles[lowerCaseName].each(function(d) {
        let d3Object = d3.select(this);
        let circleSum = parseInt(d3Object.attr("sum"));

        if (maxSum < 1) {
            maxSum = circleSum;
        }

        let circleDelay = Math.round(( 1 - circleSum / maxSum) * disappearDuration / 2);

        d3Object.classed("current-svg", false)
                .interrupt("energyCircleTransition")
                .transition("removeEnergyCircles")
                .delay(circleDelay)
                .ease(d3.easeBackOut)
                .attr("r", 0)
                .duration(circleDuration);

        if (circleSum < 1) {
            maxSum = circleSum;
        }
    });

    d3.selectAll('.legend-group').transition().duration(disappearDuration).style("opacity", 0);
    d3.select(`#${lowerCaseName}-xaxis`).transition().duration(disappearDuration).style("opacity", 0);
    d3.select(`#${lowerCaseName}-yaxis`).transition().duration(disappearDuration).style("opacity", 0);
    d3.select(`#${lowerCaseName}-xlabel`).transition().duration(disappearDuration).style("opacity", 0);
    d3.select(`#${lowerCaseName}-ylabel`).transition().duration(disappearDuration).style("opacity", 0);
}

// Removes visibility from every other chart than the one specified
// @param {string} chartType - a str of the chart to clean for (the only one we're making visible)
function clean(chartType) {
    // If we're NOT looking at the tradelinks viz
    if (chartType !== "tradeLinks") {
        removeTradeLinks();
        
        // Interrupt every timeout in the dict
        for (const key in tradeLinkTimeouts) {
            clearTimeout(tradeLinkTimeouts[key]);
        }
    }
    
    if (chartType !== "germanEnergy" ) {
        d3.select("#german-svg").transition().duration(disappearDuration).style("opacity", 0);
        removeLineChart("Germany", separated=true);
    }

    // If we're NOT looking at the tradelinks viz OR the initial map
    if (!["tradeLinks", "plainMap"].includes(chartType)) {
        svg.selectAll("path.country")
            .transition()
            .duration(disappearDuration)
            .style("opacity", 0)
    }

    // TODO
    // Add more cleaning for the specific visualizations
    // For example, add a if(chartType !== "germanEnergy")
    if (chartType !== "RussiaInvades") {
        d3.select("#russian-svg").transition().duration(disappearDuration).style("opacity", 0);
        removeLineChart("Russia", separated=true);

        d3.select("#crimea-area")
            .classed("crimea-animation", false)
            .transition()
            .duration(disappearDuration);
    }

    if (!["RussiaInvades", "germanEnergy", "CountryLineCharts"].includes(chartType)) {
        d3.selectAll('.legend-group').transition().duration(disappearDuration).style("opacity", 0);
    }

    if (chartType !== "CountryLineCharts") {
        d3.select("#mass-line-chart-container")
            .transition()
            .duration(disappearDuration)
            .style("opacity", 0);
        removeLineChart(previousCountry);
        lineChartMousing = false;

        svg.selectAll("path.country")   
            .classed("hovered-country", false);
    }
}

// Credit for the scroller code:
// https://vallandingham.me/scroller.html 
let scroll = scroller().container(d3.select('#graphic'));
scroll();

let lastIndex, activeIndex = 0;

scroll.on('active', function(index) {
    d3.selectAll('.step')
        .transition().duration(disappearDuration)
        .style('opacity', function (d, i) {return i === index ? 1 : 0.1;});
    
    activeIndex = index
    let sign = (activeIndex - lastIndex) < 0 ? -1 : 1; 
    let scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(i => {
        activationFunctions[i]();
    })
    lastIndex = activeIndex;
})

d3.select("#warning-text")
    .transition()
    .duration(disappearDuration * 2)
    .style("opacity", 0.1)

};
requestData();