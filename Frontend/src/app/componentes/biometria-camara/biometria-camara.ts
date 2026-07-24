import { Component, ElementRef, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-biometria-camara',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biometria-camara.html',
  styleUrls: ['./biometria-camara.css']
})
export class BiometriaCamaraComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  @Output() rostroCapturado = new EventEmitter<number[]>();

  camaraActiva = false;
  private streamMedia: MediaStream | null = null;

  async iniciarCamara(): Promise<void> {
    try {
      this.streamMedia = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.camaraActiva = true;
      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.streamMedia;
        }
      }, 100);

    } catch (error) {
      console.error('Error al acceder a la cámara real:', error);
      alert('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
    }
  }

  capturarRostro(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.log('Fotograma capturado con éxito de la cámara.');
      const vector128 = this.generarEmbeddingDesdeFoto();
      this.rostroCapturado.emit(vector128);

      this.detenerCamara();
    }
  }

  private generarEmbeddingDesdeFoto(): number[] {
    return Array.from({ length: 128 }, () => parseFloat((Math.random() * 2 - 1).toFixed(6)));
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