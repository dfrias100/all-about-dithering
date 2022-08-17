import { dither, clamp } from "./dither_starter.js?n=2";

let input_file = document.getElementById("formFile");
let input_shades = document.getElementById("dither-level-range");
let input_noise = document.getElementById("noise-level-range");
let input_bayer = document.getElementById("bayer-size-range");
let noise_level_label = document.getElementById("noise-level-range-label");
let dither_level_label = document.getElementById("dither-level-range-label");
let bayer_size_label = document.getElementById("bayer-size-range-label");
let grayscale_check = document.getElementById("grayscale-check");
let euclidean_check = document.getElementById("euclidean-check");
let linearization_check = document.getElementById("linearization-check");

var user_image;
var num_colors = 2;
var algorithm_dropdown = document.getElementById("algorithm-dropdown");
var image_canvas_dithered = document.getElementById("dithered-image");
var image_canvas_quantized = document.getElementById("quantized-image");
var dither_button = document.getElementById("dither-button");
var input_color = document.getElementById("color-picker-div");
var add_color_button = document.getElementById("add-color-button");
var remove_color_button = document.getElementById("remove-color-button");

input_file.addEventListener("change", load_image, false);
input_shades.addEventListener("change", number_change, false);
input_noise.addEventListener("change", number_change, false);
input_bayer.addEventListener("change", number_change_bayer, false);
input_shades.addEventListener("input", number_change, false);
input_noise.addEventListener("input", number_change, false);
input_bayer.addEventListener("input", number_change_bayer, false);
add_color_button.addEventListener("click", color_quantity_change, false);
remove_color_button.addEventListener("click", color_quantity_change, false);

input_file.value = null;
algorithm_dropdown.selectedIndex = 0;
input_shades.value = 2;
input_noise.value = 0;
input_bayer.value = 1;
grayscale_check.checked = false;
linearization_check.checked = false;
euclidean_check.checked = false;
noise_level_label.innerHTML = " " + input_noise.value + " "; 
dither_level_label.innerHTML = " " + input_shades.value + " "; 
bayer_size_label.innerHTML = " " + Math.pow(2, input_bayer.value) + " "; 

let color_collapse = new bootstrap.Collapse(input_color, {
    toggle: false
  });

let dither_collapse = new bootstrap.Collapse(document.getElementById("dither-range-div"), {
toggle: false
});

let grayscale_collapse = new bootstrap.Collapse(document.getElementById("grayscale-check-div"), {
    toggle: false
});

var noise_collapse = new bootstrap.Collapse(document.getElementById("noise-level-div"), {	
    toggle: false
});

var bayer_collapse = new bootstrap.Collapse(document.getElementById("bayer-size-div"), {
    toggle: false
});

grayscale_collapse.show();
dither_collapse.show();
color_collapse.hide();
noise_collapse.hide();
bayer_collapse.hide();

var special_elements = [
    null,
    null, 
    null,
    null, 
    null,
    noise_collapse,
    bayer_collapse
];	

algorithm_dropdown.addEventListener("change", function() {
    let index = algorithm_dropdown.selectedIndex;

    for (let i = 0; i < special_elements.length; i++) {
        if (special_elements[i] == null) {
            continue;
        }
        let element_collapse = special_elements[i]; 
        if (i == index) {
            element_collapse.show();
        } else {    
            element_collapse.hide();
        }
    }
});

dither_button.myParam = { 
    canvas_quantized: null, 
    canvas_dithered: null, 
    grayscale: false, 
    linearization: false,
    euclidean: false,
    color_palette: [],
    num_shades: input_shades.value, 
    noise_level: input_noise.value,
    bayer_size: input_bayer.value,
    algorithm: null 
};

