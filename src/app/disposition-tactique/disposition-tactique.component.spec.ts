import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispositionTactiqueComponent } from './disposition-tactique.component';

describe('DispositionTactiqueComponent', () => {
  let component: DispositionTactiqueComponent;
  let fixture: ComponentFixture<DispositionTactiqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispositionTactiqueComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DispositionTactiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
