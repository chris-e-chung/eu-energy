<!-- 
Built from BEST-README-Template
Link: https://github.com/othneildrew/Best-README-Template/tree/main 
-->
<!-- PROJECT LOGO -->

# EU Energy

<p align="center">
  A short project showing the production of energy in Europe and some exports.
  <br />
  <a href="https://chrischung.dev/eu-energy/"><strong>View the Website! »</strong></a>
</p>

<!-- ABOUT THE PROJECT -->
## About This Project

[![EU Energy example][example]](https://chrischung.dev/eu-energy/)

EU Energy is an scroll-to-interact visualization that shows the user energy trade and production in Europe, built using D3.js.

What I learned from the challenges of this project:

- Repeating D3 transitions, using global bools and tracking active setTimeout and .transition functions to cancel their repetition when needed.

- Naming D3 transitions to control interference and interruption between simultaneous animations.

- Calculating when to animate elements on a `<path>` by keeping track of their summed distances to eachother and adding a delay based on that.

- Animating elements in and out after initializing the page.

<!-- - Optimizing for mobile-view. -->

[![Render][Render.com]][Render-url] [![D3][D3.js]][D3-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

In no particular order:

- [ ] Comparative Bar Charts
- [ ] Trade Link Numbers
- [ ] Toggle (Line Chart) Animations
- [x] ~~Mobile View~~
- [ ] Split up the Russia-Ukraine section into two parts, one that storytells Crimea and another that shows the chart
- [ ] Images for storytelling on the left

<!-- CONTACT -->
## Contributors

<a href="https://github.com/chris-e-chung/eu-energy/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=chris-e-chung/eu-energy" />
</a>

*Chris Chung* - cc2299@cornell.edu

I'm currently a graduate student at Cornell University. Stay tuned for a portfolio.

*Max Ma* - mm2559@cornell.edu

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

Made...

- ...for [INFO4310](https://classes.cornell.edu/browse/roster/SP25/class/INFO/4310), a class at Cornell taught by [Prof. Jeff Rz](http://jeffrz.com/)
- ...with scrolling functionality based on [Jim Vallandingham's article](https://vallandingham.me/scroller.html), and stylistic inspiration from [Cuthbert Chow](https://medium.com/data-science/how-i-created-an-interactive-scrolling-visualisation-with-d3-js-and-how-you-can-too-e116372e2c73).

## Data Sources

- Trade data from [Eurostat](https://ec.europa.eu/eurostat)
- Energy production data from the [U.S. Energy Information Administration](https://www.eia.gov/)
- Country surface area data from the [World Bank Group](https://data.worldbank.org/indicator/AG.SRF.TOTL.K2)
- TopoJSON file from [unpkg/world-atlas@1.1.4](https://app.unpkg.com/world-atlas@1.1.4/files/world)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[example]: images/example.gif
[D3.js]: https://img.shields.io/badge/-D3.js-F9A03C?style=for-the-badge&logo=d3&logoColor=white
[D3-url]: https://d3js.org/
[Render.com]: https://img.shields.io/badge/-Render-black?style=for-the-badge&logo=render&logoColor=white&labelColor=black
[Render-url]: https://render.com/

