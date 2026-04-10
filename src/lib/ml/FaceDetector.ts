import { Detection, FaceDetector as MPFaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceDetector {
  private detector: MPFaceDetector | null = null;
  private isInitializing = false;
  private hasWarnedInfo = false;

  async init() {
    if (this.detector || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.detector = await MPFaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "CPU",
        },
        minDetectionConfidence: 0.3,
        runningMode: "VIDEO",
      });
    } catch (error) {
      console.warn("Face Detector Init Failed:", error);
    } finally {
      this.isInitializing = false;
    }
  }

  detect(video: HTMLVideoElement): Detection[] {
    if (!this.detector || video.readyState < 3 || video.videoWidth === 0) {
      return [];
    }

    // MediaPipe/TFLite sometimes logs non-error initialization info to console.error
    // which triggers the Next.js Error Overlay. We temporarily silence console.error 
    // during the detection call to prevent this overlay if it's just an info message.
    const originalError = console.error;
    if (!this.hasWarnedInfo) {
        console.error = (...args: any[]) => {
            if (args[0]?.toString().includes("XNNPACK")) {
                this.hasWarnedInfo = true;
                return; 
            }
            originalError.apply(console, args);
        };
    }

    try {
      const timestamp = performance.now();
      const result = this.detector.detectForVideo(video, timestamp);
      return result.detections || [];
    } catch (e) {
      return [];
    } finally {
      console.error = originalError;
    }
  }
}

export const faceDetector = new FaceDetector();
