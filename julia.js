// state variables
var zoom_center = [0.0, 0.0];
var target_zoom_center = [0.0, 0.0];
var juliaValue = [0.0, 0.0];
var zoom_size = 1.0;
var stop_zooming = true;
var zoom_factor = 1.0;
var max_iterations = 100;
var initial_max_iter = max_iterations;
var fractalPower = 2;

// canvas elements
var canvas_element;
var gl;

// uniform locations
var zoom_center_uniform;
var zoom_size_uniform;
var max_iterations_uniform;
var u_fractal_power_uniform;
var julia_value_uniform;

$(document).ready(function() {
  $("#btnRestoreZoom").click(function() {
    zoom_center = [0.0, 0.0];
    zoom_size = 1.0;
    window.requestAnimationFrame(renderFrame);
    console.log("Restoring zoom");
  });

  $("#maxIter").val(max_iterations);
  $("#juliaPower").val(fractalPower);
  $("#juliaValue").val("0+0i");

  $("#juliaPower").on("input", () => {
    fractalPower = $("#juliaPower").val();
    window.requestAnimationFrame(renderFrame);
    console.log("Set julia power: " + fractalPower);
  });

  $("#constA").on("input", () => {
    juliaValue[0] = $("#constA").val();
    let cmplx = math.complex(juliaValue[0], juliaValue[1]);
    $("#juliaValue").val(cmplx);
    window.requestAnimationFrame(renderFrame);

    console.log("Set julia value: " + cmplx);
  });

  $("#constB").on("input", () => {
    juliaValue[1] = $("#constB").val();
    let cmplx = math.complex(juliaValue[0], juliaValue[1]);
    $("#juliaValue").val(cmplx);
    window.requestAnimationFrame(renderFrame);

    console.log("Set julia value: " + cmplx);
  });

  function valueInputChanged() {
    let val = $("#juliaValue").val();
    try {
      let cmplx = math.complex(val);
      juliaValue[0] = cmplx.re;
      juliaValue[1] = cmplx.im;
      $("#constA").val(juliaValue[0]);
      $("#constB").val(juliaValue[1]);
      window.requestAnimationFrame(renderFrame);
      console.log("Set julia value: " + cmplx);
    } catch (error) {
      console.log(error);
    }
  }

  $("#juliaValue").on("input", valueInputChanged);
  $("#juliaValue").on("change", valueInputChanged);

  $("#maxIter").on("input", () => {
    max_iterations = $("#maxIter").val();
    window.requestAnimationFrame(renderFrame);
    console.log("Set max iter: " + max_iterations);
  });

  var mandelbrot_program = ComplileShaders();

  // find uniform locations
  SetUniformLocations(mandelbrot_program);

  // input handling
  canvas_element.onmousedown = function(e) {
    var x_part = e.offsetX / canvas_element.width;
    var y_part = e.offsetY / canvas_element.height;
    target_zoom_center[0] =
      zoom_center[0] - zoom_size / 2.0 + x_part * zoom_size;
    target_zoom_center[1] =
      zoom_center[1] + zoom_size / 2.0 - y_part * zoom_size;
    console.log(target_zoom_center);
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

  // display initial frame
  renderFrame();
});

var renderFrame = function() {
  // bind inputs & render frame
  const MinAutoFrames = 10;

  gl.uniform2f(zoom_center_uniform, zoom_center[0], zoom_center[1]);
  gl.uniform1f(zoom_size_uniform, zoom_size);
  gl.uniform1i(max_iterations_uniform, max_iterations);
  gl.uniform1i(u_fractal_power_uniform, fractalPower);
  gl.uniform2f(julia_value_uniform, juliaValue[0], juliaValue[1]);
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
};

function SetUniformLocations(mandelbrot_program) {
  zoom_center_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_zoomCenter"
  );
  zoom_size_uniform = gl.getUniformLocation(mandelbrot_program, "u_zoomSize");
  max_iterations_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_maxIterations"
  );
  u_fractal_power_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_fractal_power"
  );
  julia_value_uniform = gl.getUniformLocation(
    mandelbrot_program,
    "u_julia_c_value"
  );
}

function ComplileShaders() {
  canvas_element = document.getElementById("maincanvas");
  gl = canvas_element.getContext("webgl");
  var vertex_shader_src = document.getElementById("shader-vs").text;
  var fragment_shader_src = document.getElementById("shader-fs").text;
  var vertex_shader = gl.createShader(gl.VERTEX_SHADER);
  var fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vertex_shader, vertex_shader_src);
  gl.shaderSource(fragment_shader, fragment_shader_src);
  gl.compileShader(vertex_shader);
  console.log(gl.getShaderInfoLog(vertex_shader));
  gl.compileShader(fragment_shader);
  console.log(gl.getShaderInfoLog(fragment_shader));
  var mandelbrot_program = gl.createProgram();
  gl.attachShader(mandelbrot_program, vertex_shader);
  gl.attachShader(mandelbrot_program, fragment_shader);
  gl.linkProgram(mandelbrot_program);
  gl.useProgram(mandelbrot_program);
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
    mandelbrot_program,
    "a_Position"
  );
  gl.enableVertexAttribArray(position_attrib_location);
  gl.vertexAttribPointer(position_attrib_location, 2, gl.FLOAT, false, 0, 0);
  return mandelbrot_program;
}
