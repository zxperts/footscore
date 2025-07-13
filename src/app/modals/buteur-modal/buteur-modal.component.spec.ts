import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButeurModalComponent } from './buteur-modal.component';

describe('ButeurModalComponent', () => {
  let component: ButeurModalComponent;
  let fixture: ComponentFixture<ButeurModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButeurModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ButeurModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
