// state variables
var zoom_center = [0.0, 0.0];
var target_zoom_center = [0.0, 0.0];
var zoom_size = 1.0;
var stop_zooming = true;
var zoom_factor = 1.0;
var max_iterations = 1000;
var initial_max_iter = max_iterations;
var isProgramCompiled = false;
var palette = [[0.0, 0.0, 0.0]];
var singleColor = [0.0, 0.0, 0.0];
// 0 - single, 1 - palette
var modelType = 0;

// canvas elements
var canvas_element;
var gl;

// uniform locations
var zoom_center_uniform;
var zoom_size_uniform;
var max_iterations_uniform;
var fractal_type_uniform;
var julia_value_uniform;
var model_type_uniform;
var colors_uniform;
var colors_length_uniform;
var single_color_uniform;

$(document).ready(function() {
  $("#btnRestoreZoom").click(function() {
    if (isProgramCompiled) {
      zoom_center = [0.0, 0.0];
      zoom_size = 1.0;
      window.requestAnimationFrame(renderFrame);
      console.log("Restoring zoom");
    }
  });

  $("#colorPicker").on("input", () => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
      $("#colorPicker").val()
    );
    let rgb = {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
    singleColor = [rgb.r, rgb.g, rgb.b];
    modelType = 0;
    updateColorModel();
  });
  $("#maxIter").val(max_iterations);

  $("#maxIter").on("input", () => {
    if (isProgramCompiled) {
      max_iterations = $("#maxIter").val();
      window.requestAnimationFrame(renderFrame);
      console.log("Set max iter: " + max_iterations);
    }
  });

  $("#applyBtn").on("click", () => {
    let formula = $("#formulaInput").val();
    let breakCondition = $("#breakCondition").val();
    let fractalProgram = ComplileShaders(formula, breakCondition);
    SetUniformLocations(fractalProgram);
    renderFrame();
  });

  $("#customFile").change(readImage);

  canvas_element = document.getElementById("maincanvas");
  gl = canvas_element.getContext("webgl");

  canvas_element.onmousedown = function(e) {
    var x_part = e.offsetX / canvas_element.width;
    var y_part = e.offsetY / canvas_element.height;
    target_zoom_center[0] =
      zoom_center[0] - zoom_size / 2.0 + x_part * zoom_size;
    target_zoom_center[1] =
      zoom_center[1] + zoom_size / 2.0 - y_part * zoom_size;
    stop_zooming = false;
    zoom_factor = e.buttons & 1 ? 0.99 : 1.01;
    renderFrame();
    return true;
  };

  canvas_element.oncontextmenu = function(e) {
    return false;
  };

  canvas_element.onmouseup = function(e) {
    stop_zooming = true;
  };
});

function readImage() {
  if (this.files && this.files[0]) {
    let fileReader = new FileReader();

    fileReader.onload = function(e) {
      let img = new Image();

      img.addEventListener("load", function() {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        palette = toPalette(
          context.getImageData(0, 0, img.width, img.height).data
        );

        modelType = 1;
        updateColorModel();
      });

      img.src = e.target.result;
    };

    fileReader.readAsDataURL(this.files[0]);
  }
}

function updateColorModel() {
  window.requestAnimationFrame(renderFrame);
}

function renderFrame() {
  // bind inputs & render frame
  const MinAutoFrames = 1000;
  gl.uniform2f(zoom_center_uniform, zoom_center[0], zoom_center[1]);
  gl.uniform1f(zoom_size_uniform, zoom_size);
  gl.uniform1i(max_iterations_uniform, max_iterations);
  gl.uniform1i(model_type_uniform, modelType);
  gl.uniform3f(
    single_color_uniform,
    singleColor[0],
    singleColor[1],
    singleColor[2]
  );
  let tempPalette = [];
  palette.map(c => tempPalette.push(...c));
  gl.uniform1fv(colors_uniform, new Float32Array(tempPalette));
  gl.uniform1f(colors_length_uniform, palette.length);
  //gl.uniform2f(julia_value_uniform, c[0], c[1]);
  //gl.uniform2f(size_uniform, c_width, c_height);
  //gl.uniform1i(fractal_type_uniform, type);
  //gl.uniform1i(color_scheme_uniform, colorSchemeType);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  if (!stop_zooming) {
    zoom_size *= zoom_factor;
    zoom_center[0] += 0.1 * (target_zoom_center[0] - zoom_center[0]);
    zoom_center[1] += 0.1 * (target_zoom_center[1] - zoom_center[1]);
    window.requestAnimationFrame(renderFrame);
  }
}

