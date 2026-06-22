import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface CreateNameDialogData {
  title: string;
  label: string;
}

@Component({
  selector: 'app-create-name-dialog',
  templateUrl: './create-name-dialog.component.html',
  styleUrls: ['./create-name-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class CreateNameDialogComponent {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<CreateNameDialogComponent>);
  public data: CreateNameDialogData = inject(MAT_DIALOG_DATA);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.value.name);
  }
}
