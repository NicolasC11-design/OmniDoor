import { Component, ElementRef, EventEmitter, Output, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as faceapi from 'face-api.js';

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

  @Output() rostroCapturado = new EventEmitter<number[]>();

  camaraActiva = false;
  modelosCargados = false;
  cargandoModelos = true;
  private streamMedia: MediaStream | null = null;

  async ngOnInit(): Promise<void> {
    await this.cargarModelosIA();
  }

  async cargarModelosIA(): Promise<void> {
    try {
      this.cargandoModelos = true;
      if (faceapi.tf) {
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
      }

      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.modelosCargados = true;
      this.cargandoModelos = false;
      console.log('✅ Modelos de face-api.js cargados en CPU sin warnings.');
      
      this.iniciarCamara();
    } catch (error) {
      console.error('Error al cargar los modelos de IA:', error);
      this.cargandoModelos = false;
    }
  }

  async iniciarCamara(): Promise<void> {
    try {
      this.streamMedia = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      this.camaraActiva = true;
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          const video = this.videoElement.nativeElement;
          video.srcObject = this.streamMedia;
          video.muted = true;
          video.play().catch(e => console.error('Error al reproducir el video:', e));
        }
      }, 100);
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
    }
  }

  async capturarRostro(): Promise<void> {
    if (!this.videoElement || !this.modelosCargados) return;

    const video = this.videoElement.nativeElement;

    const deteccion = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!deteccion) {
      alert('No se detectó ningún rostro. Por favor, enfócate de frente a la cámara.');
      return;
    }
    const vector128Real: number[] = Array.from(deteccion.descriptor);

    console.log('📷 Vector biométrico generado:', vector128Real.slice(0, 5));

    this.rostroCapturado.emit(vector128Real);
    this.detenerCamara();
  }

  detenerCamara(): void {
    if (this.streamMedia) {
      this.streamMedia.getTracks().forEach(track => track.stop());
      this.streamMedia = null;
    }
    this.camaraActiva = false;
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }
}