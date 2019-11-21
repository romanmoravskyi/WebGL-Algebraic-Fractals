// state variables
var zoom_center = [0.0, 0.0];
var target_zoom_center = [0.0, 0.0];
var zoom_size = 1.0;
var stop_zooming = true;
var zoom_factor = 1.0;
var max_iterations = 1000;
var initial_max_iter = max_iterations;
var isProgramCompiled = false;

// canvas elements
var canvas_element;
var gl;

// uniform locations
var zoom_center_uniform;
var zoom_size_uniform;
var max_iterations_uniform;
var fractal_type_uniform;
var julia_value_uniform;

$(document).ready(function() {
  $("#btnRestoreZoom").click(function() {
    if (isProgramCompiled) {
      zoom_center = [0.0, 0.0];
      zoom_size = 1.0;
      window.requestAnimationFrame(renderFrame);
      console.log("Restoring zoom");
    }
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

function renderFrame() {
  // bind inputs & render frame
  const MinAutoFrames = 1000;
  gl.uniform2f(zoom_center_uniform, zoom_center[0], zoom_center[1]);
  gl.uniform1f(zoom_size_uniform, zoom_size);
  gl.uniform1i(max_iterations_uniform, max_iterations);
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

  console.log(fragment_shader_src);

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
