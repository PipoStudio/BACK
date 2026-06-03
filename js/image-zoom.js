document.addEventListener("DOMContentLoaded", () => {

    createZoomModal();
    processImages();

    const observer = new MutationObserver(() => {
        processImages();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

});

function processImages() {

    const images = document.querySelectorAll("img");

    images.forEach(img => {

        if (img.dataset.zoomReady) return;

        img.dataset.zoomReady = "true";

        const wrapper = document.createElement("div");
        wrapper.className = "zoom-wrapper";

        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const btn = document.createElement("button");
        btn.className = "zoom-btn";

        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
                 width="18"
                 height="18"
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor"
                 stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        `;

        wrapper.appendChild(btn);

        btn.addEventListener("click", e => {

            e.preventDefault();
            e.stopPropagation();

            openZoom(img.src);

        });

    });

}

function createZoomModal() {

    if (document.getElementById("zoomModal")) return;

    document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div id="zoomModal" class="zoom-modal">

            <button class="zoom-close">
                ×
            </button>

            <img id="zoomImage" src="" alt="">

        </div>
        `
    );

    const modal = document.getElementById("zoomModal");

    modal.addEventListener("click", () => {
        modal.classList.remove("active");
    });

}

function openZoom(src) {

    const modal = document.getElementById("zoomModal");
    const image = document.getElementById("zoomImage");

    image.src = src;

    modal.classList.add("active");

}