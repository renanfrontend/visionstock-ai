"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

const SCALE = 4; // supersampling for crisp text

function drawLabel(text: string): { texture: CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font = `600 ${13 * SCALE}px "Manrope Variable", ui-sans-serif, system-ui`;
  if (!context) return { texture: new CanvasTexture(canvas), aspect: 1 };
  context.font = font;
  const width = Math.ceil(context.measureText(text).width) + 18 * SCALE;
  const height = 24 * SCALE;
  canvas.width = width;
  canvas.height = height;

  context.font = font;
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#c2d0e4";
  context.lineWidth = 2 * SCALE;
  context.beginPath();
  context.roundRect(SCALE, SCALE, width - 2 * SCALE, height - 2 * SCALE, 6 * SCALE);
  context.fill();
  context.stroke();
  context.fillStyle = "#354766";
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillText(text, width / 2, height / 2 + SCALE);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  return { texture, aspect: width / height };
}

/** Text label as a camera-facing sprite: no DOM overlay, scales and sorts with the scene. */
export function LabelSprite({ text, position, height = 0.36 }: { text: string; position: [number, number, number]; height?: number }) {
  const { texture, aspect } = useMemo(() => drawLabel(text), [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={2}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
