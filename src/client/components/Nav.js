import navHtml from './nav.html?raw';

/**
 * Initializes all event listeners for the navigation component.
 * @param {HTMLElement} navElement - The container element of the navigation bar.
 */
function initNavEventListeners(navElement) {
    const toggle = navElement.querySelector('.mobile-menu-toggle');
    const navContainer = navElement.querySelector('.nav-container');

    if (toggle && navContainer) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navContainer.classList.toggle('active');
            const icon = toggle.querySelector('.material-icons');
            icon.textContent = navContainer.classList.contains('active') ? 'close' : 'menu';
        });
    }

    // Handle dropdowns
    navElement.querySelectorAll('.dropdown-toggle').forEach(dropdownToggle => {
        dropdownToggle.addEventListener('click', (e) => {
            // On mobile, clicking the toggle opens the dropdown
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                const container = dropdownToggle.closest('.dropdown-container');

                // Close other open dropdowns
                navElement.querySelectorAll('.dropdown-container').forEach(d => {
                    if (d !== container) d.classList.remove('mobile-open');
                });

                container.classList.toggle('mobile-open');
            }
        });
    });

    // Close mobile menu when clicking outside of it
    document.addEventListener('click', (e) => {
        if (navContainer && navContainer.classList.contains('active')) {
            if (!toggle.contains(e.target) && !navContainer.contains(e.target)) {
                navContainer.classList.remove('active');
                toggle.querySelector('.material-icons').textContent = 'menu';
                navElement.querySelectorAll('.dropdown-container').forEach(d => d.classList.remove('mobile-open'));
            }
        }
    });
}


/**
 * Renders the main navigation bar component.
 * It imports the HTML, sets up event listeners, and prepares the element for injection into the DOM.
 * @returns {Promise<HTMLElement>} A promise that resolves to the navigation header element.
 */
export async function Nav() {
    const headerElement = document.createElement('header');
    headerElement.innerHTML = navHtml;

    // In the future, we will add logic here to check auth status
    // and dynamically update the login/profile link.

    initNavEventListeners(headerElement);

    return headerElement;
}