import { COVE_SHORELINE, lakeFog, type LakeMotion } from './breathingLake'
import { GUIDED_EXHALE_SECONDS, RIPPLE_DRAG, RIPPLE_DRAG_FALLOFF, RIPPLE_RATE, RIPPLE_SPEED, RIPPLE_TAIL_SECONDS } from './resetTiming'

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
uniform vec4 uFog;
uniform float uFogLift;
uniform float uFogTime;
uniform float uWaveTime;

const float focal = .78;
const float cameraHeight = 1.23;

vec3 photograph(vec2 uv) {
  return texture2D(uPhoto, clamp(uv * uCrop.xy + uCrop.zw, .001, .999)).rgb;
}

float shoreAt(float x) {
  float photoX = x * uCrop.x + uCrop.z;
  float nearBank = ${COVE_SHORELINE.left} - ${COVE_SHORELINE.leftSlope} * smoothstep(.10, .53, photoX);
  float bank = mix(nearBank, ${COVE_SHORELINE.distant}, smoothstep(${COVE_SHORELINE.leftStart}, ${COVE_SHORELINE.leftEnd}, photoX));
  return (bank - uCrop.w) / uCrop.y;
}

// Sample the same air on both sides of the water plane. Samples below it
// are seen in reflection, with a weaker contribution than the air itself.
vec2 fogVolume(vec3 ray, float progress, float height, float amount, float sway) {
  float drift = smoothstep(0.0, 1.0, progress);
  float outlet = (${COVE_SHORELINE.outlet} - uCrop.z) / uCrop.x;
  float channel = (outlet - .5) * uAspect / focal;
  vec2 lowFlow = vec2(-.004, .0025) * uFogTime;
  vec2 highFlow = vec2(.003, -.005) * uFogTime;
  vec2 extinction = vec2(0.0);
  for (int i = 0; i < 24; i++) {
    // Near pockets disperse in place while a low bank lingers farther back.
    bool farBank = i >= 12;
    float offset = (mod(float(i), 12.0) + .5) / 12.0 * 2.0 - 1.0;
    float center = farBank ? 28.0 : mix(10.2, 5.0, drift);
    float span = farBank ? 13.2 : mix(6.6, 4.4, drift);
    float ceiling = farBank ? 2.75 : height * 4.0;
    float lift = farBank ? .09 : uFogLift;
    float z = center + offset * span;
    vec3 p = vec3(0.0, cameraHeight, 0.0) + ray * (z / ray.z);
    float altitude = abs(p.y);
    if (altitude < ceiling + lift) {
      float crosswind = farBank ? 0.0 : sway * (.24 + .24 * sin(2.1 * offset - .85 * altitude));
      float plumeX = p.x - channel * z - crosswind;
      vec2 flow = vec2(plumeX * .041 + altitude * .027, z * .032 + altitude * .068);
      float bank = texture2D(uNoise, flow + vec2(.62, .26) + lowFlow).r;
      float curl = texture2D(uNoise, flow * vec2(1.35, 1.72) + vec2(.19, .78) + highFlow).r;
      vec2 eddy = vec2(curl - .5, bank - .5);
      float roll = plumeX * .55 - z * .68 + altitude * 1.24 + uFogTime * .42;
      vec2 orbit = vec2(sin(roll), cos(roll)) * mix(.021, .074, bank);
      float threads = texture2D(uNoise, flow * vec2(2.4, 2.0) + orbit + eddy * .12 + vec2(altitude * .057, .33)).r;
      float roof = ceiling * mix(.24, 1.0, .62 * bank + .38 * curl);
      float lifted = altitude - lift * mix(.55, 1.16, bank) + .39 * eddy.x;
      float core = smoothstep(-.39, .13, lifted) * (1.0 - smoothstep(roof * .12, roof * .65, lifted));
      float rising = smoothstep(roof * .22, roof * .49, lifted) * (1.0 - smoothstep(roof * .62, roof, lifted));
      float floorMist = .28 * (1.0 - smoothstep(.035, max(.16, roof * .38), altitude));
      float density = (.74 * core + floorMist) * smoothstep(.33, .76, .70 * bank + .30 * threads);
      density += rising * 1.08 * smoothstep(.36, .79, .54 * curl + .46 * threads);
      float gathering = farBank ? (1.0 - drift * .56) : smoothstep(.04, .91, drift + eddy.y * .45);
      density *= gathering * mix(.48, 1.28, smoothstep(.27, .69, .69 * curl + .31 * bank));
      float across = 1.0 - smoothstep(1.0, farBank ? 7.0 : 4.25, abs(plumeX + 1.1 * eddy.x));
      float depth = offset + eddy.x * .54;
      float lengthwise = smoothstep(-1.0, -.38, depth) * (1.0 - smoothstep(.24, 1.0, depth));
      lengthwise *= 1.0 - smoothstep(.76, 1.0, abs(offset));
      float reflection = 1.0 - smoothstep(-.033, .033, p.y);
      extinction += vec2(1.0 - reflection, reflection) * density * across * lengthwise * (farBank ? .23 : .40);
    }
  }
  return 1.0 - exp(-extinction * vec2(1.0, .12) * amount);
}

