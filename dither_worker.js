var functions = [ null, floyd_steinberg, probabilistic_dither, bayer_dither ];

self.onmessage = function(message) {
    var input_data_dithered = message.data[0];
    var input_data_quantized = message.data[1];
    var parameters = message.data[2];
    var width = message.data[3];
    var height = message.data[4];
    var dither_function = functions[message.data[5]];

    parameters = {
        num_shades: parameters[0],
        grayscale: parameters[1],
        noise_level: parameters[2],
        bayer_size: parameters[3],
    }

    input_data_quantized = naive_quantize(input_data_quantized, width, height, parameters);
    input_data_dithered = dither_function(input_data_dithered, width, height, parameters);

    var finished_message = ["DONE", input_data_dithered, input_data_quantized];

    self.postMessage(finished_message);
}

function srgb_to_linear(color) {
    color.red /= 255.0;
    color.green /= 255.0;
    color.blue /= 255.0;

    color.red = srgb_to_linear_helper(color.red) * 255.0;
    color.green = srgb_to_linear_helper(color.green) * 255.0;
    color.blue = srgb_to_linear_helper(color.blue) * 255.0;

    return color;
}

function srgb_to_linear_helper(value) {
    if (value <= 0.04045) {
        return value / 12.92;
    } else {
        return Math.pow((value + 0.055) / 1.055, 2.4);
    }
}

function linear_to_srgb(color) {
    color.red /= 255.0;
    color.green /= 255.0;
    color.blue /= 255.0;

    color.red = linear_to_srgb_helper(color.red) * 255.0;
    color.green = linear_to_srgb_helper(color.green) * 255.0;
    color.blue = linear_to_srgb_helper(color.blue) * 255.0;

    return color;
}

function linear_to_srgb_helper(value) {
    if (value <= 0.0031308) {
        return value * 12.92;
    } else {
        return 1.055 * Math.pow(value, 1.0 / 2.4) - 0.055;
    }
}

function make_gray_scale(image_data_object, width, height) {
    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var color = get_color(i, j, width, image_data_object);
            var gray = color.red * 0.30 + color.green * 0.59 + color.blue * 0.11;
            image_data_object[j * width * 4 + i * 4] = gray;
            image_data_object[j * width * 4 + i * 4 + 1] = gray;
            image_data_object[j * width * 4 + i * 4 + 2] = gray;
        }
    }

    return image_data_object;
}

function add_error(color, error, coefficient) {
    color.red += error.red * coefficient;
    color.green += error.green * coefficient;
    color.blue += error.blue * coefficient;
    return color;
}

function get_color(x, y, width, image_data) {
    var red = y * width * 4 + x * 4;
    var green = y * width * 4 + x * 4 + 1;
    var blue = y * width * 4 + x * 4 + 2;
    var alpha = y * width * 4 + x * 4 + 3;

    var color = { red: image_data[red], green: image_data[green], blue: image_data[blue], alpha: image_data[alpha] };
    return color;
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

function generate_bayer_matrix(x, y, size, value, stepping_size, matrix = null) {
    if (matrix === null) {
        matrix = new Array(size);
        for (var i = 0; i < size; i++) {
            matrix[i] = new Array(size);
            for (var j = 0; j < size; j++) {
                matrix[i][j] = 0;
            }
        }
    }

    console.log(x, y);

    if (size === 1) {
        matrix[y][x] = value;
        return;
    }


    var half_size = size / 2;

    generate_bayer_matrix(x,             y,             half_size, value + stepping_size * 0, 4 * stepping_size, matrix);
    generate_bayer_matrix(x + half_size, y + half_size, half_size, value + stepping_size * 1, 4 * stepping_size, matrix);
    generate_bayer_matrix(x + half_size, y            , half_size, value + stepping_size * 2, 4 * stepping_size, matrix);
    generate_bayer_matrix(x,             y + half_size, half_size, value + stepping_size * 3, 4 * stepping_size, matrix);

    return matrix;
}

function quantize(color, num_shades) {
    var quantized_color = { red: 0, green: 0, blue: 0, alpha: color.alpha };
    var factor = 255.0 / (num_shades - 1);
    quantized_color.red = Math.round(color.red / factor) * factor;
    quantized_color.green = Math.round(color.green / factor) * factor;
    quantized_color.blue = Math.round(color.blue / factor) * factor;
    return quantized_color;
}

function check_progress_and_send(work_done, work_iteration, total_work, send_threshold) {
    if (work_iteration >= send_threshold) {
        self.postMessage(["PROGRESS", work_done / total_work]);
        work_iteration = 0;
    }

    return work_iteration;
}

function send_fixed_progress(work_done, total_work) {
    self.postMessage(["PROGRESS", work_done / total_work]);
}

function naive_quantize(input_data, width, height, parameters) {    
    if (parameters.grayscale) {
        input_data.data = make_gray_scale(input_data.data, width, height);
    }

    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var color = get_color(i, j, width, input_data.data);
            var quantized_color = quantize(color, parameters.num_shades);
            input_data.data[j * width * 4 + i * 4] = quantized_color.red;
            input_data.data[j * width * 4 + i * 4 + 1] = quantized_color.green;
            input_data.data[j * width * 4 + i * 4 + 2] = quantized_color.blue;
        }
    }

    return input_data;
}

