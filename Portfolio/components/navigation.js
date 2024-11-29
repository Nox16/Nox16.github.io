// Create Footer Class
class NavComp extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
        this.innerHTML = `
        <nav class="full-screen-nav">
            <div class="backdrop"></div>
            <ul class="nav-ul">
                <li>
                    <a href="../index.html"><i class="fas fa-home"></i> Home</a>
                </li>
                <li>
                    <a href="../resume.html"><i class="fa-solid fa-scroll"></i> Resume</a>
                </li>
                <li>
                    <a href="../projects.html"><i class="fas fa-tasks"></i> Projects</a>
                </li>
                <li>
                    <a href="../aboutme.html"><i class="fas fa-user-alt"></i> About Me</a>
                </li>
            </ul>
        </nav>

        <div class="content">
            <button class="trigger"><i class="fas fa-bars"></i></button>
        </div>
        `;
    }

  }

// Define Custom Footer Component
customElements.define('nav-component', NavComp);

// Navigation by Yash Vadhadia, Available at: https://codepen.io/yash-vadhadiya/pen/BaKYwPp
const trigger = document.querySelector('.trigger');
const nav = document.querySelector('.full-screen-nav');
const backdrop = document.querySelector('.backdrop');

trigger.addEventListener('click', () => nav.classList.add('open-nav'));
backdrop.addEventListener('click', () => nav.classList.remove('open-nav'));