import { dither, clamp } from "./dither.js";

let input_file = document.getElementById("formFile");
input_file.addEventListener("change", load_image, false);

let input_shades = document.getElementById("dither-level-range");
input_shades.addEventListener("change", number_change, false);
input_shades.addEventListener("input", number_change, false);

let level_label = document.getElementById("current-level");
level_label.innerHTML = " " + input_shades.value + " "; 

var user_image;
var image_canvas = document.getElementById("dithered-image");
var dither_button = document.getElementById("dither-button");
dither_button.myParam = { canvas: null, grayscale: false, num_shades: 2 };

function number_change(event) {
    let level_label = document.getElementById("current-level");
    level_label.innerHTML = " " + event.target.value + " "; 
}

function before_dither(event) {
    let image_canvas_context = image_canvas.getContext("2d");
    image_canvas_context.clearRect(0, 0, image_canvas.width, image_canvas.height);
    image_canvas_context.drawImage(user_image, 0, 0);

    dither_button.myParam.canvas = image_canvas;
    dither_button.myParam.grayscale = document.getElementById("grayscale-check").checked;
    dither_button.myParam.num_shades = clamp(document.getElementById("dither-level-range").value, 2, 256);

    reset_progress_bar();

    let progress_div = document.getElementById("progress-div");
    progress_div.style.height = "25px";

    hide_placeholder_texts("none");

    dither(event);
}

export function reset_progress_bar() {
    let progress_bar = document.getElementById("dither-progress-bar");
    progress_bar.style.width = "0%";
}

function hide_placeholder_texts(attribute) {
    let dither_placeholder_texts = document.getElementsByClassName("dither-not-started-text");
    for (let i = 0; i < dither_placeholder_texts.length; i++) {
        dither_placeholder_texts[i].style.display = attribute;
    }
}

function load_image(event) {
    var selected_file = event.target.files[0];
    var reader = new FileReader();

    var img_tag = document.getElementById("uploaded-image");
    img_tag.title = selected_file.name;

    reader.onload = function(event) {
        img_tag.src = event.target.result;

        user_image = new Image();
        user_image.src = event.target.result;

        user_image.onload = function() {
            image_canvas.width = user_image.width;
            image_canvas.height = user_image.height;
            image_canvas.getContext("2d").drawImage(user_image, 0, 0);

            let placeholder_texts = document.getElementsByClassName("no-picture-text");

            let final_dither_image = document.getElementById("final-downloadable-image-dithered");
            final_dither_image.style.display = "none";

            reset_progress_bar();

            for (let i = 0; i < placeholder_texts.length; i++) {
                placeholder_texts[i].style.display = "none";
            }

            hide_placeholder_texts("");
        }

        dither_button.addEventListener("click", before_dither, false);
    }

    reader.readAsDataURL(selected_file);
}