function floyd_steinberg(image_data_object, width, height, other_parameters) {
    var total_work = 2 * width * height;
    var work_done = 0;
    var work_iteration = 0;
    var work_fraction = total_work / 20;
    console.log(work_fraction);

    // Define constants for the error diffusion
    var seven_sixteenths = 7.0 / 16.0;
    var three_sixteenths = 3.0 / 16.0;
    var one_sixteenth    = 1.0 / 16.0;
    var five_sixteenths  = 5.0 / 16.0;

    // We will make the array 3D to make the code easier to read
    var multi_array_data = [];

    // Splice() is only available on a normal array (ImageData stores a Uint8ClampedArray)
    var image_data_as_array = Array.prototype.slice.call(image_data_object.data);
    console.log("splicing");
    
    // Make the image gray scale
    if (other_parameters.grayscale) {
        image_data_as_array = make_gray_scale(image_data_as_array, width, height);
    }

    // For every row, and for every 4 values, create a color structure and push
    // the color structure into the temporary array, then store the newly formed row 
    // in the multi_array_data array.
    for (var i = 0; i < width * height * 4; i += width * 4) {
        var row = [];
        for (var j = 0; j < width * 4; j += 4) {
            var color = { red: 0, green: 0, blue: 0, alpha: 0 };
            color.red = image_data_as_array[i + j];
            color.green = image_data_as_array[i + j + 1];
            color.blue = image_data_as_array[i + j + 2];
            color.alpha = image_data_as_array[i + j + 3];
            row.push(color);
            
            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
        multi_array_data.push(row);
    }
    console.log("3d stage done");

    /*multi_array_data.map(
        function(row) {
            return row.map(srgb_to_linear);
        }
    );*/

    work_done = width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    console.log("fs start");
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
                multi_array_data[j][i + 1] = add_error(multi_array_data[j][i + 1], error, seven_sixteenths);
                multi_array_data[j][i + 1] = color_clamp(multi_array_data[j][i + 1]);

                if ((j + 1) < height) {
                    multi_array_data[j + 1][i + 1] = add_error(multi_array_data[j + 1][i + 1], error, one_sixteenth);
                    multi_array_data[j + 1][i + 1] = color_clamp(multi_array_data[j + 1][i + 1]);
                }
            }

            // Same reasoning as above
            if ((j + 1) < height) {
                if ((i - 1) >= 0) {
                    multi_array_data[j + 1][i - 1] = add_error(multi_array_data[j + 1][i - 1], error, three_sixteenths);
                    multi_array_data[j + 1][i - 1] = color_clamp(multi_array_data[j + 1][i - 1]);
                }

                multi_array_data[j + 1][i] = add_error(multi_array_data[j + 1][i], error, five_sixteenths);
                multi_array_data[j + 1][i] = color_clamp(multi_array_data[j + 1][i]);
            }

            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
    }

    work_done = 2 * width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    /*multi_array_data.map(
        function(row) {
            return row.map(linear_to_srgb);
        }
    );*/

    console.log("writing");
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