function SetUniformLocations(fractalProgram) {
  zoom_center_uniform = gl.getUniformLocation(fractalProgram, "u_zoomCenter");
  zoom_size_uniform = gl.getUniformLocation(fractalProgram, "u_zoomSize");
  max_iterations_uniform = gl.getUniformLocation(
    fractalProgram,
    "u_maxIterations"
  );
  fractal_type_uniform = gl.getUniformLocation(fractalProgram, "u_fractalType");
  julia_value_uniform = gl.getUniformLocation(
    fractalProgram,
    "u_julia_c_value"
  );
  model_type_uniform = gl.getUniformLocation(fractalProgram, "u_model_type");
  colors_uniform = gl.getUniformLocation(fractalProgram, "u_colors");
  colors_length_uniform = gl.getUniformLocation(
    fractalProgram,
    "u_colors_length"
  );
  single_color_uniform = gl.getUniformLocation(fractalProgram, "u_color");
}

function ComplileShaders(iterativeFormula, condition) {
  var vertex_shader_src = document.getElementById("shader-vs").text;
  var fragment_shader_src = document.getElementById("shader-fs").text;
  fragment_shader_src = fragment_shader_src.replace(
    "%%%FORMULA_HERE%%%",
    iterativeFormula
  );

  fragment_shader_src = fragment_shader_src.replace(
    "%%%CONDITION_HERE%%%",
    condition
  );

  var vertex_shader = gl.createShader(gl.VERTEX_SHADER);
  var fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vertex_shader, vertex_shader_src);
  gl.shaderSource(fragment_shader, fragment_shader_src);
  gl.compileShader(vertex_shader);
  console.log(gl.getShaderInfoLog(vertex_shader));
  gl.compileShader(fragment_shader);
  isProgramCompiled = gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS);
  if (!isProgramCompiled) {
    alert(gl.getShaderInfoLog(fragment_shader));
    return undefined;
  }

  var fractalProgram = gl.createProgram();
  gl.attachShader(fractalProgram, vertex_shader);
  gl.attachShader(fractalProgram, fragment_shader);
  gl.linkProgram(fractalProgram);
  gl.useProgram(fractalProgram);
  /* create a vertex buffer for a full-screen triangle */
  var vertex_buf = gl.createBuffer(gl.ARRAY_BUFFER);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  /* set up the position attribute */
  var position_attrib_location = gl.getAttribLocation(
    fractalProgram,
    "a_Position"
  );
  gl.enableVertexAttribArray(position_attrib_location);
  gl.vertexAttribPointer(position_attrib_location, 2, gl.FLOAT, false, 0, 0);
  return fractalProgram;
}

function displayPalette(container, palette) {
  let sortedRgbArr = palette
    .map((c, i) => {
      return { color: rgbToHsl(c), index: i };
    })
    .sort((c1, c2) => c1.color[0] - c2.color[0])
    .map(data => palette[data.index]);

  container = document.querySelector(container);
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  let cwidth = $(container).width() / sortedRgbArr.length;

  sortedRgbArr.forEach(c => {
    let el = document.createElement("div");
    el.style.backgroundColor = "rgb(" + c.join(", ") + ")";
    el.style.width = `${cwidth}px`;
    el.style.height = container.style.height;
    el.style.display = "inline-block";
    container.appendChild(el);
  });

  return sortedRgbArr;
}