function color_quantity_change(event) {
    let id = event.target.id;
    let color_div = document.getElementById("color-holder-div");
    let color_pickers = color_div.children;

    if (id === "add-color-button") {        

        if (num_colors < 24) {
            const new_color_picker = color_pickers[0].cloneNode(true);
            color_div.appendChild(document.createTextNode (" "));
            color_div.appendChild(new_color_picker);
        }

        num_colors = num_colors == 24 ? 24 : num_colors + 1;

    } else if (id === "remove-color-button") {

        if (num_colors > 2) {
            const last_color_picker = color_pickers[num_colors - 1];
            color_div.removeChild(last_color_picker);
        }

        num_colors = num_colors == 2 ? 2 : num_colors - 1;

    }

    return;
}

function number_change(event) {
    let level_label = document.getElementById(event.target.id + "-label");
    level_label.innerHTML = " " + event.target.value + " "; 
}

function number_change_bayer(event) {
    let level_label = document.getElementById(event.target.id + "-label");
    level_label.innerHTML = " " + Math.pow(2, event.target.value) + " "; 
}

function reset_canvas(canvas, image) {
    let canvas_context = canvas.getContext("2d");
    canvas_context.clearRect(0, 0, canvas.width, canvas.height);
    canvas_context.drawImage(image, 0, 0);
}

function before_dither(event) {
    reset_canvas(image_canvas_dithered, user_image);
    reset_canvas(image_canvas_quantized, user_image);

    dither_button.myParam.canvas_dithered = image_canvas_dithered;
    dither_button.myParam.canvas_quantized = image_canvas_quantized;

    dither_button.myParam.color_palette = [];

    dither_button.myParam.grayscale = document.getElementById("grayscale-check").checked;
    dither_button.myParam.linearization = document.getElementById("linearization-check").checked;
    dither_button.myParam.euclidean = document.getElementById("euclidean-check").checked;
    dither_button.myParam.num_shades = clamp(document.getElementById("dither-level-range").value, 2, 256);
    dither_button.myParam.noise_level = clamp(document.getElementById("noise-level-range").value, 0, 100);
    dither_button.myParam.bayer_size = clamp(Math.pow(2, document.getElementById("bayer-size-range").value), 2, 128);

    algorithm_dropdown = document.getElementById("algorithm-dropdown");
    let algorithm_index = algorithm_dropdown.selectedIndex;

    if (algorithm_index == 0) {
        return;
    }

    if (dither_button.myParam.euclidean) {
        let colors = document.getElementsByClassName("form-control-color");

        for (let i = 0; i < colors.length; i++) {
            dither_button.myParam.color_palette.push(colors[i].value);
        }
    }

    dither_button.myParam.algorithm = algorithm_index;

    reset_progress_bar();

    let progress_div = document.getElementById("progress-div");
    progress_div.style.height = "25px";

    change_placeholder_display_style("none", "dither-not-started-text");

    dither(event);
}

export function reset_progress_bar() {
    let progress_bar = document.getElementById("dither-progress-bar");
    progress_bar.style.backgroundColor = "";
    progress_bar.style.width = "0%";
}

function change_placeholder_display_style(attribute, id) {
    let dither_placeholder_texts = document.getElementsByClassName(id);
    for (let i = 0; i < dither_placeholder_texts.length; i++) {
        dither_placeholder_texts[i].style.display = attribute;
    }
}

function set_image_canvas(canvas, image) {
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
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
            set_image_canvas(image_canvas_quantized, user_image);
            set_image_canvas(image_canvas_dithered, user_image);

            change_placeholder_display_style("none", "no-picture-text");

            let final_dither_image = document.getElementById("final-downloadable-image-dithered");
            final_dither_image.style.display = "none";

            let final_quantized_image = document.getElementById("final-downloadable-image-quantized");
            final_quantized_image.style.display = "none";

            reset_progress_bar();

            change_placeholder_display_style("", "dither-not-started-text");
        }

        dither_button.addEventListener("click", before_dither, false);
    }

    reader.readAsDataURL(selected_file);
}