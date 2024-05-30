// Create Footer Class
class Footer extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
        this.innerHTML = `
        <footer>
            <ul class="footer-links">
              <!-- Email -->    
              <li><a href="mailto: mattclark1616@gmail.com"><i class="fa-solid fa-envelope"></i></a> </li>
              
              <!-- LinkedIn -->
              <li><a href="https://www.linkedin.com/in/matthew-clark-705306223/"><i class="fa-brands fa-linkedin"></i></a> </li>
              
              <!-- Instagram -->
              <li><a href="https://www.instagram.com/codeclark1616/"><i class="fa-brands fa-square-instagram"></i></a> </li>
            </ul>
    
            <p class="copyright"><i class="fa-regular fa-copyright"></i> Matthew Clark 2024</p>
    
        </footer>
    `;
    }

  }

// Define Custom Footer Component
customElements.define('footer-component', Footer);