void main() {
  vec2 canvas = gl_FragCoord.xy / uBuffer;
  vec2 uv = vec2(canvas.x, uBand.x + (1.0 - canvas.y) * uBand.y);
  vec3 ray = vec3((uv.x - .5) * uAspect, uHorizon - uv.y, focal);
  vec3 color = vec3(0.0);
  float opacity = 0.0;
  float shoreline = shoreAt(uv.x);

  if (uWaveTime >= 0.0 && uv.y > shoreline) {
    // The photographed shore is a finite distance from the lens. An optical
    // vanishing line above the banks keeps the last crests on that water.
    float vanishing = (${COVE_SHORELINE.vanishing} - uCrop.w) / uCrop.y;
    vec3 waterRay = vec3(ray.x, vanishing - uv.y, focal);
    vec2 world = waterRay.xz * (-cameraHeight / waterRay.y);
    vec2 radial = world - vec2(.06, 3.14);
    float curve = 1.18 + .22 * smoothstep(.04, 3.9, -radial.x);
    vec2 fan = vec2(radial.x * curve - radial.y * .09, radial.y);
    float distance = length(fan);
    // Evaluate when the crest at this point left the source. New crests form
    // there throughout the exhale while older ones continue outward.
    float travel = distance / ${RIPPLE_SPEED.toFixed(2)}
      + ${RIPPLE_DRAG} * distance * distance / (1.0 + ${RIPPLE_DRAG_FALLOFF} * distance);
    float emitted = uWaveTime - travel;
    float feed = smoothstep(0.0, .40, emitted) * (1.0 - smoothstep(${GUIDED_EXHALE_SECONDS.toFixed(1)}, ${(GUIDED_EXHALE_SECONDS + .18).toFixed(2)}, emitted));
    float settle = 1.0 - smoothstep(${GUIDED_EXHALE_SECONDS.toFixed(1)}, ${(GUIDED_EXHALE_SECONDS + RIPPLE_TAIL_SECONDS).toFixed(1)}, uWaveTime);
    float angle = fan.y / max(.001, distance);
    float spread = mix(.70, -.26, smoothstep(.2, 6.9, distance));
    float outward = smoothstep(spread, spread + .29, angle);
    float falloff = (1.0 - .77 * smoothstep(1.15, 25.0, distance)) * smoothstep(.025, .17, distance);
    float waterEdge = smoothstep(0.0, .004 / uCrop.y, uv.y - shoreline);
    float bandEdge = smoothstep(.01, .16, canvas.y);
    float weight = feed * settle * outward * falloff * waterEdge * bandEdge;
    if (weight > .002) {
      float shallows = mix(.27, 1.0, smoothstep(.0018, .057, (uv.y - shoreline) * uCrop.y));
      vec2 direction = normalize(vec2(fan.x * curve, fan.y - .09 * fan.x) + vec2(.001));
      float variance = texture2D(uNoise, clamp(world * .062, .015625, .984375)).r;
      float crest = emitted * ${RIPPLE_RATE.toFixed(1)} + variance * .78;
      float wave = sin(crest + world.x * .09);
      float detail = sin(crest * 1.82 - world.x * .39);
      vec2 slope = (wave * .00625 + detail * .00145) * direction * weight * shallows;
      slope.x += detail * .0025 * weight * shallows;
      vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
      vec3 reflected = reflect(waterRay, normal);
      vec2 imageRay = reflected.xy / reflected.z;
      vec2 sampleAt = vec2(.5 + imageRay.x * focal / uAspect, vanishing + imageRay.y * focal);
      vec2 offset = clamp(sampleAt - uv, vec2(-.008, -.010), vec2(.008, .010));
      vec2 disturbed = uv + offset;
      disturbed.y = max(disturbed.y, shoreAt(disturbed.x));
      color = photograph(disturbed);
      float flatAngle = max(.0, -normalize(waterRay).y);
      float surfaceAngle = max(.0, dot(-normalize(waterRay), normal));
      float fresnel = pow(1.0 - surfaceAngle, 5.0) - pow(1.0 - flatAngle, 5.0);
      color += vec3(.47, .43, .37) * fresnel + weight * shallows * wave * vec3(.028, .023, .018);
      opacity = smoothstep(.001, .145, weight);
    }
  }

  if (uFog.y > .001) {
    float approach = uFog.x;
    vec2 streams = fogVolume(ray, approach, uFog.z, uFog.y, uFog.w);
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.uniform1i(gl.getUniformLocation(program, 'uNoise'), 1)

  const crop = gl.getUniformLocation(program, 'uCrop')
  const buffer = gl.getUniformLocation(program, 'uBuffer')
  const band = gl.getUniformLocation(program, 'uBand')
  const horizon = gl.getUniformLocation(program, 'uHorizon')
  const aspect = gl.getUniformLocation(program, 'uAspect')
  const fog = gl.getUniformLocation(program, 'uFog')
  const fogLift = gl.getUniformLocation(program, 'uFogLift')
  const fogTime = gl.getUniformLocation(program, 'uFogTime')
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
    draw(motion: LakeMotion | null, fraction = 0, elapsedWave = -1, seconds = 0) {
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
      if (needsResize && !resize(gl)) return
      const mist = lakeFog(motion, fraction, seconds / 1.2)
      gl.uniform4f(fog, mist.distance, mist.amount, mist.height, mist.sway)
      gl.uniform1f(fogLift, mist.lift)
      gl.uniform1f(fogTime, seconds)
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
