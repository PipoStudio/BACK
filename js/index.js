document.addEventListener('DOMContentLoaded', () => {
    // --- HERO VIDEO SLIDER ---
    const videoSlides = document.querySelectorAll('.video-slide');
    const bars = document.querySelectorAll('.slider-bar');
    const heroVideos = document.querySelectorAll('.video-slide video');
    
    if(videoSlides.length > 0) {
        let currentSlide = 0;
        const slideDuration = 6000;
        let slideInterval;

        const forcePlayActiveVideo = () => {
            const activeVideo = heroVideos[currentSlide];
            if (!activeVideo) return;
            activeVideo.muted = true;
            activeVideo.playsInline = true;
            activeVideo.currentTime = 0;
            const playPromise = activeVideo.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        };

        const changeSlide = (index) => {
            videoSlides[currentSlide].classList.remove('active');
            bars[currentSlide].classList.remove('active');
            currentSlide = index;
            videoSlides[currentSlide].classList.add('active');
            bars[currentSlide].classList.add('active');
            forcePlayActiveVideo();
        };

        const nextSlide = () => changeSlide((currentSlide + 1) % bars.length);

        heroVideos.forEach((video, index) => {
            video.addEventListener('error', () => {
                if (index === currentSlide) {
                    setTimeout(nextSlide, 250);
                }
            });
        });

        slideInterval = setInterval(nextSlide, slideDuration);
        forcePlayActiveVideo();

        bars.forEach((bar, index) => {
            bar.addEventListener('click', () => {
                clearInterval(slideInterval);
                changeSlide(index);
                slideInterval = setInterval(nextSlide, slideDuration);
            });
        });
    }

    // --- BEST SELLER SLIDER ---
    const track = document.getElementById('bsTrack');
    const prevBtn = document.getElementById('bsPrevBtn');
    const nextBtn = document.getElementById('bsNextBtn');
    const slides = document.querySelectorAll('.bs-slide');

    if (track && slides.length > 0) {
        let autoSlideInterval;
        let isTransitioning = false;
        const transitionSpeed = 'transform 0.4s ease-in-out';

        function nextSlideBS() {
            if (isTransitioning) return;
            isTransitioning = true;
            track.style.transition = transitionSpeed;
            track.style.transform = 'translateX(-100%)';
        }

        function prevSlideBS() {
            if (isTransitioning) return;
            isTransitioning = true;
            track.prepend(track.lastElementChild);
            track.style.transition = 'none';
            track.style.transform = 'translateX(-100%)';
            track.offsetHeight; // Reflow
            track.style.transition = transitionSpeed;
            track.style.transform = 'translateX(0)';
        }

        track.addEventListener('transitionend', () => {
            if (track.style.transform === 'translateX(-100%)') {
                track.style.transition = 'none';
                track.appendChild(track.firstElementChild); 
                track.style.transform = 'translateX(0)';
            }
            isTransitioning = false;
        });

        function startAutoSlide() {
            autoSlideInterval = setInterval(nextSlideBS, 3500);
        }

        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            startAutoSlide();
        }

        if(nextBtn) nextBtn.addEventListener('click', () => { nextSlideBS(); resetAutoSlide(); });
        if(prevBtn) prevBtn.addEventListener('click', () => { prevSlideBS(); resetAutoSlide(); });

        startAutoSlide();
    }
});