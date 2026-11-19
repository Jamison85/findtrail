import { lakeFog, type LakeMotion } from './breathingLake'
import { GUIDED_EXHALE_SECONDS, RIPPLE_DRAG, RIPPLE_RATE, RIPPLE_SPEED, RIPPLE_TAIL_SECONDS } from './resetTiming'

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
uniform vec3 uFog;
uniform float uWaveTime;

const float focal = .78;
const float cameraHeight = 1.23;

vec3 photograph(vec2 uv) {
  return texture2D(uPhoto, clamp(uv * uCrop.xy + uCrop.zw, .001, .999)).rgb;
}

// Sample the same air on both sides of the water plane. Samples below it
// are seen in reflection, with a weaker contribution than the air itself.
vec2 fogVolume(vec3 ray, float progress, float height, float amount) {
  float drift = smoothstep(0.0, 1.0, progress);
  float center = mix(31.0, 4.5, drift);
  float span = mix(10.4, 3.85, drift);
  float ceiling = height * mix(3.10, 4.48, drift);
  vec2 extinction = vec2(0.0);
  for (int i = 0; i < 24; i++) {
    float offset = (float(i) + .5) / 24.0 * 2.0 - 1.0;
    float z = center + offset * span;
    vec3 p = vec3(0.0, cameraHeight, 0.0) + ray * (z / ray.z);
    float altitude = abs(p.y);
    if (altitude < ceiling) {
      vec2 flow = vec2(p.x * .027 + altitude * .039 - .025 * drift, offset * .105 + altitude * .078);
      float billows = texture2D(uNoise, flow + vec2(.62, .26)).r;
      float threads = texture2D(uNoise, flow * vec2(2.9, 1.7) + vec2(altitude * .10, .33)).r;
      float curl = texture2D(uNoise, flow * vec2(1.21, 2.4) + vec2(.19, .78)).r;
      float roof = ceiling * mix(.39, 1.0, .73 * billows + .27 * curl);
      float core = 1.0 - smoothstep(roof * .13, roof * .66, altitude);
      float rising = smoothstep(roof * .23, roof * .51, altitude) * (1.0 - smoothstep(roof * .63, roof, altitude));
      float density = .8 * core * smoothstep(.23, .71, .76 * billows + .24 * threads);
      density += rising * 1.21 * smoothstep(.28, .80, .61 * curl + .39 * threads);
      float across = 1.0 - smoothstep(1.8, mix(8.1, 6.2, drift), abs(p.x - .47 + .019 * z));
      float reflection = 1.0 - smoothstep(-.033, .033, p.y);
      extinction += vec2(1.0 - reflection, reflection) * density * across * (1.0 - offset * offset) * .168;
    }
  }
  return 1.0 - exp(-extinction * vec2(1.0, .15) * amount);
}

