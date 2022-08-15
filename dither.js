export function dither(event) {
    var input_canvas = event.target.myParam.canvas;
    var parameters = event.target.myParam;
    var input_context = input_canvas.getContext("2d");
    var input_data = input_context.getImageData(0, 0, input_canvas.width, input_canvas.height);

    input_data = floyd_steinberg(input_data, input_canvas.width, input_canvas.height, parameters);

    input_context.putImageData(input_data, 0, 0);
}

function make_gray_scale(image_data_object, width, height) {
    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var color = getColor(i, j, width, image_data_object);
            var gray = color.red * 0.30 + color.green * 0.59 + color.blue * 0.11;
            image_data_object[j * width * 4 + i * 4] = gray;
            image_data_object[j * width * 4 + i * 4 + 1] = gray;
            image_data_object[j * width * 4 + i * 4 + 2] = gray;
        }
    }

    return image_data_object;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function color_clamp(color) {
    color.red = clamp(color.red, 0, 255);
    color.green = clamp(color.green, 0, 255);
    color.blue = clamp(color.blue, 0, 255);

    return color;
}

function quantize(color, num_shades) {
    var quantized_color = { red: 0, green: 0, blue: 0, alpha: color.alpha };
    var factor = 255 / (num_shades - 1);
    quantized_color.red = Math.round(color.red / factor) * factor;
    quantized_color.green = Math.round(color.green / factor) * factor;
    quantized_color.blue = Math.round(color.blue / factor) * factor;
    return quantized_color;
}

function floyd_steinberg(image_data_object, width, height, other_parameters) {
    // Define constants for the error diffusion
    var seven_sixteenths = 7.0 / 16.0;
    var three_sixteenths = 3.0 / 16.0;
    var one_sixteenth    = 1.0 / 16.0;
    var five_sixteenths  = 5.0 / 16.0;

    // We will make the array 3D to make the code easier to read
    var multi_array_data = [];

    // Splice() is only available on a normal array (ImageData stores a Uint8ClampedArray)
    var image_data_as_array = Array.prototype.slice.call(image_data_object.data);
    
    // Make the image gray scale
    if (other_parameters.grayscale) {
        image_data_as_array = make_gray_scale(image_data_as_array, width, height);
    }

    // Push all the rows into the new array
    while (image_data_as_array.length > 0) {
        multi_array_data.push(image_data_as_array.splice(0, width * 4));
    }

    // For every row, and for every 4 values, create a color structure and push
    // the color structure into the temporary array, then store the newly formed row 
    // in the multi_array_data array.
    for (var i = 0; i < height; i++) {
        var row = [];

        while (multi_array_data[i].length > 0) {
            var color = { red: 0, green: 0, blue: 0, alpha: 0 };
            var color_element = multi_array_data[i].splice(0, 4);

            color.red = color_element[0];
            color.green = color_element[1];
            color.blue = color_element[2];
            color.alpha = color_element[3];

            row.push(color);
        }

        multi_array_data[i] = row;
    }

    // Floyd-Steinberg dithering algorithm
    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var old_color = multi_array_data[j][i];
            var new_color = quantize(old_color, other_parameters.num_shades);

            multi_array_data[j][i] = new_color;

            var error = { 
                red: old_color.red - new_color.red, 
                green: old_color.green - new_color.green, 
                blue: old_color.blue - new_color.blue 
            };

            // Ignore diffusion if the pixel is on the edge of the image
            if ((i + 1) < width) {
                multi_array_data[j][i + 1] = addError(multi_array_data[j][i + 1], error, seven_sixteenths);
                multi_array_data[j][i + 1] = color_clamp(multi_array_data[j][i + 1]);

                if ((j + 1) < height) {
                    multi_array_data[j + 1][i + 1] = addError(multi_array_data[j + 1][i + 1], error, one_sixteenth);
                    multi_array_data[j + 1][i + 1] = color_clamp(multi_array_data[j + 1][i + 1]);
                }
            }

            // Same reasoning as above
            if ((j + 1) < height) {
                if ((i - 1) >= 0) {
                    multi_array_data[j + 1][i - 1] = addError(multi_array_data[j + 1][i - 1], error, three_sixteenths);
                    multi_array_data[j + 1][i - 1] = color_clamp(multi_array_data[j + 1][i - 1]);
                }

                multi_array_data[j + 1][i] = addError(multi_array_data[j + 1][i], error, five_sixteenths);
                multi_array_data[j + 1][i] = color_clamp(multi_array_data[j + 1][i]);
            }
        }
    }

    // When finished, place the data back into the image data object and return it
    for (var i = 0; i < width; i++) {
        for (var j = 0; j < height; j++) {
            var color = multi_array_data[j][i];
            image_data_object.data[j * width * 4 + i * 4] = color.red;
            image_data_object.data[j * width * 4 + i * 4 + 1] = color.green;
            image_data_object.data[j * width * 4 + i * 4 + 2] = color.blue;
            image_data_object.data[j * width * 4 + i * 4 + 3] = color.alpha;
        }
    }

    return image_data_object;
}

function addError(color, error, coefficient) {
    color.red += error.red * coefficient;
    color.green += error.green * coefficient;
    color.blue += error.blue * coefficient;
    return color;
}

function getColor(x, y, width, image_data) {
    var red = y * width * 4 + x * 4;
    var green = y * width * 4 + x * 4 + 1;
    var blue = y * width * 4 + x * 4 + 2;
    var alpha = y * width * 4 + x * 4 + 3;

    var color = { red: image_data[red], green: image_data[green], blue: image_data[blue], alpha: image_data[alpha] };
    return color;
}