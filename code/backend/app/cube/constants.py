"""
Canonical cube representation.

facelets = 54-character string, 6 blocks of 9, in URFDLB face order.
Each character is a COLOUR letter (w y r o g b) — NOT a face letter.
Index of a sticker = face*9 + row*3 + col (row top->bottom, col left->right,
looking at that face from outside).

This is the single source of truth the whole backend agrees on. The frontend
(cube/facelets.js) must use the exact same convention.
"""

FACE_ORDER = "URFDLB"          # U R F D L B
COLOURS = "wroygb"              # white red orange yellow green blue

# Centres fixed as: U=w R=r F=g D=y L=o B=b (standard western colour scheme)
SOLVED = (
    "w" * 9 +  # U
    "r" * 9 +  # R
    "g" * 9 +  # F
    "y" * 9 +  # D
    "o" * 9 +  # L
    "b" * 9    # B
)
