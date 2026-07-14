import cv2
import numpy as np

# HSV color ranges for each cube face
COLOR_RANGES = {
    'U': ([0,   0,   168], [180, 40,  255]),  # white
    'R': ([0,   120, 70],  [10,  255, 255]),  # red (low)
    'F': ([36,  100, 100], [86,  255, 255]),  # green
    'D': ([20,  100, 100], [35,  255, 255]),  # yellow
    'L': ([10,  100, 100], [20,  255, 255]),  # orange
    'B': ([94,  80,  2],   [126, 255, 255]),  # blue
}

RED_HIGH_RANGE = ([170, 120, 70], [180, 255, 255])

def classify_color(hsv_pixel) -> str:
    h, s, v = int(hsv_pixel[0]), int(hsv_pixel[1]), int(hsv_pixel[2])
    
    # Check red high range
    rh = RED_HIGH_RANGE
    if rh[0][0] <= h <= rh[1][0] and rh[0][1] <= s <= rh[1][1] and rh[0][2] <= v <= rh[1][2]:
        return 'R'
        
    for label, (lower, upper) in COLOR_RANGES.items():
        if lower[0] <= h <= upper[0] and lower[1] <= s <= upper[1] and lower[2] <= v <= upper[2]:
            return label
    return 'U'

def detect_colors_from_image(image_bytes: bytes) -> list:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: return ['U'] * 9

    h, w = img.shape[:2]
    cell_h, cell_w = h // 3, w // 3
    detected = []
    
    for row in range(3):
        for col in range(3):
            cy, cx = row * cell_h + cell_h // 2, col * cell_w + cell_w // 2
            region = img[max(0, cy-2):cy+3, max(0, cx-2):cx+3]
            avg_bgr = region.mean(axis=(0, 1))
            pixel = np.uint8([[avg_bgr]])
            hsv = cv2.cvtColor(pixel, cv2.COLOR_BGR2HSV)[0][0]
            detected.append(classify_color(hsv))
    return detected

if __name__ == "__main__":
    cap = cv2.VideoCapture(0)
    print("Camera active. Press 'q' to exit.")

    while True:
        ret, frame = cap.read()
        if not ret: break

        # Encode for processing
        _, img_encoded = cv2.imencode('.jpg', frame)
        frame_bytes = img_encoded.tobytes()
        detected = detect_colors_from_image(frame_bytes)
        
        # Display feedback on frame
        for i, label in enumerate(detected):
            r, c = divmod(i, 3)
            x, y = c * (frame.shape[1] // 3) + 40, r * (frame.shape[0] // 3) + 80
            cv2.putText(frame, label, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)

        cv2.imshow('Rubik Cube Vision', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
