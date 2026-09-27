import { useEffect, useRef } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  startedAt: number | null
}

const WATER_IMAGE = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`
const RESET_SECONDS = 30
const CYCLE_SECONDS = 10
const CONTACT_SECONDS = 7.2
const RIPPLE_SECONDS = 8.4

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_image;
  uniform vec2 u_size;
  uniform vec2 u_crop;
  uniform float u_time;
  uniform float u_impact_age;

  void main() {
    vec2 point = vec2(v_uv.x, 1.0 - v_uv.y) * u_size;
    float horizon = u_size.y * 0.486;
    float contact = u_size.y * 0.625;
    float water = smoothstep(horizon + 1.0, horizon + 22.0, point.y);
    float guard = smoothstep(horizon + 30.0, horizon + 76.0, point.y);
    float depth = clamp((point.y - horizon) / (u_size.y - horizon), 0.0, 1.0);

    // A few pixels of continuous movement in the reflection. The skyline stays still.
    vec2 offset = water * depth * vec2(
      sin(point.y * 0.071 + u_time * 1.05) * 1.6
        + sin(point.x * 0.031 - point.y * 0.018 - u_time * 0.72) * 1.0,
      sin(point.x * 0.047 + point.y * 0.014 + u_time * 0.66) * 1.1
        + sin(point.y * 0.113 - u_time * 0.48) * 0.6
    );

    float light = 0.0;
    float shade = 0.0;
    if (u_impact_age >= 0.0 && u_impact_age <= 8.4) {
      vec2 fromContact = point - vec2(u_size.x * 0.5, contact);
      vec2 perspective = vec2(fromContact.x, fromContact.y / 0.25);
      float distance = length(perspective);
      float angle = atan(perspective.y, perspective.x);
      float warpedDistance = distance
        + sin(angle * 3.2 + u_time * 0.12) * 4.0
        + sin(angle * 7.1 - u_time * 0.08) * 1.7;
      float progress = clamp(u_impact_age / 8.4, 0.0, 1.0);
      float radius = (1.0 - pow(1.0 - progress, 1.36)) * u_size.x * 0.72;
      float fromFront = warpedDistance - radius;
      float packet = exp(-0.5 * pow(fromFront / 30.0, 2.0));
      float fleck = 0.78 + 0.15 * sin(point.x * 0.026 + point.y * 0.008 + u_time * 0.26);
      float refraction = sin(fromFront * 0.17) * packet;

      float fade = smoothstep(0.0, 0.16, u_impact_age)
        * (1.0 - smoothstep(5.8, 8.4, u_impact_age)) * guard;
      vec2 radial = perspective / max(distance, 1.0);
      offset += radial * vec2(20.0, 5.0) * refraction * fade;
      light = exp(-0.5 * pow((fromFront - 9.0) / 21.0, 2.0)) * fade * fleck;
      shade = exp(-0.5 * pow((fromFront + 17.0) / 23.0, 2.0)) * fade;
    }

    float sampleY = point.y < horizon ? point.y : max(horizon, point.y + offset.y);
    vec2 sampleUv = vec2(point.x + offset.x, sampleY) / u_size;
    sampleUv.y = 1.0 - sampleUv.y;
    sampleUv = (sampleUv - 0.5) * u_crop + 0.5;
    vec3 color = texture2D(u_image, clamp(sampleUv, vec2(0.0), vec2(1.0))).rgb;
    color = mix(color, vec3(0.76, 0.73, 0.62), clamp(light * 0.18, 0.0, 0.18));
    color *= 1.0 - clamp(shade * 0.06, 0.0, 0.06);
    gl_FragColor = vec4(color, 1.0);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

export function HorizonRipples({ reducedMotion, startedAt }: HorizonRipplesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test' || reducedMotion) return
    const element = canvasRef.current
    if (!element) return
    const gl = element.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' })
    if (!gl) return

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      return
    }

    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    const texture = gl.createTexture()
    if (!program || !buffer || !texture) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0)
    const sizeUniform = gl.getUniformLocation(program, 'u_size')
    const cropUniform = gl.getUniformLocation(program, 'u_crop')
    const timeUniform = gl.getUniformLocation(program, 'u_time')
    const impactUniform = gl.getUniformLocation(program, 'u_impact_age')

    const source = new Image()
    let animationFrame = 0
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false
    let ready = false
    let lastFrame = Number.NEGATIVE_INFINITY
    let lastImpactCycle = -1
    let impactAt = Number.NEGATIVE_INFINITY
    const sceneStartedAt = performance.now()

    function draw(now: number) {
      if (!ready || now - lastFrame < (startedAt === null ? 64 : 32)) return
      lastFrame = now
      const rect = element!.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const pixelWidth = Math.round(width * ratio)
      const pixelHeight = Math.round(height * ratio)
      if (element!.width !== pixelWidth || element!.height !== pixelHeight) {
        element!.width = pixelWidth
        element!.height = pixelHeight
        gl!.viewport(0, 0, pixelWidth, pixelHeight)
      }
      const imageRatio = source.naturalWidth / source.naturalHeight
      const canvasRatio = width / height
      const cropX = imageRatio > canvasRatio ? canvasRatio / imageRatio : 1
      const cropY = imageRatio > canvasRatio ? 1 : imageRatio / canvasRatio
      gl!.uniform2f(sizeUniform, width, height)
      gl!.uniform2f(cropUniform, cropX, cropY)
      gl!.uniform1f(timeUniform, (now - sceneStartedAt) / 1000)
      gl!.uniform1f(impactUniform, impactAt === Number.NEGATIVE_INFINITY ? -1 : (now - impactAt) / 1000)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }

    function tick(now: number) {
      if (cancelled) return
      const elapsed = startedAt === null ? -1 : (now - startedAt) / 1000
      const cycleIndex = Math.floor(elapsed / CYCLE_SECONDS)
      if (elapsed >= 0 && elapsed < RESET_SECONDS && elapsed % CYCLE_SECONDS >= CONTACT_SECONDS && lastImpactCycle !== cycleIndex) {
        lastImpactCycle = cycleIndex
        impactAt = startedAt! + (cycleIndex * CYCLE_SECONDS + CONTACT_SECONDS) * 1000
      }
      draw(now)
      if (startedAt === null || elapsed < RESET_SECONDS + RIPPLE_SECONDS) animationFrame = window.requestAnimationFrame(tick)
    }

    function begin() {
      if (cancelled) return
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source)
      ready = true
      resizeObserver = new ResizeObserver(() => draw(performance.now()))
      resizeObserver.observe(element!)
      draw(performance.now())
      animationFrame = window.requestAnimationFrame(tick)
    }

    source.decoding = 'async'
    source.src = WATER_IMAGE
    if (source.complete && source.naturalWidth) begin()
    else source.addEventListener('load', begin, { once: true })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      source.removeEventListener('load', begin)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [reducedMotion, startedAt])

  return <canvas ref={canvasRef} className="horizon-ripples" style={{ backgroundImage: `url(${WATER_IMAGE})`, backgroundPosition: 'center', backgroundSize: 'cover' }} aria-hidden="true" />
}