function probabilistic_dither(image_data_object, width, height, other_parameters) {
    var total_work = 2 * width * height;
    var work_done = 0;
    var work_iteration = 0;
    var work_fraction = total_work / 20;
    console.log(work_fraction);

    // We will make the array 3D to make the code easier to read
    var multi_array_data = [];

    // Splice() is only available on a normal array (ImageData stores a Uint8ClampedArray)
    var image_data_as_array = Array.prototype.slice.call(image_data_object.data);
    console.log("splicing");
    
    // Make the image gray scale
    if (other_parameters.grayscale) {
        image_data_as_array = make_gray_scale(image_data_as_array, width, height);
    }

    // For every row, and for every 4 values, create a color structure and push
    // the color structure into the temporary array, then store the newly formed row 
    // in the multi_array_data array.
    for (var i = 0; i < width * height * 4; i += width * 4) {
        var row = [];
        for (var j = 0; j < width * 4; j += 4) {
            var color = { red: 0, green: 0, blue: 0, alpha: 0 };
            color.red = image_data_as_array[i + j];
            color.green = image_data_as_array[i + j + 1];
            color.blue = image_data_as_array[i + j + 2];
            color.alpha = image_data_as_array[i + j + 3];
            row.push(color);
            
            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
        multi_array_data.push(row);
    }
    console.log("3d stage done");

    /*multi_array_data.map(
        function(row) {
            return row.map(srgb_to_linear);
        }
    );*/

    work_done = width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    console.log("pd start");
    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var old_color = multi_array_data[j][i];
            
            let offset = (Math.random() * 255.0 - 127.5) * other_parameters.noise_levels / 100.0;

            var new_color = {
                red:   (old_color.red   + offset) > 127.5 ? 255 : 0,
                green: (old_color.green + offset) > 127.5 ? 255 : 0,
                blue:  (old_color.blue  + offset) > 127.5 ? 255 : 0,
                alpha:  old_color.alpha
            }

            multi_array_data[j][i] = new_color;

            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
    }

    work_done = 2 * width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    /*multi_array_data.map(
        function(row) {
            return row.map(linear_to_srgb);
        }
    );*/

    console.log("writing");
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

function bayer_dither(image_data_object, width, height, other_parameters) {
    var total_work = 2 * width * height;
    var work_done = 0;
    var work_iteration = 0;
    var work_fraction = total_work / 20;
    console.log(work_fraction);

    // We will make the array 3D to make the code easier to read
    var multi_array_data = [];

    // Splice() is only available on a normal array (ImageData stores a Uint8ClampedArray)
    var image_data_as_array = Array.prototype.slice.call(image_data_object.data);
    console.log("splicing");
    
    // Make the image gray scale
    if (other_parameters.grayscale) {
        image_data_as_array = make_gray_scale(image_data_as_array, width, height);
    }

    var size = other_parameters.bayer_size;
    var bayer = generate_bayer_matrix(0, 0, size, 0, 1);
    console.log(bayer);

    // For every row, and for every 4 values, create a color structure and push
    // the color structure into the temporary array, then store the newly formed row 
    // in the multi_array_data array.
    for (var i = 0; i < width * height * 4; i += width * 4) {
        var row = [];
        for (var j = 0; j < width * 4; j += 4) {
            var color = { red: 0, green: 0, blue: 0, alpha: 0 };
            color.red = image_data_as_array[i + j];
            color.green = image_data_as_array[i + j + 1];
            color.blue = image_data_as_array[i + j + 2];
            color.alpha = image_data_as_array[i + j + 3];
            row.push(color);
            
            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
        multi_array_data.push(row);
    }
    console.log("3d stage done");

    /*multi_array_data.map(
        function(row) {
            return row.map(srgb_to_linear);
        }
    );*/

    work_done = width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    let N = Math.log2(other_parameters.num_shades);
    let r = 255.0 / N;

    console.log("pd start");
    for (var j = 0; j < height; j++) {
        for (var i = 0; i < width; i++) {
            var old_color = multi_array_data[j][i];

            /*old_color.red /= 255.0;
            old_color.green /= 255.0;
            old_color.blue /= 255.0;*/

            var threshold = bayer[j % size][i % size] / (size * size);
            threshold = r * (threshold - 0.5);

            old_color.red   = (old_color.red   + threshold);
            old_color.green = (old_color.green + threshold);
            old_color.blue  = (old_color.blue  + threshold);

            old_color = color_clamp(old_color);

            var new_color = quantize(old_color, other_parameters.num_shades);

            multi_array_data[j][i] = new_color;

            work_done++;
            work_iteration++;

            work_iteration = check_progress_and_send(work_done, work_iteration, total_work, work_fraction);
        }
    }

    work_done = 2 * width * height;
    work_iteration = 0;
    send_fixed_progress(work_done, total_work);

    /*multi_array_data.map(
        function(row) {
            return row.map(linear_to_srgb);
        }
    );*/

    console.log("writing");
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