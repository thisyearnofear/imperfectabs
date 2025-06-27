declare module "@mediapipe/pose" {
  export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility: number;
  }

  export interface Results {
    poseLandmarks?: PoseLandmark[];
    poseWorldLandmarks?: PoseLandmark[];
    segmentationMask?: ImageData;
  }

  export interface PoseConfig {
    locateFile?: (file: string) => string;
  }

  export interface PoseOptions {
    modelComplexity?: number;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    smoothSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class Pose {
    constructor(config: PoseConfig);
    setOptions(options: PoseOptions): void;
    onResults(callback: (results: Results) => void): void;
    send(inputs: {
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    }): Promise<void>;
    close(): void;
  }

  export const POSE_CONNECTIONS: Array<[number, number]>;
  export const POSE_LANDMARKS: { [key: string]: number };
}

declare module "@mediapipe/camera_utils" {
  export interface CameraConfig {
    onFrame?: () => Promise<void>;
    width?: number;
    height?: number;
  }

  export class Camera {
    constructor(videoElement: HTMLVideoElement, config: CameraConfig);
    start(): Promise<void>;
    stop(): void;
  }
}

declare module "@mediapipe/drawing_utils" {
  export interface DrawingSpec {
    color?: string;
    lineWidth?: number;
    radius?: number;
  }

  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmark[],
    connections: Array<[number, number]>,
    style?: DrawingSpec,
  ): void;

  export function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmark[],
    style?: DrawingSpec,
  ): void;
}
