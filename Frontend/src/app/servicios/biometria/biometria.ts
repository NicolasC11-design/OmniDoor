import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as faceapi from '@vladmandic/face-api';
import { Observable } from 'rxjs';

export interface UsuarioCoincidencia {
  id: number | string;
  correo: string;
  nombre?: string;
  avatar?: string;
}

export interface RespuestaVerificacionBiometrica {
  multiple_matches: boolean;
  coincidencias: UsuarioCoincidencia[];
  token?: string;
  mensaje?: string;
}

export interface ValidacionPorteriaPayload {
  placa?: string;
  vector_biometrico: number[];
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'REGISTRO_VISITANTE';
}

export interface ResultadoBiometria {
  coincide: boolean;
  distancia: number;
}

@Injectable({
  providedIn: 'root'
})
export class BiometriaService {
  private modelosCargados = false;
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  async cargarModelos(): Promise<boolean> {
    if (this.modelosCargados) return true;

    try {
      await this.inicializarBackendTensorFlow();
      const MODEL_URL = '/assets/models'; 

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.modelosCargados = true;
      const tfEngine = faceapi.tf as any;
      console.log(`✅ Modelos biométricos cargados con backend: [${tfEngine.getBackend?.() || 'desconocido'}]`);
      return true;
    } catch (error) {
      console.error('❌ Error al cargar modelos biométricos:', error);
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
      console.warn('⚠️ WebGL no disponible. Intentando iniciar en modo CPU...');
      try {
        if (tfEngine?.setBackend) {
          await tfEngine.setBackend('cpu');
          if (tfEngine.ready) await tfEngine.ready();
        }
      } catch (cpuError) {
        console.error('❌ Falló la inicialización del backend de TensorFlow:', cpuError);
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

    return deteccion ? deteccion.descriptor : null;
  }

  async obtenerVectorFacialArray(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<number[] | null> {
    const descriptor = await this.obtenerDescriptorFacial(input);
    return descriptor ? Array.from(descriptor) : null;
  }

  compararDescriptores(
    descriptorCapturado: number[] | Float32Array,
    descriptorGuardado: number[] | Float32Array,
    umbral: number = 0.55
  ): ResultadoBiometria {
    const desc1 = new Float32Array(descriptorCapturado);
    const desc2 = new Float32Array(descriptorGuardado);
    const distancia = faceapi.euclideanDistance(desc1, desc2);

    return {
      coincide: distancia <= umbral,
      distancia: parseFloat(distancia.toFixed(4))
    };
  }
  verificarBiometriaLogin(vectorBiometrico: number[]): Observable<RespuestaVerificacionBiometrica> {
    return this.http.post<RespuestaVerificacionBiometrica>(
      `${this.apiUrl}/auth/verificar-biometria/`,
      { vector_biometrico: vectorBiometrico }
    );
  }

  registrarBiometria(payload: { usuario_id?: string; vector_biometrico: number[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/registrar-biometria/`, payload);
  }

  enrolarBiometria(idUsuario: string, descriptor: number[]): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/biometria/enrolar/`,
      { id_usuario: idUsuario, descriptor: descriptor },
      { headers: this.getHeaders() }
    );
  }

  validarPlaca(placa: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/biometria/validar-placa/${placa}/`,
      { headers: this.getHeaders() }
    );
  }

  validarAccesoPorteria(payload: ValidacionPorteriaPayload): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/accesos/validar-porteria/`,
      payload,
      { headers: this.getHeaders() }
    );
  }
}