export function dither(event) {
    const worker = new Worker("dither_worker.js");

    var input_canvas = event.target.myParam.canvas;
    var parameters = event.target.myParam;
    var input_context = input_canvas.getContext("2d");
    var input_data = input_context.getImageData(0, 0, input_canvas.width, input_canvas.height);

    var initial_message = [
        input_data,
        [parameters.num_shades, parameters.grayscale],
        input_canvas.width,
        input_canvas.height,
    ];

    //input_data = floyd_steinberg(input_data, input_canvas.width, input_canvas.height, parameters);
    worker.postMessage(initial_message);

    worker.onmessage = function(msg) {
        if (msg.data[1] == "DONE") {
            input_context.putImageData(msg.data[0], 0, 0);

            let destination_image = document.getElementById("final-downloadable-image-dithered");
            let data_uri = input_canvas.toDataURL("image/png;base64");
            destination_image.src = data_uri;

            let final_dither_image = document.getElementById("final-downloadable-image-dithered");
            final_dither_image.style.display = "";

            worker.terminate();
        } else if (msg.data[1] == "PROGRESS") {
            let progress_bar = document.getElementById("dither-progress-bar");
            var progress = clamp(msg.data[0] * 100, 0, 100);
            progress_bar.style.width = progress + "%";
            progress_bar.innerHTML = Math.round(progress) + "%";
        }  
    };    
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}