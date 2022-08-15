import { dither } from "./dither.js";

let input_file = document.getElementById("image_file");
input_file.addEventListener("change", load_image, false);

let input_shades = document.getElementById("num_shades");
input_shades.addEventListener("change", number_change, false);

let input_grayscale = document.getElementById("grayscale_check");
input_grayscale.addEventListener("change", checkbox_change, false);

var user_image;
var image_canvas = document.getElementById("dithered_image");
var dither_button = document.getElementById("dither_button");
dither_button.myParam = { canvas: null, grayscale: false, num_shades: 2 };

function number_change(event) {
    dither_button.myParam.num_shades = event.target.value;
}

function checkbox_change(event) {
    dither_button.myParam.grayscale = event.target.checked;
}

function before_dither(event) {
    image_canvas.getContext("2d").clearRect(0, 0, image_canvas.width, image_canvas.height);
    image_canvas.getContext("2d").drawImage(user_image, 0, 0);
    dither_button.myParam.canvas = image_canvas;
    dither(event);
}

function load_image(event) {
    console.log(event);
    var selected_file = event.target.files[0];
    var reader = new FileReader();

    var img_tag = document.getElementById("uploaded_image");
    img_tag.title = selected_file.name;

    reader.onload = function(event) {
        img_tag.src = event.target.result;

        user_image = new Image();
        user_image.src = event.target.result;

        user_image.onload = function() {
            image_canvas.width = user_image.width;
            image_canvas.height = user_image.height;
            image_canvas.getContext("2d").drawImage(user_image, 0, 0);
        }

        dither_button.addEventListener("click", before_dither, false);
    }

    reader.readAsDataURL(selected_file);
}