void main() {
  vec2 canvas = gl_FragCoord.xy / uBuffer;
  vec2 uv = vec2(canvas.x, uBand.x + (1.0 - canvas.y) * uBand.y);
  vec3 ray = vec3((uv.x - .5) * uAspect, uHorizon - uv.y, focal);
  vec3 color = vec3(0.0);
  float opacity = 0.0;

  if (uWaveTime >= 0.0 && ray.y < -.018) {
    // Cast the camera ray into a horizontal world-space water plane. The same
    // wavelength covers fewer pixels with distance, and the front widens in 3D.
    vec2 world = (ray.xz * (-cameraHeight / ray.y));
    vec2 radial = world - vec2(.06, 3.74);
    float curve = 1.18 + .22 * smoothstep(.04, 3.9, -radial.x);
    vec2 fan = vec2(radial.x * curve - radial.y * .09, radial.y);
    float distance = length(fan);
    // Evaluate when the crest at this point left the source. New crests form
    // there throughout the exhale while older ones continue outward.
    float travel = distance / ${RIPPLE_SPEED.toFixed(2)} + ${RIPPLE_DRAG} * distance * distance;
    float emitted = uWaveTime - travel;
    float feed = smoothstep(0.0, .40, emitted) * (1.0 - smoothstep(${GUIDED_EXHALE_SECONDS.toFixed(1)}, ${(GUIDED_EXHALE_SECONDS + .18).toFixed(2)}, emitted));
    float settle = 1.0 - smoothstep(${GUIDED_EXHALE_SECONDS.toFixed(1)}, ${(GUIDED_EXHALE_SECONDS + RIPPLE_TAIL_SECONDS).toFixed(1)}, uWaveTime);
    float angle = fan.y / max(.001, distance);
    float spread = mix(.70, -.15, smoothstep(.2, 8.4, distance));
    float outward = smoothstep(spread, spread + .29, angle);
    float falloff = (1.0 - .77 * smoothstep(1.15, 16.4, distance)) * smoothstep(.025, .17, distance);
    float waterEdge = smoothstep(.017, .039, uv.y - uHorizon);
    float bandEdge = smoothstep(.01, .16, canvas.y);
    float weight = feed * settle * outward * falloff * waterEdge * bandEdge;
    if (weight > .002) {
      vec2 direction = normalize(vec2(fan.x * curve, fan.y - .09 * fan.x) + vec2(.001));
      float variance = texture2D(uNoise, world * .062).r;
      float crest = emitted * ${RIPPLE_RATE.toFixed(1)} + variance * .78;
      float wave = sin(crest + world.x * .09);
      float detail = sin(crest * 1.82 - world.x * .39);
      vec2 slope = (wave * .00625 + detail * .00145) * direction * weight;
      slope.x += detail * .0025 * weight;
      vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
      vec3 reflected = reflect(ray, normal);
      vec2 imageRay = reflected.xy / reflected.z;
      vec2 sampleAt = vec2(.5 + imageRay.x * focal / uAspect, uHorizon + imageRay.y * focal);
      vec2 offset = clamp(sampleAt - uv, vec2(-.008, -.010), vec2(.008, .010));
      color = photograph(uv + offset);
      float flatAngle = max(.0, -normalize(ray).y);
      float surfaceAngle = max(.0, dot(-normalize(ray), normal));
      float fresnel = pow(1.0 - surfaceAngle, 5.0) - pow(1.0 - flatAngle, 5.0);
      color += vec3(.47, .43, .37) * fresnel + weight * wave * vec3(.028, .023, .018);
      opacity = smoothstep(.001, .145, weight);
    }
  }

  if (uFog.y > .001) {
    float approach = uFog.x;
    vec2 streams = fogVolume(ray, approach, uFog.z, uFog.y);
    streams *= smoothstep(0.0, .14, canvas.y) * smoothstep(.0, .11, 1.0 - canvas.y);
    float opening = smoothstep(.29 - approach * .14, .64 - approach * .18, uv.x);
    float aboveShore = 1.0 - smoothstep(-.014, .103, uv.y - uHorizon);
    streams.x *= mix(1.0, opening, aboveShore * .95);
    streams.y *= smoothstep(.003, .039, uv.y - uHorizon);
    float fog = streams.x + streams.y * (1.0 - streams.x);
    // Match the sky's cool fill and warm opening in the photograph. The
    // reflected mist gathers colour from the water and is softer and darker.
    vec3 warm = mix(photograph(vec2(.74, uHorizon - .148)), vec3(.98, .90, .81), .51);
    vec3 cool = mix(photograph(vec2(.82, uHorizon - .288)), vec3(.78, .81, .82), .71);
    float sunlight = smoothstep(.26, .84, uv.x) * (1.0 - approach * .26);
    vec3 local = photograph(uv);
    vec3 direct = mix(mix(cool, warm, sunlight), local, .08);
    vec3 reflected = mix(direct * .87, local, .46);
    vec3 light = (direct * streams.x + reflected * streams.y * (1.0 - streams.x)) / max(.00001, fog);
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
  const fog = gl.getUniformLocation(program, 'uFog')
  const waveTime = gl.getUniformLocation(program, 'uWaveTime')
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
    draw(motion: LakeMotion | null, fraction = 0, elapsedWave = -1, entry = 1) {
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
      const mist = lakeFog(motion, fraction, entry)
      gl.uniform3f(fog, mist.distance, mist.amount, mist.height)
      gl.uniform1f(waveTime, elapsedWave)
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
