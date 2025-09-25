// Slider initialization script for Smart Cafe
// This script handles the home slider functionality

$(document).ready(function () {
    // Force reinitialize slider to fix missing slides
    // Destroy existing slider if any
    if ($('#homeSlider').hasClass('owl-loaded')) {
        $('#homeSlider').owlCarousel('destroy');
    }

    // Wait a bit then reinitialize
    setTimeout(function () {
        $("#homeSlider").owlCarousel({
            loop: true,
            autoplay: true,
            margin: 0,
            animateOut: "fadeOut",
            animateIn: "fadeIn",
            nav: false,
            autoplayHoverPause: false,
            items: 1,
            navText: [
                "<span class='ion-md-arrow-back'></span>",
                "<span class='ion-chevron-right'></span>",
            ],
            responsive: {
                0: {
                    items: 1,
                    nav: false,
                },
                600: {
                    items: 1,
                    nav: false,
                },
                1000: {
                    items: 1,
                    nav: false,
                },
            },
        });


    }, 100);
});

