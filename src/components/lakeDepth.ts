import type { LakeMotion } from './breathingLake'

const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`

const fragmentSource = `
precision highp float;
uniform sampler2D uPhoto;
uniform sampler2D uNoise;
uniform vec4 uCrop;
uniform vec2 uBuffer;
uniform vec2 uBand;
uniform float uAspect;
uniform float uHorizon;
uniform float uProgress;
uniform float uPhase;

const float focal = .78;
const float cameraHeight = 1.23;

vec3 photograph(vec2 uv) {
  return texture2D(uPhoto, clamp(uv * uCrop.xy + uCrop.zw, .001, .999)).rgb;
}

// Looking through near and far samples of the same volume lets shore-level
// mist grow naturally as it comes closer instead of scaling a screen overlay.
float fogVolume(vec3 ray, float progress) {
  float drift = smoothstep(0.0, 1.0, progress);
  float center = mix(24.0, 4.4, drift);
  float span = mix(7.0, 2.55, drift);
  float extinction = 0.0;
  for (int i = 0; i < 12; i++) {
    float offset = (float(i) + .5) / 12.0 * 2.0 - 1.0;
    float z = center + offset * span;
    vec3 p = vec3(0.0, cameraHeight, 0.0) + ray * (z / ray.z);
    float profile = smoothstep(-.04, .07, p.y) * (1.0 - smoothstep(.11, .48, p.y));
    if (profile > .001) {
      vec2 uv = vec2(p.x * .14 + p.y * .16, z * .115 + p.y * .21);
      float wisps = texture2D(uNoise, uv + vec2(-drift * .28, drift * .58)).r;
      float detail = texture2D(uNoise, uv * 2.2 + vec2(p.y * .63, -drift * .13)).r;
      float density = smoothstep(.29, .75, .78 * wisps + .22 * detail);
      float across = 1.0 - smoothstep(1.4, 7.5, abs(p.x + .28 + .05 * z));
      extinction += profile * density * across * (1.0 - offset * offset) * .109;
    }
  }
  return 1.0 - exp(-extinction);
}

