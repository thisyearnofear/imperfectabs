import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface ExerciseState {
  counter: number;
  status: 'up' | 'down';
  angle: number;
  formAccuracy: number;
}

export class AbsExerciseDetector {
  private pose: Pose;
  private camera: Camera | null = null;
  private onResults: ((results: Results) => void) | null = null;

  constructor() {
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  public async initialize(videoElement: HTMLVideoElement, onResultsCallback: (results: Results) => void): Promise<void> {
    this.onResults = onResultsCallback;
    this.pose.onResults(this.onResults);

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.pose.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    await this.camera.start();
  }

  public stop(): void {
    if (this.camera) {
      this.camera.stop();
    }
  }

  // Calculate angle between three points
  private calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
      angle = 360 - angle;
    }

    return angle;
  }

  // Get body part coordinates from landmarks
  private getBodyPart(landmarks: PoseLandmark[], partIndex: number): PoseLandmark {
    return landmarks[partIndex];
  }

  // Calculate abs exercise angle (sit-up/crunch)
  public calculateAbsAngle(landmarks: PoseLandmark[]): number {
    // Get shoulder, hip, and knee landmarks
    const leftShoulder = this.getBodyPart(landmarks, 11); // LEFT_SHOULDER
    const rightShoulder = this.getBodyPart(landmarks, 12); // RIGHT_SHOULDER
    const leftHip = this.getBodyPart(landmarks, 23); // LEFT_HIP
    const rightHip = this.getBodyPart(landmarks, 24); // RIGHT_HIP
    const leftKnee = this.getBodyPart(landmarks, 25); // LEFT_KNEE
    const rightKnee = this.getBodyPart(landmarks, 26); // RIGHT_KNEE

    // Calculate average points
    const shoulderAvg = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
      visibility: (leftShoulder.visibility + rightShoulder.visibility) / 2
    };

    const hipAvg = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
      visibility: (leftHip.visibility + rightHip.visibility) / 2
    };

    const kneeAvg = {
      x: (leftKnee.x + rightKnee.x) / 2,
      y: (leftKnee.y + rightKnee.y) / 2,
      z: (leftKnee.z + rightKnee.z) / 2,
      visibility: (leftKnee.visibility + rightKnee.visibility) / 2
    };

    return this.calculateAngle(shoulderAvg, hipAvg, kneeAvg);
  }

  // Process abs exercise (sit-up/crunch)
  public processAbsExercise(landmarks: PoseLandmark[], currentState: ExerciseState): ExerciseState {
    const angle = this.calculateAbsAngle(landmarks);
    let { counter, status } = currentState;

    // Sit-up logic based on angle thresholds
    if (status === 'down') {
      if (angle < 55) { // Person is in up position
        counter += 1;
        status = 'up';
      }
    } else {
      if (angle > 105) { // Person is in down position
        status = 'down';
      }
    }

    // Calculate form accuracy based on angle range
    let formAccuracy = 100;
    if (status === 'up' && (angle < 45 || angle > 65)) {
      formAccuracy = Math.max(0, 100 - Math.abs(angle - 55) * 2);
    } else if (status === 'down' && (angle < 95 || angle > 115)) {
      formAccuracy = Math.max(0, 100 - Math.abs(angle - 105) * 2);
    }

    return {
      counter,
      status,
      angle,
      formAccuracy: Math.round(formAccuracy)
    };
  }

  // Check if pose landmarks are valid
  public isValidPose(landmarks: PoseLandmark[]): boolean {
    const requiredLandmarks = [11, 12, 23, 24, 25, 26]; // Shoulders, hips, knees
    return requiredLandmarks.every(index =>
      landmarks[index] && landmarks[index].visibility > 0.5
    );
  }
}

// MediaPipe pose landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};
