# utils/cube_vision.py
import cv2
import numpy as np

# HSV color ranges for each cube face
# The cube face letter tells you what color the face's CENTER is:
# U=white, R=red, F=green, D=yellow, L=orange, B=blue
COLOR_RANGES = {
    'U': ([0,   0,   168], [180, 40,  255]),  # white
    'R': ([0,   120, 70],  [10,  255, 255]),  # red (low hue range)
    'F': ([36,  100, 100], [86,  255, 255]),  # green
    'D': ([20,  100, 100], [35,  255, 255]),  # yellow
    'L': ([10,  100, 100], [20,  255, 255]),  # orange
    'B': ([94,  80,  2],   [126, 255, 255]),  # blue
}

# Also check for red at high hue (red wraps around in HSV)
RED_HIGH_RANGE = ([170, 120, 70], [180, 255, 255])


def detect_colors_from_image(image_bytes: bytes) -> list:
    """
    Takes raw image bytes of one cube face.
    Returns a list of 9 color labels like ['U', 'R', 'U', 'F', 'U', 'B', 'D', 'U', 'L']
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image — make sure it's a valid JPEG or PNG")

    h, w = img.shape[:2]
    cell_h = h // 3
    cell_w = w // 3

    detected = []
    for row in range(3):
        for col in range(3):
            # Center of each cell in the 3x3 grid
            cy = row * cell_h + cell_h // 2
            cx = col * cell_w + cell_w // 2

            # Sample a 5x5 region for stability (avoids single-pixel noise)
            region = img[max(0, cy-2):cy+3, max(0, cx-2):cx+3]
            avg_bgr = region.mean(axis=(0, 1))

            # Convert to HSV for better color classification
            pixel = np.uint8([[avg_bgr]])
            hsv = cv2.cvtColor(pixel, cv2.COLOR_BGR2HSV)[0][0]

            color_label = classify_color(hsv)
            detected.append(color_label)

    return detected  # 9 labels for this face


def classify_color(hsv_pixel) -> str:
    """Match an HSV pixel to the nearest cube color"""
    h, s, v = int(hsv_pixel[0]), int(hsv_pixel[1]), int(hsv_pixel[2])

    # Check red at high hue range first (special case — red wraps in HSV)
    rh = RED_HIGH_RANGE
    if rh[0][0] <= h <= rh[1][0] and rh[0][1] <= s <= rh[1][1] and rh[0][2] <= v <= rh[1][2]:
        return 'R'

    for label, (lower, upper) in COLOR_RANGES.items():
        if lower[0] <= h <= upper[0] and lower[1] <= s <= upper[1] and lower[2] <= v <= upper[2]:
            return label

    return 'U'  # fallback to white if nothing matches