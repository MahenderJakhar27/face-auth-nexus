import * as ort from "onnxruntime-web";

export class FaceEmbedder {
  private session: ort.InferenceSession | null = null;
  private readonly MODEL_URL = "/models/arcface.onnx";

  async init() {
    if (this.session) return;

    // Configure WASM paths for Next.js/Browser
    ort.env.wasm.wasmPaths = "/wasm/";

    try {
      this.session = await ort.InferenceSession.create(this.MODEL_URL, {
        executionProviders: ["webgl", "wasm"], // Fallback to wasm if webgl fails
      });
      console.log("Face recognition model loaded");
    } catch (e) {
      console.error("Failed to load ONNX model:", e);
      throw e;
    }
  }

  /**
   * Generates a 512-dimensional embedding from an aligned face image.
   * Input image must be 112x112 pixels.
   */
  async getEmbedding(canvas: HTMLCanvasElement): Promise<Float32Array> {
    if (!this.session) {
      throw new Error("Embedder not initialized");
    }

    // 1. Preprocess: Get pixel data from canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");

    const imageData = ctx.getImageData(0, 0, 112, 112);
    const { data } = imageData;

    // 2. Prepare tensor (NHWC format: [1, 112, 112, 3])
    // Most ONNX Model Zoo ArcFace models expect [1, 112, 112, 3]
    const float32Data = new Float32Array(1 * 112 * 112 * 3);
    for (let i = 0; i < 112 * 112; i++) {
        float32Data[i * 3 + 0] = (data[i * 4 + 0] - 127.5) / 128.0; // R
        float32Data[i * 3 + 1] = (data[i * 4 + 1] - 127.5) / 128.0; // G
        float32Data[i * 3 + 2] = (data[i * 4 + 2] - 127.5) / 128.0; // B
    }

    const inputTensor = new ort.Tensor("float32", float32Data, [1, 112, 112, 3]);

    // 3. Inference
    const outputMap = await this.session.run({ [this.session.inputNames[0]]: inputTensor });
    const output = outputMap[this.session.outputNames[0]].data as Float32Array;

    // 4. L2 Normalization (ArcFace embeddings are usually normalized)
    return this.l2Normalize(output);
  }

  private l2Normalize(vector: Float32Array): Float32Array {
    let sumSquares = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSquares += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSquares);
    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / norm;
    }
    return normalized;
  }
}

export const faceEmbedder = new FaceEmbedder();
