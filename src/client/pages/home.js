import homeHtml from './home.html?raw';
import * as d3 from 'd3';

let slideInterval;
let animationFrameId;

/**
 * Initializes the slideshow functionality.
 * @param {HTMLElement} element - The root element of the home page component.
 */
function initSlideshow(element) {
    const slides = element.querySelectorAll('.slide');
    const dots = element.querySelectorAll('.nav-dot');
    let currentSlide = 0;

    function showSlide(n) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        currentSlide = (n + slides.length) % slides.length;
        if (slides[currentSlide]) slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function startSlideshow() {
        // Clear any existing interval to avoid duplicates
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 8000);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(slideInterval);
            showSlide(index);
            startSlideshow();
        });
    });

    startSlideshow();
}

/**
 * Initializes the D3.js hero visualization.
 * @param {HTMLElement} element - The root element of the home page component.
 */
function initHeroVisualization(element) {
    const container = element.querySelector('#hero-visualization');
    if (!container) return;

    // Clear any previous SVG to prevent duplicates on re-render
    d3.select(container).select('svg').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const nodes = d3.range(30).map(i => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      type: i < 8 ? 'user' : i < 20 ? 'content' : 'tag'
    }));

    const links = d3.range(nodes.length - 1).map(i => ({
        source: Math.floor(Math.sqrt(i)),
        target: i + 1
    }));

    const link = svg.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .style('stroke', 'rgba(139, 92, 246, 0.3)')
      .style('stroke-width', 1);

    const node = svg.selectAll('.node')
      .data(nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', d => d.type === 'user' ? 6 : d.type === 'content' ? 4 : 3)
      .style('fill', d => d.type === 'user' ? '#a278ff' : d.type === 'content' ? '#7fd8d8' : '#ff9c66')
      .style('opacity', 0.8);

    function animate() {
        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > width) node.vx *= -1;
            if (node.y < 0 || node.y > height) node.vy *= -1;
        });

        node.attr('cx', d => d.x).attr('cy', d => d.y);
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

        animationFrameId = requestAnimationFrame(animate);
    }

    // Start the animation
    animate();
}

/**
 * Renders the Home page and initializes its interactive components.
 * @returns {Promise<HTMLElement>} A promise that resolves to the page's DOM element.
 */
export async function HomePage() {
    const element = document.createElement('div');
    element.innerHTML = homeHtml;

    // We need to ensure the DOM is ready and the container has dimensions
    // before initializing the D3 visualization.
    // Using a timeout is a simple way to wait for the next paint cycle.
    setTimeout(() => {
        initSlideshow(element);
        initHeroVisualization(element);
    }, 0);

    // Return a cleanup function to be called when the page is unmounted
    element.cleanup = () => {
        if (slideInterval) clearInterval(slideInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    return element;
}