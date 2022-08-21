export function dither(event) {
    const worker = new Worker("dither_worker.js?n=3");

    var input_canvas_dithered = event.target.myParam.canvas_dithered;
    var input_canvas_quantized = event.target.myParam.canvas_quantized;

    var parameters = event.target.myParam;

    var input_context_dithered = input_canvas_dithered.getContext("2d");
    var input_data_dithered = input_context_dithered.getImageData(0, 0, input_canvas_dithered.width, input_canvas_dithered.height);

    var input_context_quantized = input_canvas_quantized.getContext("2d");
    var input_data_quantized = input_context_quantized.getImageData(0, 0, input_canvas_quantized.width, input_canvas_quantized.height);

    var algorithm_index = parameters.algorithm;

    var initial_message = [
        input_data_dithered,
        input_data_quantized,
        [
            parameters.num_shades, 
            parameters.grayscale, 
            parameters.noise_level, 
            parameters.bayer_size,
            parameters.linearization,
            parameters.color_palette,
            parameters.euclidean
        ],
        input_canvas_dithered.width,
        input_canvas_dithered.height,
        algorithm_index
    ];

    worker.postMessage(initial_message);

    worker.onmessage = function(msg) {
        let progress_bar = document.getElementById("dither-progress-bar");

        if (msg.data[0] == "DONE") {
            progress_bar.style.backgroundColor = "var(--bs-success)";
            progress_bar.innerHTML = "Completed";
            
            input_context_dithered.putImageData(msg.data[1], 0, 0);
            input_context_quantized.putImageData(msg.data[2], 0, 0);

            write_to_image(input_canvas_quantized, "final-downloadable-image-quantized");
            write_to_image(input_canvas_dithered, "final-downloadable-image-dithered");

            let final_dither_image = document.getElementById("final-downloadable-image-dithered");
            final_dither_image.style.display = "";  
            
            let final_quantized_image = document.getElementById("final-downloadable-image-quantized");
            final_quantized_image.style.display = "";  

            worker.terminate();
        } else if (msg.data[0] == "PROGRESS") {
            progress_bar = document.getElementById("dither-progress-bar");
            var progress = clamp(msg.data[1] * 100, 0, 100);
            progress_bar.style.width = progress + "%";
            progress_bar.innerHTML = Math.round(progress) + "%";
        }  
    };    
}

function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
        
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, {type:mime});
}

function write_to_image(canvas, id) {
    let destination_image = document.getElementById(id);
    let data_uri_dithered = canvas.toDataURL("image/png;base64");
    let file = dataURLtoFile(data_uri_dithered, "index.png");
    destination_image.src = URL.createObjectURL(file);
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}