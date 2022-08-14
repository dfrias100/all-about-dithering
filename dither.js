export function dither(event) {
    var input_canvas = event.target.myParam;
    var input_context = input_canvas.getContext("2d");
    var input_data = input_context.getImageData(0, 0, input_canvas.width, input_canvas.height);

    input_data = floyd_steinberg(input_data, input_canvas.width, input_canvas.height);

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

function quantize(color) {
    var quantized_color = { red: 0, green: 0, blue: 0, alpha: color.alpha };
    quantized_color.red = Math.round(color.red / 255) * 255;
    quantized_color.green = Math.round(color.green / 255) * 255;
    quantized_color.blue = Math.round(color.blue / 255) * 255;
    return quantized_color;
}

function floyd_steinberg(image_data_object, width, height) {
    var seven_sixteenths = 7.0 / 16.0;
    var three_sixteenths = 3.0 / 16.0;
    var one_sixteenth    = 1.0 / 16.0;
    var five_sixteenths  = 5.0 / 16.0;

    var multi_array_data = [];
    var image_data_as_array = Array.prototype.slice.call(image_data_object.data);
    
    image_data_as_array = make_gray_scale(image_data_as_array, width, height);

    while (image_data_as_array.length > 0) {
        multi_array_data.push(image_data_as_array.splice(0, width * 4));
    }

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

    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var old_color = multi_array_data[j][i];
            var new_color = quantize(old_color);

            multi_array_data[j][i] = new_color;

            var error = { red: old_color.red - new_color.red, green: old_color.green - new_color.green, blue: old_color.blue - new_color.blue };

            if ((i + 1) < width) {
                multi_array_data[j][i + 1].red += error.red * seven_sixteenths;
                multi_array_data[j][i + 1].green += error.green * seven_sixteenths;
                multi_array_data[j][i + 1].blue += error.blue * seven_sixteenths;

                multi_array_data[j][i + 1] = color_clamp(multi_array_data[j][i + 1]);

                if ((j + 1) < height) {
                    multi_array_data[j + 1][i + 1].red += error.red * one_sixteenth;
                    multi_array_data[j + 1][i + 1].green += error.green * one_sixteenth;
                    multi_array_data[j + 1][i + 1].blue += error.blue * one_sixteenth;

                    multi_array_data[j + 1][i + 1] = color_clamp(multi_array_data[j + 1][i + 1]);
                }
            }

            if ((j + 1) < height) {
                if ((i - 1) >= 0) {
                    multi_array_data[j + 1][i - 1].red += error.red * three_sixteenths;
                    multi_array_data[j + 1][i - 1].green += error.green * three_sixteenths;
                    multi_array_data[j + 1][i - 1].blue += error.blue * three_sixteenths;

                    multi_array_data[j + 1][i - 1] = color_clamp(multi_array_data[j + 1][i - 1]);
                }

                multi_array_data[j + 1][i].red += error.red * five_sixteenths;
                multi_array_data[j + 1][i].green += error.green * five_sixteenths;
                multi_array_data[j + 1][i].blue += error.blue * five_sixteenths;

                multi_array_data[j + 1][i] = color_clamp(multi_array_data[j + 1][i]);
            }
        }
    }

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

function getColor(x, y, width, image_data) {
    var red = y * width * 4 + x * 4;
    var green = y * width * 4 + x * 4 + 1;
    var blue = y * width * 4 + x * 4 + 2;
    var alpha = y * width * 4 + x * 4 + 3;

    var color = { red: image_data[red], green: image_data[green], blue: image_data[blue], alpha: image_data[alpha] };
    return color;
}