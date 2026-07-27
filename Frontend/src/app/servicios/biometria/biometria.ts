import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as faceapi from '@vladmandic/face-api';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BiometriaService {
  private modelosCargados = false;
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  registrarBiometria(payload: { usuario_id: string; biometria: number[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/registrar-biometria/`, payload);
  }

  async cargarModelos(): Promise<boolean> {
    if (this.modelosCargados) return true;

    try {
      await this.inicializarBackendTensorFlow();
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.modelosCargados = true;
      const tfEngine = faceapi.tf as any;
      console.log(`✅ Modelos biométricos cargados usando el backend: [${tfEngine.getBackend?.() || 'desconocido'}]`);
      return true;
    } catch (error) {
      console.error('❌ Error crítico al cargar los modelos biométricos:', error);
      return false;
    }
  }

  private async inicializarBackendTensorFlow(): Promise<void> {
    const tfEngine = faceapi.tf as any;

    try {
      if (tfEngine?.setBackend) {
        await tfEngine.setBackend('webgl');
        if (tfEngine.ready) await tfEngine.ready();
      }
    } catch {
      console.warn('⚠️ WebGL no está disponible en este dispositivo/entorno. Reintentando con CPU...');
      try {
        if (tfEngine?.setBackend) {
          await tfEngine.setBackend('cpu');
          if (tfEngine.ready) await tfEngine.ready();
        }
      } catch (cpuError) {
        console.error('❌ No se pudo inicializar ningún backend de TensorFlow:', cpuError);
        throw cpuError;
      }
    }
  }

  async obtenerDescriptorFacial(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<Float32Array | null> {
    if (!this.modelosCargados) {
      const exito = await this.cargarModelos();
      if (!exito) return null;
    }

    const opciones = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5
    });

    const deteccion = await faceapi
      .detectSingleFace(input, opciones)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!deteccion) {
      return null;
    }

    return deteccion.descriptor;
  }
  

  compararDescriptores(
    descriptorCapturado: number[] | Float32Array,
    descriptorGuardado: number[] | Float32Array,
    umbral: number = 0.55
  ): { coincide: boolean; distancia: number } {
    const desc1 = new Float32Array(descriptorCapturado);
    const desc2 = new Float32Array(descriptorGuardado);
    const distancia = faceapi.euclideanDistance(desc1, desc2);

    return {
      coincide: distancia <= umbral,
      distancia: parseFloat(distancia.toFixed(4))
    };
  }
}