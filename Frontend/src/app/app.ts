import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Login } from './componentes/login/login'; 
import { Register } from './componentes/registrer/registrer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Register],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Frontend');
}
