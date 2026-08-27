import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as faceapi from '@vladmandic/face-api';

@Component({
  selector: 'app-biometria-camara',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biometria-camara.html',
  styleUrls: ['./biometria-camara.css']
})
export class BiometriaCamaraComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  @Output() alCapturarBiometria = new EventEmitter<number[]>();

  camaraActiva = false;
  modelosCargados = false;
  cargandoModelos = true;
  procesandoCaptura = false;
  private streamMedia: MediaStream | null = null;

  constructor(private cdRef: ChangeDetectorRef) { }

  async ngOnInit(): Promise<void> {
    await this.cargarModelosIA();
  }

  async cargarModelosIA(): Promise<void> {
    try {
      this.cargandoModelos = true;
      const tfEngine = faceapi.tf as any;

      if (tfEngine?.setBackend) {
        try {
          await tfEngine.setBackend('webgl');
          if (tfEngine.ready) await tfEngine.ready();
        } catch {
          await tfEngine.setBackend('cpu');
          if (tfEngine.ready) await tfEngine.ready();
        }
      }

      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.modelosCargados = true;
      this.cargandoModelos = false;
      this.cdRef.detectChanges();

      await this.iniciarCamara();
    } catch (error) {
      console.error('❌ Error al cargar los modelos de IA:', error);
      this.cargandoModelos = false;
      this.cdRef.detectChanges();
    }
  }

  async iniciarCamara(): Promise<void> {
    try {
      this.streamMedia = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      this.camaraActiva = true;
      this.cdRef.detectChanges();

      setTimeout(async () => {
        if (this.videoElement && this.videoElement.nativeElement) {
          const video = this.videoElement.nativeElement;
          video.srcObject = this.streamMedia;
          video.muted = true;
          try {
            await video.play();
          } catch (e) {
            console.error('Error al reproducir el video:', e);
          }
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error al acceder a la cámara:', error);
    }
  }

  async capturarRostro(): Promise<void> {
    if (!this.videoElement || !this.videoElement.nativeElement) return;

    this.procesandoCaptura = true;
    this.cdRef.detectChanges();

    const video = this.videoElement.nativeElement;
    const opcionesDeteccion = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.35
    });

    try {
      const deteccion = await faceapi
        .detectSingleFace(video, opcionesDeteccion)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!deteccion) {
        alert('No se detectó ningún rostro. Por favor, enfócate de frente a la cámara.');
        this.procesandoCaptura = false;
        this.cdRef.detectChanges();
        return;
      }

      const vectorBiometrico = Array.from(deteccion.descriptor);
      console.log('Vector biométrico capturado (128 posiciones):', vectorBiometrico);
      this.detenerCamara();
      this.alCapturarBiometria.emit(vectorBiometrico);
      alert('¡Biometría facial capturada correctamente!');

    } catch (err) {
      console.error('Error durante la detección facial:', err);
      alert('Ocurrió un error al procesar la captura biométrica.');
    } finally {
      this.procesandoCaptura = false;
      this.cdRef.detectChanges();
    }
  }

  detenerCamara(): void {
    if (this.streamMedia) {
      this.streamMedia.getTracks().forEach(track => track.stop());
      this.streamMedia = null;
    }
    this.camaraActiva = false;
    this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }
}