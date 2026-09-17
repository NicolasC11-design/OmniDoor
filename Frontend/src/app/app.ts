import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = ('OmniDoor');
  
  private swUpdate = inject(SwUpdate);

  ngOnInit(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((evt) => {
        if (evt.type === 'VERSION_READY') {
          if (confirm('Hay una nueva versión de OmniDoor disponible. ¿Deseas actualizar la aplicación para ver los cambios recientes?')) {
            window.location.reload();
          }
        }
      });
    }
  }
}
