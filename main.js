import { dither } from "./dither.js";

var image_canvas;

function load_image(event) {
    console.log(event);
    var selected_file = event.target.files[0];
    var reader = new FileReader();

    var img_tag = document.getElementById("uploaded_image");
    img_tag.title = selected_file.name;

    reader.onload = function(event) {
        img_tag.src = event.target.result;

        var user_image = new Image();
        user_image.src = event.target.result;

        user_image.onload = function() {
            image_canvas = document.getElementById("dithered_image");
            image_canvas.width = user_image.width;
            image_canvas.height = user_image.height;
            image_canvas.getContext("2d").drawImage(user_image, 0, 0);
            
            let dither_button = document.getElementById("dither_button");
            dither_button.addEventListener("click", dither, false);
            dither_button.myParam = image_canvas;
        }
    }

    reader.readAsDataURL(selected_file);
}

let input = document.getElementById("image_file");
input.addEventListener("change", load_image, false);