void main() {
  vec2 canvas = gl_FragCoord.xy / uBuffer;
  vec2 uv = vec2(canvas.x, uBand.x + (1.0 - canvas.y) * uBand.y);
  vec3 ray = vec3((uv.x - .5) * uAspect, uHorizon - uv.y, focal);
  vec3 color = vec3(0.0);
  float opacity = 0.0;

  if (uPhase > 1.5 && ray.y < -.018) {
    // Cast the camera ray into a horizontal world-space water plane. The same
    // wavelength covers fewer pixels with distance, and the front widens in 3D.
    vec2 world = (ray.xz * (-cameraHeight / ray.y));
    vec2 radial = world - vec2(.14, 2.85);
    float distance = length(radial);
    float front = .15 + 20.2 * pow(uProgress, 1.55);
    float wake = distance - front;
    float width = mix(2.1, 6.2, uProgress);
    float envelope = 1.0 - smoothstep(.025, width, abs(wake));
    float strength = smoothstep(0.0, .19, uProgress) * (1.0 - smoothstep(.73, 1.0, uProgress));
    float waterEdge = smoothstep(.024, .076, uv.y - uHorizon);
    float silhouette = smoothstep(.005, .10, canvas.x) * smoothstep(.005, .12, 1.0 - canvas.x);
    float bandEdge = smoothstep(.01, .16, canvas.y);
    float variance = texture2D(uNoise, world * .19).r;
    float weight = envelope * strength * waterEdge * bandEdge * silhouette;
    if (weight > .002) {
      vec2 direction = normalize(radial + vec2(.001));
      float wave = sin(7.4 * wake + world.x * .39 + variance * 1.55);
      float detail = sin(16.2 * wake - world.x * .61 + variance * .78);
      vec2 slope = (wave * .0052 + detail * .0014) * direction * weight;
      slope.x += detail * .0022 * weight;
      vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
      vec3 reflected = reflect(ray, normal);
      vec2 imageRay = reflected.xy / reflected.z;
      vec2 sampleAt = vec2(.5 + imageRay.x * focal / uAspect, uHorizon + imageRay.y * focal);
      vec2 offset = clamp(sampleAt - uv, vec2(-.007, -.009), vec2(.007, .009));
      color = photograph(uv + offset);
      float flatAngle = max(.0, -normalize(ray).y);
      float surfaceAngle = max(.0, dot(-normalize(ray), normal));
      float fresnel = pow(1.0 - surfaceAngle, 5.0) - pow(1.0 - flatAngle, 5.0);
      color += vec3(.47, .43, .37) * fresnel + weight * wave * vec3(.023, .019, .015);
      opacity = smoothstep(.001, .145, weight);
    }
  }

  float mist = uPhase < 1.5 ? smoothstep(0.0, .20, uProgress) : 1.0 - smoothstep(0.0, .28, uProgress);
  if (mist > .001 && ray.y < -.012) {
    float drift = uPhase < 1.5 ? uProgress : 1.0;
    float fog = fogVolume(ray, drift) * mist;
    fog *= smoothstep(0.0, .12, canvas.y) * smoothstep(.0, .09, 1.0 - canvas.y);
    fog *= smoothstep(.021, .061, uv.y - uHorizon);
    vec3 light = mix(vec3(.71, .73, .74), vec3(.91, .84, .72), smoothstep(.15, .69, uv.x));
    color = (color * opacity * (1.0 - fog) + light * fog) / max(.00001, opacity * (1.0 - fog) + fog);
    opacity = opacity * (1.0 - fog) + fog;
  }
  gl_FragColor = vec4(color, opacity);
}
`

function makeShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function makeProgram(gl: WebGLRenderingContext) {
  const vertex = makeShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = makeShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = vertex && fragment ? gl.createProgram() : null
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
  }
  if (vertex) gl.deleteShader(vertex)
  if (fragment) gl.deleteShader(fragment)
  if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  if (program) gl.deleteProgram(program)
  return null
}

export function createLakeDepth(photo: HTMLImageElement, canvas: HTMLCanvasElement, waterline: number) {
  if (typeof WebGLRenderingContext === 'undefined') return null
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false, preserveDrawingBuffer: true })
  if (!gl) return null
  const program = makeProgram(gl)
  if (!program) return null
  const vertices = gl.createBuffer()
  const photoTexture = gl.createTexture()
  const noiseTexture = gl.createTexture()

  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, photoTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.uniform1i(gl.getUniformLocation(program, 'uPhoto'), 0)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture)
  const size = 32
  let seed = 7157
  const noise = Uint8Array.from({ length: size * size }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed >>> 24
  })
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, noise)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.uniform1i(gl.getUniformLocation(program, 'uNoise'), 1)

  const crop = gl.getUniformLocation(program, 'uCrop')
  const buffer = gl.getUniformLocation(program, 'uBuffer')
  const band = gl.getUniformLocation(program, 'uBand')
  const horizon = gl.getUniformLocation(program, 'uHorizon')
  const aspect = gl.getUniformLocation(program, 'uAspect')
  const phase = gl.getUniformLocation(program, 'uPhase')
  const progress = gl.getUniformLocation(program, 'uProgress')
  let needsResize = true
  let uploaded = false
  let lost = false

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { needsResize = true })
  observer?.observe(photo)
  observer?.observe(canvas)
  const onContextLost = () => {
    lost = true
    canvas.removeAttribute('data-motion-phase')
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  function resize(context: WebGLRenderingContext) {
    const frame = canvas.getBoundingClientRect()
    const image = photo.getBoundingClientRect()
    if (!frame.width || !frame.height || !image.height) return false
    const cover = Math.max(image.width / photo.naturalWidth, image.height / photo.naturalHeight)
    const scaleX = image.width / (photo.naturalWidth * cover)
    const scaleY = image.height / (photo.naturalHeight * cover)
    const offsetY = (1 - scaleY) / 2
    const ratio = Math.min(1, 440 / frame.width)
    canvas.width = Math.max(1, Math.round(frame.width * ratio))
    canvas.height = Math.max(1, Math.round(frame.height * ratio))
    context.viewport(0, 0, canvas.width, canvas.height)
    context.uniform4f(crop, scaleX, scaleY, (1 - scaleX) / 2, offsetY)
    context.uniform2f(buffer, canvas.width, canvas.height)
    context.uniform2f(band, (frame.top - image.top) / image.height, frame.height / image.height)
    context.uniform1f(horizon, (waterline - offsetY) / scaleY)
    context.uniform1f(aspect, image.width / image.height)
    needsResize = false
    return true
  }

  return {
    available: () => !lost && !gl.isContextLost(),
    draw(motion: LakeMotion | null, fraction = 0) {
      if (!motion) {
        canvas.removeAttribute('data-motion-phase')
        return
      }
      if (!photo.naturalWidth || !photo.complete || lost) return
      if (!uploaded) {
        gl.activeTexture(gl.TEXTURE0)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo)
        uploaded = true
      }
      if (motion === 'hold' && canvas.dataset.motionPhase === motion && !needsResize) return
      if (needsResize && !resize(gl)) return
      gl.uniform1f(phase, motion === 'exhale' ? 2 : 1)
      gl.uniform1f(progress, motion === 'hold' ? 1 : fraction)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.dataset.motionPhase = motion
    },
    dispose() {
      observer?.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeAttribute('data-motion-phase')
      gl.deleteBuffer(vertices)
      gl.deleteTexture(photoTexture)
      gl.deleteTexture(noiseTexture)
      gl.deleteProgram(program)
    },
  }
}
