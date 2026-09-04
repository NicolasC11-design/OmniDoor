import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioComponent {
  tiltStyle = {};

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Invertimos los cálculos para que mire hacia el mouse, y usamos traslación para que lo siga físicamente
    const xAxis = (event.pageX - window.innerWidth / 2) / 30;
    const yAxis = (event.pageY - window.innerHeight / 2) / 30;
    
    this.tiltStyle = {
      'transform': `perspective(1000px) rotateY(${xAxis}deg) rotateX(${-yAxis}deg) translateX(${xAxis}px) translateY(${yAxis}px)`,
      'transition': 'transform 0.1s ease-out'
    };
  }

  @HostListener('document:mouseleave')
  onMouseLeave() {
    this.tiltStyle = {
      'transform': `perspective(1000px) rotateY(0deg) rotateX(0deg)`,
      'transition': 'transform 0.5s ease-out'
    };
  }
}