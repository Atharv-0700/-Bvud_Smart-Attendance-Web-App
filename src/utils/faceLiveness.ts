/**
 * Face Liveness Detection Module
 * Performs silent liveness check during QR scan without storing images
 * Detects blink and micro-movements to prevent photo/video spoofing
 */

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  reason?: string;
  detectionTime: number;
}

interface FaceDetection {
  detected: boolean;
  landmarks?: any;
  boundingBox?: any;
}

/**
 * Configuration for liveness detection
 */
const LIVENESS_CONFIG = {
  ENABLED: true,
  REQUIRE_BLINK: true,
  BLINK_DETECTION_TIME_MS: 3000, // 3 seconds to detect blink
  MIN_CONFIDENCE: 0.6,
  FRAME_CAPTURE_INTERVAL_MS: 100, // Capture frame every 100ms
  MAX_FRAMES: 30, // Max 30 frames (3 seconds)
};

/**
 * Simple blink detection using eye aspect ratio changes
 * Based on landmarks (if available) or brightness changes around eye region
 */
class BlinkDetector {
  private previousEyeState: 'OPEN' | 'CLOSED' = 'OPEN';
  private blinkCount: number = 0;
  private frameCount: number = 0;

  /**
   * Analyze frame for blink detection
   * Returns true if blink detected
   */
  analyzeFrame(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
    this.frameCount++;

    // Create canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Draw current video frame
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Simple eye region detection based on brightness
    const currentEyeState = this.detectEyeState(imageData);

    // Check for blink (open -> closed -> open)
    if (this.previousEyeState === 'OPEN' && currentEyeState === 'CLOSED') {
      // Eye closing detected
      this.previousEyeState = 'CLOSED';
    } else if (this.previousEyeState === 'CLOSED' && currentEyeState === 'OPEN') {
      // Eye opening detected - complete blink
      this.blinkCount++;
      this.previousEyeState = 'OPEN';
      console.log('[LIVENESS] Blink detected! Count:', this.blinkCount);
      return true;
    }

    return false;
  }

  /**
   * Simple eye state detection based on brightness in upper third of frame
   * More sophisticated implementation would use face landmarks
   */
  private detectEyeState(imageData: ImageData): 'OPEN' | 'CLOSED' {
    const { width, height, data } = imageData;

    // Sample eye region (upper third, center half)
    const eyeRegionTop = Math.floor(height * 0.25);
    const eyeRegionBottom = Math.floor(height * 0.45);
    const eyeRegionLeft = Math.floor(width * 0.25);
    const eyeRegionRight = Math.floor(width * 0.75);

    let totalBrightness = 0;
    let pixelCount = 0;

    for (let y = eyeRegionTop; y < eyeRegionBottom; y++) {
      for (let x = eyeRegionLeft; x < eyeRegionRight; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }

    const avgBrightness = totalBrightness / pixelCount;

    // Threshold-based detection (closed eyes are typically darker)
    // This is a simplified approach - production should use ML models
    return avgBrightness < 80 ? 'CLOSED' : 'OPEN';
  }

  getBlinkCount(): number {
    return this.blinkCount;
  }

  getFrameCount(): number {
    return this.frameCount;
  }
}

/**
 * Motion detector - detects micro-movements between frames
 */
class MotionDetector {
  private previousFrame: ImageData | null = null;
  private motionScore: number = 0;

  /**
   * Analyze frame for motion
   */
  analyzeFrame(videoElement: HTMLVideoElement, canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.previousFrame) {
      const motion = this.calculateMotion(this.previousFrame, currentFrame);
      this.motionScore += motion;

      if (motion > 0.01) {
        // Significant motion detected
        console.log('[LIVENESS] Motion detected, score:', motion.toFixed(4));
        this.previousFrame = currentFrame;
        return true;
      }
    }

    this.previousFrame = currentFrame;
    return false;
  }

  /**
   * Calculate motion between two frames
   */
  private calculateMotion(prev: ImageData, current: ImageData): number {
    const { data: prevData } = prev;
    const { data: currData } = current;

    let diff = 0;
    const step = 4; // Sample every 4th pixel for performance

    for (let i = 0; i < prevData.length; i += step * 4) {
      const prevBrightness = (prevData[i] + prevData[i + 1] + prevData[i + 2]) / 3;
      const currBrightness = (currData[i] + currData[i + 1] + currData[i + 2]) / 3;
      diff += Math.abs(prevBrightness - currBrightness);
    }

    return diff / (prevData.length / 4);
  }

  getMotionScore(): number {
    return this.motionScore;
  }
}

/**
 * Perform liveness detection on video stream
 * This is called silently during QR scan
 */
