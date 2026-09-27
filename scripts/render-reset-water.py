"""Render one capillary-gravity impulse into the existing lake photograph.

Developer asset tool: Python 3, numpy, scipy, Pillow, and ffmpeg.
The app plays the resulting video; no fluid simulation runs on the phone.

The dispersion relation is omega² = g*k + tension/density*k³.
Surface slopes reflect camera rays into the lake image. No ring is drawn and
no light-colored ellipse is composited over the photograph.
"""

import argparse
import os
from pathlib import Path
import subprocess

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
import numpy as np
from PIL import Image, ImageDraw
from scipy.special import j1
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]


class Lake:
    def __init__(self, width=540, height=960, amplitude=.010):
        self.width, self.height = width, height
        self.image = np.asarray(Image.open(ROOT / 'public/findtrail-reset-lake.webp').convert('RGB').resize((width, height), Image.Resampling.LANCZOS), dtype=np.float32)
        self.horizon = height * .486
        self.start = int(self.horizon) + 1
        self.contact = .64
        self.focal = height * .9
        camera_height = .4
        y, x = np.mgrid[self.start:height, :width].astype(np.float32)
        self.x, self.y = x, y
        vx = (x - width * .5) / self.focal
        vy = -(y - self.horizon) / self.focal
        vz = np.ones_like(vx)
        length = np.sqrt(vx * vx + vy * vy + 1)
        self.vx, self.vy, self.vz = vx / length, vy / length, vz / length
        self.flat_fresnel = .0204 + .9796 * (1 + self.vy) ** 5
        self.z = camera_height / -vy
        self.world_x = self.z * vx
        impact_z = camera_height * self.focal / (height * self.contact - self.horizon)
        self.dx = self.world_x
        self.dz = self.z - impact_z
        self.radius = np.hypot(self.dx, self.dz)
        self.ux = self.dx / np.maximum(self.radius, .0001)
        self.uz = self.dz / np.maximum(self.radius, .0001)
        self.guard = np.clip((y / height - .495) / .04, 0, 1)
        self.guard = self.guard ** 2 * (3 - 2 * self.guard)
        # Distant waves smaller than one pixel must fade, not alias or shimmer.
        footprint = camera_height * self.focal / np.maximum(1, (y - self.horizon) ** 2)
        self.texture_filter = np.exp(-(footprint * 65) ** 2)

        # Fourier-Bessel solution for a small Gaussian dimple released once.
        self.radii = np.linspace(0, 5, 6000, dtype=np.float32)
        k = np.arange(.25, 600, .5, dtype=np.float32)
        sigma = .026
        self.omega = np.sqrt(9.81 * k + .0728 / 998 * k ** 3)
        self.damping = 2 * 1.0e-6 * k * k + .04
        spectrum = amplitude * sigma ** 2 * k ** 2 * np.exp(-.5 * (k * sigma) ** 2) * .5
        self.slope_kernel = j1(np.outer(self.radii, k)).astype(np.float32) * spectrum

    def frame(self, t):
        # The disturbed surface disperses naturally from the one initial dimple.
        profile = self.slope_kernel @ (np.cos(self.omega * t) * np.exp(-self.damping * t))
        slope = np.interp(self.radius, self.radii, profile, right=0).astype(np.float32)
        tail = 1 - np.clip((t - 7.4) / 2.6, 0, 1)
        tail = tail * tail * (3 - 2 * tail)
        slope *= self.guard * tail
        nx = -slope * self.ux
        nz = -slope * self.uz
        # Very small surrounding surface texture breaks up mirror-perfect bands.
        breeze = .0015 * self.guard * self.texture_filter * np.sin(np.pi * min(1, t / 10)) ** 2
        nx += breeze * (np.sin(self.world_x * 73 + self.z * 21 - t * 2.3) + .45 * np.sin(self.world_x * 129 - self.z * 41 + t * 3.2))
        nz += breeze * (np.cos(self.world_x * 51 - self.z * 83 + t * 1.9) + .4 * np.sin(self.world_x * 27 + self.z * 133 - t * 3.6))
        length = np.sqrt(nx * nx + nz * nz + 1)
        nx, ny, nz = nx / length, 1 / length, nz / length
        dot = self.vx * nx + self.vy * ny + self.vz * nz
        rx = self.vx - 2 * dot * nx
        ry = self.vy - 2 * dot * ny
        rz = self.vz - 2 * dot * nz
        sx = self.width * .5 + self.focal * rx / np.maximum(.05, rz)
        sy = self.horizon + self.focal * ry / np.maximum(.05, rz)
        sy = np.clip(sy, self.horizon + 1, self.height - 1)
        # Mirror the texture at the sides instead of stretching edge pixels.
        sx = np.abs((sx + self.width) % (self.width * 2) - self.width)
        sx = np.clip(sx, 0, self.width - 1)
        fresnel = .0204 + .9796 * (1 - np.clip(-dot, 0, 1)) ** 5
        reflectance = np.clip(.35 + .65 * fresnel / self.flat_fresnel, .5, 1.6)
        result = self.image.copy()
        for channel in range(3):
            sampled = map_coordinates(self.image[:, :, channel], [sy, sx], order=1, mode='nearest')
            result[self.start:, :, channel] = sampled * reflectance
        return np.clip(result, 0, 255).astype(np.uint8)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--preview', action='store_true')
    p.add_argument('--amplitude', type=float, default=.010)
    p.add_argument('--output', type=Path, default=ROOT / 'public/findtrail-water-impact.mp4')
    p.add_argument('--width', type=int, default=540)
    p.add_argument('--height', type=int, default=960)
    args = p.parse_args()
    lake = Lake(args.width, args.height, args.amplitude)
    if args.preview:
        times = [0, .5, 1, 2, 3.5, 5.5]
        sheet = Image.new('RGB', (270 * 3, 480 * 2))
        for i, t in enumerate(times):
            im = Image.fromarray(lake.frame(t))
            im.save(args.output.with_name(f'water-{t:g}.png'))
            im = im.resize((270, 480), Image.Resampling.LANCZOS)
            ImageDraw.Draw(im).text((12, 12), f'{t:g} seconds', fill='white')
            sheet.paste(im, ((i % 3) * 270, (i // 3) * 480))
        sheet.save(args.output.with_suffix('.jpg'))
        print(args.output.with_suffix('.jpg'))
        return
    command = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{args.width}x{args.height}', '-r', '30', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(args.output)]
    with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
        for i in range(300):
            encoder.stdin.write(lake.frame(i / 30).tobytes())
            if i % 30 == 0:
                print(f'rendered {i}/300 frames', flush=True)
        encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError('Video encoding failed')
    print(args.output)


if __name__ == '__main__':
    main()