function colorMinMax(colors) {
  if (colors && colors.length === 0) {
    return undefined;
  }

  let minR = 256;
  let maxR = -1;
  let minG = 256;
  let maxG = -1;
  let minB = 256;
  let maxB = -1;

  for (let i = 0; i < colors.length; ++i) {
    // Red
    if (colors[i][0] < minR) {
      minR = colors[i][0];
    }

    if (colors[i][0] > maxR) {
      maxR = colors[i][0];
    }

    // Green
    if (colors[i][1] < minG) {
      minG = colors[i][1];
    }

    if (colors[i][1] > maxG) {
      maxG = colors[i][0];
    }

    // Blue
    if (colors[i][2] < minB) {
      minB = colors[i][2];
    }

    if (colors[i][2] > maxB) {
      maxB = colors[i][2];
    }
  }

  return {
    minR: minR,
    maxR: maxR,
    minG: minG,
    maxG: maxG,
    minB: minB,
    maxB: maxB,
    lenRed: maxR - minR,
    lenGreen: maxG - minG,
    lenBlue: maxB - minB
  };
}

function quantile(colors, colorsNumber, maxColors) {
  let palette = [];

  if (colorsNumber > maxColors) {
    palette.push(avarageColor(colors));

    return palette;
  }

  let cs = colorMinMax(colors);
  let cuboids, median, colorPos;

  if (cs.lenRed >= cs.lenBlue && cs.lenRed >= cs.lenGreen) {
    median = (cs.minR + cs.maxR) / 2;
    colorPos = 0;
  } else if (cs.lenGreen >= cs.lenBlue && cs.lenGreen >= cs.lenRed) {
    median = (cs.minG + cs.maxG) / 2;
    colorPos = 1;
  } else {
    median = (cs.minB + cs.maxB) / 2;
    colorPos = 2;
  }

  cuboids = getColors(colors, c => c[colorPos] <= median);

  if (cuboids.first.length > 1) {
    let firstPalette = quantile(cuboids.first, colorsNumber + 1, maxColors);
    palette.push(...firstPalette);
  } else if (cuboids.first.length === 1) {
    palette.push(cuboids.first[0]);
  }

  if (cuboids.second.length > 1) {
    let secondPalette = quantile(cuboids.second, colorsNumber + 1, maxColors);
    palette.push(...secondPalette);
  } else if (cuboids.second.length === 1) {
    palette.push(cuboids.second[0]);
  }

  return palette;
}

function getColors(colors, f) {
  let first = [],
    second = [];

  for (let i = 0; i < colors.length; ++i) {
    if (f(colors[i])) {
      first.push(colors[i]);
    } else {
      second.push(colors[i]);
    }
  }

  return {
    first: first,
    second: second
  };
}

function avarageColor(colors) {
  let ar = colors[0][0],
    ag = colors[0][1],
    ab = colors[0][2];

  for (let i = 1; i < colors.length; ++i) {
    for (let j = colors[i][3]; j < colors[i][3].length; ++j) {
      ar = (ar + colors[i][0]) / 2;
      ag = (ag + colors[i][1]) / 2;
      ab = (ab + colors[i][2]) / 2;
    }
  }

  return [ar, ag, ab];
}

function rgbToHsl(c) {
  var r = c[0] / 255,
    g = c[1] / 255,
    b = c[2] / 255;
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  var h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return new Array(h * 360, s * 100, l * 100);
}

function toPalette(imgData) {
  let hash = {};

  for (let i = 0; i < imgData.length; i += 4) {
    addColor(`${imgData[i]} ${imgData[i + 1]} ${imgData[i + 2]}`);
  }

  let colors = [];

  for (let key in hash) {
    let color = key.split(" ").map(el => {
      return Number(el);
    });
    color.push(hash[key]);
    colors.push(color);
  }

  let currentPalette = quantile(colors, 0, 6);

  console.log(`Number of unique colors: ${colors.length}`);
  console.log(`Palette size: ${currentPalette.length}`);

  return displayPalette("#paletteContainer", currentPalette);

  function addColor(value) {
    let count = 0;
    if (hash[value]) {
      count = hash[value];
    } else {
      count = 1;
    }
    hash[value] = count + 1;
  }
}