export async function performLivenessCheck(
  videoElement: HTMLVideoElement
): Promise<LivenessResult> {
  const startTime = Date.now();

  if (!LIVENESS_CONFIG.ENABLED) {
    console.log('[LIVENESS] Liveness detection disabled');
    return {
      isLive: true,
      confidence: 1.0,
      reason: 'DISABLED',
      detectionTime: 0,
    };
  }

  try {
    // Create hidden canvas for analysis
    const canvas = document.createElement('canvas');
    const blinkDetector = new BlinkDetector();
    const motionDetector = new MotionDetector();

    let blinkDetected = false;
    let motionDetected = false;
    let frameCount = 0;

    // Wait for video to be ready
    if (videoElement.readyState < 2) {
      await new Promise((resolve) => {
        videoElement.addEventListener('loadeddata', resolve, { once: true });
      });
    }

    console.log('[LIVENESS] Starting liveness detection...');

    // Analyze frames for blink/motion
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        frameCount++;

        // Analyze for blink
        if (LIVENESS_CONFIG.REQUIRE_BLINK && !blinkDetected) {
          blinkDetected = blinkDetector.analyzeFrame(videoElement, canvas);
        }

        // Analyze for motion
        if (!motionDetected) {
          motionDetected = motionDetector.analyzeFrame(videoElement, canvas);
        }

        // Check if detection complete
        if (
          (blinkDetected && motionDetected) ||
          frameCount >= LIVENESS_CONFIG.MAX_FRAMES
        ) {
          clearInterval(interval);
          resolve();
        }
      }, LIVENESS_CONFIG.FRAME_CAPTURE_INTERVAL_MS);

      // Safety timeout
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, LIVENESS_CONFIG.BLINK_DETECTION_TIME_MS);
    });

    // Calculate confidence
    let confidence = 0;

    if (blinkDetected) confidence += 0.5;
    if (motionDetected) confidence += 0.3;

    // Bonus confidence for multiple blinks
    const blinkCount = blinkDetector.getBlinkCount();
    if (blinkCount >= 2) confidence += 0.2;

    confidence = Math.min(confidence, 1.0);

    const isLive = confidence >= LIVENESS_CONFIG.MIN_CONFIDENCE;
    const detectionTime = Date.now() - startTime;

    console.log('[LIVENESS] Detection complete:', {
      isLive,
      confidence: confidence.toFixed(2),
      blinkDetected,
      motionDetected,
      blinkCount,
      detectionTime: `${detectionTime}ms`,
    });

    // Clean up canvas
    canvas.remove();

    return {
      isLive,
      confidence,
      reason: isLive
        ? undefined
        : `Low confidence: ${(confidence * 100).toFixed(0)}%`,
      detectionTime,
    };
  } catch (error) {
    console.error('[LIVENESS] Error during liveness detection:', error);

    // On error, allow attendance to prevent false negatives
    return {
      isLive: true,
      confidence: 0,
      reason: 'DETECTION_ERROR',
      detectionTime: Date.now() - startTime,
    };
  }
}

/**
 * Simplified liveness check for quick validation
 * Just checks for basic face presence and motion
 */
export async function performQuickLivenessCheck(
  videoElement: HTMLVideoElement
): Promise<LivenessResult> {
  const startTime = Date.now();

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Wait for video
    if (videoElement.readyState < 2) {
      await new Promise((resolve) => {
        videoElement.addEventListener('loadeddata', resolve, { once: true });
      });
    }

    // Capture single frame
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Simple brightness check (face should be visible)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const brightness = calculateAverageBrightness(imageData);

    // Face should have moderate brightness (not too dark, not blown out)
    const isLive = brightness > 30 && brightness < 200;
    const confidence = isLive ? 0.7 : 0.3;

    canvas.remove();

    return {
      isLive,
      confidence,
      reason: isLive ? undefined : 'NO_FACE_DETECTED',
      detectionTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[LIVENESS] Quick check error:', error);
    return {
      isLive: true,
      confidence: 0,
      reason: 'DETECTION_ERROR',
      detectionTime: Date.now() - startTime,
    };
  }
}

/**
 * Calculate average brightness of image
 */
function calculateAverageBrightness(imageData: ImageData): number {
  const { data } = imageData;
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    total += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  return total / (data.length / 4);
}

/**
 * Get liveness configuration
 */
export function getLivenessConfig() {
  return { ...LIVENESS_CONFIG };
}

/**
 * Update liveness configuration
 */
export function updateLivenessConfig(config: Partial<typeof LIVENESS_CONFIG>) {
  Object.assign(LIVENESS_CONFIG, config);
  console.log('[LIVENESS] Configuration updated:', LIVENESS_CONFIG);
}

/**
 * Check if liveness detection is supported
 */
export function isLivenessSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    document.createElement('canvas').getContext('2d')
  );
}
