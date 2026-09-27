# Reset water

The water asset is a 1080 × 1920, 30 fps, ten-second H.264 render of one
initial disturbance. The lake photograph is the reflection source.

## Reproduce the asset

Install Python with NumPy, SciPy, Pillow, and FFmpeg, then run:

```sh
OPENBLAS_NUM_THREADS=1 python scripts/render-reset-water.py
```

The output is `public/findtrail-water-impact.mp4`. This rendering tool is not
part of the application build and its Python dependencies do not ship to users.

## Motion and optics

- One Gaussian surface dimple: 26 mm width, 10 mm initial displacement.
- Radial Fourier-Bessel solution of the capillary-gravity dispersion relation:
  `omega² = 9.81 k + (0.0728 / 998) k³`.
- The surface slopes change the normal used to reflect each camera ray.
- The reflected direction samples the lake image, with Fresnel attenuation.
- Perspective projection expands the near side faster than the far side.
- Subpixel surface texture is filtered near the distant water; the actual
  shoreline and sky are fixed.
- The wave settles into the still photograph over its last 2.6 seconds.

References: [MIT, The Physics of Waves, chapter 11](https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/ef731c1b91d77a6db003f6c27e300d25_MIT8_03SCF16_Textbook.pdf)
and [NVIDIA, Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models).

## Screen alignment and playback

The impact is at `(50%, 64%)` of the uncropped video. A ResizeObserver maps
that point through the same cover crop as the poster and video. The feather's
visible tip is at `(54.3%, 93.4%)` of its transparent image; all its transforms
pivot around that point. The three 12-second breaths use 4 seconds in, 2 seconds
holding gently, and 6 seconds out. The feather reaches the water at 11.2, 23.2,
and 35.2 seconds, leaving only 0.8 seconds at the bottom of each breath.
Each landing plays this same single-impact clip once.

Begin establishes the shared clock. Water waits for the first landing. Media
playback catches up after loading or a hidden tab; it ends after the final
wave settles. Reduced motion retains the still lake. The service worker
precaches the asset and responds to media byte ranges for offline playback.
