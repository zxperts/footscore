import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispositionModalComponent } from './disposition-modal.component';

describe('DispositionModalComponent', () => {
  let component: DispositionModalComponent;
  let fixture: ComponentFixture<DispositionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispositionModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DispositionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
