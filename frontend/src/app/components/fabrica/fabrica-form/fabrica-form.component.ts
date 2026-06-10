import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fabrica-form',
  templateUrl: './fabrica-form.component.html',
  styleUrls: ['./fabrica-form.component.css']
})
export class FabricaFormComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      descripcionFabrica: [''], estadoFabrica: [''], precioFabrica: [0]
    });
  }
}